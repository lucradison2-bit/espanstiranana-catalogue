// js/auth.js
import { supabase } from './config.js';

// --- Validations ---

export function validerMotDePasse(mdp) {
  const aLettre = /[A-Za-z]/.test(mdp);
  const aChiffre = /[0-9]/.test(mdp);
  return aLettre && aChiffre && mdp.length >= 8;
}

export function validerCarteIdentite(valeur) {
  if (!valeur || valeur.trim() === '') {
    return true; // facultatif
  }
  const chiffres = valeur.replace(/D/g, '');
  return chiffres.length >= 12;
}

export function validerCarteEtudiant(valeur) {
  if (!valeur || valeur.trim() === '') {
    return true; // facultatif
  }
  return /^[A-Za-z0-9]+$/.test(valeur);
}

// --- Inscription ---

export async function inscrireUtilisateur({
  email,
  password,
  first_name,
  last_name,
  carte_identite,
  carte_etudiant
}) {
  if (!validerMotDePasse(password)) {
    throw new Error(
      "Le mot de passe doit contenir au moins 8 caractères, dont 1 lettre et 1 chiffre."
    );
  }

  if (!validerCarteIdentite(carte_identite)) {
    throw new Error(
      "Le numéro de carte d'identité doit contenir au moins 12 chiffres."
    );
  }

  if (!validerCarteEtudiant(carte_etudiant)) {
    throw new Error(
      "La carte étudiant ne peut contenir que des lettres et des chiffres."
    );
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError) {
    throw authError;
  }

  const user = authData.user;
  if (!user) {
    throw new Error("L'inscription a échoué (pas de user).");
  }

  const { error: profileError } = await supabase.from('profiles').insert({
    id: user.id,
    email,
    first_name,
    last_name,
    carte_identite: carte_identite || null,
    carte_etudiant: carte_etudiant || null,
    role: 'user',
    status: 'pending'
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(user.id);
    throw profileError;
  }

  return authData;
}

// --- Connexion ---

export async function connecterUtilisateur({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw error;
  }

  const user = data.user;
  if (!user) {
    throw new Error("La connexion a échoué (pas de user).");
  }

  // Si "Confirm email" est activé dans Supabase, on vérifie :
  if (!user.email_confirmed_at) {
    await supabase.auth.signOut();
    throw new Error("Veuillez confirmer votre adresse e-mail.");
  }

  const { data: profil } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (!profil) {
    await supabase.auth.signOut();
    throw new Error("Profil introuvable. Contactez l'administrateur.");
  }

  if (profil.status !== 'active') {
    await supabase.auth.signOut();
    throw new Error("Votre compte n'est pas encore activé par l'administrateur.");
  }

  return data;
}

// --- Utilisateur courant ---

export async function getUtilisateurCourant() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profil } = await supabase
    .from('profiles')
    .select('role, status, first_name, last_name, email')
    .eq('id', user.id)
    .single();

  return { user, profil };
}

// --- Déconnexion ---

export async function deconnecterUtilisateur() {
  await supabase.auth.signOut();
}
