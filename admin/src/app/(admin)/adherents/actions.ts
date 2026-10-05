"use server";

import { refresh } from "next/cache";

import { toActionState, type ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";

// La permission MEMBER_MANAGE est vérifiée par la base (approve_member / reject_member).

export async function approveMember(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_member", { member_id: String(formData.get("memberId")) });
  if (error) return toActionState(error);
  refresh();
  return null;
}

export async function rejectMember(_state: ActionState, formData: FormData): Promise<ActionState> {
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    return { error: "Indiquez le motif du refus : il sera affiché à l'adhérent." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_member", { member_id: String(formData.get("memberId")), reason });
  if (error) return toActionState(error);
  refresh();
  return null;
}
