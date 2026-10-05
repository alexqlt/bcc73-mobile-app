"use server";

import { refresh } from "next/cache";

import { toActionState, type ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";

// ROLE_MANAGE est vérifié par la RLS ; le rôle Administrateur (système) n'est pas modifiable.

export async function createRole(_state: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Donnez un nom au rôle." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("roles")
    .insert({ name, description: String(formData.get("description") ?? "").trim() || null });
  if (error) {
    return error.code === "23505" ? { error: `Le rôle « ${name} » existe déjà.` } : toActionState(error);
  }
  refresh();
  return null;
}

/** Enregistre les permissions cochées : ajoute les nouvelles, retire celles décochées. */
export async function saveRolePermissions(_state: ActionState, formData: FormData): Promise<ActionState> {
  const roleId = String(formData.get("roleId"));
  const selected = new Set(formData.getAll("permissions").map(String));
  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("role_permissions")
    .select("permission_code")
    .eq("role_id", roleId);
  if (readError) return toActionState(readError);

  const currentCodes = new Set(current.map((row) => row.permission_code));
  const toAdd = [...selected].filter((code) => !currentCodes.has(code));
  const toRemove = [...currentCodes].filter((code) => !selected.has(code));

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("role_permissions")
      .insert(toAdd.map((permission_code) => ({ role_id: roleId, permission_code })));
    if (error) return toActionState(error);
  }
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .in("permission_code", toRemove);
    if (error) return toActionState(error);
  }
  refresh();
  return null;
}

export async function deleteRole(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("roles").delete().eq("id", String(formData.get("roleId"))).select();
  if (error) return toActionState(error);
  if (data.length === 0) return { error: "Ce rôle ne peut pas être supprimé." };
  refresh();
  return null;
}
