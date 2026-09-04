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

  await Promise.all([
    chargerComptesEnAttente(),
    chargerDemandes(),
    chargerLivres()
  ]);
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
  if (!date) {
    return '-';
  }

  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function dateInputDans14Jours() {
  const date = new Date();
  date.setDate(date.getDate() + JOURS_PRET_PAR_DEFAUT);
  return date.toISOString().slice(0, 10);
}

function dateVersInput(date) {
  if (!date) {
    return dateInputDans14Jours();
  }

  return new Date(date).toISOString().slice(0, 10);
}

function convertirDateInput(dateInput) {
  if (!dateInput) {
    return null;
  }

  return new Date(`${dateInput}T12:00:00`).toISOString();
}

function afficherMessageLivre(message, type = '') {
  const zoneMessage = document.getElementById('message-livre');

  if (!zoneMessage) {
    return;
  }

  zoneMessage.textContent = message;
  zoneMessage.className = `message ${type}`.trim();
}

function construireLienLivre(livreId) {
  const urlActuelle = new URL(window.location.href);

  return `${urlActuelle.origin}${urlActuelle.pathname.replace(
    'administration.html',
    'livre.html'
  )}?id=${encodeURIComponent(livreId)}`;
}

/* =========================================================
   COMPTES UTILISATEURS
   ========================================================= */

async function chargerComptesEnAttente() {
  const tbody = document.querySelector('#table-comptes tbody');

  if (!tbody) {
    return;
  }

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

  if (error) {
    console.error('Erreur comptes en attente :', error);

    tbody.innerHTML = `
      <tr>
        <td colspan="5">Impossible de charger les comptes.</td>
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
    const nomComplet =
      `${profil.first_name || ''} ${profil.last_name || ''}`.trim() || '-';

    tbody.insertAdjacentHTML(
      'beforeend',
      `
        <tr>
          <td>${echapperHtml(nomComplet)}</td>
          <td>${echapperHtml(profil.email)}</td>
          <td>${echapperHtml(profil.carte_identite || '-')}</td>
          <td>${echapperHtml(profil.carte_etudiant || '-')}</td>
          <td>
            <button
              type="button"
              class="btn-accept"
              data-action="accepter-compte"
              data-id="${profil.id}"
            >
              Accepter
            </button>

            <button
              type="button"
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
  }
}

async function gererCompte(event) {
  const bouton = event.target.closest('button[data-action]');

  if (!bouton) {
    return;
  }

  const profilId = bouton.dataset.id;
  const action = bouton.dataset.action;

  bouton.disabled = true;

  try {
    if (action === 'accepter-compte') {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', profilId);

      if (error) {
        throw error;
      }

      alert('Compte utilisateur accepté et activé.');
    }

    if (action === 'refuser-compte') {
      const confirmation = confirm(
        'Voulez-vous vraiment refuser ce compte utilisateur ?'
      );

      if (!confirmation) {
        bouton.disabled = false;
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', profilId);

      if (error) {
        throw error;
      }

      alert('Compte utilisateur refusé.');
    }

    await chargerComptesEnAttente();
  } catch (error) {
    console.error('Erreur compte utilisateur :', error);
    alert("Impossible de modifier l'état du compte.");
  } finally {
    bouton.disabled = false;
  }
}

/* =========================================================
   EMPRUNTS, DATE DE RETOUR ET PENALITES
   ========================================================= */

async function chargerDemandes() {
  const tbody = document.querySelector('#table-demandes tbody');

  if (!tbody) {
    return;
  }

  const { data, error } = await supabase
    .from('emprunts')
    .select(`
      id,
      user_id,
      livre_id,
      statut,
      date_demande,
      date_emprunt,
      date_retour_prevu,
      date_retour_reel,
      penalite,
      statut_penalite,
      note_admin,
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

  if (error) {
    console.error('Erreur chargement emprunts :', error);

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
        <td colspan="7">Aucune demande ou aucun emprunt enregistré.</td>
      </tr>
    `;

    return;
  }

  for (const emprunt of data) {
    const profil = emprunt.profiles;
    const livre = emprunt.livres;

    const nomUtilisateur =
      `${profil?.first_name || ''} ${profil?.last_name || ''}`.trim() ||
      profil?.email ||
      'Utilisateur inconnu';

    const dateInput = dateVersInput(emprunt.date_retour_prevu);
    const montantPenalite = Number(emprunt.penalite || 0);

    let statutAffiche = emprunt.statut;
    let classeStatut = emprunt.statut;

    const estEnRetard =
      emprunt.statut === 'approved' &&
      emprunt.date_retour_prevu &&
      new Date(emprunt.date_retour_prevu) < new Date();

    if (estEnRetard) {
      statutAffiche = 'overdue';
      classeStatut = 'overdue';
    }

    let actions = '';

    /* Demande pas encore acceptée */
    if (emprunt.statut === 'pending') {
      actions = `
        <label class="table-label">
          Date de retour choisie par admin
          <input
            type="date"
            class="input-date-retour"
            data-date-id="${emprunt.id}"
            value="${dateInput}"
          />
        </label>

        <button
          type="button"
          class="btn-accept"
          data-action="accepter-emprunt"
          data-id="${emprunt.id}"
          data-livre-id="${emprunt.livre_id}"
        >
          Accepter
        </button>

        <button
          type="button"
          class="btn-reject"
          data-action="refuser-emprunt"
          data-id="${emprunt.id}"
        >
          Refuser
        </button>
      `;
    }

    /* Emprunt accepté : date modifiable + retour */
    if (emprunt.statut === 'approved') {
      actions = `
        <label class="table-label">
          Modifier date de retour
          <input
            type="date"
            class="input-date-retour"
            data-date-id="${emprunt.id}"
            value="${dateInput}"
          />
        </label>

        <button
          type="button"
          class="btn-return"
          data-action="modifier-date"
          data-id="${emprunt.id}"
        >
          Enregistrer date
        </button>

        <label class="table-label">
          Pénalité (Ar)
          <input
            type="number"
            min="0"
            step="100"
            class="input-penalite"
            data-penalite-id="${emprunt.id}"
            value="${montantPenalite}"
          />
        </label>

        <button
          type="button"
          class="btn-return"
          data-action="livre-retourne"
          data-id="${emprunt.id}"
          data-livre-id="${emprunt.livre_id}"
        >
          Livre retourné
        </button>
      `;
    }

    /* Livre retourné et éventuellement pénalité */
    if (emprunt.statut === 'returned') {
      actions = `
        <p class="small-info">
          Rendu le : <strong>${formatDate(emprunt.date_retour_reel)}</strong>
        </p>
      `;

      if (montantPenalite > 0) {
        actions += `
          <p class="small-info">
            Pénalité : <strong>${montantPenalite.toLocaleString('fr-FR')} Ar</strong>
          </p>

          <p class="small-info">
            Paiement : <strong>${echapperHtml(emprunt.statut_penalite)}</strong>
          </p>
        `;

        if (emprunt.statut_penalite !== 'paid') {
          actions += `
            <button
              type="button"
              class="btn-accept"
              data-action="penalite-payee"
              data-id="${emprunt.id}"
            >
              Marquer payée
            </button>
          `;
        }
      } else {
        actions += `
          <p class="small-info">Aucune pénalité.</p>
        `;
      }
    }

    /* Emprunt refusé */
    if (emprunt.statut === 'rejected') {
      actions = `
        <p class="small-info">Demande d’emprunt refusée.</p>
      `;
    }

    tbody.insertAdjacentHTML(
      'beforeend',
      `
        <tr>
          <td>${echapperHtml(nomUtilisateur)}</td>
          <td>${echapperHtml(livre?.titre || 'Livre introuvable')}</td>
          <td>${formatDate(emprunt.date_demande)}</td>
          <td>
            <span class="badge badge-${classeStatut}">
              ${echapperHtml(statutAffiche)}
            </span>
          </td>
          <td>${formatDate(emprunt.date_retour_prevu)}</td>
          <td>
            ${
              montantPenalite > 0
                ? `${montantPenalite.toLocaleString('fr-FR')} Ar`
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

  if (!bouton) {
    return;
  }

  const action = bouton.dataset.action;
  const empruntId = bouton.dataset.id;
  const livreId = bouton.dataset.livreId;

  bouton.disabled = true;

  try {
    const inputDate = document.querySelector(
      `.input-date-retour[data-date-id="${empruntId}"]`
    );

    const dateRetourPrevu = convertirDateInput(inputDate?.value);

    /* Admin accepte l'emprunt et choisit la date de retour */
    if (action === 'accepter-emprunt') {
      if (!dateRetourPrevu) {
        throw new Error(
          "Vous devez choisir une date de retour avant d'accepter l'emprunt."
        );
      }

      const { error: erreurEmprunt } = await supabase
        .from('emprunts')
        .update({
          statut: 'approved',
          date_emprunt: new Date().toISOString(),
          date_retour_prevu: dateRetourPrevu,
          note_admin: 'Emprunt accepté par administrateur.'
        })
        .eq('id', empruntId);

      if (erreurEmprunt) {
        throw erreurEmprunt;
      }

      const { error: erreurLivre } = await supabase
        .from('livres')
        .update({ disponible: false })
        .eq('id', livreId);

      if (erreurLivre) {
        throw erreurLivre;
      }

      alert(
        "Emprunt accepté. La date de retour est enregistrée et le livre devient indisponible."
      );
    }

    /* Admin refuse une demande */
    if (action === 'refuser-emprunt') {
      const confirmation = confirm(
        "Voulez-vous vraiment refuser cette demande d'emprunt ?"
      );

      if (!confirmation) {
        bouton.disabled = false;
        return;
      }

      const { error } = await supabase
        .from('emprunts')
        .update({
          statut: 'rejected',
          note_admin: 'Demande refusée par administrateur.'
        })
        .eq('id', empruntId);

      if (error) {
        throw error;
      }

      alert('Demande d’emprunt refusée.');
    }

    /* Admin peut modifier la date de retour après acceptation */
    if (action === 'modifier-date') {
      if (!dateRetourPrevu) {
        throw new Error('Choisissez une date de retour valide.');
      }

      const { error } = await supabase
        .from('emprunts')
        .update({
          date_retour_prevu: dateRetourPrevu,
          note_admin: 'Date de retour modifiée par administrateur.'
        })
        .eq('id', empruntId);

      if (error) {
        throw error;
      }

      alert('Date de retour modifiée avec succès.');
    }

    /* Retour livre + pénalité choisie par admin */
    if (action === 'livre-retourne') {
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
          statut_penalite: penalite > 0 ? 'pending' : 'none',
          note_admin:
            penalite > 0
              ? `Livre retourné avec une pénalité de ${penalite} Ar.`
              : 'Livre retourné sans pénalité.'
        })
        .eq('id', empruntId);

      if (erreurEmprunt) {
        throw erreurEmprunt;
      }

      const { error: erreurLivre } = await supabase
        .from('livres')
        .update({ disponible: true })
        .eq('id', livreId);

      if (erreurLivre) {
        throw erreurLivre;
      }

      alert('Retour enregistré. Le livre est à nouveau disponible.');
    }

    /* Admin confirme le paiement d'une pénalité */
    if (action === 'penalite-payee') {
      const confirmation = confirm(
        'Confirmez-vous que cette pénalité a été payée ?'
      );

      if (!confirmation) {
        bouton.disabled = false;
        return;
      }

      const { error } = await supabase
        .from('emprunts')
        .update({
          statut_penalite: 'paid',
          note_admin: 'Pénalité payée.'
        })
        .eq('id', empruntId);

      if (error) {
        throw error;
      }

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

/* =========================================================
   LIVRES ET QR CODES
   ========================================================= */

async function ajouterLivre(event) {
  event.preventDefault();

  const titre = document.getElementById('livre-titre').value.trim();
  const auteur = document.getElementById('livre-auteur').value.trim();
  const resume = document.getElementById('livre-resume').value.trim();
  const numeroRef = document.getElementById('livre-ref').value.trim();
  const categorie = document.getElementById('livre-categorie').value.trim();

  if (!titre || !numeroRef) {
    afficherMessageLivre(
      'Le titre et la référence unique sont obligatoires.',
      'error'
    );
    return;
  }

  afficherMessageLivre('Ajout du livre en cours...');

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
      afficherMessageLivre(
        'Cette référence existe déjà. Entrez une référence unique.',
        'error'
      );
      return;
    }

    afficherMessageLivre(
      "Impossible d'ajouter ce livre. Vérifiez les informations.",
      'error'
    );
    return;
  }

  event.target.reset();

  afficherMessageLivre(
    'Livre ajouté avec succès. Vous pouvez maintenant créer son QR code.',
    'success'
  );

  await chargerLivres();
}

async function chargerLivres() {
  const tbody = document.querySelector('#table-livres tbody');

  if (!tbody) {
    return;
  }

  const { data, error } = await supabase
    .from('livres')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur chargement livres :', error);

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
    const disponibilite = livre.disponible ? 'Disponible' : 'Indisponible';
    const classeDisponibilite = livre.disponible
      ? 'badge-active'
      : 'badge-rejected';

    tbody.insertAdjacentHTML(
      'beforeend',
      `
        <tr>
          <td>${echapperHtml(livre.titre)}</td>
          <td>${echapperHtml(livre.auteur || '-')}</td>
          <td>${echapperHtml(livre.numero_ref || '-')}</td>
          <td>${echapperHtml(livre.categorie || '-')}</td>
          <td>
            <span class="badge ${classeDisponibilite}">
              ${disponibilite}
            </span>
          </td>
          <td>
            <button
              type="button"
              class="btn-return"
              data-action="afficher-qr"
              data-id="${livre.id}"
              data-titre="${encodeURIComponent(livre.titre)}"
              data-reference="${encodeURIComponent(livre.numero_ref || '')}"
            >
              QR code
            </button>
          </td>
          <td>
            <button
              type="button"
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
  }
}

async function gererLivre(event) {
  const bouton = event.target.closest('button[data-action]');

  if (!bouton) {
    return;
  }

  const action = bouton.dataset.action;
  const livreId = bouton.dataset.id;

  if (action === 'afficher-qr') {
    const titre = decodeURIComponent(bouto
