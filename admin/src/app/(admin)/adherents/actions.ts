"use server";

import { refresh } from "next/cache";

import { toActionState, type ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";

// La permission MEMBER_MANAGE est vérifiée par la base (approve_member / reject_member).

/** Réactive un compte archivé (MEMBER_MANAGE, vérifié par set_account_status). */
export async function reactivateAccount(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_account_status", {
    account: String(formData.get("accountId")),
    new_status: "active",
  });
  if (error) return toActionState(error);
  refresh();
  return null;
}

export async function approveMember(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const memberId = String(formData.get("memberId"));
  const { error } = await supabase.rpc("approve_member", { member_id: memberId });
  if (error) return toActionState(error);
  // P7-10 : prévenir l'adhérent par email (une seule fois ; un échec ne bloque pas la validation).
  const { error: emailError } = await supabase.functions.invoke("send-email", {
    body: { kind: "member_approved", id: memberId },
  });
  if (emailError) console.error("Email de licence validée non envoyé", emailError);
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
