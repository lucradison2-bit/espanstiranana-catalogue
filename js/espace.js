// js/espace.js
import { getUtilisateurCourant } from './auth.js';
import { supabase } from './config.js';

export async function afficherEspace() {
  const info = await getUtilisateurCourant();
  if (!info) {
    window.location.href = 'connexion.html';
    return;
  }

  const { user, profil } = info;

  const elNom = document.getElementById('profil-nom');
  const elEmail = document.getElementById('profil-email');
  const elCarteIdentite = document.getElementById('profil-carte-identite');
  const elCarteEtudiant = document.getElementById('profil-carte-etudiant');

  if (elNom) {
    elNom.textContent = `${profil.first_name || ''} ${profil.last_name || ''}`.trim();
  }
  if (elEmail) elEmail.textContent = profil.email || '';
  if (elCarteIdentite) elCarteIdentite.textContent = profil.carte_identite || 'Non renseignée';
  if (elCarteEtudiant) elCarteEtudiant.textContent = profil.carte_etudiant || 'Non renseignée';

  await chargerHistorique(user.id);
}

async function chargerHistorique(userId) {
  const { data: emprunts, error } = await supabase
    .from('emprunts')
    .select(`
      id,
      statut,
      date_emprunt,
      date_retour_prevu,
      date_retour_reel,
      livres ( titre, auteur )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const tbody = document.querySelector('#table-historique tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  for (const e of emprunts) {
    const tr = document.createElement('tr');
    const livre = e.livres;

    tr.innerHTML = `
      <td>${livre?.titre || '???'}</td>
      <td>${livre?.auteur || ''}</td>
      <td>${e.statut}</td>
      <td>${e.date_emprunt ? new Date(e.date_emprunt).toLocaleDateString() : ''}</td>
      <td>${e.date_retour_prevu ? new Date(e.date_retour_prevu).toLocaleDateString() : ''}</td>
      <td>${e.date_retour_reel ? new Date(e.date_retour_reel).toLocaleDateString() : ''}</td>
    `;

    tbody.appendChild(tr);
  }
}
