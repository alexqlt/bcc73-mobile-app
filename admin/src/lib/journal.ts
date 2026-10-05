import type { Permission } from "@/lib/auth";
import type { Json, Tables } from "@/lib/database.types";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type AuditLog = Tables<"audit_logs">;

/** Catégories d'événements du journal (filtre), avec les tables concernées et le libellé de chaque action. */
/**
 * Catégories d'événements du journal : tables concernées, permissions qui donnent accès (même
 * correspondance que la fonction SQL readable_audit_targets, seule à faire foi) et libellés.
 */
export const eventCategories: {
  value: string;
  label: string;
  targetTypes: string[];
  permissions: Permission[];
  events: Record<string, string>;
}[] = [
  {
    value: "licences",
    label: "Licences",
    targetTypes: ["members"],
    permissions: ["MEMBER_VIEW", "MEMBER_MANAGE"],
    events: {
      "approve:members": "a validé une licence",
      "reject:members": "a refusé une licence",
    },
  },
  {
    value: "roles",
    label: "Rôles et accès",
    targetTypes: ["roles", "role_permissions", "account_roles", "accounts"],
    permissions: ["USER_MANAGE", "ROLE_MANAGE"],
    events: {
      "create_account:accounts": "a créé un compte",
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
    permissions: ["NEWS_CREATE", "NEWS_UPDATE", "NEWS_DELETE"],
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
    permissions: ["SCHEDULE_CREATE", "SCHEDULE_UPDATE", "SCHEDULE_DELETE"],
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
    permissions: ["VOLANT_MANAGE", "VOLANT_VIEW_SALES", "STAGE_CREATE", "STAGE_UPDATE", "STAGE_DELETE", "STAGE_VIEW_REGISTRATIONS"],
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
    permissions: ["USER_MANAGE", "ROLE_MANAGE"],
    events: {
      "clear:audit_logs": "a vidé le journal",
    },
  },
];

const eventLabels: Record<string, string> = Object.assign({}, ...eventCategories.map((category) => category.events));

/** Catégories que le lecteur peut consulter, d'après ses permissions. */
export function readableCategories(permissions: Set<Permission>) {
  return eventCategories.filter((category) => category.permissions.some((permission) => permissions.has(permission)));
}

/** Filtre `?categorie=…` → la catégorie choisie, ou null si absente ou inconnue. */
export function parseCategory(value: unknown) {
  return eventCategories.find((category) => category.value === value) ?? null;
}

/**
 * Contexte pour rendre une ligne lisible : emails des comptes (si l'utilisateur peut les voir),
 * noms des rôles et des permissions.
 */
export async function loadJournalContext(supabase: Supabase, canListUsers: boolean) {
  const [{ data: roles }, { data: permissions }, users, actors] = await Promise.all([
    supabase.from("roles").select("id, name"),
    supabase.from("permissions").select("code, description"),
    canListUsers ? supabase.rpc("admin_list_users") : Promise.resolve({ data: null }),
    // Auteurs des lignes visibles par le lecteur, même sans accès à la liste des comptes.
    supabase.rpc("journal_actor_emails"),
  ]);
  const emailById = new Map([...(actors.data ?? []), ...(users.data ?? [])].map((user) => [user.id, user.email]));
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
        (details as {
          new?: Record<string, string>;
          old?: Record<string, string>;
          reason?: string;
          deleted?: number;
          email?: string;
        }) ?? {};
      const data = row.new ?? row.old ?? {};
      const parts = [
        row.email,
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
