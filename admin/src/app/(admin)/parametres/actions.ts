"use server";

import { refresh } from "next/cache";

import { toActionState, type ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";

/** Active ou coupe les notifications push (rôle Administrateur, vérifié par la RLS). */
export async function setPushNotifications(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .update({ push_notifications_enabled: formData.get("enabled") === "true" })
    .eq("id", true)
    .select("id");
  if (error) return toActionState(error);
  if (data.length === 0) return { error: "Seul un administrateur peut modifier les paramètres." };
  refresh();
  return null;
}
