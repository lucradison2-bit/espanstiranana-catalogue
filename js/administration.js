export async function initAdministration() {
  const contenu = document.querySelector('#contenu-admin');
  const body = document.querySelector('body');

  if (!contenu) {
    body.insertAdjacentHTML(
      'beforeend',
      '<div style="padding:20px;color:red;">#contenu-admin introuvable dans administration.html</div>'
    );
    return;
  }

  body.insertAdjacentHTML(
    'beforeend',
    '<div style="padding:20px;color:green;">initAdministration appelé – on va afficher le contenu</div>'
  );

  contenu.classList.remove('hidden');

  body.insertAdjacentHTML(
    'beforeend',
    '<div style="padding:20px;color:blue;">#contenu-admin devrait être visible maintenant</div>'
  );
}
