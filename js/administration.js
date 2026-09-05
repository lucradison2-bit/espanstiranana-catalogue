import { supabase } from './config.js';
import { convertirDateISO } from './utils.js';

let qrActuel = null;

export async function initAdministration() {
  console.log('initAdministration appelée');

  const contenu = document.querySelector('#contenu-admin');
  if (contenu) {
    contenu.classList.remove('hidden');
    console.log('contenu-admin affiché');
  } else {
    console.warn('#contenu-admin introuvable');
  }

  installerEvenements();
  console.log('événements installés');

  console.log('chargement des données...');
  await Promise.all([
    chargerComptes(),
    chargerEmprunts(),
    chargerLivres(),
    chargerTousMembres()
  ]);
  console.log('données chargées');
}

function installerEvenements() {
  document.getElementById('form-ajout-livre')?.addEventListener('submit', gererAjoutLivre);
  document.getElementById('table-comptes')?.addEventListener('click', actionCompte);
  document.getElementById('table-tous-membres')?.addEventListener('click', actionMembre);
  document.getElementById('table-emprunts')?.addEventListener('click', actionEmprunt);
  document.getElementById('table-livres')?.addEventListener('click', actionLivre);

  document.getElementById('btn-fermer-qr')?.addEventListener('click', () => {
    document.getElementById('modal-qr').classList.add('hidden');
  });

  document.getElementById('btn-telecharger-qr')?.addEventListener('click', telechargerQR);
  document.getElementById('btn-imprimer-qr')?.addEventListener('click', imprimerQR);
}

async function chargerComptes() {
  console.log('chargerComptes: début');
  const tbody = document.querySelector('#table-comptes tbody');
  if (!tbody) {
    console.warn('chargerComptes: tbody #table-comptes introuvable');
    return;
  }

  let { data: comptes, error } = await supabase
    .from('utilisateurs')
    .select('id, nom, email, carte_identite, carte_etudiant, est_valide, role')
    .eq('est_valide', false);

  console.log('chargerComptes: réponse Supabase', { comptes, error });

  if (error) {
    console.error('chargerComptes: erreur Supabase', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="5">Erreur de chargement des comptes.</td>
      </tr>
    `;
    return;
  }

  if (!comptes || comptes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">Aucun compte en attente.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = comptes
    .map(
      u => `
        <tr>
          <td>${u.nom || ''}</td>
          <td>${u.email || ''}</td>
          <td>${u.carte_identite ? '✅' : '❌'}</td>
          <td>${u.carte_etudiant ? '✅' : '❌'}</td>
          <td>
            <button
              class="btn-accept"
              data-action="valider-compte"
              data-id="${u.id}"
            >
              Valider
            </button>
            <button
              class="btn-reject"
              data-action="supprimer-compte"
              data-id="${u.id}"
            >
              Supprimer
            </button>
          </td>
        </tr>
      `
    )
    .join('');

  console.log('chargerComptes: terminé, lignes insérées:', comptes.length);
}

async function chargerTousMembres() {
  console.log('chargerTousMembres: début');
  const tbody = document.querySelector('#table-tous-membres tbody');
  if (!tbody) {
    console.warn('chargerTousMembres: tbody #table-tous-membres introuvable');
    return;
  }

  let { data: membres, error } = await supabase
    .from('utilisateurs')
    .select('id, nom, email, role, est_valide, carte_identite, carte_etudiant');

  console.log('chargerTousMembres: réponse Supabase', { membres, error });

  if (error) {
    console.error('chargerTousMembres: erreur Supabase', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="7">Erreur de chargement des membres.</td>
      </tr>
    `;
    return;
  }

  if (!membres || membres.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">Aucun membre.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = membres
    .map(
      u => `
        <tr>
          <td>${u.nom || ''}</td>
          <td>${u.email || ''}</td>
          <td>${u.role || 'membre'}</td>
          <td>${u.est_valide ? 'Validé' : 'En attente'}</td>
          <td>${u.carte_identite ? '✅' : '❌'}</td>
          <td>${u.carte_etudiant ? '✅' : '❌'}</td>
          <td>
            <button
              class="btn-reject"
              data-action="supprimer-utilisateur"
              data-id="${u.id}"
            >
              Supprimer
            </button>
          </td>
        </tr>
      `
    )
    .join('');

  console.log('chargerTousMembres: terminé, lignes insérées:', membres.length);
}

async function chargerEmprunts() {
  console.log('chargerEmprunts: début');
  const tbody = document.querySelector('#table-emprunts tbody');
  if (!tbody) {
    console.warn('chargerEmprunts: tbody #table-emprunts introuvable');
    return;
  }

  let { data: emprunts, error } = await supabase
    .from('emprunts')
    .select(`
      id,
      statut,
      date_emprunt,
      date_retour_prevu,
      penalite,
      utilisateur_id,
      livre_id,
      utilisateurs ( nom, email ),
      livres ( titre, auteur )
    `)
    .order('date_emprunt', { ascending: false });

  console.log('chargerEmprunts: réponse Supabase', { emprunts, error });

  if (error) {
    console.error('chargerEmprunts: erreur Supabase', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="6">Erreur de chargement des emprunts.</td>
      </tr>
    `;
    return;
  }

  if (!emprunts || emprunts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">Aucun emprunt.</td>
      </tr>
    `;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  tbody.innerHTML = emprunts
    .map(e => {
      const nom = e.utilisateurs?.nom || 'Inconnu';
      const titre = e.livres?.titre || 'Livre supprimé';
      const statutText =
        e.statut === 'pending'
          ? 'En attente'
          : e.statut === 'approved'
            ? 'Emprunté'
            : e.statut === 'returned'
              ? 'Retourné'
              : e.statut;

      let dateRetour = '';
      if (e.date_retour_prevu) {
        const d = new Date(e.date_retour_prevu);
        dateRetour = d.toISOString().slice(0, 10);
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        dateRetour = d.toISOString().slice(0, 10);
      }

      let penalite = '0';
      if (e.statut === 'approved' && e.date_retour_prevu) {
        const retour = new Date(e.date_retour_prevu);
        if (retour < today) {
          const jours = Math.floor((today - retour) / (1000 * 60 * 60 * 24));
          penalite = (jours * 100).toString();
        }
      }

      let actions = '';

      if (e.statut === 'pending') {
        actions = `
          <label class="table-label">
            Date retour
            <input
              class="input-date"
              data-id="${e.id}"
              type="date"
              value="${dateRetour}"
            >
          </label>

          <button
            class="btn-accept"
            data-action="accepter-emprunt"
            data-id="${e.id}"
            data-livre="${e.livre_id}"
          >
            Accepter
          </button>

          <button
            class="btn-reject"
            data-action="refuser-emprunt"
            data-id="${e.id}"
          >
            Refuser
          </button>
        `;
      } else if (e.statut === 'approved') {
        actions = `
          <button
            class="btn-accept"
            data-action="retour-livre"
            data-id="${e.id}"
            data-livre="${e.livre_id}"
          >
            Retour
          </button>
        `;
      } else {
        actions = '—';
      }

      return `
        <tr>
          <td>${nom}</td>
          <td>${titre}</td>
          <td>${statutText}</td>
          <td>${dateRetour}</td>
          <td>${penalite} Ar</td>
          <td>${actions}</td>
        </tr>
      `;
    })
    .join('');

  console.log('chargerEmprunts: terminé, lignes insérées:', emprunts.length);
}

async function chargerLivres() {
  console.log('chargerLivres: début');
  const tbody = document.querySelector('#table-livres tbody');
  if (!tbody) {
    console.warn('chargerLivres: tbody #table-livres introuvable');
    return;
  }

  let { data: livres, error } = await supabase
    .from('livres')
    .select('id, titre, auteur, reference, categorie, disponible');

  console.log('chargerLivres: réponse Supabase', { livres, error });

  if (error) {
    console.error('chargerLivres: erreur Supabase', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="7">Erreur de chargement des livres.</td>
      </tr>
    `;
    return;
  }

  if (!livres || livres.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">Aucun livre.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = livres
    .map(l => {
      const ref = l.reference || `LIV-${l.id}`;
      return `
        <tr>
          <td>${l.titre || ''}</td>
          <td>${l.auteur || ''}</td>
          <td>${ref}</td>
          <td>${l.categorie || ''}</td>
          <td>${l.disponible ? 'Disponible' : 'Emprunté'}</td>
          <td>
            <button
              class="btn-accept"
              data-action="voir-qr"
              data-ref="${ref}"
            >
              Voir QR
            </button>
          </td>
          <td>
            <button
              class="btn-reject"
              data-action="supprimer-livre"
              data-id="${l.id}"
            >
              Supprimer
            </button>
          </td>
        </tr>
      `;
    })
    .join('');

  console.log('chargerLivres: terminé, lignes insérées:', livres.length);
}

async function gererAjoutLivre(e) {
  e.preventDefault();
  const message = document.getElementById('message-livre');
  message.textContent = '';

  const titre = document.getElementById('livre-titre').value.trim();
  const auteur = document.getElementById('livre-auteur').value.trim();
  const reference = document.getElementById('livre-ref').value.trim();
  const categorie = document.getElementById('livre-categorie').value.trim();
  const resume = document.getElementById('livre-resume').value.trim();

  if (!titre || !reference) {
    message.textContent = 'Titre et référence obligatoires.';
    message.classList.add('error');
    return;
  }

  const { error } = await supabase.from('livres').insert({
    titre,
    auteur: auteur || null,
    reference,
    categorie: categorie || null,
    resume: resume || null,
    disponible: true
  });

  if (error) {
    console.error('Erreur ajout livre', error);
    message.textContent = "Erreur lors de l'ajout du livre.";
    message.classList.add('error');
    return;
  }

  message.textContent = 'Livre ajouté avec succès.';
  message.classList.remove('error');
  e.target.reset();
  await chargerLivres();
}

async function actionCompte(e) {
  const btn = e.target.closest('button');
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'valider-compte') {
    const { error } = await supabase
      .from('utilisateurs')
      .update({ est_valide: true })
      .eq('id', id);

    if (error) {
      alert("Erreur lors de la validation du compte.");
      return;
    }

    await chargerComptes();
    await chargerTousMembres();
  }

  if (action === 'supprimer-compte') {
    if (!confirm('Supprimer ce compte ?')) return;

    const { error } = await supabase
      .from('utilisateurs')
      .delete()
      .eq('id', id);

    if (error) {
      alert("Erreur lors de la suppression du compte.");
      return;
    }

    await chargerComptes();
    await chargerTousMembres();
  }
}

async function actionMembre(e) {
  const btn = e.target.closest('button');
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'supprimer-utilisateur') {
    if (!confirm('Supprimer ce membre ?')) return;

    const { error } = await supabase
      .from('utilisateurs')
      .delete()
      .eq('id', id);

    if (error) {
      alert("Erreur lors de la suppression du membre.");
      return;
    }

    await chargerTousMembres();
  }
}

async function actionEmprunt(e) {
  const btn = e.target.closest('button');
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'accepter-emprunt') {
    const date = document.querySelector(
      `.input-date[data-id="${id}"]`
    )?.value;

    if (!date) {
      alert('Choisissez une date de retour.');
      return;
    }

    const livreId = btn.dataset.livre;

    let resultat = await supabase
      .from('emprunts')
      .update({
        statut: 'approved',
        date_emprunt: new Date().toISOString(),
        date_retour_prevu: convertirDateISO(date)
      })
      .eq('id', id);

    if (resultat.error) {
      alert("Erreur lors de l'acceptation de l'emprunt.");
      return;
    }

    await supabase
      .from('livres')
      .update({ disponible: false })
      .eq('id', livreId);

    await chargerEmprunts();
    await chargerLivres();
  }

  if (action === 'refuser-emprunt') {
    if (!confirm('Refuser cet emprunt ?')) return;

    const { error } = await supabase
      .from('emprunts')
      .delete()
      .eq('id', id);

    if (error) {
      alert("Erreur lors du refus de l'emprunt.");
      return;
    }

    await chargerEmprunts();
  }

  if (action === 'retour-livre') {
    if (!confirm('Confirmer le retour du livre ?')) return;

    const livreId = btn.dataset.livre;

    let resultat = await supabase
      .from('emprunts')
      .update({
        statut: 'returned',
        date_retour_effectif: new Date().toISOString()
      })
      .eq('id', id);

    if (resultat.error) {
      alert("Erreur lors du retour du livre.");
      return;
    }

    await supabase
      .from('livres')
      .update({ disponible: true })
      .eq('id', livreId);

    await chargerEmprunts();
    await chargerLivres();
  }
}

async function actionLivre(e) {
  const btn = e.target.closest('button');
  if (!btn) return;

  const action = btn.dataset.action;

  if (action === 'voir-qr') {
    const reference = btn.dataset.ref;
    qrActuel = reference;

    document.getElementById('qr-titre').textContent = 'QR code';
    document.getElementById('qr-reference').textContent = `Référence : ${reference}`;
    document.getElementById('qrcode-container').innerHTML = '';

    new QRCode(document.getElementById('qrcode-container'), {
      text: reference,
      width: 200,
      height: 200
    });

    document.getElementById('modal-qr').classList.remove('hidden');
  }

  if (action === 'supprimer-livre') {
    const id = btn.dataset.id;
    if (!confirm('Supprimer ce livre ?')) return;

    const { error } = await supabase
      .from('livres')
      .delete()
      .eq('id', id);

    if (error) {
      alert("Erreur lors de la suppression du livre.");
      return;
    }

    await chargerLivres();
  }
}

function telechargerQR() {
  if (!qrActuel) return;
  const canvas = document.querySelector('#qrcode-container canvas');
  if (!canvas) return;

  const lien = document.createElement('a');
  lien.download = `qr-${qrActuel}.png`;
  lien.href = canvas.toDataURL('image/png');
  lien.click();
}

function imprimerQR() {
  const contenu = document.getElementById('qrcode-container')?.innerHTML;
  if (!contenu) return;

  const fenetre = window.open('', '', 'width=400,height=400');
  if (!fenetre) return;

  fenetre.document.write(`
    <html>
      <head><title>QR code — ${qrActuel}</title></head>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
        ${contenu}
      </body>
    </html>
  `);
  fenetre.document.close();
  fenetre.print();
}
