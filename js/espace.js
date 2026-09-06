import { getUtilisateurCourant } from './auth.js';
import { supabase } from './config.js';

const formaterDate = (date) =>
  date ? new Date(date).toLocaleDateString('fr-FR') : '-';

export async function afficherEspace() {
  const info = await getUtilisateurCourant();

  if (!info?.user || !info?.profil) {
    location.href = 'connexion.html';
    return;
  }

  const profil = info.profil;

  const nomAffiche =
    `${profil.first_name || ''} ${profil.last_name || ''}`.trim() ||
    profil.last_name ||
    '-';

  document.querySelector('#profil-nom').textContent = nomAffiche;
  document.querySelector('#profil-email').textContent =
    profil.email || '-';

  document.querySelector('#profil-carte-identite').textContent =
    profil.carte_identite || 'Non renseignée';

  document.querySelector('#profil-carte-etudiant').textContent =
    profil.carte_etudiant || 'Non renseignée';

  document.querySelector('#profil-status').textContent =
    profil.status || '-';

  // Chercher le tableau
  const table = document.querySelector('#table-historique');
  if (!table) {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="debug" style="color:red;white-space:pre-wrap;font-family:monospace;"></div>'
    );
    document.getElementById('debug').textContent =
      'Element #table-historique introuvable dans le HTML';
    return;
  }

  const tbody = table.querySelector('tbody');
  if (!tbody) {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="debug" style="color:red;white-space:pre-wrap;font-family:monospace;"></div>'
    );
    document.getElementById('debug').textContent =
      'Element <tbody> introuvable dans #table-historique';
    return;
  }

  const { data, error } = await supabase
    .from('emprunts')
    .select('id, user_id, livre_id, statut')
    .eq('user_id', info.user.id)
    .limit(5);

  if (error) {
    const message = 'Erreur Supabase:
' + JSON.stringify(error, null, 2);

    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="debug" style="color:red;white-space:pre-wrap;font-family:monospace;"></div>'
    );
    document.getElementById('debug').textContent = message;

    tbody.innerHTML =
      '<tr><td colspan="6">Erreur lors du chargement.</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6">Aucun emprunt.</td></tr>';
    return;
  }

  tbody.innerHTML = '';

  data.forEach((emprunt) => {
    tbody.insertAdjacentHTML(
      'beforeend',
      `
      <tr>
        <td>${emprunt.id}</td>
        <td>${emprunt.livre_id}</td>
        <td>${emprunt.statut}</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>
      `
    );
  });
      }
