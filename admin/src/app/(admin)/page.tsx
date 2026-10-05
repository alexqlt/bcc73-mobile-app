import Link from "next/link";

import { ColumnChart, type ChartSeries } from "@/components/charts/column-chart";
import { Card, PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { accountActivity, loadSalesStats, weeklyLicenceRequests } from "@/lib/dashboard-stats";
import { formatEuros } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";

const ACTIVE_DAYS = 30;

/** Tableau de bord : chaque bloc n'apparaît qu'aux rôles concernés (et la base ne renvoie que leurs données). */
export default async function DashboardPage() {
  const viewer = await getViewer();
  const can = (permission: Parameters<typeof viewer.permissions.has>[0]) => viewer.permissions.has(permission);
  const showShop = can("PAYMENT_VIEW") || can("VOLANT_VIEW_SALES");
  const showStages = can("PAYMENT_VIEW") || can("STAGE_VIEW_REGISTRATIONS");
  const supabase = await createClient();

  const [members, users, sales] = await Promise.all([
    can("MEMBER_VIEW") ? supabase.rpc("admin_list_members").then((result) => result.data) : null,
    can("USER_MANAGE") ? supabase.rpc("admin_list_users").then((result) => result.data) : null,
    showShop || showStages ? loadSalesStats(supabase) : null,
  ]);

  const pending = members?.filter((member) => member.status === "pending").length ?? 0;
  const approved = members?.filter((member) => member.status === "approved").length ?? 0;

  // Comptes actifs : connectés ces 30 derniers jours ; comptes sans aucune licence validée.
  const activity = users ? accountActivity(users, members, ACTIVE_DAYS) : null;

  const requests = members ? weeklyLicenceRequests(members.map((member) => member.created_at)) : null;
  const requestsTotal = requests?.reduce((sum, week) => sum + week.values.requests, 0) ?? 0;

  const salesSeries: ChartSeries[] = [
    ...(showShop ? [{ key: "shop", label: "Volants", color: "--series-1" }] : []),
    ...(showStages ? [{ key: "stages", label: "Stages", color: "--series-2" }] : []),
  ];

  return (
    <>
      <PageHeader eyebrow="Badminton Club de Chambéry" title="Tableau de bord" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {members && (
          <>
            <Stat label="Licences à valider" value={pending} highlighted={pending > 0} href="/adherents?statut=pending" />
            <Stat label="Adhérents validés" value={approved} href="/adherents?statut=approved" />
          </>
        )}
        {users && (
          <>
            <Stat label="Comptes créés" value={users.length} href="/utilisateurs" />
            <Stat
              label={`Comptes actifs (${ACTIVE_DAYS} j)`}
              value={activity?.active ?? 0}
              detail={[
                `sur ${users.length} compte(s)`,
                activity?.withoutLicence != null ? `${activity.withoutLicence} sans licence validée` : null,
              ]}
              href="/utilisateurs"
            />
          </>
        )}
      </div>

      {sales && salesSeries.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl">Ventes de la saison {sales.season}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {showShop && (
              <Stat
                label="Volants"
                value={formatEuros(sales.totals.shop)}
                detail={[
                  `${sales.totals.tubes} tube(s) · ${sales.totals.shopOrders} commande(s)`,
                  monthDelta(sales.thisMonth.shop, sales.previousMonth.shop, sales.thisMonth.label, sales.previousMonth.label),
                ]}
                href="/boutique?ventes=toutes"
              />
            )}
            {showStages && (
              <Stat
                label="Stages"
                value={formatEuros(sales.totals.stages)}
                detail={[
                  `${sales.totals.registrations} inscription(s)`,
                  monthDelta(sales.thisMonth.stages, sales.previousMonth.stages, sales.thisMonth.label, sales.previousMonth.label),
                ]}
                href="/stages"
              />
            )}
            {showShop && showStages && (
              <Stat
                label="Total"
                value={formatEuros(sales.totals.shop + sales.totals.stages)}
                highlighted
                detail={[
                  monthDelta(
                    sales.thisMonth.shop + sales.thisMonth.stages,
                    sales.previousMonth.shop + sales.previousMonth.stages,
                    sales.thisMonth.label,
                    sales.previousMonth.label
                  ),
                ]}
                href={can("PAYMENT_VIEW") ? "/paiements" : "/boutique"}
              />
            )}
          </div>
          <Card className="mt-4">
            <h3 className="mb-4 font-heading text-sm uppercase tracking-widest text-muted">Ventes par mois</h3>
            <ColumnChart
              columns={sales.months}
              series={salesSeries}
              unit="euros"
              caption={`Ventes par mois de la saison ${sales.season}, en euros`}
            />
          </Card>
        </section>
      )}

      {requests && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl">Demandes de licence</h2>
          <Card>
            <h3 className="mb-4 font-heading text-sm uppercase tracking-widest text-muted">
              {requestsTotal} demande(s) sur les 8 dernières semaines
            </h3>
            <ColumnChart
              columns={requests}
              series={[{ key: "requests", label: "Demandes", color: "--series-1" }]}
              unit="count"
              caption="Demandes de licence par semaine, sur les 8 dernières semaines"
            />
          </Card>
        </section>
      )}

      {!members && !users && !sales && (
        <p className="text-muted">Les écrans liés à vos rôles apparaîtront ici au fil des prochaines phases.</p>
      )}
    </>
  );
}

/** « octobre 2026 : 120 € (+20 % vs septembre 2026) ». */
function monthDelta(current: number, previous: number, label: string, previousLabel: string) {
  const change =
    previous > 0
      ? ` (${current >= previous ? "+" : "−"}${Math.round((Math.abs(current - previous) / previous) * 100)} % vs ${previousLabel})`
      : "";
  return `${label} : ${formatEuros(current)}${change}`;
}

function Stat({
  label,
  value,
  href,
  highlighted,
  detail,
}: {
  label: string;
  value: number | string;
  href: string;
  highlighted?: boolean;
  detail?: (string | null)[];
}) {
  return (
    <Link href={href} className="block transition hover:opacity-80">
      <Card highlighted={highlighted} className="h-full">
        <p className="font-heading text-sm uppercase tracking-widest text-muted">{label}</p>
        <p className="mt-2 font-heading text-4xl">{value}</p>
        {detail?.filter(Boolean).map((line) => (
          <p key={line} className="mt-1 text-sm text-muted">
            {line}
          </p>
        ))}
      </Card>
    </Link>
  );
}
