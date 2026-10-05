import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

/**
 * Client Supabase pour les Server Components et les Server Actions, connecté
 * avec la session de l'utilisateur (cookies). Un nouveau client par requête.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis un Server Component, qui ne peut pas écrire de cookie :
          // le proxy (src/proxy.ts) se charge déjà de rafraîchir la session.
        }
      },
    },
  });
}
