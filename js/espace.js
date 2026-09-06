import { getUtilisateurCourant } from './auth.js';
import { supabase } from './config.js';

export async function afficherEspace() {
  const info = await getUtilisateurCourant();

  // 1. Vérifier que l'utilisateur est connecté
  if (!info?.user) {
    console.warn('Pas d utilisateur connecté');
    location.href = 'connexion.html';
    return;
  }

  console.log('Utilisateur connecté:', info.user.id);

  // 2. Tester une requête très simple sur emprunts
  const { data, error } = await supabase
    .from('emprunts')
    .select('id, user_id, livre_id, statut')
    .eq('user_id', info.user.id)
    .limit(5);

  if (error) {
    console.error('Erreur Supabase emprunts:', error);
    const tbody = document.querySelector('#table-historique tbody');
    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="6">Erreur lors du chargement.</td></tr>';
    }
    return;
  }

  console.log('Emprunts chargés:', data);

  const tbody = document.querySelector('#table-historique tbody');
  if (!tbody) {
    console.error('Element #table-historique tbody introuvable');
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
