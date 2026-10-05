import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/** Paramètres généraux de l'application (une ligne, lue une fois par requête). */
export const getAppSettings = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("app_settings").select("push_notifications_enabled, updated_at").maybeSingle();
  if (error) throw error;
  return { pushEnabled: data?.push_notifications_enabled ?? false, updatedAt: data?.updated_at ?? null };
});
