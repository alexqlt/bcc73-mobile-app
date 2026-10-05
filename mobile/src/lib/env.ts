import { z } from 'zod';

/**
 * Variables d'environnement publiques, lues dans `.env.local` (voir `.env.example`).
 * Les accès doivent rester littéraux (`process.env.EXPO_PUBLIC_X`) pour qu'Expo les remplace au build.
 */
const envSchema = z.object({
  supabaseUrl: z.url('EXPO_PUBLIC_SUPABASE_URL doit être une URL'),
  supabasePublishableKey: z.string().min(1, 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY est vide'),
});

const result = envSchema.safeParse({
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

if (!result.success) {
  throw new Error(
    `Configuration manquante : copiez mobile/.env.example en mobile/.env.local et renseignez-le.\n${z.prettifyError(result.error)}`
  );
}

export const env = result.data;
