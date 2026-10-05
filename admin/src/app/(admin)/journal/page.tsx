import { EmptyState, formatDate, PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Journal — BCC73 Administration" };

const actionLabels: Record<string, string> = {
  "approve:members": "a validé une licence",
  "reject:members": "a refusé une licence",
  "insert:roles": "a créé un rôle",
  "update:roles": "a modifié un rôle",
  "delete:roles": "a supprimé un rôle",
  "insert:role_permissions": "a ajouté une permission à un rôle",
  "delete:role_permissions": "a retiré une permission d'un rôle",
  "insert:account_roles": "a attribué un rôle",
  "delete:account_roles": "a retiré un rôle",
  "insert:news": "a créé une actualité",
  "update:news": "a modifié une actualité",
  "delete:news": "a supprimé une actualité",
  "insert:schedule_periods": "a créé une période du planning",
  "update:schedule_periods": "a modifié une période du planning",
  "delete:schedule_periods": "a supprimé une période du planning",
  "insert:schedules": "a ajouté un créneau",
  "update:schedules": "a modifié un créneau",
  "delete:schedules": "a supprimé un créneau",
  "insert:schedule_cancellations": "a annulé un créneau",
  "delete:schedule_cancellations": "a rétabli un créneau",
};

/** P2-11 : journal des actions administratives (100 dernières). */
export default async function JournalPage() {
  const viewer = await getViewer();
  if (!viewer.permissions.has("USER_MANAGE") && !viewer.permissions.has("ROLE_MANAGE")) {
    redirect("/");
  }
  const supabase = await createClient();

  const [{ data: logs, error }, { data: roles }, { data: permissions }, users] = await Promise.all([
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("roles").select("id, name"),
    supabase.from("permissions").select("code, description"),
    viewer.permissions.has("USER_MANAGE") ? supabase.rpc("admin_list_users") : Promise.resolve({ data: null }),
  ]);
  if (error) throw error;

  const emailById = new Map((users.data ?? []).map((user) => [user.id, user.email]));
  const roleNameById = new Map((roles ?? []).map((role) => [role.id, role.name]));
  const permissionById = new Map((permissions ?? []).map((p) => [p.code, p.description]));

  /** Détail lisible de l'élément concerné, à partir de la ligne enregistrée. */
  function describe(details: Json) {
    const row = (details as { new?: Record<string, string>; old?: Record<string, string>; reason?: string }) ?? {};
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
    ];
    return parts.filter(Boolean).join(" · ");
  }

  return (
    <>
      <PageHeader eyebrow="Sécurité" title="Journal" />
      {logs.length === 0 ? (
        <EmptyState>Aucune action enregistrée pour l&apos;instant.</EmptyState>
      ) : (
        <ol className="flex flex-col divide-y divide-border bg-surface">
          {logs.map((log) => (
            <li key={log.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-4">
              <time className="w-36 shrink-0 text-sm text-muted">{formatDate(log.created_at)}</time>
              <p>
                <strong>{log.actor_id ? (emailById.get(log.actor_id) ?? "Un responsable") : "Supabase (SQL)"}</strong>{" "}
                {actionLabels[`${log.action}:${log.target_type}`] ?? `${log.action} ${log.target_type}`}
                <span className="text-muted"> {describe(log.details)}</span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
