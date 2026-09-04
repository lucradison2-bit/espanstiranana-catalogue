import { supabase } from './config.js';

const ADMINS = [
  'lucradison2@gmail.com',
  'rcchancetick@gmail.com',
  'rakoolivert@gmail.com'
];

function estAdminEmail(email) {
  return ADMINS.includes((email || '').trim().toLowerCase());
}

export function validerMotDePasse(password) {
  return (
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

export function validerCarteIdentite(valeur) {
  if (!valeur || valeur.trim() === '') return true;

  return valeur.replace(/D/g, '').length >= 12;
}

export function validerCarteEtudiant(valeur) {
  if (!valeur || valeur.trim() === '') return true;

  return /^[A-Za-z0-9_-]+$/.test(valeur);
}

export async function inscrireUtilisateur({
  first_name,
  last_name,
  email,
  password,
  carte_identite,
  carte_etudiant
}) {
  const emailNettoye = email.trim().toLowerCase();

  if (!validerMotDePasse(password)) {
    throw new Error(
      'Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre.'
    );
  }

  if (!validerCarteIdentite(carte_identite)) {
    throw new Error(
      "La carte d'identité doit contenir au moins 12 chiffres si elle est renseignée."
    );
  }

  if (!validerCarteEtudiant(carte_etudiant)) {
    throw new Error(
      'La carte étudiant accepte seulement lettres, chiffres, tirets et _.'
    );
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: emailNettoye,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}${window.location.pathname.replace(
        'inscription.html',
        'connexion.html'
      )}`
    }
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Impossible de créer le compte.');

  const admin = estAdminEmail(emailNettoye);

  const { error: profilError } = await supabase.from('profiles').upsert(
    {
      id: authData.user.id,
      email: emailNettoye,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      carte_identite: carte_identite.trim() || null,
      carte_etudiant: carte_etudiant.trim() || null,
      role: admin ? 'admin' : 'user',
      status: admin ? 'active' : 'pending'
    },
    { onConflict: 'id' }
  );

  if (profilError) throw profilError;

  return authData;
}

export async function connecterUtilisateur({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  });

  if (error) {
    if (error.message.toLowerCase().includes('email not confirmed')) {
      throw new Error(
        'Votre e-mail n’est pas confirmé. Vérifiez votre boîte e-mail et cliquez sur le lien reçu.'
      );
    }

    throw new Error('Adresse e-mail ou mot de passe incorrect.');
  }

  if (!data.user) throw new Error('Connexion impossible.');

  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut();

    throw new Error(
      "Vous devez confirmer votre adresse e-mail avant de vous connecter."
    );
  }

  const { data: profil, error: profilError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profilError || !profil) {
    await supabase.auth.signOut();
    throw new Error('Profil utilisateur introuvable.');
  }

  if (profil.status === 'pending') {
    await supabase.auth.signOut();

    throw new Error(
      "Votre e-mail est confirmé, mais votre compte attend la validation d'un administrateur."
    );
  }

  if (profil.status === 'rejected') {
    await supabase.auth.signOut();
    throw new Error('Votre compte a été refusé par un administrateur.');
  }

  return { user: data.user, profil };
}

export async function getUtilisateurCourant() {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profil } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { user, profil };
}

export async function deconnecterUtilisateur() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
