export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function showMessage(element, text, type = '') {
  if (!element) return

  element.innerHTML = `
    <div class="message ${type}">
      ${escapeHtml(text)}
    </div>
  `
}

export function formatDate(value) {
  if (!value) return '-'

  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} Ar`
}

export function loanStatusLabel(status) {
  const labels = {
    pending: 'Demande en attente',
    active: 'En cours',
    overdue: 'En retard',
    returned: 'Retourné',
    returned_late: 'Retourné en retard',
    refused: 'Refusé',
    lost: 'Perdu',
    damaged: 'Endommagé',
  }

  return labels[status] || status
}

export function bookStatusLabel(status) {
  const labels = {
    available: 'Disponible',
    borrowed: 'Emprunté',
    lost: 'Perdu',
    damaged: 'Endommagé',
    inactive: 'Désactivé',
  }

  return labels[status] || status
}

export async function renderLayout() {
  const header = document.querySelector('#header')
  const footer = document.querySelector('#footer')

  if (header) {
    header.innerHTML = `
      <div class="header">
        <a class="logo" href="./index.html">
          Espantsiranana Catalogue
        </a>

        <nav class="nav">
          <a href="./catalogue.html">Catalogue</a>
          <a href="./espace.html">Mon espace</a>
          <a href="./administration.html">Administration</a>
          <button id="logout-button" class="button button-small">
            Déconnexion
          </button>
        </nav>
      </div>
    `
  }

  if (footer) {
    footer.innerHTML = `
      <p>© 2026 Espantsiranana Catalogue</p>
    `
  }

  const logout = document.querySelector('#logout-button')

  if (logout) {
    const { supabase } = await import('./supabase.js')

    logout.addEventListener('click', async () => {
      await supabase.auth.signOut()
      window.location.href = './index.html'
    })
  }
}

export async function getCurrentUser() {
  const { supabase } = await import('./supabase.js')
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function getCurrentProfile() {
  const { supabase } = await import('./supabase.js')
  const user = await getCurrentUser()

  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

export async function requireAdmin() {
  const profile = await getCurrentProfile()

  if (!profile || profile.role !== 'admin' || profile.status !== 'active') {
    window.location.href = './connexion.html'
    return null
  }

  return profile
}
