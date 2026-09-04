// js/commun.js
import { getUtilisateurCourant, deconnecterUtilisateur } from './auth.js';

function montrer(element) {
  if (!element) return;
  element.classList.remove('hidden');
}

function cacher(element) {
  if (!element) return;
  element.classList.add('hidden');
}

export async function initMenu() {
  const btnConnexion = document.getElementById('btn-connexion');
  const btnDeconnexion = document.getElementById('btn-deconnexion');
  const lienAdmin = document.getElementById('lien-admin');
  const lienEspace = document.getElementById('lien-espace');
  const spanNom = document.getElementById('span-nom-utilisateur');

  // Toujours cacher Administration au début.
  cacher(lienAdmin);
  cacher(lienEspace);
  cacher(btnDeconnexion);
  montrer(btnConnexion);

  const info = await getUtilisateurCourant();

  // Personne non connectée : administration reste cachée.
  if (!info || !info.user || !info.profil) {
    if (spanNom) spanNom.textContent = '';
    return;
  }

  const { profil } = info;

  // Utilisateur connecté.
  cacher(btnConnexion);
  montrer(btnDeconnexion);
  montrer(lienEspace);

  if (spanNom) {
    const nom = `${profil.first_name || ''} ${profil.last_name || ''}`.trim();
    spanNom.textContent = nom || profil.email || '';
  }

  // Le lien est montré seulement si l'utilisateur est admin ET actif.
  if (profil.role === 'admin' && profil.status === 'active') {
    montrer(lienAdmin);
    lienAdmin.setAttribute('aria-hidden', 'false');
  } else {
    cacher(lienAdmin);
    lienAdmin.setAttribute('aria-hidden', 'true');
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
    window.location.replace('connexion.html');
    return false;
  }

  const { profil } = info;

  if (profil.role !== 'admin' || profil.status !== 'active') {
    alert("Accès réservé aux administrateurs.");
    window.location.replace('index.html');
    return false;
  }

  return true;
}
