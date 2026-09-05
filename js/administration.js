import { supabase } from './config.js';
import { verifierAdmin, getUtilisateurCourant } from './commun.js';

const echapper = (texte) => {
  const div = document.createElement('div');
  div.textContent = texte || '';
  return div.innerHTML;
};

const formaterDate = (date) =>
  date ? new Date(date).toLocaleDateString('fr-FR') : '-';

const dateDans14Jours = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
};

const convertirDateISO = (date) =>
  date ? new Date(`${date}T12:00:00`).toISOString() : null;

export async function initAdministration() {
  if (!(await verifierAdmin())) return;

  document.querySelector('#contenu-admin').classList.remove('hidden');

  installerEvenements();

  await Promise.all([
    chargerComptes(),
    chargerEmprunts(),
    chargerLivres()
  ]);
}

function installerEvenements() {
  document.querySelector('#table-comptes tbody').onclick = actionCompte;
  document.querySelector('#table-emprunts tbody').onclick = actionEmprunt;
  document.querySelector('#table-livres tbody').onclick = actionLivre;

  document.querySelector('#form-ajout-livre').onsubmit = ajouterLivre;

  document.querySelector('#btn-fermer-qr').onclick = fermerQR;
  document.querySelector('#btn-telecharger-qr').onclick = telechargerQR;
  document.querySelector('#btn-imprimer-qr').onclick = imprimerQR;
}

async function chargerComptes() {
  const tbody = document.querySelector('#table-comptes tbody');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'user')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    tbody.innerHTML =
      '<tr><td colspan="5">Erreur lors du chargement des comptes.</td></tr>';
    return;
  }

  tbody.innerHTML = data.length
    ? ''
    : '<tr><td colspan="5">Aucun compte à valider.</td></tr>';

  data.forEach((profil) => {
    const nom =
      `${profil.first_name || ''} ${profil.last_name || ''}`.trim() ||
      profil.last_name ||
      '-';

    tbody.insertAdjacentHTML(
      'beforeend',
      `
      <tr>
        <td>${echapper(nom)}</td>
        <td>${echapper(profil.email)}</td>
        <td>${echapper(profil.carte_identite || '-')}</td>
        <td>${echapper(profil.carte_etudiant || '-')}</td>

        <td>
          <button
            class="btn-accept"
            data-action="accepter-compte"
            data-id="${profil.id}"
          >
            Accepter
          </button>

          <button
            class="btn-reject"
            data-action="refuser-compte"
            data-id="${profil.id}"
          >
            Refuser
          </button>
        </td>
      </tr>
      `
    );
  });
}

async function actionCompte(event) {
  const bouton = event.target.closest('button[data-action]');

  if (!bouton) return;

  const action = bouton.dataset.action;
  const id = bouton.dataset.id;

  if (
    action === 'refuser-compte' &&
    !confirm('Voulez-vous refuser ce compte ?')
  ) {
    return;
  }

  const status =
    action === 'accepter-compte' ? 'active' : 'rejected';

  const { error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', id);

  if (error) {
    alert('Erreur lors de la mise à jour du compte.');
  }

  await chargerComptes();
}

async function chargerEmprunts() {
  const tbody = document.querySelector('#table-emprunts tbody');

  const { data, error } = await supabase
    .from('emprunts')
    .select(`
      *,
      profiles(first_name, last_name, email),
      livres(titre)
    `)
    .order('date_demande', { ascending: false });

  if (error) {
    tbody.innerHTML =
      '<tr><td colspan="6">Erreur lors du chargement des emprunts.</td></tr>';
    return;
  }

  tbody.innerHTML = data.length
    ? ''
    : '<tr><td colspan="6">Aucun emprunt.</td></tr>';

  data.forEach((emprunt) => {
    const utilisateur =
      `${emprunt.profiles?.first_name || ''} ${
        emprunt.profiles?.last_name || ''
      }`.trim() ||
      emprunt.profiles?.email ||
      '-';

    const dateRetour = emprunt.date_retour_prevu
      ? new Date(emprunt.date_retour_prevu).toISOString().slice(0, 10)
      : dateDans14Jours();

    let actions = '-';

    if (emprunt.statut === 'pending') {
      actions = `
        <label class="table-label">
          Date retour
          <input
            class="input-date"
            data-id="${emprunt.id}"
            type="date"
            value="${dateRetour}"
          >
        </label>

        <button
          class="btn-accept"
          data-action="accepter-emprunt"
          data-id="${emprunt.id}"
          data-livre="${emprunt.livre_id}"
        >
          Accepter
        </button>

        <button
          class="btn-reject"
          data-action="refuser-emprunt"
          data-id="${emprunt.id}"
        >
          Refuser
        </button>
      `;
    }

    if (emprunt.statut === 'approved') {
      actions = `
        <label class="table-label">
          Modifier date
          <input
            class="input-date"
            data-id="${emprunt.id}"
            type="date"
            value="${dateRetour}"
          >
        </label>

        <button
          class="btn-return"
          data-action="sauver-date"
          data-id="${emprunt.id}"
        >
          Enregistrer
        </button>

        <label class="table-label">
          Pénalité Ar
          <input
            class="input-penalite"
            data-id="${emprunt.id}"
            type="number"
            min="0"
            value="${Number(emprunt.penalite || 0)}"
          >
        </label>

        <button
          class="btn-return"
          data-action="retour-livre"
          data-id="${emprunt.id}"
          data-livre="${emprunt.livre_id}"
        >
          Livre retourné
        </button>
      `;
    }

    if (
      emprunt.statut === 'returned' &&
      Number(emprunt.penalite) > 0 &&
      emprunt.statut_penalite !== 'paid'
    ) {
      actions = `
        <button
          class="btn-accept"
          data-action="payer-penalite"
          data-id="${emprunt.id}"
        >
          Pénalité payée
        </button>
      `;
    }

    tbody.insertAdjacentHTML(
      'beforeend',
      `
      <tr>
        <td>${echapper(utilisateur)}</td>
        <td>${echapper(emprunt.livres?.titre || '-')}</td>

        <td>
          <span class="badge badge-${emprunt.statut}">
            ${emprunt.statut}
          </span>
        </td>

        <td>${formaterDate(emprunt.date_retour_prevu)}</td>

        <td>
          ${
            Number(emprunt.penalite || 0) > 0
              ? `${emprunt.penalite} Ar`
              : '-'
          }
        </td>

        <td class="actions-cell">${actions}</td>
      </tr>
      `
    );
  });
}

async function actionEmprunt(event) {
  const bouton = event.target.closest('button[data-action]');

  if (!bouton) return;

  const action = bouton.dataset.action;
  const id = bouton.dataset.id;
  const livreId = bouton.dataset.livre;

  try {
    if (action === 'accepter-emprunt') {
      const date = document.querySelector(
        `.input-date[data-id="${id}"]`
      )?.value;

      if (!date) {
        alert('Choisissez une date de retour.');
        return;
      }

      let resultat = await supabase
        .from('emprunts')
        .update({
          statut: 'approved',
          date_emprunt: new Date().toISOString(),
          date_retour_prevu: convertirDateISO(date)
        })
        .eq('id', id);

      if (resultat.error) throw resultat.error;

      resultat = await supabase
        .from('livres')
        .update({ disponible: false })
        .eq('id', livreId);

      if (resultat.error) throw resultat.error;
    }

    if (action === 'refuser-emprunt') {
      if (!confirm('Voulez-vous refuser cet emprunt ?')) return;

      const { error } = await supabase
        .from('emprunts')
        .update({ statut: 'rejected' })
        .eq('id', id);

      if (error) throw error;
    }

    if (action === 'sauver-date') {
      const date = document.querySelector(
        `.input-date[data-id="${id}"]`
      )?.value;

      const { error } = await supabase
        .from('emprunts')
        .update({
          date_retour_prevu: convertirDateISO(date)
        })
        .eq('id', id);

      if (error) throw error;
    }

    if (action === 'retour-livre') {
      const penalite = Number(
        document.querySelector(
          `.input-penalite[data-id="${id}"]`
        )?.value || 0
      );

      let resultat = await supabase
        .from('emprunts')
        .update({
          statut: 'returned',
          date_retour_reel: new Date().toISOString(),
          penalite,
          statut_penalite: penalite > 0 ? 'pending' : 'none'
        })
        .eq('id', id);

      if (resultat.error) throw resultat.error;

      resultat = await supabase
        .from('livres')
        .update({ disponible: true })
        .eq('id', livreId);

      if (resultat.error) throw resultat.error;
    }

    if (action === 'payer-penalite') {
      const { error } = await supabase
        .from('emprunts')
        .update({ statut_penalite: 'paid' })
        .eq('id', id);

      if (error) throw error;
    }

    await Promise.all([
      chargerEmprunts(),
      chargerLivres()
    ]);
  } catch (error) {
    console.error('Erreur action emprunt:', error);
    alert("L'action a échoué.");
  }
}

async function ajouterLivre(event) {
  event.preventDefault();

  const livre = {
    titre: document.querySelector('#livre-titre').value.trim(),
    auteur: document.querySelector('#livre-auteur').value.trim() || null,
    numero_ref: document.querySelector('#livre-ref').value.trim(),
    categorie:
      document.querySelector('#livre-categorie').value.trim() || null,
    resume: document.querySelector('#livre-resume').value.trim() || null,
    disponible: true
  };

  const { error } = await supabase
    .from('livres')
    .insert(livre);

  const message = document.querySelector('#message-livre');

  if (error) {
    message.textContent =
      'Erreur : référence déjà utilisée ou accès refusé.';
    message.className = 'message error';
    return;
  }

  message.textContent = 'Livre ajouté avec succès.';
  message.className = 'message success';

  event.target.reset();

  await chargerLivres();
}

async function chargerLivres() {
  const tbody = document.querySelector('#table-livres tbody');

  const { data, error } = await supabase
    .from('livres')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    tbody.innerHTML =
      '<tr><td colspan="7">Erreur lors du chargement des livres.</td></tr>';
    return;
  }

  tbody.innerHTML = data.length
    ? ''
    : '<tr><td colspan="7">Aucun livre enregistré.</td></tr>';

  data.forEach((livre) => {
    tbody.insertAdjacentHTML(
      'beforeend',
      `
      <tr>
        <td>${echapper(livre.titre)}</td>
        <td>${echapper(livre.auteur || '-')}</td>
        <td>${echapper(livre.numero_ref)}</td>
        <td>${echapper(livre.categorie || '-')}</td>

        <td>
          <span class="badge ${
            livre.disponible ? 'badge-active' : 'badge-rejected'
          }">
            ${livre.disponible ? 'Disponible' : 'Indisponible'}
          </span>
        </td>

        <td>
          <button
            class="btn-return"
            data-action="qr"
            data-id="${livre.id}"
            data-titre="${encodeURIComponent(livre.titre)}"
            data-reference="${encodeURIComponent(livre.numero_ref)}"
          >
            QR
          </button>
        </td>

        <td>
          <button
            class="btn-delete"
            data-action="supprimer-livre"
            data-id="${livre.id}"
          >
            Supprimer
          </button>
        </td>
      </tr>
      `
    );
  });
}

async function actionLivre(event) {
  const bouton = event.target.closest('button[data-action]');

  if (!bouton) return;

  if (bouton.dataset.action === 'qr') {
    afficherQR(
      bouton.dataset.id,
      decodeURIComponent(bouton.dataset.titre),
      decodeURIComponent(bouton.dataset.reference)
    );

    return;
  }

  if (bouton.dataset.action === 'supprimer-livre') {
    if (!confirm('Voulez-vous supprimer ce livre ?')) return;

    const { error } = await supabase
      .from('livres')
      .delete()
      .eq('id', bouton.dataset.id);

    if (error) {
      alert(
        'Impossible de supprimer ce livre. Il est peut-être lié à un emprunt.'
      );
    }

    await chargerLivres();
  }
}

function afficherQR(id, titre, reference) {
  if (typeof QRCode === 'undefined') {
    alert('La bibliothèque QR code ne peut pas être chargée.');
    return;
  }

  document.querySelector('#qr-titre').textContent = titre;
  document.querySelector('#qr-reference').textContent =
    `Référence : ${reference}`;

  const conteneur = document.querySelector('#qrcode-container');
  conteneur.innerHTML = '';

  const lienLivre =
    `${location.origin}${location.pathname.replace(
      'administration.html',
      'livre.html'
    )}?id=${encodeURIComponent(id)}`;

  new QRCode(conteneur, {
    text: lienLivre,
    width: 250,
    height: 250,
    colorDark: '#0284c7',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });

  document.querySelector('#modal-qr').classList.remove('hidden');
}

function fermerQR() {
  document.querySelector('#modal-qr').classList.add('hidden');
  document.querySelector('#qrcode-container').innerHTML = '';
}

function telechargerQR() {
  const image = document.querySelector('#qrcode-container img');

  if (!image) return;

  const lien = document.createElement('a');
  lien.href = image.src;
  lien.download = 'qr-code-livre.png';
  lien.click();
}

function imprimerQR() {
  const image = document.querySelector('#qrcode-container img');

  if (!image) return;

  const fenetre = window.open('', '_blank');

  fenetre.document.write(`
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>QR code</title>
      </head>

      <body style="text-align:center;font-family:Arial,sans-serif">
        <h2>${document.querySelector('#qr-titre').textContent}</h2>
        <p>${document.querySelector('#qr-reference').textContent}</p>
        <img src="${image.src}" style="width:280px">
        <p>Scannez pour consulter ce livre.</p>
      </body>
    </html>
  `);

  fenetre.document.close();

  setTimeout(() => fenetre.print(), 400);
                         }
