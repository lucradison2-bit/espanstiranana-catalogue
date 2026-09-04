import { supabase } from './config.js';

function echapperHtml(texte) {
  const div = document.createElement('div');
  div.textContent = texte || '';
  return div.innerHTML;
}

export async function chargerAccueil() {
  const { data: livres, error } = await supabase
    .from('livres')
    .select('id, titre, auteur, categorie, disponible')
    .order('titre');

  const liste = document.getElementById('liste-livres');

  if (error) {
    console.error(error);
    liste.textContent = 'Impossible de charger les livres.';
    return;
  }

  document.getElementById('total-livres').textContent = livres.length;
  document.getElementById('livres-disponibles').textContent =
    livres.filter((livre) => livre.disponible).length;

  liste.innerHTML = '';

  if (livres.length === 0) {
    liste.textContent = 'Aucun livre enregistré.';
    return;
  }

  for (const livre of livres.slice(0, 8)) {
    const lien = document.createElement('a');
    lien.href = `livre.html?id=${encodeURIComponent(livre.id)}`;
    lien.className = 'book-row';

    lien.innerHTML = `
      <div>
        <h3>${echapperHtml(livre.titre)}</h3>
        <p>
          ${echapperHtml(livre.auteur || 'Auteur non renseigné')}
          ${livre.categorie ? `• ${echapperHtml(livre.categorie)}` : ''}
        </p>
      </div>
      <span class="badge ${livre.disponible ? 'badge-active' : 'badge-rejected'}">
        ${livre.disponible ? 'Disponible' : 'Indisponible'}
      </span>
    `;

    liste.appendChild(lien);
  }
}
