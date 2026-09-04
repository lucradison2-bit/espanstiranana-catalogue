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

  document.querySelector('#profil-nom').textContent =
    `${profil.first_name || ''} ${profil.last_name || ''}`.trim() || '-';

  document.querySelector('#profil-email').textContent =
    profil.email || '-';

  document.querySelector('#profil-carte-identite').textContent =
    profil.carte_identite || 'Non renseignée';

  document.querySelector('#profil-carte-etudiant').textContent =
    profil.carte_etudiant || 'Non renseignée';

  document.querySelector('#profil-status').textContent =
    profil.status || '-';

  const { data, error } = await supabase
    .from('emprunts')
    .select(
      `
      statut,
      date_emprunt,
      date_retour_prevu,
      date_retour_reel,
      penalite,
      livres(titre)
    `
    )
    .eq('user_id', info.user.id)
    .order('date_demande', { ascending: false });

  const tbody = document.querySelector('#table-historique tbody');

  if (error) {
    tbody.innerHTML =
      '<tr><td colspan="6">Erreur lors du chargement.</td></tr>';
    return;
  }

  tbody.innerHTML = data?.length
    ? ''
    : '<tr><td colspan="6">Aucun emprunt.</td></tr>';

  data?.forEach((emprunt) => {
    tbody.insertAdjacentHTML(
      'beforeend',
      `
      <tr>
        <td>${emprunt.livres?.titre || '-'}</td>
        <td>
          <span class="badge badge-${emprunt.statut}">
            ${emprunt.statut}
          </span>
        </td>
        <td>${formaterDate(emprunt.date_emprunt)}</td>
        <td>${formaterDate(emprunt.date_retour_prevu)}</td>
        <td>${formaterDate(emprunt.date_retour_reel)}</td>
        <td>
          ${
            Number(emprunt.penalite || 0) > 0
              ? `${emprunt.penalite} Ar`
              : '-'
          }
        </td>
      </tr>
      `
    );
  });
}
