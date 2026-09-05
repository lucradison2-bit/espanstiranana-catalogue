import { supabase } from './config.js';

const echapper = (texte) => {
  const div = document.createElement('div');
  div.textContent = texte || '';
  return div.innerHTML;
};

export async function chargerAccueil() {
  const { data: livres = [], error } = await supabase
    .from('livres')
    .select('id, titre, auteur, categorie, disponible')
    .order('titre');

  const liste = document.querySelector('#liste-livres');

  if (error) {
    liste.textContent = 'Impossible de charger les livres.';
    return;
  }

  document.querySelector('#total-livres').textContent = livres.length;
  document.querySelector('#livres-disponibles').textContent = livres.filter(
    (livre) => livre.disponible
  ).length;

  liste.innerHTML = livres.length ? '' : 'Aucun livre enregistré.';

  livres.slice(0, 8).forEach((livre) => {
    liste.insertAdjacentHTML(
      'beforeend',
      `
      <a class="book-row" href="livre.html?id=${encodeURIComponent(livre.id)}">
        <div>
          <h3>${echapper(livre.titre)}</h3>
          <p>
            ${echapper(livre.auteur || 'Auteur non renseigné')}
            ${livre.categorie ? ` • ${echapper(livre.categorie)}` : ''}
          </p>
        </div>

        <span class="badge ${
          livre.disponible ? 'badge-active' : 'badge-rejected'
        }">
          ${livre.disponible ? 'Disponible' : 'Indisponible'}
        </span>
      </a>
      `
    );
  });
    }
