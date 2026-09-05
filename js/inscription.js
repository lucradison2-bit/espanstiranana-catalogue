import { supabase } from './config.js';

export async function initInscription() {
  const formulaire = document.querySelector('#form-inscription');

  if (!formulaire) {
    return;
  }

  formulaire.addEventListener('submit', inscrireUtilisateur);
}

async function inscrireUtilisateur(event) {
  event.preventDefault();

  const message = document.querySelector('#message-inscription');
  const bouton = document.querySelector('#btn-inscription');

  const prenom = document.querySelector('#prenom').value.trim();
  const nom = document.querySelector('#nom').value.trim();
  const email = document.querySelector('#email').value.trim().toLowerCase();
  const motDePasse = document.querySelector('#mot-de-passe').value;
  const confirmationMotDePasse = document.querySelector(
    '#confirmation-mot-de-passe'
  ).value;
  const carteEtudiant = document
    .querySelector('#carte-etudiant')
    .value
    .trim();
  const carteIdentite = document
    .querySelector('#carte-identite')
    .value
    .trim();

  message.textContent = '';
  message.className = 'message';

  if (!prenom) {
    afficherErreur(
      message,
      'Veuillez saisir votre prénom. Si vous n’en avez pas, mettez un point : .'
    );
    return;
  }

  if (!nom) {
    afficherErreur(message, 'Veuillez saisir votre nom.');
    return;
  }

  if (!email) {
    afficherErreur(message, 'Veuillez saisir une adresse e-mail.');
    return;
  }

  if (motDePasse.length < 6) {
    afficherErreur(
      message,
      'Le mot de passe doit contenir au moins 6 caractères.'
    );
    return;
  }

  if (motDePasse !== confirmationMotDePasse) {
    afficherErreur(message, 'Les deux mots de passe ne sont pas identiques.');
    return;
  }

  if (!carteEtudiant) {
    afficherErreur(
      message,
      'Veuillez saisir votre numéro de carte étudiant.'
    );
    return;
  }

  bouton.disabled = true;
  bouton.textContent = 'Inscription en cours…';

  try {
    /*
      Étape 1 :
      Création du compte dans Supabase Auth.

      Les informations supplémentaires sont placées dans data.
      Elles peuvent ensuite être utilisées par un trigger Supabase
      pour créer le profil automatiquement.
    */
    const { data: resultatInscription, error: erreurInscription } =
      await supabase.auth.signUp({
        email,
        password: motDePasse,
        options: {
          data: {
            first_name: prenom,
            last_name: nom,
            carte_etudiant: carteEtudiant,
            carte_identite: carteIdentite || null,
            role: 'user',
            status: 'pending'
          }
        }
      });

    if (erreurInscription) {
      throw erreurInscription;
    }

    const utilisateur = resultatInscription.user;

    if (!utilisateur) {
      throw new Error(
        'Le compte n’a pas été créé. Vérifiez votre adresse e-mail.'
      );
    }

    /*
      Étape 2 :
      Création ou mise à jour du profil dans la table profiles.

      upsert évite une erreur si un trigger Supabase crée déjà le profil.
      id est l’identifiant de supabase.auth.users.
    */
    const { error: erreurProfil } = await supabase
      .from('profiles')
      .upsert(
        {
          id: utilisateur.id,
          first_name: prenom,
          last_name: nom,
          email,
          carte_etudiant: carteEtudiant,
          carte_identite: carteIdentite || null,
          role: 'user',
          status: 'pending'
        },
        {
          onConflict: 'id'
        }
      );

    if (erreurProfil) {
      throw erreurProfil;
    }

    message.textContent =
      'Inscription réussie. Vérifiez votre boîte e-mail, puis attendez la validation de votre compte par l’administrateur.';
    message.className = 'message success';

    event.target.reset();
  } catch (error) {
    console.error('Erreur inscription :', error);

    let texteErreur =
      "L'inscription a échoué. Vérifiez vos informations puis réessayez.";

    const erreurMinuscule = String(error.message || '').toLowerCase();

    if (erreurMinuscule.includes('already registered')) {
      texteErreur =
        'Cette adresse e-mail possède déjà un compte. Essayez de vous connecter.';
    }

    if (erreurMinuscule.includes('password')) {
      texteErreur =
        'Le mot de passe est refusé. Utilisez au moins 6 caractères.';
    }

    if (erreurMinuscule.includes('email')) {
      texteErreur =
        'Cette adresse e-mail est invalide ou ne peut pas être utilisée.';
    }

    if (erreurMinuscule.includes('row-level security')) {
      texteErreur =
        'Erreur de droits Supabase : la création du profil est bloquée. L’administrateur doit vérifier les politiques RLS.';
    }

    afficherErreur(message, texteErreur);
  } finally {
    bouton.disabled = false;
    bouton.textContent = 'S’inscrire';
  }
}

function afficherErreur(element, texte) {
  element.textContent = texte;
  element.className = 'message error';
    }
