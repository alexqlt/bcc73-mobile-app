/** Compte archivé ou bloqué : la personne doit passer au club. */
export const ACCOUNT_DISABLED_MESSAGE =
  "Votre compte a été archivé ou bloqué. Rendez-vous au club pour régler la situation.";

/** Résultat d'une Server Action affiché par <ActionForm>. */
export type ActionState = { error?: string } | null;

type ErrorLike = { code?: string; message?: string } | null | undefined;

/** Message en français à partir d'une erreur Supabase (PostgREST / PostgreSQL / Auth). */
export function toErrorMessage(error: ErrorLike): string {
  switch (error?.code) {
    case "42501":
      return "Vous n'avez pas le droit d'effectuer cette action.";
    case "23505":
      return "Cet élément existe déjà.";
    case "23514":
      return "Certaines informations sont invalides.";
    case "P0001":
      // Messages métier levés par la base, déjà rédigés en français.
      return error.message ?? "Action impossible.";
    case "invalid_credentials":
      return "Email ou mot de passe incorrect.";
    case "user_banned":
      return ACCOUNT_DISABLED_MESSAGE;
    case "email_not_confirmed":
      return "Adresse email non confirmée : terminez l'inscription depuis l'application.";
    default:
      return "Une erreur est survenue. Réessayez dans quelques instants.";
  }
}

/** Transforme le résultat d'un appel Supabase en état d'action. */
export function toActionState(error: ErrorLike): ActionState {
  return error ? { error: toErrorMessage(error) } : null;
}
