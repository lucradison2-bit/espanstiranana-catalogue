import { getUtilisateurCourant } from './auth.js';
import { supabase } from './config.js';

export async function afficherEspace() {
  const info = await getUtilisateurCourant();

  const container = document.querySelector('#table-historique');
  if (!container) {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="debug" style="color:red;white-space:pre-wrap;"></div>'
    );
    const debug = document.getElementById('debug');
    debug.textContent = 'Element #table-historique introuvable';
    return;
  }

  const tbody = container.querySelector('tbody');
  if (!tbody) {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="debug" style="color:red;white-space:pre-wrap;"></div>'
    );
    const debug = document.getElementById('debug');
    debug.textContent = 'Element tbody introuvable dans #table-historique';
    return;
  }

  if (!info?.user) {
    tbody.innerHTML =
      '<tr><td colspan="6">Pas d utilisateur connecté</td></tr>';
    return;
  }

  const { data, error } = await supabase
    .from('emprunts')
    .select('id, user_id, livre_id, statut')
    .eq('user_id', info.user.id)
    .limit(5);

  if (error) {
    // Afficher l erreur complete dans la page
    const message =
      'Erreur Supabase:
' +
      JSON.stringify(error, null, 2);

    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="debug" style="color:red;white-space:pre-wrap;font-family:monospace;"></div>'
    );
    const debug = document.getElementById('debug');
    debug.textContent = message;

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
