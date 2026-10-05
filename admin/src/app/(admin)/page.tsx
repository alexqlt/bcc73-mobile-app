import Link from "next/link";

import { Card, PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const viewer = await getViewer();
  const supabase = await createClient();

  const members = viewer.permissions.has("MEMBER_VIEW") ? (await supabase.rpc("admin_list_members")).data : null;
  const users = viewer.permissions.has("USER_MANAGE") ? (await supabase.rpc("admin_list_users")).data : null;

  const pending = members?.filter((member) => member.status === "pending").length ?? 0;
  const approved = members?.filter((member) => member.status === "approved").length ?? 0;

  return (
    <>
      <PageHeader eyebrow="Badminton Club de Chambéry" title="Tableau de bord" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members && (
          <>
            <Stat
              label="Licences à valider"
              value={pending}
              highlighted={pending > 0}
              href="/adherents?statut=pending"
            />
            <Stat label="Adhérents validés" value={approved} href="/adherents?statut=approved" />
          </>
        )}
        {users && <Stat label="Comptes créés" value={users.length} href="/utilisateurs" />}
      </div>
      {!members && !users && (
        <p className="text-muted">Les écrans liés à vos rôles apparaîtront ici au fil des prochaines phases.</p>
      )}
    </>
  );
}

function Stat({ label, value, href, highlighted }: { label: string; value: number; href: string; highlighted?: boolean }) {
  return (
    <Link href={href} className="block transition hover:opacity-80">
      <Card highlighted={highlighted}>
        <p className="font-heading text-sm uppercase tracking-widest text-muted">{label}</p>
        <p className="mt-2 font-heading text-5xl">{value}</p>
      </Card>
    </Link>
  );
}
