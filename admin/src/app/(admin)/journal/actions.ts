"use server";

import { refresh } from "next/cache";

import { toActionState, type ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";

/** Vide le journal. La base n'accepte que le rôle Administrateur et garde une trace de l'effacement. */
export async function clearJournal(): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("clear_audit_logs");
  if (error) return toActionState(error);
  refresh();
  return null;
}
