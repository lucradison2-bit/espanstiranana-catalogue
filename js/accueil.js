import { supabase } from './supabase.js'
import { escapeHtml, renderLayout } from './commun.js'

await renderLayout()

const totalElement = document.querySelector('#total-livres')
const availableElement = document.querySelector('#livres-disponibles')
const recentElement = document.querySelector('#livres-recents')

const { count: total } = await supabase
  .from('books')
  .select('*', { count: 'exact', head: true })
  .neq('status', 'inactive')

const { count: available } = await supabase
  .from('books')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'available')

const { data: books, error } = await supabase
  .from('books')
  .select('id, title, author, reference, status, categories(name)')
  .neq('status', 'inactive')
  .order('created_at', { ascending: false })
  .limit(8)

totalElement.textContent = total || 0
availableElement.textContent = available || 0

if (error) {
  recentElement.innerHTML = '<p>Impossible de charger les livres.</p>'
} else {
  recentElement.innerHTML = (books || []).map((book) => `
    <article class="book-card">
      <span class="category">
        ${escapeHtml(book.categories?.name || 'Sans catégorie')}
      </span>

      <h3>${escapeHtml(book.title)}</h3>
      <p>${escapeHtml(book.author)}</p>

      <p class="${book.status === 'available' ? 'available' : 'unavailable'}">
        ${book.status === 'available' ? 'Disponible' : 'Indisponible'}
      </p>

      <a href="./livre.html?id=${book.id}">
        Voir la fiche
      </a>
    </article>
  `).join('')
  }
