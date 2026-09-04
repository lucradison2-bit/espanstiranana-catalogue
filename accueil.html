// js/accueil.js
import { supabase } from './config.js';

function echapperHtml(texte) {
  const element = document.createElement('div');
  element.textContent = texte || '';
  return element.innerHTML;
}

export async function chargerAccueil() {
  const { data: livres, error } = await supabase
    .from('livres')
    .select('id, titre, categorie, auteur, disponible')
    .order('titre', { ascending: true });

  const listeLivres = document.getElementById('liste-livres');
  const totalLivres = document.getElementById('total-livres');
  const livresDisponibles = document.getElementById('livres-disponibles');

  if (error) {
    console.error('Erreur chargement accueil :', error);

    if (listeLivres) {
      listeLivres.innerHTML = `
        <p class="error">Impossible de charger les livres.</p>
      `;
    }

    return;
  }

  const total = livres?.length || 0;
  const disponibles = livres?.filter((livre) => livre.disponible).length || 0;

  if (totalLivres) totalLivres.textContent = total;
  if (livresDisponibles) livresDisponibles.textContent = disponibles;

  if (!listeLivres) return;

  listeLivres.innerHTML = '';

  if (!livres || livres.length === 0) {
    listeLivres.innerHTML = `
      <p class="empty-state">Aucun livre n’est encore enregistré.</p>
    `;
    return;
  }

  for (const livre of livres) {
    const statut = livre.disponible ? 'Disponible' : 'Indisponible';
    const classeStatut = livre.disponible ? 'badge-active' : 'badge-rejected';

    const lien = document.createElement('a');
    lien.className = 'livre-accueil-card';
    lien.href = `livre.html?id=${encodeURIComponent(livre.id)}`;

    lien.innerHTML = `
      <div class="livre-accueil-main">
        <h3>${echapperHtml(livre.titre)}</h3>
        <p>
          ${echapperHtml(livre.auteur || 'Auteur non renseigné')}
          ${livre.categorie ? `• ${echapperHtml(livre.categorie)}` : ''}
        </p>
      </div>

      <div class="livre-accueil-side">
        <span class="badge ${classeStatut}">${statut}</span>
        <span class="arrow-link">Voir →</span>
      </div>
    `;

    listeLivres.appendChild(lien);
  }
}
