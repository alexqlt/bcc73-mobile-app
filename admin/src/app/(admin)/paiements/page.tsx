import Link from "next/link";

import { Badge, EmptyState, formatDate, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { formatEuros, orderStatusLabels, orderTypeLabels, type OrderStatus } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Paiements — BCC73 Administration" };

const filters: { value: OrderStatus | "all"; label: string }[] = [
  { value: "paid", label: "Payées" },
  { value: "pending", label: "En cours" },
  { value: "cancelled", label: "Abandonnées" },
  { value: "all", label: "Toutes" },
];

/** P6-16 : toutes les commandes (boutique et stages) et leur statut HelloAsso. */
export default async function PaiementsPage({ searchParams }: PageProps<"/paiements">) {
  await requirePermission("PAYMENT_VIEW");
  const params = await searchParams;
  const filter = filters.find((item) => item.value === params.statut)?.value ?? "paid";
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      "id, type, status, provider, total_cents, payer_name, payer_email, provider_order_id, created_at, paid_at, order_items (label, quantity)"
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (filter !== "all") query = query.eq("status", filter);
  const { data: orders, error } = await query;
  if (error) throw error;

  // Les commandes du mode test (administrateurs) ne sont pas encaissées.
  const paidTotal = orders
    .filter((order) => order.status === "paid" && order.provider !== "test")
    .reduce((sum, order) => sum + order.total_cents, 0);

  return (
    <>
      <PageHeader eyebrow="Club" title="Paiements">
        <nav className="flex flex-wrap gap-1">
          {filters.map((item) => (
            <Link
              key={item.value}
              href={`/paiements?statut=${item.value}`}
              className={`border-2 px-3 py-1 font-heading text-xs uppercase tracking-wider ${
                item.value === filter ? "border-foreground bg-foreground text-background" : "border-border"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </PageHeader>

      {paidTotal > 0 && (
        <p className="mb-4 text-sm text-muted">
          Encaissé sur cette liste : <strong className="font-heading text-foreground">{formatEuros(paidTotal)}</strong>
          {orders.length === 300 && " (300 dernières commandes)"}
        </p>
      )}

      {orders.length === 0 ? (
        <EmptyState>Aucune commande dans cette liste.</EmptyState>
      ) : (
        <ul className="flex flex-col divide-y divide-border bg-surface">
          {orders.map((order) => (
            <li key={order.id} className="flex flex-col gap-1 p-4 md:flex-row md:items-center md:gap-4">
              <time className="w-36 shrink-0 text-sm text-muted">{formatDate(order.paid_at ?? order.created_at)}</time>
              <div className="flex-1">
                <p>
                  <strong>{order.payer_name ?? "Adhérent"}</strong>{" "}
                  <span className="text-sm text-muted">{order.payer_email}</span>
                </p>
                <p className="text-sm">
                  {order.order_items.map((item) => (item.quantity > 1 ? `${item.quantity} × ${item.label}` : item.label)).join(", ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{orderTypeLabels[order.type]}</Badge>
                {order.provider === "test" && <Badge tone="accent">Test</Badge>}
                <Badge tone={orderStatusLabels[order.status].tone}>{orderStatusLabels[order.status].label}</Badge>
                <span className="w-24 text-right font-heading">{formatEuros(order.total_cents)}</span>
              </div>
              {order.provider_order_id && order.provider !== "test" && (
                <span className="text-xs text-muted md:w-32 md:text-right">HelloAsso n° {order.provider_order_id}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
