// Fournit le `localStorage` (adossé à SQLite) dans lequel Supabase conserve la session sur le téléphone.
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { env } from './env';

/**
 * Client Supabase de l'application. À n'utiliser que depuis `src/features/` :
 * les écrans passent par les hooks TanStack Query de chaque domaine.
 */
export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    // Absent pendant le rendu statique web (côté serveur) : la session n'est alors pas persistée.
    storage: typeof localStorage === 'undefined' ? undefined : localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (Platform.OS !== 'web') {
  // Le jeton n'est rafraîchi que lorsque l'app est au premier plan.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
