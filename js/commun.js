// js/commun.js
import { getUtilisateurCourant, deconnecterUtilisateur } from './auth.js';

export async function initMenu() {
  const btnConnexion = document.getElementById('btn-connexion');
  const btnDeconnexion = document.getElementById('btn-deconnexion');
  const lienAdmin = document.getElementById('lien-admin');
  const spanNom = document.getElementById('span-nom-utilisateur');

  const info = await getUtilisateurCourant();

  if (!info) {
    if (btnConnexion) btnConnexion.style.display = 'inline-block';
    if (btnDeconnexion) btnDeconnexion.style.display = 'none';
    if (lienAdmin) lienAdmin.style.display = 'none';
    if (spanNom) spanNom.textContent = '';
    return;
  }

  const { user, profil } = info;

  if (btnConnexion) btnConnexion.style.display = 'none';
  if (btnDeconnexion) btnDeconnexion.style.display = 'inline-block';

  if (spanNom && profil) {
    spanNom.textContent = `${profil.first_name || ''} ${profil.last_name || ''}`.trim();
  }

  // Lien admin visible uniquement pour les admins actifs
  if (
    profil &&
    profil.role === 'admin' &&
    profil.status === 'active'
  ) {
    if (lienAdmin) lienAdmin.style.display = 'inline-block';
  } else {
    if (lienAdmin) lienAdmin.style.display = 'none';
  }

  if (btnDeconnexion) {
    btnDeconnexion.addEventListener('click', async (e) => {
      e.preventDefault();
      await deconnecterUtilisateur();
      window.location.reload();
    });
  }
}

export async function verifierAdmin() {
  const info = await getUtilisateurCourant();
  if (!info) {
    window.location.href = 'connexion.html';
    return false;
  }

  const { profil } = info;
  if (
    !profil ||
    profil.role !== 'admin' ||
    profil.status !== 'active'
  ) {
    alert("Accès réservé à l'administrateur.");
    window.location.href = 'index.html';
    return false;
  }

  return true;
    }
