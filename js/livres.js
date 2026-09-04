import { supabase } from './config.js';
import { getUtilisateurCourant } from './auth.js';

const echapper = (texte) => {
  const div = document.createElement('div');
  div.textContent = texte || '';
  return div.innerHTML;
};

function afficherMessage(texte, classe = '') {
  const zone = document.querySelector('#message-ref');

  if (!zone) return;

  zone.textContent = texte;
  zone.className = `message ${classe}`;
}

export async function afficherLivre() {
  const id = new URLSearchParams(location.search).get('id');

  if (!id) return;

  const { data: livre, error } = await supabase
    .from('livres')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !livre) {
    afficherMessage('Livre introuvable.', 'error');
    return;
  }

  afficherFicheLivre(livre);
}

export async function ouvrirLivreParReference(reference) {
  if (!reference) {
    afficherMessage('Saisissez une référence.', 'error');
    return;
  }

  const { data: livre, error } = await supabase
    .from('livres')
    .select('*')
    .eq('numero_ref', reference.trim())
    .single();

  if (error || !livre) {
    afficherMessage(
      'Aucun livre ne correspond à cette référence.',
      'error'
    );
    return;
  }

  afficherMessage(`Livre trouvé : ${livre.titre}`, 'success');

  history.replaceState(
    {},
    '',
    `livre.html?id=${encodeURIComponent(livre.id)}`
  );

  afficherFicheLivre(livre);
}

function afficherFicheLivre(livre) {
  const contenu = document.querySelector('#contenu-livre');

  contenu.classList.remove('hidden');

  contenu.innerHTML = `
    <p class="eyebrow blue">Informations du livre</p>

    <h2>${echapper(livre.titre)}</h2>

    <div class="details-grid">
      <p><b>Auteur :</b> ${echapper(livre.auteur || '-')}</p>
      <p><b>Catégorie :</b> ${echapper(livre.categorie || '-')}</p>
      <p><b>Référence :</b> ${echapper(livre.numero_ref || '-')}</p>

      <p>
        <b>Disponibilité :</b>
        <span class="badge ${
          livre.disponible ? 'badge-active' : 'badge-rejected'
        }">
          ${livre.disponible ? 'Disponible' : 'Indisponible'}
        </span>
      </p>
    </div>

    <div class="summary-box">
      <b>Résumé</b>
      <p>${echapper(livre.resume || 'Aucun résumé renseigné.')}</p>
    </div>

    <div id="zone-emprunt" class="button-row"></div>

    <p id="message-emprunt" class="message"></p>
  `;

  const zoneEmprunt = document.querySelector('#zone-emprunt');

  if (!livre.disponible) {
    zoneEmprunt.innerHTML =
      '<span class="error">Livre indisponible actuellement.</span>';
    return;
  }

  const bouton = document.createElement('button');
  bouton.textContent = "Demander l'emprunt";

  bouton.onclick = async () => {
    const message = document.querySelector('#message-emprunt');
    const info = await getUtilisateurCourant();

    if (!info?.user) {
      message.textContent =
        'Connectez-vous avant de demander un emprunt.';
      message.className = 'message error';
      return;
    }

    if (!info.profil || info.profil.status !== 'active') {
      message.textContent =
        "Votre compte doit être validé par un administrateur.";
      message.className = 'message error';
      return;
    }

    const { error } = await supabase.from('emprunts').insert({
      user_id: info.user.id,
      livre_id: livre.id,
      statut: 'pending'
    });

    if (error) {
      message.textContent = "Impossible d'envoyer la demande.";
      message.className = 'message error';
      console.error(error);
      return;
    }

    message.textContent =
      "Demande envoyée. L'administrateur choisira la date de retour.";
    message.className = 'message success';

    bouton.remove();
  };

  zoneEmprunt.append(bouton);
}
