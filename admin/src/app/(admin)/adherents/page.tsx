import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { Badge, Button, EmptyState, formatDate, Input, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

import { approveMember, rejectMember } from "./actions";

type MemberStatus = Database["public"]["Enums"]["member_status"];

const filters: { value: MemberStatus | "all"; label: string }[] = [
  { value: "pending", label: "À valider" },
  { value: "approved", label: "Validés" },
  { value: "rejected", label: "Refusés" },
  { value: "all", label: "Tous" },
];

const statusBadge: Record<MemberStatus, { label: string; tone: "warning" | "success" | "danger" }> = {
  pending: { label: "En attente", tone: "warning" },
  approved: { label: "Validé", tone: "success" },
  rejected: { label: "Refusé", tone: "danger" },
};

export const metadata = { title: "Adhérents — BCC73 Administration" };

/** P2-07 : liste des adhérents et validation des licences (remplace la procédure SQL). */
export default async function AdherentsPage({ searchParams }: PageProps<"/adherents">) {
  const viewer = await requirePermission("MEMBER_VIEW");
  const canManage = viewer.permissions.has("MEMBER_MANAGE");
  const { statut } = await searchParams;
  const filter = filters.find((item) => item.value === statut)?.value ?? "pending";

  const supabase = await createClient();
  const { data: members, error } = await supabase.rpc("admin_list_members");
  if (error) throw error;

  const visible = filter === "all" ? members : members.filter((member) => member.status === filter);

  return (
    <>
      <PageHeader eyebrow="Club" title="Adhérents">
        <nav className="flex flex-wrap gap-1">
          {filters.map((item) => (
            <Link
              key={item.value}
              href={`/adherents?statut=${item.value}`}
              className={`border-2 px-3 py-1 font-heading text-xs uppercase tracking-wider ${
                item.value === filter ? "border-foreground bg-foreground text-background" : "border-border"
              }`}
            >
              {item.label} ({item.value === "all" ? members.length : members.filter((m) => m.status === item.value).length})
            </Link>
          ))}
        </nav>
      </PageHeader>

      {visible.length === 0 ? (
        <EmptyState>Aucun adhérent dans cette liste.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((member) => (
            <li key={member.id} className="flex flex-col gap-4 bg-surface p-5 lg:flex-row lg:items-center">
              <div className="flex-1">
                <p className="font-bold">
                  {member.first_name} {member.last_name.toUpperCase()}
                  {!member.is_account_holder && <span className="ml-2 text-sm font-normal text-muted">(rattaché au compte)</span>}
                </p>
                <p className="text-sm text-muted">
                  Licence <span className="font-mono text-foreground">{member.license_number}</span> · {member.email} ·
                  demande du {formatDate(member.created_at)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone={statusBadge[member.status].tone}>{statusBadge[member.status].label}</Badge>
                  {member.reviewed_at && <span className="text-xs text-muted">le {formatDate(member.reviewed_at)}</span>}
                  {member.rejection_reason && <span className="text-sm text-red-700 dark:text-red-400">{member.rejection_reason}</span>}
                </div>
              </div>

              {canManage && (
                <div className="flex flex-col gap-2 lg:w-[28rem]">
                  {member.status !== "approved" && (
                    <ActionForm action={approveMember}>
                      <input type="hidden" name="memberId" value={member.id} />
                      <Button type="submit" variant="accent" className="w-full">
                        Valider la licence
                      </Button>
                    </ActionForm>
                  )}
                  {member.status !== "rejected" && (
                    <ActionForm action={rejectMember} className="flex flex-wrap gap-2">
                      <input type="hidden" name="memberId" value={member.id} />
                      <Input name="reason" placeholder="Motif du refus" aria-label="Motif du refus" className="min-w-0 flex-1" />
                      <Button type="submit" variant="danger">
                        Refuser
                      </Button>
                    </ActionForm>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
