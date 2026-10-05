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
  /** Prénom et nom du titulaire du compte (ou du premier membre), l'email à défaut. */
  name: string;
  initials: string;
  avatarPath: string | null;
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

  const [{ data: permissions }, { data: members }, { data: account }] = await Promise.all([
    supabase.rpc("my_permissions"),
    // Ses propres membres : la RLS les limite au compte connecté, même pour un responsable.
    supabase
      .from("members")
      .select("first_name, last_name")
      .eq("account_id", data.claims.sub)
      .order("is_account_holder", { ascending: false })
      .order("created_at")
      .limit(1),
    supabase.from("accounts").select("avatar_path").eq("id", data.claims.sub).maybeSingle(),
  ]);
  const email = String(data.claims.email ?? "");
  const member = members?.[0];
  return {
    email,
    name: member ? `${member.first_name} ${member.last_name}` : email,
    initials: (member ? `${member.first_name[0]}${member.last_name[0]}` : email.charAt(0)).toUpperCase(),
    avatarPath: account?.avatar_path ?? null,
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

/**
 * Lecture du journal : chaque responsable y voit les événements de son domaine (licences,
 * actualités, planning, boutique, stages, rôles), filtrés par la base.
 */
export const JOURNAL_PERMISSIONS: Permission[] = [
  "MEMBER_VIEW",
  "MEMBER_MANAGE",
  "USER_MANAGE",
  "ROLE_MANAGE",
  "NEWS_CREATE",
  "NEWS_UPDATE",
  "NEWS_DELETE",
  "SCHEDULE_CREATE",
  "SCHEDULE_UPDATE",
  "SCHEDULE_DELETE",
  "VOLANT_MANAGE",
  "VOLANT_VIEW_SALES",
  "STAGE_CREATE",
  "STAGE_UPDATE",
  "STAGE_DELETE",
  "STAGE_VIEW_REGISTRATIONS",
];

/** Rôle Administrateur (affichage seulement : la base vérifie de son côté). */
export const isAdmin = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin");
  return data === true;
});

/** Boutique : gestion des produits ou suivi des ventes. */
export const SHOP_PERMISSIONS: Permission[] = ["VOLANT_MANAGE", "VOLANT_VIEW_SALES"];

/** Stages : création, modification, suppression ou suivi des inscriptions. */
export const STAGE_PERMISSIONS: Permission[] = ["STAGE_CREATE", "STAGE_UPDATE", "STAGE_DELETE", "STAGE_VIEW_REGISTRATIONS"];
