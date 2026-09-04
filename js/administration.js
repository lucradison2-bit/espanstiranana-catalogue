// js/administration.js
import { supabase } from './config.js';
import { verifierAdmin } from './commun.js';

export async function initAdministration() {
  const ok = await verifierAdmin();
  if (!ok) return;

  document.getElementById('contenu-admin').style.display = 'block';
  chargerDemandes();
  chargerLivres();
}

async function chargerDemandes() {
  const { data, error } = await supabase
    .from('emprunts')
    .select(`
      id,
      statut,
      livres ( titre, auteur ),
      profiles ( first_name, last_name, email )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const tbody = document.querySelector('#table-demandes tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  for (const d of data) {
    const tr = document.createElement('tr');

    const user = d.profiles;
    const livre = d.livres;
    const nom = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Inconnu';

    let actionsHtml = '';

    if (d.statut === 'pending') {
      actionsHtml = `
        <button data-id="${d.id}" data-action="accept">Accepter</button>
        <button data-id="${d.id}" data-action="reject">Refuser</button>
      `;
    } else if (d.statut === 'approved') {
      actionsHtml = `
        <button data-id="${d.id}" data-action="return">Retourner</button>
      `;
    }

    tr.innerHTML = `
      <td>${nom}</td>
      <td>${livre?.titre || '???'}</td>
      <td>${d.statut}</td>
      <td>${actionsHtml}</td>
    `;

    tbody.appendChild(tr);
  }

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === 'accept') {
      await supabase
        .from('emprunts')
        .update({ statut: 'approved', date_emprunt: new Date().toISOString() })
        .eq('id', id);

      const { data: emp } = await supabase
        .from('emprunts')
        .select('livre_id')
        .eq('id', id)
        .single();

      if (emp?.livre_id) {
        await supabase
          .from('livres')
          .update({ disponible: false })
          .eq('id', emp.livre_id);
      }
    } else if (action === 'reject') {
      await supabase
        .from('emprunts')
        .update({ statut: 'rejected' })
        .eq('id', id);
    } else if (action === 'return') {
      // Marquer comme rendu et remettre le livre en disponible
      await supabase
        .from('emprunts')
        .update({
          statut: 'returned',
          date_retour_reel: new Date().toISOString()
        })
        .eq('id', id);

      const { data: emp } = await supabase
        .from('emprunts')
        .select('livre_id')
        .eq('id', id)
        .single();

      if (emp?.livre_id) {
        await supabase
          .from('livres')
          .update({ disponible: true })
          .eq('id', emp.livre_id);
      }
    }

    chargerDemandes();
  });
}

async function chargerLivres() {
  const { data, error } = await supabase
    .from('livres')
    .select('*')
    .order('titre');

  if (error) {
    console.error(error);
    return;
  }

  const tbody = document.querySelector('#table-livres tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  for (const l of data) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${l.titre}</td>
      <td>${l.auteur || ''}</td>
      <td>${l.numero_ref || ''}</td>
      <td>${l.categorie || ''}</td>
      <td>${l.disponible ? 'Oui' : 'Non'}</td>
      <td>
        <button data-id="${l.id}" data-action="delete">Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn || btn.dataset.action !== 'delete') return;
    const id = btn.dataset.id;
    if (!confirm('Supprimer ce livre ?')) return;

    await supabase.from('livres').delete().eq('id', id);
    chargerLivres();
  });
}

document.getElementById('form-ajout-livre')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const titre = document.getElementById('livre-titre').value.trim();
  const auteur = document.getElementById('livre-auteur').value.trim();
  const resume = document.getElementById('livre-resume').value.trim();
  const numero_ref = document.getElementById('livre-ref').value.trim();
  const categorie = document.getElementById('livre-categorie').value.trim();

  await supabase.from('livres').insert({
    titre,
    auteur: auteur || null,
    resume: resume || null,
    numero_ref: numero_ref || null,
    categorie: categorie || null,
    disponible: true
  });

  e.target.reset();
  chargerLivres();
});
