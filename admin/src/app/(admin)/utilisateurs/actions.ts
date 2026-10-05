"use server";

import { refresh } from "next/cache";

import { toActionState, type ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";

// USER_MANAGE (et le rôle Administrateur pour le rôle système) est vérifié par la RLS d'account_roles.

export async function grantRole(_state: ActionState, formData: FormData): Promise<ActionState> {
  const roleId = String(formData.get("roleId") ?? "");
  if (!roleId) return { error: "Choisissez un rôle." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("account_roles")
    .insert({ account_id: String(formData.get("accountId")), role_id: roleId });
  if (error) return toActionState(error);
  refresh();
  return null;
}

export async function revokeRole(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_roles")
    .delete()
    .eq("account_id", String(formData.get("accountId")))
    .eq("role_id", String(formData.get("roleId")))
    .select();
  if (error) return toActionState(error);
  // La RLS filtre silencieusement les suppressions interdites : aucune ligne supprimée = refus.
  if (data.length === 0) return { error: "Vous n'avez pas le droit de retirer ce rôle." };
  refresh();
  return null;
}

export type CreateAccountState = { error?: string; created?: { email: string; password: string } } | null;

/**
 * Crée un compte (adresse confirmée, mot de passe provisoire) et lui attribue les rôles cochés,
 * par l'Edge Function admin-create-account qui vérifie USER_MANAGE et les règles des rôles.
 */
export async function createAccount(_state: CreateAccountState, formData: FormData): Promise<CreateAccountState> {
  // « Créer un autre compte » : retour au formulaire vide.
  if (formData.get("reset")) return null;
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Indiquez l'adresse email de la personne." };

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke<{ email: string; password: string }>("admin-create-account", {
    body: { email, roleIds: formData.getAll("roleIds").map(String) },
  });
  if (error) {
    // Message de la fonction (adresse déjà utilisée, droits…), déjà en français.
    const body = "context" in error && error.context instanceof Response ? await error.context.json().catch(() => null) : null;
    return { error: body?.error ?? "Le compte n'a pas pu être créé." };
  }
  refresh();
  return { created: { email: data!.email, password: data!.password } };
}

