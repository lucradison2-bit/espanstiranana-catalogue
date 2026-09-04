// js/catalogue.js
import { supabase } from './config.js';
import { getUtilisateurCourant } from './auth.js';

export async function afficherCatalogue() {
  const { data: livres, error } = await supabase
    .from('livres')
    .select('*')
    .order('titre');

  if (error) {
    console.error(error);
    const el = document.getElementById('liste-livres');
    if (el) el.textContent = 'Erreur lors du chargement des livres.';
    return;
  }

  const container = document.getElementById('liste-livres');
  if (!container) return;

  container.innerHTML = '';

  if (livres.length === 0) {
    container.textContent = 'Aucun livre disponible pour le moment.';
    return;
  }

  for (const livre of livres) {
    const div = document.createElement('div');
    div.className = 'livre';

    const statutClasse = livre.disponible ? 'disponible' : 'indisponible';
    const statutText = livre.disponible ? 'Disponible' : 'Indisponible';

    div.innerHTML = `
      <h3>${livre.titre}</h3>
      <p><strong>Auteur :</strong> ${livre.auteur || 'Non renseigné'}</p>
      <p><strong>Catégorie :</strong> ${livre.categorie || 'Non renseignée'}</p>
      <p><strong>Référence :</strong> ${livre.numero_ref || 'Non renseignée'}</p>
      <p><strong>Statut :</strong> <span class="${statutClasse}">${statutText}</span></p>
      <div class="actions"></div>
      <div class="message"></div>
    `;

    container.appendChild(div);

    const actionsDiv = div.querySelector('.actions');
    const messageDiv = div.querySelector('.message');

    if (livre.disponible) {
      const btnEmprunter = document.createElement('button');
      btnEmprunter.textContent = 'Emprunter';
      actionsDiv.appendChild(btnEmprunter);

      btnEmprunter.addEventListener('click', async () => {
        messageDiv.textContent = '';
        messageDiv.className = 'message';

        const info = await getUtilisateurCourant();

        if (!info) {
          messageDiv.textContent = 'Vous devez vous connecter pour emprunter un livre.';
          messageDiv.classList.add('error');
          return;
        }

        const { user, profil } = info;

        if (!profil || profil.status !== 'active') {
          messageDiv.textContent =
            "Votre compte n'est pas encore activé par l'administrateur.";
          messageDiv.classList.add('error');
          return;
        }

        const { error: insertError } = await supabase.from('emprunts').insert({
          user_id: user.id,
          livre_id: livre.id,
          statut: 'pending',
          date_retour_prevu: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });

        if (insertError) {
          console.error(insertError);
          messageDiv.textContent =
            "Erreur lors de l'envoi de la demande d'emprunt.";
          messageDiv.classList.add('error');
        } else {
          messageDiv.textContent =
            "Demande d'emprunt envoyée. En attente de validation par l'administrateur.";
          messageDiv.classList.add('success');
        }
      });
    } else {
      const span = document.createElement('span');
      span.textContent = 'Ce livre est actuellement indisponible.';
      span.style.color = '#666';
      actionsDiv.appendChild(span);
    }
  }
                                         }
