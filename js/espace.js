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

  // 1. Charger les emprunts
  const { data: emprunts, error: errorEmprunts } = await supabase
    .from('emprunts')
    .select(`
      id,
      livre_id,
      statut,
      date_emprunt,
      date_retour_prevu,
      date_retour_reel
    `)
    .eq('user_id', info.user.id)
    .order('created_at', { ascending: false });

  const tbody = document.querySelector('#table-historique tbody');

  if (errorEmprunts) {
    console.error('Erreur chargement emprunts:', errorEmprunts);
    tbody.innerHTML =
      '<tr><td colspan="6">Erreur lors du chargement.</td></tr>';
    return;
  }

  if (!emprunts || emprunts.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6">Aucun emprunt.</td></tr>';
    return;
  }

  // 2. Récupérer tous les livre_id
  const livreIds = [...new Set(emprunts.map(e => e.livre_id).filter(Boolean))];

  let livresParId = new Map();

  if (livreIds.length > 0) {
    const { data: livres, error: errorLivres } = await supabase
      .from('livres')
      .select('id, titre')
      .in('id', livreIds);

    if (!errorLivres && livres) {
      livresParId = new Map(livres.map(l => [l.id, l]));
    }
  }

  // 3. Affichage
  tbody.innerHTML = '';

  emprunts.forEach((emprunt) => {
    const livre = livresParId.get(emprunt.livre_id);
    const titreLivre = livre?.titre || 'Livre (titre inconnu)';

    tbody.insertAdjacentHTML(
      'beforeend',
      `
      <tr>
        <td>${titreLivre}</td>
        <td>
          <span class="badge badge-${emprunt.statut}">
            ${emprunt.statut}
          </span>
        </td>
        <td>${formaterDate(emprunt.date_emprunt)}</td>
        <td>${formaterDate(emprunt.date_retour_prevu)}</td>
        <td>${formaterDate(emprunt.date_retour_reel)}</td>
        <td>-</td>
      </tr>
      `
    );
  });
                         }
