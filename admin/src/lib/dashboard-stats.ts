import type { ChartColumn } from "@/components/charts/column-chart";
import { parisLocalToISO } from "@/lib/shop";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const PARIS = "Europe/Paris";

/** Année, mois (1-12) et jour d'une date, à l'heure de Paris. */
function parisDate(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: PARIS, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(date)
      .map((part) => [part.type, Number(part.value)])
  );
  return { year: parts.year, month: parts.month, day: parts.day };
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthLabels(year: number, month: number) {
  const date = new Date(Date.UTC(year, month - 1, 15));
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: "UTC" }).format(date);
  return { label: format({ month: "short" }), longLabel: format({ month: "long", year: "numeric" }) };
}

/** Saison sportive en cours : du 1er septembre au 31 août. */
export function currentSeason(now = new Date()) {
  const { year, month } = parisDate(now);
  const start = month >= 9 ? year : year - 1;
  return { startYear: start, label: `${start}-${start + 1}`, startISO: parisLocalToISO(`${start}-09-01T00:00`)! };
}

export type SalesStats = {
  season: string;
  months: ChartColumn[];
  thisMonth: { key: string; label: string; shop: number; stages: number };
  previousMonth: { label: string; shop: number; stages: number };
  totals: { shop: number; stages: number; tubes: number; shopOrders: number; registrations: number };
};

/**
 * Ventes payées de la saison, par mois et par type (volants / stages). La RLS ne renvoie que ce que
 * le lecteur peut voir : la boutique pour VOLANT_VIEW_SALES, les stages pour STAGE_VIEW_REGISTRATIONS,
 * tout pour PAYMENT_VIEW.
 */
export async function loadSalesStats(supabase: Supabase, now = new Date()): Promise<SalesStats> {
  const season = currentSeason(now);
  const { year, month } = parisDate(now);
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  // En septembre, le mois précédent (août) appartient à la saison passée : on le lit aussi.
  const from = [season.startISO, parisLocalToISO(`${monthKey(previous.year, previous.month)}-01T00:00`)!].sort()[0];

  const { data: orders, error } = await supabase
    .from("orders")
    .select("type, total_cents, paid_at, order_items (quantity)")
    .eq("status", "paid")
    .gte("paid_at", from);
  if (error) throw error;

  const byMonth = new Map<string, { shop: number; stages: number }>();
  const totals = { shop: 0, stages: 0, tubes: 0, shopOrders: 0, registrations: 0 };
  for (const order of orders) {
    if (!order.paid_at) continue;
    const paid = parisDate(new Date(order.paid_at));
    const key = monthKey(paid.year, paid.month);
    const entry = byMonth.get(key) ?? { shop: 0, stages: 0 };
    const inSeason = order.paid_at >= season.startISO;
    if (order.type === "shop") {
      entry.shop += order.total_cents;
      if (inSeason) {
        totals.shop += order.total_cents;
        totals.shopOrders += 1;
        totals.tubes += order.order_items.reduce((sum, item) => sum + item.quantity, 0);
      }
    } else {
      entry.stages += order.total_cents;
      if (inSeason) {
        totals.stages += order.total_cents;
        // Une commande peut inscrire plusieurs membres : une ligne par personne.
        totals.registrations += order.order_items.length;
      }
    }
    byMonth.set(key, entry);
  }

  // Mois de la saison, de septembre au mois en cours.
  const months: ChartColumn[] = [];
  for (let y = season.startYear, m = 9; monthKey(y, m) <= monthKey(year, month); m === 12 ? ((y += 1), (m = 1)) : (m += 1)) {
    const entry = byMonth.get(monthKey(y, m)) ?? { shop: 0, stages: 0 };
    months.push({ ...monthLabels(y, m), values: { shop: entry.shop, stages: entry.stages } });
  }

  const current = byMonth.get(monthKey(year, month)) ?? { shop: 0, stages: 0 };
  const before = byMonth.get(monthKey(previous.year, previous.month)) ?? { shop: 0, stages: 0 };
  return {
    season: season.label,
    months,
    thisMonth: { key: monthKey(year, month), label: monthLabels(year, month).longLabel, ...current },
    previousMonth: { label: monthLabels(previous.year, previous.month).longLabel, ...before },
    totals,
  };
}

/** Demandes de licence des 8 dernières semaines (lundi → dimanche, heure de Paris). */
export function weeklyLicenceRequests(createdAt: string[], now = new Date()): ChartColumn[] {
  const today = parisDate(now);
  const todayUTC = Date.UTC(today.year, today.month - 1, today.day);
  const monday = todayUTC - ((new Date(todayUTC).getUTCDay() + 6) % 7) * 86_400_000;
  const weeks = Array.from({ length: 8 }, (_, index) => monday - (7 - index) * 7 * 86_400_000);

  const counts = new Array(8).fill(0);
  for (const iso of createdAt) {
    const day = parisDate(new Date(iso));
    const time = Date.UTC(day.year, day.month - 1, day.day);
    const index = weeks.findIndex((start) => time >= start && time < start + 7 * 86_400_000);
    if (index !== -1) counts[index] += 1;
  }

  const short = (time: number) =>
    new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(time));
  return weeks.map((start, index) => ({
    label: short(start),
    longLabel: `Semaine du ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(start))}`,
    values: { requests: counts[index] },
  }));
}

/** Comptes connectés ces `days` derniers jours, et comptes sans aucune licence validée (si les licences sont visibles). */
export function accountActivity(
  users: { id: string; last_sign_in_at: string | null }[],
  members: { account_id: string; status: string }[] | null,
  days: number,
  now = new Date()
) {
  const since = new Date(now.getTime() - days * 86_400_000).toISOString();
  const approved = new Set(members?.filter((member) => member.status === "approved").map((member) => member.account_id));
  return {
    active: users.filter((user) => user.last_sign_in_at && user.last_sign_in_at >= since).length,
    withoutLicence: members ? users.filter((user) => !approved.has(user.id)).length : null,
  };
}

