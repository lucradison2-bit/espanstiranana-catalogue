import {
  getUtilisateurCourant,
  deconnecterUtilisateur
} from './auth.js';

const afficher = (element) => element?.classList.remove('hidden');
const cacher = (element) => element?.classList.add('hidden');

export async function initMenu() {
  const lienAdmin = document.querySelector('#lien-admin');
  const lienEspace = document.querySelector('#lien-espace');
  const boutonConnexion = document.querySelector('#btn-connexion');
  const boutonDeconnexion = document.querySelector('#btn-deconnexion');
  const nomUtilisateur = document.querySelector('#nom-utilisateur');

  cacher(lienAdmin);
  cacher(lienEspace);
  cacher(boutonDeconnexion);
  cacher(nomUtilisateur);
  afficher(boutonConnexion);

  const info = await getUtilisateurCourant();

  if (!info?.user || !info?.profil) return;

  cacher(boutonConnexion);
  afficher(boutonDeconnexion);
  afficher(lienEspace);

  if (nomUtilisateur) {
    const nomAffiche =
      `${info.profil.first_name || ''} ${info.profil.last_name || ''}`.trim() ||
      info.profil.last_name ||
      info.profil.email;

    nomUtilisateur.textContent = nomAffiche;
    afficher(nomUtilisateur);
  }

  if (
    info.profil.role === 'admin' &&
    info.profil.status === 'active'
  ) {
    afficher(lienAdmin);
  }

  if (boutonDeconnexion) {
    boutonDeconnexion.onclick = async () => {
      await deconnecterUtilisateur();
      location.href = 'index.html';
    };
  }
}

export async function verifierAdmin() {
  const info = await getUtilisateurCourant();

  if (!info?.user || !info?.profil) {
    location.href = 'connexion.html';
    return false;
  }

  if (
    info.profil.role !== 'admin' ||
    info.profil.status !== 'active'
  ) {
    alert('Accès réservé aux administrateurs.');
    location.href = 'index.html';
    return false;
  }

  return true;
}
