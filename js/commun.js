// js/commun.js
import { getUtilisateurCourant, deconnecterUtilisateur } from './auth.js';

function montrer(element) {
  if (element) element.classList.remove('hidden');
}

function cacher(element) {
  if (element) element.classList.add('hidden');
}

export async function initMenu() {
  const btnConnexion = document.getElementById('btn-connexion');
  const btnDeconnexion = document.getElementById('btn-deconnexion');
  const lienAdmin = document.getElementById('lien-admin');
  const lienEspace = document.getElementById('lien-espace');
  const nomUtilisateur = document.getElementById('nom-utilisateur');

  // Tout ce qui est privé est caché au premier affichage.
  cacher(lienAdmin);
  cacher(lienEspace);
  cacher(btnDeconnexion);
  cacher(nomUtilisateur);
  montrer(btnConnexion);

  const info = await getUtilisateurCourant();

  // Visiteur non connecté.
  if (!info || !info.user || !info.profil) {
    return;
  }

  const { profil } = info;

  // Utilisateur connecté.
  cacher(btnConnexion);
  montrer(btnDeconnexion);
  montrer(lienEspace);

  const nomComplet = `${profil.first_name || ''} ${profil.last_name || ''}`.trim();

  if (nomUtilisateur) {
    nomUtilisateur.textContent = nomComplet || profil.email || '';
    montrer(nomUtilisateur);
  }

  // Seul admin actif voit le lien Administration.
  if (profil.role === 'admin' && profil.status === 'active') {
    montrer(lienAdmin);
  } else {
    cacher(lienAdmin);
  }

  if (btnDeconnexion) {
    btnDeconnexion.onclick = async () => {
      await deconnecterUtilisateur();
      window.location.href = 'index.html';
    };
  }
}

export async function verifierAdmin() {
  const info = await getUtilisateurCourant();

  if (!info || !info.user || !info.profil) {
    window.location.href = 'connexion.html';
    return false;
  }

  if (
    info.profil.role !== 'admin' ||
    info.profil.status !== 'active'
  ) {
    alert("Accès réservé à l'administrateur.");
    window.location.href = 'index.html';
    return false;
  }

  return true;
}
