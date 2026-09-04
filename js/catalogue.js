import { supabase } from './config.js';

let tousLesLivres = [];

const echapper = (texte) => {
  const div = document.createElement('div');
  div.textContent = texte || '';
  return div.innerHTML;
};

export async function afficherCatalogue() {
  const { data, error } = await supabase
    .from('livres')
    .select('*')
    .order('titre');

  const liste = document.querySelector('#liste-livres');

  if (error) {
    liste.textContent = 'Impossible de charger le catalogue.';
    return;
  }

  tousLesLivres = data || [];
  afficherLivres(tousLesLivres);

  document.querySelector('#recherche-livre').oninput = (event) => {
    const recherche = event.target.value.toLowerCase();

    const resultat = tousLesLivres.filter((livre) =>
      [
        livre.titre,
        livre.auteur,
        livre.categorie,
        livre.numero_ref
      ]
        .join(' ')
        .toLowerCase()
        .includes(recherche)
    );

    afficherLivres(resultat);
  };
}

function afficherLivres(livres) {
  const liste = document.querySelector('#liste-livres');

  liste.innerHTML = livres.length ? '' : 'Aucun livre trouvé.';

  livres.forEach((livre) => {
    liste.insertAdjacentHTML(
      'beforeend',
      `
      <a class="book-card" href="livre.html?id=${encodeURIComponent(livre.id)}">
        <h3>${echapper(livre.titre)}</h3>
        <p><b>Auteur :</b> ${echapper(livre.auteur || '-')}</p>
        <p><b>Catégorie :</b> ${echapper(livre.categorie || '-')}</p>
        <p><b>Référence :</b> ${echapper(livre.numero_ref || '-')}</p>

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
