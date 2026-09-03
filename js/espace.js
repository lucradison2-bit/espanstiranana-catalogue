import { supabase } from './supabase.js'
import {
  escapeHtml,
  formatDate,
  formatMoney,
  getCurrentUser,
  loanStatusLabel,
  renderLayout,
} from './commun.js'

await renderLayout()

const user = await getCurrentUser()

if (!user) {
  window.location.href = './connexion.html'
} else {
  const profileElement = document.querySelector('#profil')
  const loansElement = document.querySelector('#mes-emprunts')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: loans } = await supabase
    .from('loans')
    .select(`
      *,
      books(title, author, reference),
      penalties(late_days, amount, paid_amount, status)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  profileElement.innerHTML = `
    <div class="profile-card">
      <h2>
        ${escapeHtml(profile?.first_name || '')}
        ${escapeHtml(profile?.last_name || '')}
      </h2>

      <p>${escapeHtml(profile?.email || '')}</p>

      <p>
        Statut du compte :
        <strong>${profile?.status === 'active' ? 'Validé' : 'En attente'}</strong>
      </p>
    </div>
  `

  loansElement.innerHTML = (loans || []).map((loan) => {
    const penalty = Array.isArray(loan.penalties)
      ? loan.penalties[0]
      : loan.penalties

    return `
      <article class="loan-card">
        <h3>${escapeHtml(loan.books?.title || 'Livre')}</h3>
        <p class="muted">${escapeHtml(loan.books?.author || '')}</p>

        <p>
          Statut :
          <span class="loan-status status-${loan.status}">
            ${loanStatusLabel(loan.status)}
          </span>
        </p>

        <p>Date d’emprunt : ${formatDate(loan.borrowed_at)}</p>
        <p>Date limite : ${formatDate(loan.due_at)}</p>
        <p>Date de retour : ${formatDate(loan.returned_at)}</p>

        ${
          penalty
            ? `<p>Pénalité : ${formatMoney(penalty.amount)}</p>`
            : ''
        }
      </article>
    `
  }).join('')

  if (!loans?.length) {
    loansElement.innerHTML = '<p class="muted">Aucun emprunt.</p>'
  }
    }
