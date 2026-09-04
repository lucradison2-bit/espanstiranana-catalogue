// js/administration.js
import { supabase } from './config.js';
import { verifierAdmin } from './commun.js';

const JOURS_PRET_PAR_DEFAUT = 14;

export async function initAdministration() {
  const estAdmin = await verifierAdmin();

  if (!estAdmin) {
    return;
  }

  document.getElementById('contenu-admin')?.classList.remove('hidden');

  installerEvenements();
  await chargerComptesEnAttente();
  await chargerDemandes();
  await chargerLivres();
}

function installerEvenements() {
  document
    .getElementById('form-ajout-livre')
    ?.addEventListener('submit', ajouterLivre);

  document
    .querySelector('#table-comptes tbody')
    ?.addEventListener('click', gererCompte);

  document
    .querySelector('#table-demandes tbody')
    ?.addEventListener('click', gererEmprunt);

  document
    .querySelector('#table-livres tbody')
    ?.addEventListener('click', gererLivre);

  document
    .getElementById('btn-fermer-qr')
    ?.addEventListener('click', fermerQr);

  document
    .getElementById('btn-telecharger-qr')
    ?.addEventListener('click', telechargerQr);

  document
    .getElementById('btn-imprimer-qr')
    ?.addEventListener('click', imprimerQr);

  document
    .getElementById('modal-qr')
    ?.addEventListener('click', (event) => {
      if (event.target.id === 'modal-qr') {
        fermerQr();
      }
    });
}

function echapperHtml(texte) {
  const element = document.createElement('div');
  element.textContent = texte || '';
  return element.innerHTML;
}

function formatDate(date) {
  if (!date) return '-';

  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function dateDans14Jours() {
  const date = new Date();
  date.setDate(date.getDate() + JOURS_PRET_PAR_DEFAUT);
  return date.toISOString().slice(0, 10);
}

function convertirDateInput(dateInput) {
  if (!dateInput) return null;
  return new Date(`${dateInput}T12:00:00`).toISOString();
}

function construireLienLivre(livreId) {
  const base = window.location.href.split('/').slice(0, -1).join('/');
  return `${base}/livre.html?id=${encodeURIComponent(livreId)}`;
}

async function chargerComptesEnAttente() {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      first_name,
      last_name,
      carte_identite,
      carte_etudiant,
      status,
      created_at
    `)
    .eq('role', 'user')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const tbody = document.querySelector('#table-comptes tbody');

  if (!tbody) return;

  if (error) {
    console.error('Erreur comptes :', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="5">Impossible de charger les comptes en attente.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">Aucun compte en attente de validation.</td>
      </tr>
    `;
    return;
  }

  for (const profil of data) {
    const nom = `${profil.first_name || ''} ${profil.last_name || ''}`.trim();

    tbody.insertAdjacentHTML(
      'beforeend',
      `
        <tr>
          <td>${echapperHtml(nom || '-')}</td>
          <td>${echapperHtml(profil.email)}</td>
          <td>${echapperHtml(profil.carte_identite || '-')}</td>
          <td>${echapperHtml(profil.carte_etudiant || '-')}</td>
          <td>
            <button class="btn-accept" data-action="activate-account" data-id="${profil.id}">
              Accepter
            </button>
            <button class="btn-reject" data-action="reject-account" data-id="${profil.id}">
              Refuser
            </button>
          </td>
        </tr>
      `
    );
  }
}

async function gererCompte(event) {
  const bouton = event.target.closest('button[data-action]');

  if (!bouton) return;

  const profilId = bouton.dataset.id;
  const action = bouton.dataset.action;

  bouton.disabled = true;

  try {
    if (action === 'activate-account') {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', profilId);

      if (error) throw error;

      alert('Compte accepté et activé.');
    }

    if (action === 'reject-account') {
      const confirmation = confirm('Refuser ce compte ?');

      if (!confirmation) {
        bouton.disabled = false;
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', profilId);

      if (error) throw error;

      alert('Compte refusé.');
    }

    await chargerComptesEnAttente();
  } catch (error) {
    console.error('Erreur validation compte :', error);
    alert("Impossible de modifier l'état du compte.");
  } finally {
    bouton.disabled = false;
  }
}

async function chargerDemandes() {
  const { data, error } = await supabase
    .from('emprunts')
    .select(`
      id,
      livre_id,
      statut,
      date_demande,
      date_emprunt,
      date_retour_prevu,
      date_retour_reel,
      penalite,
      statut_penalite,
      profiles (
        first_name,
        last_name,
        email
      ),
      livres (
        titre,
        auteur
      )
    `)
    .order('date_demande', { ascending: false });

  const tbody = document.querySelector('#table-demandes tbody');

  if (!tbody) return;

  if (error) {
    console.error('Erreur emprunts :', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="7">Impossible de charger les emprunts.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">Aucune demande d'emprunt.</td>
      </tr>
    `;
    return;
  }

  for (const emprunt of data) {
    const profil = emprunt.profiles;
    const livre = emprunt.livres;

    const utilisateur =
      `${profil?.first_name || ''} ${profil?.last_name || ''}`.trim() ||
      profil?.email ||
      'Utilisateur inconnu';

    let actions = '';

    if (emprunt.statut === 'pending') {
      actions = `
        <label class="table-label">
          Retour prévu
          <input
            type="date"
            class="input-date-retour"
            data-date-id="${emprunt.id}"
            value="${dateDans14Jours()}"
          />
        </label>

        <button
          class="btn-accept"
          data-action="accept-loan"
          data-id="${emprunt.id}"
          data-livre-id="${emprunt.livre_id}"
        >
          Accepter
        </button>

        <button
          class="btn-reject"
          data-action="reject-loan"
          data-id="${emprunt.id}"
        >
          Refuser
        </button>
      `;
    }

    if (emprunt.statut === 'approved' || emprunt.statut === 'overdue') {
      actions = `
        <p class="small-info">
          Retour prévu : <strong>${formatDate(emprunt.date_retour_prevu)}</strong>
        </p>

        <label class="table-label">
          Pénalité (Ar)
          <input
            type="number"
            min="0"
            step="100"
            class="input-penalite"
            data-penalite-id="${emprunt.id}"
            value="${Number(emprunt.penalite || 0)}"
          />
        </label>

        <button
          class="btn-return"
          data-action="return-loan"
          data-id="${emprunt.id}"
          data-livre-id="${emprunt.livre_id}"
        >
          Livre retourné
        </button>
      `;
    }

    if (emprunt.statut === 'returned' && Number(emprunt.penalite) > 0) {
      actions = `
        <p class="small-info">
          Pénalité : <strong>${Number(emprunt.penalite).toLocaleString('fr-FR')} Ar</strong>
        </p>

        <p class="small-info">
          Statut : <strong>${echapperHtml(emprunt.statut_penalite)}</strong>
        </p>

        ${
          emprunt.statut_penalite !== 'paid'
            ? `
              <button
                class="btn-accept"
                data-action="pay-penalty"
                data-id="${emprunt.id}"
              >
                Marquer payée
              </button>
            `
            : ''
        }
      `;
    }

    if (emprunt.statut === 'rejected') {
      actions = '<span class="small-info">Demande refusée.</span>';
    }

    tbody.insertAdjacentHTML(
      'beforeend',
      `
        <tr>
          <td>${echapperHtml(utilisateur)}</td>
          <td>${echapperHtml(livre?.titre || 'Livre introuvable')}</td>
          <td>${formatDate(emprunt.date_demande)}</td>
          <td>
            <span class="badge badge-${echapperHtml(emprunt.statut)}">
              ${echapperHtml(emprunt.statut)}
            </span>
          </td>
          <td>${formatDate(emprunt.date_retour_prevu)}</td>
          <td>
            ${
              Number(emprunt.penalite) > 0
                ? `${Number(emprunt.penalite).toLocaleString('fr-FR')} Ar`
                : '-'
            }
          </td>
          <td class="actions-cell">${actions}</td>
        </tr>
      `
    );
  }
}

async function gererEmprunt(event) {
  const bouton = event.target.closest('button[data-action]');

  if (!bouton) return;

  const action = bouton.dataset.action;
  const empruntId = bouton.dataset.id;
  const livreId = bouton.dataset.livreId;

  bouton.disabled = true;

  try {
    if (action === 'accept-loan') {
      const inputDate = document.querySelector(
        `.input-date-retour[data-date-id="${empruntId}"]`
      );

      const dateRetourPrevu = convertirDateInput(inputDate?.value);

      if (!dateRetourPrevu) {
        throw new Error('Choisissez une date de retour prévue.');
      }

      const { error: erreurEmprunt } = await supabase
        .from('emprunts')
        .update({
          statut: 'approved',
          date_emprunt: new Date().toISOString(),
          date_retour_prevu: dateRetourPrevu
        })
        .eq('id', empruntId);

      if (erreurEmprunt) throw erreurEmprunt;

      const { error: erreurLivre } = await supabase
        .from('livres')
        .update({ disponible: false })
        .eq('id', livreId);

      if (erreurLivre) throw erreurLivre;

      alert('Emprunt accepté. Le livre est maintenant indisponible.');
    }

    if (action === 'reject-loan') {
      const confirmation = confirm("Refuser cette demande d'emprunt ?");

      if (!confirmation) {
        bouton.disabled = false;
        return;
      }

      const { error } = await supabase
        .from('emprunts')
        .update({ statut: 'rejected' })
        .eq('id', empruntId);

      if (error) throw error;

      alert('Demande refusée.');
    }

    if (action === 'return-loan') {
      const inputPenalite = document.querySelector(
        `.input-penalite[data-penalite-id="${empruntId}"]`
      );

      const penalite = Number(inputPenalite?.value || 0);

      if (penalite < 0) {
        throw new Error('La pénalité ne peut pas être négative.');
      }

      const { error: erreurEmprunt } = await supabase
        .from('emprunts')
        .update({
          statut: 'returned',
          date_retour_reel: new Date().toISOString(),
          penalite,
          statut_penalite: penalite > 0 ? 'pending' : 'none'
        })
        .eq('id', empruntId);

      if (erreurEmprunt) throw erreurEmprunt;

      const { error: erreurLivre } = await supabase
        .from('livres')
        .update({ disponible: true })
        .eq('id', livreId);

      if (erreurLivre) throw erreurLivre;

      alert('Retour enregistré. Le livre est disponible de nouveau.');
    }

    if (action === 'pay-penalty') {
      const confirmation = confirm('Confirmer le paiement de la pénalité ?');

      if (!confirmation) {
        bouton.disabled = false;
        return;
      }

      const { error } = await supabase
        .from('emprunts')
        .update({ statut_penalite: 'paid' })
        .eq('id', empruntId);

      if (error) throw error;

      alert('Pénalité marquée comme payée.');
    }

    await chargerDemandes();
    await chargerLivres();
  } catch (error) {
    console.error('Erreur action emprunt :', error);
    alert(error.message || "L'action n'a pas pu être enregistrée.");
  } finally {
    bouton.disabled = false;
  }
}

async function ajouterLivre(event) {
  event.preventDefault();

  const titre = document.getElementById('livre-titre').value.trim();
  const auteur = document.getElementById('livre-auteur').value.trim();
  const resume = document.getElementById('livre-resume').value.trim();
  const numeroRef = document.getElementById('livre-ref').value.trim();
  const categorie = document.getElementById('livre-categorie').value.trim();

  if (!titre || !numeroRef) {
    alert('Le titre et la référence unique sont obligatoires.');
    return;
  }

  const { error } = await supabase
    .from('livres')
    .insert({
      titre,
      auteur: auteur || null,
      resume: resume || null,
      numero_ref: numeroRef,
      categorie: categorie || null,
      disponible: true
    });

  if (error) {
    console.error('Erreur ajout livre :', error);

    if (error.message.toLowerCase().includes('duplicate')) {
      alert('Cette référence existe déjà. Choisis une référence unique.');
      return;
    }

    alert("Impossible d'ajouter ce livre.");
    return;
  }

  event.target.reset();
  await chargerLivres();
  alert('Livre ajouté. Tu peux maintenant générer et imprimer son QR code.');
}

async function chargerLivres() {
  const { data, error } = await supabase
    .from('livres')
    .select('*')
    .order('created_at', { ascending: false });

  const tbody = document.querySelector('#table-livres tbody');

  if (!tbody) return;

  if (error) {
    console.error('Erreur livres :', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="7">Impossible de charger les livres.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">Aucun livre enregistré.</td>
      </tr>
    `;
    return;
  }

  for (const livre of data) {
    tbody.insertAdjacentHTML(
      'beforeend',
      `
        <tr>
          <td>${echapperHtml(livre.titre)}</td>
          <td>${echapperHtml(livre.auteur || '-')}</td>
          <td>${echapperHtml(livre.numero_ref || '-')}</td>
          <td>${echapperHtml(livre.categorie || '-')}</td>
          <td>
            <span class="badge ${livre.disponible ? 'badge-active' : 'badge-rejected'}">
              ${livre.disponible ? 'Disponible' : 'Indisponible'}
            </span>
          </td>
          <td>
            <button
              class="btn-return"
              data-action="show-qr"
              data-id="${livre.id}"
              data-titre="${encodeURIComponent(livre.titre)}"
              data-ref="${encodeURIComponent(livre.numero_ref || '')}"
            >
              Afficher QR
            </button>
          </td>
          <td>
            <button
              class="btn-delete"
              data-action="delete-book"
              data-id="${livre.id}"
            >
              Supprimer
            </button>
          </td>
        </tr>
      `
    );
  }
}

async function gererLivre(event) {
  const bouton = event.target.closest('button[data-action]');

  if (!bouton) return;

  const action = bouton.dataset.action;

  if (action === 'show-qr') {
    const titre = decodeURIComponent(bouton.dataset.titre || '');
    const reference = decodeURIComponent(bouton.dataset.ref || '');
    afficherQr(bouton.dataset.id, titre, reference);
    return;
  }

  if (action === 'delete-book') {
    const confirmation = confirm(
      'Voulez-vous supprimer définitivement ce livre ?'
    );

    if (!confirmation) return;

    bouton.disabled = true;

    const { error } = await supabase
      .from('livres')
      .delete()
      .eq('id', bouton.dataset.id);

    if (error) {
      console.error('Erreur suppression :', error);
      alert(
        "Impossible de supprimer ce livre. Il est peut-être lié à un emprunt."
      );
      bouton.disabled = false;
      return;
    }

    await chargerLivres();
  }
}

function afficherQr(livreId, titre, reference) {
  const modal = document.getElementById('modal-qr');
  const qrContainer = document.getElementById('qrcode-container');
  const qrTitre = document.getElementById('qr-titre');
  const qrReference = document.getElementById('qr-reference');

  if (!modal || !qrContainer || typeof QRCode === 'undefined') {
    alert("La bibliothèque de QR code n'est pas chargée.");
    return;
  }

  qrTitre.textContent = titre || 'QR code du livre';
  qrReference.textContent = reference
    ? `Référence : ${reference}`
    : 'Référence non renseignée';

  qrContainer.innerHTML = '';

  new QRCode(qrContainer, {
    text: construireLienLivre(livreId),
    width: 260,
    height: 260,
    colorDark: '#0b2d45',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });

  modal.dataset.titreLivre = titre || 'livre';
  modal.dataset.referenceLivre = reference || 'reference';
  modal.classList.remove('hidden');
}

function fermerQr() {
  document.getElementById('modal-qr')?.classList.add('hidden');
  document.getElementById('qrcode-container').replaceChildren();
}

function telechargerQr() {
  const imageQr = document.querySelector('#qrcode-container img');

  if (!imageQr) {
    alert("Le QR code n'est pas encore généré.");
    return;
  }

  const modal = document.getElementById('modal-qr');
  const titre = (modal?.dataset.titreLivre || 'livre')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();

  const lien = document.createElement('a');
  lien.href = imageQr.src;
  lien.download = `qr_code_${titre}.png`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
}

function imprimerQr() {
  const imageQr = document.querySelector('#qrcode-container img');
  const titre = document.getElementById('qr-titre')?.textContent || 'Livre';
  const reference = document.getElementById('qr-reference')?.textContent || '';

  if (!imageQr) {
    alert("Le QR code n'est pas encore généré.");
    return;
  }

  const fenetre = window.open('', '_blank', 'width=700,height=700');

  if (!fenetre) {
    alert("Le navigateur a bloqué la fenêtre d'impression.");
    return;
  }

  fenetre.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>QR code - ${echapperHtml(titre)}</title>
        <style>
          body {
            margin: 0;
            padding: 35px;
            color: #0b2d45;
            font-family: Arial, sans-serif;
            text-align: center;
          }

          h1 {
            margin-bottom: 8px;
            font-size: 22px;
          }

          p {
            color: #465b6a;
          }

          img {
            width: 300px;
            height: 300px;
            margin: 25px auto;
            image-rendering: pixelated;
          }

          .instruction {
            margin-top: 20px;
            font-size: 13px;
          }

          @media print {
            body {
              padding: 10px;
            }
          }
        </style>
      </head>
      <body>
        <h1>${echapperHtml(titre)}</h1>
        <p>${echapperHtml(reference)}</p>
        <img src="${imageQr.src}" alt="QR code du livre">
        <p class="instruction">
          Scannez ce QR code pour consulter ce livre et demander un emprunt.
        </p>
      </body>
    </html>
  `);

  fenetre.document.close();
  fenetre.focus();

  setTimeout(() => {
    fenetre.print();
  }, 400);
                    }
