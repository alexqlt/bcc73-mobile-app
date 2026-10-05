import type { Json, Tables } from "@/lib/database.types";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type AuditLog = Tables<"audit_logs">;

/** Catégories d'événements du journal (filtre), avec les tables concernées et le libellé de chaque action. */
export const eventCategories: { value: string; label: string; targetTypes: string[]; events: Record<string, string> }[] = [
  {
    value: "licences",
    label: "Licences",
    targetTypes: ["members"],
    events: {
      "approve:members": "a validé une licence",
      "reject:members": "a refusé une licence",
    },
  },
  {
    value: "roles",
    label: "Rôles et accès",
    targetTypes: ["roles", "role_permissions", "account_roles"],
    events: {
      "insert:roles": "a créé un rôle",
      "update:roles": "a modifié un rôle",
      "delete:roles": "a supprimé un rôle",
      "insert:role_permissions": "a ajouté une permission à un rôle",
      "delete:role_permissions": "a retiré une permission d'un rôle",
      "insert:account_roles": "a attribué un rôle",
      "delete:account_roles": "a retiré un rôle",
    },
  },
  {
    value: "actualites",
    label: "Actualités",
    targetTypes: ["news"],
    events: {
      "insert:news": "a créé une actualité",
      "update:news": "a modifié une actualité",
      "delete:news": "a supprimé une actualité",
    },
  },
  {
    value: "planning",
    label: "Planning",
    targetTypes: ["schedule_periods", "schedules", "schedule_cancellations"],
    events: {
      "insert:schedule_periods": "a créé une période du planning",
      "update:schedule_periods": "a modifié une période du planning",
      "delete:schedule_periods": "a supprimé une période du planning",
      "insert:schedules": "a ajouté un créneau",
      "update:schedules": "a modifié un créneau",
      "delete:schedules": "a supprimé un créneau",
      "insert:schedule_cancellations": "a annulé un créneau",
      "delete:schedule_cancellations": "a rétabli un créneau",
    },
  },
  {
    value: "boutique-stages",
    label: "Boutique et stages",
    targetTypes: ["products", "stages", "stage_prices"],
    events: {
      "insert:products": "a ajouté un article à la boutique",
      "update:products": "a modifié un article de la boutique",
      "delete:products": "a supprimé un article de la boutique",
      "insert:stages": "a créé un stage",
      "update:stages": "a modifié un stage",
      "delete:stages": "a supprimé un stage",
      "insert:stage_prices": "a ajouté un tarif de stage",
      "update:stage_prices": "a modifié un tarif de stage",
      "delete:stage_prices": "a supprimé un tarif de stage",
    },
  },
  {
    value: "journal",
    label: "Journal",
    targetTypes: ["audit_logs"],
    events: {
      "clear:audit_logs": "a vidé le journal",
    },
  },
];

const eventLabels: Record<string, string> = Object.assign({}, ...eventCategories.map((category) => category.events));

/** Filtre `?categorie=…` → la catégorie choisie, ou null si absente ou inconnue. */
export function parseCategory(value: unknown) {
  return eventCategories.find((category) => category.value === value) ?? null;
}

/**
 * Contexte pour rendre une ligne lisible : emails des comptes (si l'utilisateur peut les voir),
 * noms des rôles et des permissions.
 */
export async function loadJournalContext(supabase: Supabase, canListUsers: boolean) {
  const [{ data: roles }, { data: permissions }, users] = await Promise.all([
    supabase.from("roles").select("id, name"),
    supabase.from("permissions").select("code, description"),
    canListUsers ? supabase.rpc("admin_list_users") : Promise.resolve({ data: null }),
  ]);
  const emailById = new Map((users.data ?? []).map((user) => [user.id, user.email]));
  const roleNameById = new Map((roles ?? []).map((role) => [role.id, role.name]));
  const permissionById = new Map((permissions ?? []).map((p) => [p.code, p.description]));

  return {
    /** Auteur de l'action. */
    actor(log: AuditLog) {
      return log.actor_id ? (emailById.get(log.actor_id) ?? "Un responsable") : "Supabase (SQL)";
    },
    /** Libellé de l'action. */
    action(log: AuditLog) {
      return eventLabels[`${log.action}:${log.target_type}`] ?? `${log.action} ${log.target_type}`;
    },
    /** Détail lisible de l'élément concerné, à partir de la ligne enregistrée. */
    describe(details: Json) {
      const row =
        (details as { new?: Record<string, string>; old?: Record<string, string>; reason?: string; deleted?: number }) ?? {};
      const data = row.new ?? row.old ?? {};
      const parts = [
        data.name,
        data.title,
        data.date,
        data.start_date && (data.start_date === data.end_date ? data.start_date : `${data.start_date} → ${data.end_date}`),
        data.role_id && roleNameById.get(data.role_id),
        data.permission_code && (permissionById.get(data.permission_code) ?? data.permission_code),
        data.account_id && (emailById.get(data.account_id) ?? "un utilisateur"),
        row.reason && `motif : ${row.reason}`,
        row.deleted !== undefined && `${row.deleted} entrée(s) effacée(s)`,
      ];
      return parts.filter(Boolean).join(" · ");
    },
  };
}
