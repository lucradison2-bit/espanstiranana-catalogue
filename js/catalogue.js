import { supabase } from './supabase.js'
import {
  escapeHtml,
  renderLayout,
} from './commun.js'

await renderLayout()

const form = document.querySelector('#form-recherche')
const input = document.querySelector('#recherche')
const resultats = document.querySelector('#resultats')
const message = document.querySelector('#message')

async function loadBooks(search = '') {
  let request = supabase
    .from('books')
    .select('id, title, author, reference, summary, status, categories(name)')
    .neq('status', 'inactive')
    .order('title')

  if (search) {
    request = request.or(
      `title.ilike.%${search}%,author.ilike.%${search}%,reference.ilike.%${search}%`
    )
  }

  const { data: books, error } = await request

  if (error) {
    message.innerHTML = '<p class="message error">Erreur de chargement.</p>'
    return
  }

  resultats.innerHTML = (books || []).map((book) => `
    <article class="book-card">
      <span class="category">
        ${escapeHtml(book.categories?.name || 'Sans catégorie')}
      </span>

      <h3>${escapeHtml(book.title)}</h3>
      <p>${escapeHtml(book.author)}</p>
      <p>Référence : ${escapeHtml(book.reference)}</p>

      <p class="${book.status === 'available' ? 'available' : 'unavailable'}">
        ${book.status === 'available' ? 'Disponible' : 'Indisponible'}
      </p>

      <a class="button button-small" href="./livre.html?id=${book.id}">
        Voir la fiche
      </a>
    </article>
  `).join('')

  if (!books?.length) {
    resultats.innerHTML = '<p>Aucun livre trouvé.</p>'
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault()
  loadBooks(input.value.trim())
})

loadBooks()
