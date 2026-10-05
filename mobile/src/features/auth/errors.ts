import { isAuthError } from '@supabase/supabase-js';

/** Messages en français pour les codes d'erreur Supabase Auth les plus courants. */
const authMessages: Record<string, string> = {
  invalid_credentials: 'Email ou mot de passe incorrect.',
  email_not_confirmed: "Votre adresse email n'est pas encore confirmée.",
  user_already_exists: 'Un compte existe déjà avec cette adresse email.',
  email_exists: 'Un compte existe déjà avec cette adresse email.',
  weak_password: 'Ce mot de passe est trop faible. Choisissez-en un plus long ou plus varié.',
  same_password: "Le nouveau mot de passe doit être différent de l'ancien.",
  otp_expired: 'Ce code est expiré ou incorrect. Demandez-en un nouveau.',
  over_email_send_rate_limit: 'Trop de demandes. Patientez quelques minutes avant de réessayer.',
  over_request_rate_limit: 'Trop de tentatives. Patientez quelques minutes avant de réessayer.',
  email_address_invalid: 'Adresse email invalide.',
  signup_disabled: 'Les inscriptions sont momentanément fermées.',
};

/** Codes PostgreSQL renvoyés par la base (via PostgREST). */
const databaseMessages: Record<string, string> = {
  '23505': 'Ce numéro de licence est déjà rattaché à un compte. Contactez le club si c’est une erreur.',
  '23514': 'Certaines informations sont invalides.',
  '42501': "Vous n'avez pas le droit d'effectuer cette action.",
};

/** Erreur dont le message, déjà rédigé en français, peut être montré tel quel. */
export class UserFacingError extends Error {}

/** Message lisible par l'utilisateur, quelle que soit l'origine de l'erreur. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof UserFacingError) {
    return error.message;
  }
  if (isAuthError(error) && error.code && authMessages[error.code]) {
    return authMessages[error.code];
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: unknown }).code);
    if (databaseMessages[code]) {
      return databaseMessages[code];
    }
    // Règles métier levées par la base (stage complet, licence non validée…), déjà en français.
    if (code === 'P0001' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
  }
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'Connexion impossible. Vérifiez votre accès à internet.';
  }
  return 'Une erreur est survenue. Réessayez dans quelques instants.';
}

export function isEmailNotConfirmed(error: unknown) {
  return isAuthError(error) && error.code === 'email_not_confirmed';
}
