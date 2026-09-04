// header.js
import { getUtilisateurCourant, deconnecterUtilisateur } from './auth.js';

export async function initHeader() {
  const btnConnexion = document.getElementById('btn-connexion');
  const btnDeconnexion = document.getElementById('btn-deconnexion');
  const lienAdmin = document.getElementById('lien-admin');
  const spanNom = document.getElementById('span-nom-utilisateur');

  const info = await getUtilisateurCourant();

  if (!info) {
    // Non connecté
    if (btnConnexion) btnConnexion.style.display = 'inline-block';
    if (btnDeconnexion) btnDeconnexion.style.display = 'none';
    if (lienAdmin) lienAdmin.style.display = 'none';
    if (spanNom) spanNom.textContent = '';
    return;
  }

  const { user, profil } = info;

  // Connecté
  if (btnConnexion) btnConnexion.style.display = 'none';
  if (btnDeconnexion) btnDeconnexion.style.display = 'inline-block';

  if (spanNom && profil) {
    spanNom.textContent = `${profil.first_name || ''} ${profil.last_name || ''}`.trim();
  }

  // Admin uniquement
  if (
    profil &&
    profil.role === 'admin' &&
    profil.status === 'active'
  ) {
    if (lienAdmin) lienAdmin.style.display = 'inline-block';
  } else {
    if (lienAdmin) lienAdmin.style.display = 'none';
  }

  // Gestion du bouton déconnexion
  if (btnDeconnexion) {
    btnDeconnexion.addEventListener('click', async (e) => {
      e.preventDefault();
      await deconnecterUtilisateur();
      window.location.reload();
    });
  }
}
