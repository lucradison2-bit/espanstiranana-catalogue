// js/livre.js
import { supabase } from './config.js';
import { getUtilisateurCourant } from './auth.js';

function echapperHtml(texte) {
  const element = document.createElement('div');
  element.textContent = texte || '';
  return element.innerHTML;
}

function afficherMessage(message, type = '') {
  const messageRef = document.getElementById('message-ref');

  if (!messageRef) return;

  messageRef.textContent = message;
  messageRef.className = `message ${type}`.trim();
}

export async function afficherLivre() {
  const params = new URLSearchParams(window.location.search);
  const livreId = params.get('id');

  if (!livreId) {
    return;
  }

  const { data: livre, error } = await supabase
    .from('livres')
    .select('*')
    .eq('id', livreId)
    .single();

  if (error || !livre) {
    console.error('Erreur livre :', error);
    afficherMessage('Livre introuvable.', 'error');
    return;
  }

  afficherInformationsLivre(livre);
}

export async function ouvrirLivreParReference(reference) {
  const valeur = (reference || '').trim();

  if (!valeur) {
    afficherMessage('Saisissez ou scannez une référence de livre.', 'error');
    return;
  }

  const { data: livre, error } = await supabase
    .from('livres')
    .select('*')
    .eq('numero_ref', valeur)
    .single();

  if (error || !livre) {
    console.error('Erreur recherche référence :', error);
    afficherMessage(
      'Aucun livre ne correspond à cette référence ou ce code-barres.',
      'error'
    );
    return;
  }

  afficherMessage(`Livre trouvé : ${livre.titre}`, 'success');
  afficherInformationsLivre(livre);

  window.history.replaceState(
    {},
    '',
    `livre.html?id=${encodeURIComponent(livre.id)}`
  );
}

function afficherInformationsLivre(livre) {
  const container = document.getElementById('contenu-livre');

  if (!container) return;

  container.classList.remove('hidden');

  const statut = livre.disponible ? 'Disponible' : 'Indisponible';
  const classeStatut = livre.disponible ? 'badge-active' : 'badge-rejected';

  container.innerHTML = `
    <p class="eyebrow">Informations du livre</p>
    <h2>${echapperHtml(livre.titre)}</h2>

    <div class="fiche-livre-grid">
      <p><strong>Auteur :</strong> ${echapperHtml(livre.auteur || 'Non renseigné')}</p>
      <p><strong>Catégorie :</strong> ${echapperHtml(livre.categorie || 'Non renseignée')}</p>
      <p><strong>Référence :</strong> ${echapperHtml(livre.numero_ref || 'Non renseignée')}</p>
      <p>
        <strong>Disponibilité :</strong>
        <span class="badge ${classeStatut}">${statut}</span>
      </p>
    </div>

    <div class="resume-livre">
      <strong>Résumé</strong>
      <p>${echapperHtml(livre.resume || 'Aucun résumé renseigné.')}</p>
    </div>

    <div id="zone-emprunt" class="actions"></div>
    <p id="message-emprunt" class="message"></p>
  `;

  if (livre.disponible) {
    ajouterBoutonEmprunt(livre);
  } else {
    const zone = document.getElementById('zone-emprunt');

    if (zone) {
      zone.innerHTML = `
        <span class="indisponible">
          Ce livre est actuellement emprunté ou indisponible.
        </span>
      `;
    }
  }
}

function ajouterBoutonEmprunt(livre) {
  const zone = document.getElementById('zone-emprunt');

  if (!zone) return;

  const bouton = document.createElement('button');
  bouton.textContent = 'Demander cet emprunt';
  bouton.type = 'button';

  bouton.addEventListener('click', async () => {
    const message = document.getElementById('message-emprunt');

    if (message) {
      message.textContent = '';
      message.className = 'message';
    }

    const info = await getUtilisateurCourant();

    if (!info || !info.user) {
      if (message) {
        message.textContent = 'Connectez-vous avant de demander un emprunt.';
        message.classList.add('error');
      }

      return;
    }

    if (!info.profil || info.profil.status !== 'active') {
      if (message) {
        message.textContent =
          "Votre compte doit être validé par un administrateur avant tout emprunt.";
        message.classList.add('error');
      }

      return;
    }

    bouton.disabled = true;

    const { error } = await supabase
      .from('emprunts')
      .insert({
        user_id: info.user.id,
        livre_id: livre.id,
        statut: 'pending'
      });

    bouton.disabled = false;

    if (error) {
      console.error('Erreur demande emprunt :', error);

      if (message) {
        message.textContent =
          "Erreur : votre demande d'emprunt n'a pas été envoyée.";
        message.classList.add('error');
      }

      return;
    }

    if (message) {
      message.textContent =
        "Demande envoyée. Un administrateur choisira la date de retour et acceptera ou refusera l'emprunt.";
      message.classList.add('success');
    }

    bouton.remove();
  });

  zone.appendChild(bouton);
}
