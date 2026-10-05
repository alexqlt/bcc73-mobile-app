import type { Database } from "@/lib/database.types";

export type ScheduleType = Database["public"]["Enums"]["schedule_type"];
export type PeriodKind = Database["public"]["Enums"]["schedule_period_kind"];

export const scheduleTypeLabels: Record<ScheduleType, string> = {
  free_play: "Jeu libre",
  training: "Entraînement",
  other: "Autre",
};

export const periodKindLabels: Record<PeriodKind, string> = {
  normal: "Planning normal",
  holidays: "Vacances",
};

/** Jours ISO : 1 = lundi … 7 = dimanche. */
export const weekdays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/** Date du jour à Chambéry, au format AAAA-MM-JJ. */
export function todayInParis() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

/** AAAA-MM-JJ décalé de quelques jours. */
export function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Ex. « lundi 12 octobre 2026 » (ou sans l'année). */
export function formatDay(isoDate: string, { year = true }: { year?: boolean } = {}) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(year ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** Ex. « 12/10/2026 ». */
export function formatShortDate(isoDate: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** « 18:00:00 » → « 18:00 ». */
export function formatTime(time: string) {
  return time.slice(0, 5);
}
