import { supabase } from './supabase.js'
import {
  escapeHtml,
  formatDate,
  getCurrentProfile,
  renderLayout,
  showMessage,
} from './commun.js'
import { SITE_URL } from './config.js'

await renderLayout()

const id = new URLSearchParams(window.location.search).get('id')
const container = document.querySelector('#details-livre')

if (!id) {
  container.innerHTML = '<p class="message error">Livre introuvable.</p>'
} else {
  const { data: book, error } = await supabase
    .from('books')
    .select('*, categories(name)')
    .eq('id', id)
    .single()

  if (error || !book) {
    container.innerHTML = '<p class="message error">Livre introuvable.</p>'
  } else {
    const qrUrl = `${SITE_URL}/livre.html?id=${book.id}`

    container.innerHTML = `
      <div class="book-details">
        <div>
          <span class="category">
            ${escapeHtml(book.categories?.name || 'Sans catégorie')}
          </span>

          <h1>${escapeHtml(book.title)}</h1>

          <p class="muted">
            Auteur : ${escapeHtml(book.author)}
          </p>

          <p class="muted">
            Référence : ${escapeHtml(book.reference)}
          </p>

          <h2>Résumé</h2>
          <p class="summary">
            ${escapeHtml(book.summary || 'Aucun résumé disponible.')}
          </p>

          <p class="${book.status === 'available' ? 'available' : 'unavailable'}">
            ${book.status === 'available' ? 'Disponible' : 'Indisponible'}
          </p>

          <div id="borrow-area"></div>
        </div>

        <div class="qr-box">
          <canvas id="qr-code"></canvas>
          <p class="muted">Scannez pour consulter ce livre</p>
          <button id="print-qr" class="button button-small">
            Imprimer
          </button>
        </div>
      </div>
    `

    const QRCode = await import(
      'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm'
    )

    await QRCode.toCanvas(
      document.querySelector('#qr-code'),
      qrUrl,
      {
        width: 220,
        margin: 2,
        errorCorrectionLevel: 'H',
      }
    )

    document.querySelector('#print-qr').addEventListener('click', () => {
      window.print()
    })

    const borrowArea = document.querySelector('#borrow-area')

    if (book.status === 'available') {
      borrowArea.innerHTML = `
        <button id="borrow-button" class="button">
          Demander à emprunter
        </button>
        <div id="borrow-message"></div>
      `

      document
        .querySelector('#borrow-button')
        .addEventListener('click', async () => {
          const profile = await getCurrentProfile()

          if (!profile) {
            window.location.href = './connexion.html'
            return
          }

          if (profile.status !== 'active') {
            showMessage(
              document.querySelector('#borrow-message'),
              'Votre compte doit être validé par l’administrateur.',
              'error'
            )
            return
          }

          const { data: existing } = await supabase
            .from('loans')
            .select('id')
            .eq('book_id', book.id)
            .in('status', ['pending', 'active', 'overdue'])
            .maybeSingle()

          if (existing) {
            showMessage(
              document.querySelector('#borrow-message'),
              'Une demande existe déjà pour ce livre.',
              'error'
            )
            return
          }

          const { error: insertError } = await supabase
            .from('loans')
            .insert({
              book_id: book.id,
              user_id: profile.id,
              status: 'pending',
            })

          showMessage(
            document.querySelector('#borrow-message'),
            insertError
              ? 'Impossible d’envoyer la demande.'
              : 'Demande envoyée à l’administrateur.',
            insertError ? 'error' : 'success'
          )
        })
    }
  }
      }
