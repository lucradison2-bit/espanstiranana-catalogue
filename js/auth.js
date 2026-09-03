import { supabase } from './supabase.js'
import {
  renderLayout,
  showMessage,
} from './commun.js'

await renderLayout()

const loginForm = document.querySelector('#form-connexion')
const registerForm = document.querySelector('#form-inscription')

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    const email = document.querySelector('#email').value.trim()
    const password = document.querySelector('#password').value
    const message = document.querySelector('#message')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      showMessage(message, error.message, 'error')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'admin') {
      window.location.href = './administration.html'
    } else {
      window.location.href = './espace.html'
    }
  })
}

if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    const message = document.querySelector('#message')

    const firstName = document.querySelector('#first-name').value.trim()
    const lastName = document.querySelector('#last-name').value.trim()
    const email = document.querySelector('#email').value.trim()
    const phone = document.querySelector('#phone').value.trim()
    const studentCard = document.querySelector('#student-card').value.trim()
    const identityCard = document.querySelector('#identity-card').value.trim()
    const password = document.querySelector('#password').value

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          student_card: studentCard,
          identity_card: identityCard,
        },
      },
    })

    showMessage(
      message,
      error
        ? error.message
        : 'Compte créé. Il doit maintenant être validé par l’administrateur.',
      error ? 'error' : 'success'
    )

    if (!error) registerForm.reset()
  })
    }
