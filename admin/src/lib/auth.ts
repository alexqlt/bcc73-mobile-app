import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type Permission =
  | "NEWS_READ"
  | "NEWS_CREATE"
  | "NEWS_UPDATE"
  | "NEWS_DELETE"
  | "SCHEDULE_READ"
  | "SCHEDULE_CREATE"
  | "SCHEDULE_UPDATE"
  | "SCHEDULE_DELETE"
  | "STAGE_READ"
  | "STAGE_CREATE"
  | "STAGE_UPDATE"
  | "STAGE_DELETE"
  | "STAGE_VIEW_REGISTRATIONS"
  | "VOLANT_VIEW_SALES"
  | "VOLANT_MANAGE"
  | "MEMBER_VIEW"
  | "MEMBER_MANAGE"
  | "PAYMENT_VIEW"
  | "USER_MANAGE"
  | "ROLE_MANAGE";

export type Viewer = {
  email: string;
  permissions: Set<Permission>;
};

/**
 * Utilisateur connecté et ses permissions, lues dans la base (une fois par requête).
 * Ne sert qu'à l'affichage : chaque lecture ou écriture est de toute façon contrôlée par la base.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/connexion");
  }

  const { data: permissions } = await supabase.rpc("my_permissions");
  return {
    email: String(data.claims.email ?? ""),
    permissions: new Set((permissions ?? []) as Permission[]),
  };
});

/** Interrompt la page si l'utilisateur n'a pas la permission. */
export async function requirePermission(permission: Permission) {
  const viewer = await getViewer();
  if (!viewer.permissions.has(permission)) {
    redirect("/");
  }
  return viewer;
}

/** Interrompt la page si l'utilisateur n'a aucune des permissions. */
export async function requireAnyPermission(permissions: Permission[]) {
  const viewer = await getViewer();
  if (!permissions.some((permission) => viewer.permissions.has(permission))) {
    redirect("/");
  }
  return viewer;
}

export const NEWS_PERMISSIONS: Permission[] = ["NEWS_CREATE", "NEWS_UPDATE", "NEWS_DELETE"];

export const SCHEDULE_PERMISSIONS: Permission[] = ["SCHEDULE_CREATE", "SCHEDULE_UPDATE", "SCHEDULE_DELETE"];

/** Lecture du journal : gestion des utilisateurs ou des rôles. */
export const JOURNAL_PERMISSIONS: Permission[] = ["USER_MANAGE", "ROLE_MANAGE"];

/** Rôle Administrateur (affichage seulement : la base vérifie de son côté). */
export const isAdmin = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin");
  return data === true;
});
