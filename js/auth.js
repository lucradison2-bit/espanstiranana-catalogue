import { supabase } from './config.js';

const ADMINS = [
  'lucradison2@gmail.com',
  'rcchancetick@gmail.com',
  'rakoolivert@gmail.com'
];

const isAdmin = (email) =>
  ADMINS.includes((email || '').trim().toLowerCase());

export const validerMotDePasse = (password) =>
  password.length >= 8 &&
  /[A-Za-z]/.test(password) &&
  /[0-9]/.test(password);

export const validerCarteIdentite = (valeur) =>
  !valeur || valeur.trim() === '' || valeur.replace(/D/g, '').length >= 12;

export const validerCarteEtudiant = (valeur) =>
  !valeur || valeur.trim() === '' || /^[A-Za-z0-9_-]+$/.test(valeur);

export async function inscrireUtilisateur({
  full_name,
  email,
  password,
  carte_identite = '',
  carte_etudiant = ''
}) {
  const e = email.trim().toLowerCase();

  if (!validerMotDePasse(password)) {
    throw new Error(
      'Mot de passe : 8 caractères minimum, avec une lettre et un chiffre.'
    );
  }

  if (!validerCarteIdentite(carte_identite)) {
    throw new Error("Carte d'identité : 12 chiffres minimum si renseignée.");
  }

  if (!validerCarteEtudiant(carte_etudiant)) {
    throw new Error(
      'Carte étudiant : utilisez lettres, chiffres, tirets ou underscore.'
    );
  }

  const redirect = `${location.origin}${location.pathname.replace(
    'inscription.html',
    'connexion.html'
  )}`;

  const { data, error } = await supabase.auth.signUp({
    email: e,
    password,
    options: {
      emailRedirectTo: redirect
    }
  });

  if (error) throw error;
  if (!data.user) throw new Error('Création du compte impossible.');

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: data.user.id,
        email: e,
        first_name: null,
        last_name: full_name.trim(),
        carte_identite: carte_identite.trim() || null,
        carte_etudiant: carte_etudiant.trim() || null,
        role: isAdmin(e) ? 'admin' : 'user',
        status: isAdmin(e) ? 'active' : 'pending'
      },
      { onConflict: 'id' }
    );

  if (profileError) throw profileError;

  return data;
}

export async function connecterUtilisateur({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  });

  if (error) {
    if (error.message.toLowerCase().includes('email not confirmed')) {
      throw new Error("Confirmez d'abord votre e-mail.");
    }

    throw new Error('E-mail ou mot de passe incorrect.');
  }

  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    throw new Error("Confirmez d'abord votre e-mail.");
  }

  const { data: profil, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profil) {
    await supabase.auth.signOut();
    throw new Error('Profil introuvable.');
  }

  if (profil.status === 'pending') {
    await supabase.auth.signOut();
    throw new Error(
      "Votre compte attend encore la validation d'un administrateur."
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
  return supabase.auth.signOut();
  }
