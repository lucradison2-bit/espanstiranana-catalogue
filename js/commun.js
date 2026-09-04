import { getUtilisateurCourant, deconnecterUtilisateur } from './auth.js';

function montrer(element) {
  if (element) element.classList.remove('hidden');
}

function cacher(element) {
  if (element) element.classList.add('hidden');
}

export async function initMenu() {
  const lienAdmin = document.getElementById('lien-admin');
  const lienEspace = document.getElementById('lien-espace');
  const btnConnexion = document.getElementById('btn-connexion');
  const btnDeconnexion = document.getElementById('btn-deconnexion');
  const nomUtilisateur = document.getElementById('nom-utilisateur');

  cacher(lienAdmin);
  cacher(lienEspace);
  cacher(btnDeconnexion);
  cacher(nomUtilisateur);
  montrer(btnConnexion);

  const info = await getUtilisateurCourant();

  if (!info || !info.user || !info.profil) return;

  cacher(btnConnexion);
  montrer(btnDeconnexion);
  montrer(lienEspace);

  const nom = `${info.profil.first_name || ''} ${info.profil.last_name || ''}`.trim();

  if (nomUtilisateur) {
    nomUtilisateur.textContent = nom || info.profil.email;
    montrer(nomUtilisateur);
  }

  if (info.profil.role === 'admin' && info.profil.status === 'active') {
    montrer(lienAdmin);
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

  if (info.profil.role !== 'admin' || info.profil.status !== 'active') {
    alert("Accès réservé à l'administration.");
    window.location.href = 'index.html';
    return false;
  }

  return true;
}
