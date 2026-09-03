import { supabase } from './supabase.js'
import {
  bookStatusLabel,
  escapeHtml,
  formatDate,
  formatMoney,
  loanStatusLabel,
  renderLayout,
  requireAdmin,
  showMessage,
} from './commun.js'
import {
  DEFAULT_DAILY_RATE,
  DEFAULT_GRACE_DAYS,
} from './config.js'
await renderLayout()

const admin = await requireAdmin()

if (admin) {
  setupTabs()
  await loadDashboard()
  await loadUsers()
  await loadLoans()
  setupBookForm()
}

function setupTabs() {
  document.querySelectorAll('.tab-button').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach((item) => {
        item.classList.remove('active')
      })

      document.querySelectorAll('.admin-section').forEach((section) => {
        section.classList.remove('active')
      })

      button.classList.add('active')
      document
        .querySelector(`#${button.dataset.section}`)
        .classList.add('active')
    })
  })
}

async function loadDashboard() {
  const [{ count: books }, { count: available }, { count: users }, { count: overdue }] =
    await Promise.all([
      supabase.from('books').select('*', { count: 'exact', head: true }),
      supabase
        .from('books')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available'),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('loans')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'overdue'),
    ])

  document.querySelector('#admin-stats').innerHTML = `
    <article class="stat-card">
      <strong>${books || 0}</strong>
      <span>Total des livres</span>
    </article>

    <article class="stat-card">
      <strong>${available || 0}</strong>
      <span>Livres disponibles</span>
    </article>

    <article class="stat-card">
      <strong>${users || 0}</strong>
      <span>Comptes en attente</span>
    </article>

    <article class="stat-card">
      <strong>${overdue || 0}</strong>
      <span>Emprunts en retard</span>
    </article>
  `
}

function setupBookForm() {
  const form = document.querySelector('#form-livre')

  form.addEventListener('submit', async (event) => {
    event.preventDefault()

    const message = document.querySelector('#book-message')
    const title = document.querySelector('#book-title').value.trim()
    const author = document.querySelector('#book-author').value.trim()
    const reference = document.querySelector('#book-reference').value.trim()
    const categoryName = document.querySelector('#book-category').value.trim()
    const summary = document.querySelector('#book-summary').value.trim()

    let categoryId = null

    if (categoryName) {
      const { data: category } = await supabase
        .from('categories')
        .upsert(
          { name: categoryName },
          { onConflict: 'name' }
        )
        .select()
        .single()

      categoryId = category?.id || null
    }

    const { data: user } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('books')
      .insert({
        title,
        author,
        reference,
        summary,
        category_id: categoryId,
        created_by: user.user.id,
      })

    showMessage(
      message,
      error ? error.message : 'Livre ajouté avec succès.',
      error ? 'error' : 'success'
    )

    if (!error) {
      form.reset()
      await loadDashboard()
    }
  })
}

async function loadUsers() {
  const container = document.querySelector('#liste-utilisateurs')

  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    container.innerHTML = '<p class="message error">Erreur.</p>'
    return
  }

  container.innerHTML = `
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>E-mail</th>
            <th>Statut</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${(users || []).map((user) => `
            <tr>
              <td>
                ${escapeHtml(user.first_name)}
                ${escapeHtml(user.last_name)}
              </td>
              <td>${escapeHtml(user.email)}</td>
              <td>${escapeHtml(user.status)}</td>
              <td>
                ${
                  user.status === 'pending'
                    ? `
                      <button
                        class="button button-small validate-user"
                        data-id="${user.id}"
                      >
                        Valider
                      </button>
                    `
                    : ''
                }

                ${
                  user.status === 'active'
                    ? `
                      <button
                        class="button button-small button-danger block-user"
                        data-id="${user.id}"
                      >
                        Bloquer
                      </button>
                    `
                    : ''
                }
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `

  document.querySelectorAll('.validate-user').forEach((button) => {
    button.addEventListener('click', () => updateUserStatus(button.dataset.id, 'active'))
  })

  document.querySelectorAll('.block-user').forEach((button) => {
    button.addEventListener('click', () => updateUserStatus(button.dataset.id, 'blocked'))
  })
}

async function updateUserStatus(id, status) {
  await supabase
    .from('profiles')
    .update({ status })
    .eq('id', id)

  await loadUsers()
  await loadDashboard()
}

async function loadLoans() {
  const container = document.querySelector('#liste-emprunts')

  const { data: loans, error } = await supabase
    .from('loans')
    .select(`
      *,
      books(title, reference),
      profiles(first_name, last_name, email),
      penalties(late_days, amount, paid_amount, status)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    container.innerHTML = '<p class="message error">Erreur.</p>'
    return
  }

  container.innerHTML = `
    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Livre</th>
            <th>Statut</th>
            <th>Date limite</th>
            <th>Pénalité</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${(loans || []).map((loan) => {
            const penalty = Array.isArray(loan.penalties)
              ? loan.penalties[0]
              : loan.penalties

            return `
              <tr>
                <td>
                  ${escapeHtml(loan.profiles?.first_name || '')}
                  ${escapeHtml(loan.profiles?.last_name || '')}
                </td>
                <td>${escapeHtml(loan.books?.title || '')}</td>
                <td>${loanStatusLabel(loan.status)}</td>
                <td>${formatDate(loan.due_at)}</td>
                <td>
                  ${penalty ? formatMoney(penalty.amount) : '0 Ar'}
                </td>
                <td>
                  ${
                    ['pending'].includes(loan.status)
                      ? `
                        <button
                          class="button button-small approve-loan"
                          data-id="${loan.id}"
                        >
                          Accepter
                        </button>

                        <button
                          class="button button-small button-danger refuse-loan"
                          data-id="${loan.id}"
                        >
                          Refuser
                        </button>
                      `
                      : ''
                  }

                  ${
                    ['active', 'overdue'].includes(loan.status)
                      ? `
                        <button
                          class="button button-small return-loan"
                          data-id="${loan.id}"
                        >
                          Confirmer retour
                        </button>
                      `
                      : ''
                  }

                  ${
                    penalty && penalty.status !== 'paid'
                      ? `
                        <button
                          class="button button-small pay-penalty"
                          data-id="${penalty.id}"
                        >
                          Marquer payé
                        </button>
                      `
                      : ''
                  }
                </td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
    </div>
  `

  document.querySelectorAll('.approve-loan').forEach((button) => {
    button.addEventListener('click', () => approveLoan(button.dataset.id))
  })

  document.querySelectorAll('.refuse-loan').forEach((button) => {
    button.addEventListener('click', () => refuseLoan(button.dataset.id))
  })

  document.querySelectorAll('.return-loan').forEach((button) => {
    button.addEventListener('click', () => returnLoan(button.dataset.id))
  })

  document.querySelectorAll('.pay-penalty').forEach((button) => {
    button.addEventListener('click', () => payPenalty(button.dataset.id))
  })
}

async function approveLoan(id) {
  const { data: loan } = await supabase
    .from('loans')
    .select('book_id, user_id')
    .eq('id', id)
    .single()

  if (!loan) return

  const borrowedAt = new Date()
  const dueAt = new Date(borrowedAt)
  dueAt.setDate(dueAt.getDate() + 14)

  const { data: adminUser } = await supabase.auth.getUser()

  await supabase
    .from('loans')
    .update({
      status: 'active',
      borrowed_at: borrowedAt.toISOString(),
      due_at: dueAt.toISOString(),
      approved_by: adminUser.user.id,
    })
    .eq('id', id)

  await supabase
    .from('books')
    .update({ status: 'borrowed' })
    .eq('id', loan.book_id)

  await loadDashboard()
  await loadLoans()
}

async function refuseLoan(id) {
  const { data: loan } = await supabase
    .from('loans')
    .select('book_id')
    .eq('id', id)
    .single()

  await supabase
    .from('loans')
    .update({ status: 'refused' })
    .eq('id', id)

  if (loan) {
    await supabase
      .from('books')
      .update({ status: 'available' })
      .eq('id', loan.book_id)
  }

  await loadDashboard()
  await loadLoans()
}

async function returnLoan(id) {
  const { data: loan } = await supabase
    .from('loans')
    .select('book_id, due_at')
    .eq('id', id)
    .single()

  if (!loan) return

  const now = new Date()
  const late =
    loan.due_at &&
    now.getTime() > new Date(loan.due_at).getTime()

  const { data: adminUser } = await supabase.auth.getUser()

  await supabase
    .from('loans')
    .update({
      status: late ? 'returned_late' : 'returned',
      returned_at: now.toISOString(),
      return_confirmed_by: adminUser.user.id,
    })
    .eq('id', id)

  await supabase
    .from('books')
    .update({ status: 'available' })
    .eq('id', loan.book_id)

  if (late) {
    const totalLateDays = Math.max(
      0,
      Math.floor(
        (now.getTime() - new Date(loan.due_at).getTime()) /
        86400000
      )
    )

    const billableDays = Math.max(
      0,
      totalLateDays - DEFAULT_GRACE_DAYS
    )

    await supabase
      .from('penalties')
      .upsert(
        {
          loan_id: id,
          late_days: billableDays,
          daily_rate: DEFAULT_DAILY_RATE,
          amount: billableDays * DEFAULT_DAILY_RATE,
          status: billableDays > 0 ? 'unpaid' : 'cancelled',
        },
        { onConflict: 'loan_id' }
      )
  }

  await loadDashboard()
  await loadLoans()
}

async function payPenalty(id) {
  await supabase
    .from('penalties')
    .update({
      paid_amount: supabase.rpc ? undefined : 0,
      status: 'paid',
    })
    .eq('id', id)

  await loadLoans()
      }
