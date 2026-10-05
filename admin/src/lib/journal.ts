import type { Permission } from "@/lib/auth";
import type { Tables } from "@/lib/database.types";
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
    label: "Boutique et événements",
    targetTypes: ["products", "stages", "stage_prices", "event_default_prices"],
    permissions: ["VOLANT_MANAGE", "VOLANT_VIEW_SALES", "STAGE_CREATE", "STAGE_UPDATE", "STAGE_DELETE", "STAGE_VIEW_REGISTRATIONS"],
    events: {
      "insert:products": "a ajouté un article à la boutique",
      "update:products": "a modifié un article de la boutique",
      "delete:products": "a supprimé un article de la boutique",
      "insert:stages": "a créé un événement",
      "update:stages": "a modifié un événement",
      "delete:stages": "a supprimé un événement",
      "insert:stage_prices": "a ajouté un tarif d'événement",
      "update:stage_prices": "a modifié un tarif d'événement",
      "delete:stage_prices": "a supprimé un tarif d'événement",
      "update:event_default_prices": "a modifié les tarifs par défaut des événements",
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
 * Contexte pour rendre une ligne lisible : prénom et nom des personnes citées (auteurs et comptes
 * concernés, l'email seulement pour un compte sans membre), noms des rôles et des permissions.
 */
export async function loadJournalContext(supabase: Supabase) {
  const [{ data: roles }, { data: permissions }, { data: people }] = await Promise.all([
    supabase.from("roles").select("id, name"),
    supabase.from("permissions").select("code, description"),
    supabase.rpc("journal_people"),
  ]);
  const nameById = new Map((people ?? []).map((person) => [person.id, person.display_name]));
  const roleNameById = new Map((roles ?? []).map((role) => [role.id, role.name]));
  const permissionById = new Map((permissions ?? []).map((p) => [p.code, p.description]));

  return {
    /** Auteur de l'action. */
    actor(log: AuditLog) {
      return log.actor_id ? (nameById.get(log.actor_id) ?? "Un responsable") : "Supabase (SQL)";
    },
    /** Libellé de l'action. */
    action(log: AuditLog) {
      return eventLabels[`${log.action}:${log.target_type}`] ?? `${log.action} ${log.target_type}`;
    },
    /** Détail lisible de l'élément concerné, à partir de la ligne enregistrée. */
    describe(log: AuditLog) {
      const row = (log.details as { new?: Record<string, string>; old?: Record<string, string>; reason?: string; deleted?: number }) ?? {};
      const data = row.new ?? row.old ?? {};
      const parts = [
        // Compte créé depuis le back-office.
        log.target_type === "accounts" && log.target_id && (nameById.get(log.target_id) ?? "un utilisateur"),
        data.name,
        data.title,
        data.date,
        data.start_date && (data.start_date === data.end_date ? data.start_date : `${data.start_date} → ${data.end_date}`),
        data.role_id && roleNameById.get(data.role_id),
        data.permission_code && (permissionById.get(data.permission_code) ?? data.permission_code),
        data.account_id && (nameById.get(data.account_id) ?? "un utilisateur"),
        row.reason && `motif : ${row.reason}`,
        row.deleted !== undefined && `${row.deleted} entrée(s) effacée(s)`,
      ];
      return parts.filter(Boolean).join(" · ");
    },
  };
}
