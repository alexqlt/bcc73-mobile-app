import type { Json, Tables } from "@/lib/database.types";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type AuditLog = Tables<"audit_logs">;

/** Types d'événements du journal (`action:table`), regroupés par domaine pour le filtre. */
export const eventGroups: { label: string; events: Record<string, string> }[] = [
  {
    label: "Licences",
    events: {
      "approve:members": "a validé une licence",
      "reject:members": "a refusé une licence",
    },
  },
  {
    label: "Rôles et accès",
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
    label: "Actualités",
    events: {
      "insert:news": "a créé une actualité",
      "update:news": "a modifié une actualité",
      "delete:news": "a supprimé une actualité",
    },
  },
  {
    label: "Planning",
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
    label: "Journal",
    events: {
      "clear:audit_logs": "a vidé le journal",
    },
  },
];

export const eventLabels: Record<string, string> = Object.assign({}, ...eventGroups.map((group) => group.events));

/** Filtre `?type=action:table` → conditions de la requête, ou null si absent ou inconnu. */
export function parseEventType(value: unknown) {
  if (typeof value !== "string" || !(value in eventLabels)) return null;
  const [action, targetType] = value.split(":");
  return { value, action, targetType };
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
