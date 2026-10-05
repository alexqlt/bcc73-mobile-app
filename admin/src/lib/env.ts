/**
 * Variables d'environnement publiques, lues dans `.env.local` (voir `.env.example`).
 * Les accès restent littéraux pour que Next.js les remplace au build.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Configuration manquante : copiez admin/.env.example en admin/.env.local et renseignez l'URL et la clé Supabase."
  );
}

export const env = { supabaseUrl, supabasePublishableKey };
