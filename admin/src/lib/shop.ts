import type { Database } from "@/lib/database.types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type OrderType = Database["public"]["Enums"]["order_type"];
export type RegistrationStatus = Database["public"]["Enums"]["registration_status"];

export const orderStatusLabels: Record<OrderStatus, { label: string; tone: "warning" | "success" | "neutral" }> = {
  pending: { label: "Paiement en cours", tone: "warning" },
  paid: { label: "Payée", tone: "success" },
  cancelled: { label: "Abandonnée", tone: "neutral" },
};

export const orderTypeLabels: Record<OrderType, string> = {
  shop: "Boutique",
  stage: "Stage",
};

export const registrationStatusLabels: Record<RegistrationStatus, { label: string; tone: "warning" | "success" | "neutral" }> = {
  pending: { label: "Paiement en cours", tone: "warning" },
  confirmed: { label: "Confirmée", tone: "success" },
  cancelled: { label: "Annulée", tone: "neutral" },
};

/** 2550 → « 25,50 € ». */
export function formatEuros(cents: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

/** « 25 », « 25,5 » ou « 25.50 » → 2550 centimes ; null si le montant est invalide ou nul. */
export function parseEuros(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim().replace(/\s|€/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return cents > 0 ? cents : null;
}

/** Centimes → valeur d'un champ de saisie (« 25,50 »). */
export function eurosInputValue(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

const PARIS = "Europe/Paris";

/** Décalage horaire de Paris (« +01:00 » / « +02:00 ») à une date donnée. */
function parisOffset(date: Date) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: PARIS, timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  return name === "GMT" ? "+00:00" : (name ?? "GMT+01:00").replace("GMT", "");
}

/** Valeur d'un champ `datetime-local` saisie à l'heure de Paris → date ISO, ou null. */
export function parisLocalToISO(value: FormDataEntryValue | null) {
  const local = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  // Le décalage dépend de la date (heure d'été) : on le calcule à partir d'une première estimation.
  const offset = parisOffset(new Date(`${local}:00Z`));
  const date = new Date(`${local}:00${offset}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Date ISO → valeur d'un champ `datetime-local` à l'heure de Paris. */
export function isoToParisLocal(iso: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: PARIS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .replace(" ", "T");
}

/** Ex. « jeu. 12 nov. 2026, 09:00 → 17:00 » (même jour) ou les deux dates complètes. */
export function formatStageDates(startIso: string, endIso: string) {
  const day = (iso: string) =>
    new Intl.DateTimeFormat("fr-FR", { timeZone: PARIS, weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(
      new Date(iso)
    );
  const time = (iso: string) =>
    new Intl.DateTimeFormat("fr-FR", { timeZone: PARIS, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  return day(startIso) === day(endIso)
    ? `${day(startIso)}, ${time(startIso)} → ${time(endIso)}`
    : `${day(startIso)} ${time(startIso)} → ${day(endIso)} ${time(endIso)}`;
}
