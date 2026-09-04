// js/accueil.js
import { supabase } from './config.js';

export async function chargerAccueil() {
  const { data: livres, error } = await supabase
    .from('livres')
    .select('titre, categorie, disponible')
    .order('titre');

  if (error) {
    console.error(error);
    const el = document.getElementById('liste-livres');
    if (el) el.textContent = 'Erreur lors du chargement des livres.';
    return;
  }

  const total = livres.length;
  const disponibles = livres.filter(l => l.disponible).length;

  const elTotal = document.getElementById('total-livres');
  const elDisponibles = document.getElementById('livres-disponibles');

  if (elTotal) elTotal.textContent = total;
  if (elDisponibles) elDisponibles.textContent = disponibles;

  const container = document.getElementById('liste-livres');
  if (!container) return;

  container.innerHTML = '';

  if (livres.length === 0) {
    container.textContent = 'Aucun livre enregistré pour le moment.';
    return;
  }

  for (const livre of livres) {
    const div = document.createElement('div');
    div.className = 'livre-item';

    div.innerHTML = `
      <span class="titre">${livre.titre}</span>
      <span class="categorie">
        ${livre.categorie ? '— ' + livre.categorie : ''}
      </span>
    `;

    container.appendChild(div);
  }
    }
