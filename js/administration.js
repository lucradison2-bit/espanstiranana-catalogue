// js/administration.js
import { supabase } from './config.js';
import { verifierAdmin } from './commun.js';

export async function initAdministration() {
  const estAdmin = await verifierAdmin();

  if (!estAdmin) {
    return;
  }

  const contenuAdmin = document.getElementById('contenu-admin');

  if (contenuAdmin) {
    contenuAdmin.classList.remove('hidden');
  }

  await chargerDemandes();
  await chargerLivres();
  installerEvenementsAdmin();
}

function installerEvenementsAdmin() {
  const formulaire = document.getElementById('form-ajout-livre');
  const demandes = document.querySelector('#table-demandes tbody');
  const livres = document.querySelector('#table-livres tbody');

  if (formulaire) {
    formulaire.addEventListener('submit', ajouterLivre);
  }

  if (demandes) {
    demandes.addEventListener('click', gererActionEmprunt);
  }

  if (livres) {
    livres.addEventListener('click', gererActionLivre);
  }
}

async function chargerDemandes() {
  const { data, error } = await supabase
    .from('emprunts')
    .select(`
      id,
      statut,
      livre_id,
      created_at,
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
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur demandes :', error);
    alert("Erreur : impossible de charger les demandes d'emprunt.");
    return;
  }

  const tbody = document.querySelector('#table-demandes tbody');

  if (!tbody) return;

  tbody.innerHTML = '';

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4">Aucune demande d'emprunt pour le moment.</td>
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

    let actions = '';

    if (emprunt.statut === 'pending') {
      actions = `
        <button class="btn-accept" data-action="accept" data-id="${emprunt.id}" data-livre-id="${emprunt.livre_id}">
          Accepter
        </button>
        <button class="btn-reject" data-action="reject" data-id="${emprunt.id}">
          Refuser
        </button>
      `;
    }

    if (emprunt.statut === 'approved') {
      actions = `
        <button class="btn-return" data-action="return" data-id="${emprunt.id}" data-livre-id="${emprunt.livre_id}">
          Livre retourné
        </button>
      `;
    }

    tbody.insertAdjacentHTML(
      'beforeend',
      `
        <tr>
          <td>${nomUtilisateur}</td>
          <td>${livre?.titre || 'Livre introuvable'}</td>
          <td><span class="badge badge-${emprunt.statut}">${emprunt.statut}</span></td>
          <td>${actions}</td>
        </tr>
      `
    );
  }
}

async function gererActionEmprunt(event) {
  const bouton = event.target.closest('button[data-action]');

  if (!bouton) return;

  const action = bouton.dataset.action;
  const empruntId = bouton.dataset.id;
  const livreId = bouton.dataset.livreId;

  bouton.disabled = true;

  try {
    if (action === 'accept') {
      const { error: errorEmprunt } = await supabase
        .from('emprunts')
        .update({
          statut: 'approved',
          date_emprunt: new Date().toISOString()
        })
        .eq('id', empruntId);

      if (errorEmprunt) throw errorEmprunt;

      const { error: errorLivre } = await supabase
        .from('livres')
        .update({ disponible: false })
        .eq('id', livreId);

      if (errorLivre) throw errorLivre;
    }

    if (action === 'reject') {
      const { error } = await supabase
        .from('emprunts')
        .update({ statut: 'rejected' })
        .eq('id', empruntId);

      if (error) throw error;
    }

    if (action === 'return') {
      const { error: errorEmprunt } = await supabase
        .from('emprunts')
        .update({
          statut: 'returned',
          date_retour_reel: new Date().toISOString()
        })
        .eq('id', empruntId);

      if (errorEmprunt) throw errorEmprunt;

      const { error: errorLivre } = await supabase
        .from('livres')
        .update({ disponible: true })
        .eq('id', livreId);

      if (errorLivre) throw errorLivre;
    }

    await chargerDemandes();
    await chargerLivres();
  } catch (error) {
    console.error('Erreur action emprunt :', error);
    alert("L'action n'a pas pu être enregistrée.");
  } finally {
    bouton.disabled = false;
  }
}

async function ajouterLivre(event) {
  event.preventDefault();

  const titre = document.getElementById('livre-titre').value.trim();
  const auteur = document.getElementById('livre-auteur').value.trim();
  const resume = document.getElementById('livre-resume').value.trim();
  const numero_ref = document.getElementById('livre-ref').value.trim();
  const categorie = document.getElementById('livre-categorie').value.trim();

  if (!titre) {
    alert('Le titre du livre est obligatoire.');
    return;
  }

  const { error } = await supabase
    .from('livres')
    .insert({
      titre,
      auteur: auteur || null,
      resume: resume || null,
      numero_ref: numero_ref || null,
      categorie: categorie || null,
      disponible: true
    });

  if (error) {
    console.error('Erreur ajout livre :', error);
    alert("Erreur : impossible d'ajouter le livre.");
    return;
  }

  event.target.reset();
  await chargerLivres();
  alert('Livre ajouté avec succès.');
}

async function chargerLivres() {
  const { data, error } = await supabase
    .from('livres')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur livres :', error);
    return;
  }

  const tbody = document.querySelector('#table-livres tbody');

  if (!tbody) return;

  tbody.innerHTML = '';

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">Aucun livre enregistré.</td>
      </tr>
    `;
    return;
  }

  for (const livre of data) {
    const disponibilite = livre.disponible ? 'Disponible' : 'Indisponible';
    const classeDisponibilite = livre.disponible ? 'badge-approved' : 'badge-rejected';

    tbody.insertAdjacentHTML(
      'beforeend',
      `
        <tr>
          <td>${livre.titre}</td>
          <td>${livre.auteur || '-'}</td>
          <td>${livre.numero_ref || '-'}</td>
          <td>${livre.categorie || '-'}</td>
          <td><span class="badge ${classeDisponibilite}">${disponibilite}</span></td>
          <td>
            <button class="btn-delete" data-action="delete-book" data-id="${livre.id}">
              Supprimer
            </button>
          </td>
        </tr>
      `
    );
  }
}

async function gererActionLivre(event) {
  const bouton = event.target.closest('button[data-action="delete-book"]');

  if (!bouton) return;

  const livreId = bouton.dataset.id;

  const confirmation = confirm('Voulez-vous vraiment supprimer ce livre ?');

  if (!confirmation) return;

  bouton.disabled = true;

  const { error } = await supabase
    .from('livres')
    .delete()
    .eq('id', livreId);

  if (error) {
    console.error('Erreur suppression livre :', error);
    alert('Impossible de supprimer ce livre.');
    bouton.disabled = false;
    return;
  }

  await chargerLivres();
      }
