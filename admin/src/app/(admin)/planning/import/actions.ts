"use server";

import { refresh } from "next/cache";

import { toErrorMessage } from "@/lib/action-state";
import { requireAnyPermission, SCHEDULE_PERMISSIONS } from "@/lib/auth";
import type { Json } from "@/lib/database.types";
import { scheduleTypeLabels, todayInParis, type PeriodKind } from "@/lib/planning";
import { parsePlanningWorkbook, type ParsedSheet } from "@/lib/planning-xlsx";
import { normalize } from "@/lib/text";
import { createClient } from "@/lib/supabase/server";

/** Créneau déjà en base, pour repérer les doublons dans l'aperçu. */
export type ExistingSlot = {
  id: string;
  period_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  title: string;
};

/** Créneau existant qu'une ligne de l'onglet « Annulations » vise (même jour, horaires qui se chevauchent, même gymnase). */
export type CancellationMatch = {
  schedule_id: string;
  label: string;
  already_cancelled: boolean;
};

export type AnalyzedSheet = ParsedSheet & { matches?: CancellationMatch[][] };

export type Analysis = {
  fileName: string;
  today: string;
  sheets: AnalyzedSheet[];
  periods: { id: string; name: string; kind: PeriodKind; start_date: string; end_date: string }[];
  existing: ExistingSlot[];
};

const MAX_BYTES = 5 * 1024 * 1024;
const LOCATION_STOPWORDS = new Set(["gymnase", "salle", "complexe", "de", "du", "des", "la", "le", "et", "ou"]);

/** « Merande » vise « Gymnase de Mérande (4 terrains) » : un mot significatif en commun suffit. */
function sameLocation(wanted: string | null, location: string | null) {
  if (!wanted) return true;
  const words = normalize(wanted)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !LOCATION_STOPWORDS.has(word));
  const target = normalize(location);
  return words.length === 0 || words.some((word) => target.includes(word));
}

/** Étape 1 : lit le fichier et prépare l'aperçu (rien n'est enregistré). */
export async function analyzePlanningFile(formData: FormData): Promise<{ error: string } | { analysis: Analysis }> {
  await requireAnyPermission(SCHEDULE_PERMISSIONS);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisissez un fichier .xlsx." };
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { error: "Le fichier doit être au format .xlsx (Excel)." };
  if (file.size > MAX_BYTES) return { error: "Le fichier ne doit pas dépasser 5 Mo." };

  let sheets: ParsedSheet[];
  try {
    sheets = parsePlanningWorkbook(await file.arrayBuffer());
  } catch {
    return { error: "Ce fichier n'a pas pu être lu. Vérifiez qu'il s'ouvre bien dans Excel." };
  }

  const supabase = await createClient();
  const [periods, schedules] = await Promise.all([
    supabase.from("schedule_periods").select("id, name, kind, start_date, end_date").order("start_date", { ascending: false }),
    supabase.from("schedules").select("id, period_id, weekday, start_time, end_time, title"),
  ]);
  if (periods.error || schedules.error) return { error: toErrorMessage(periods.error ?? schedules.error) };

  // Annulations : on cherche, pour chaque ligne, les créneaux qui ont lieu ce jour-là dans la base.
  const planningByDate = new Map<string, Awaited<ReturnType<typeof fetchDay>>>();
  async function fetchDay(date: string) {
    const { data, error } = await supabase.rpc("planning", { from_date: date, to_date: date });
    if (error) throw error;
    return data;
  }

  const analyzed: AnalyzedSheet[] = [];
  for (const sheet of sheets) {
    if (sheet.kind !== "cancellations") {
      analyzed.push(sheet);
      continue;
    }
    const matches: CancellationMatch[][] = [];
    for (const row of sheet.rows) {
      if (!planningByDate.has(row.date)) planningByDate.set(row.date, await fetchDay(row.date));
      matches.push(
        planningByDate
          .get(row.date)!
          .filter(
            (slot) =>
              (!row.start_time || !row.end_time || (slot.start_time < row.end_time && row.start_time < slot.end_time)) &&
              sameLocation(row.location, slot.location)
          )
          .map((slot) => ({
            schedule_id: slot.schedule_id,
            label: `${slot.start_time.slice(0, 5)} → ${slot.end_time.slice(0, 5)} · ${slot.title}${slot.location ? ` · ${slot.location}` : ""}`,
            already_cancelled: slot.is_cancelled,
          }))
      );
    }
    analyzed.push({ ...sheet, matches });
  }

  return {
    analysis: {
      fileName: file.name,
      today: todayInParis(),
      sheets: analyzed,
      periods: periods.data,
      existing: schedules.data,
    },
  };
}

// ---------------------------------------------------------------------------
// Étape 2 : enregistrement (fonction import_planning, en une transaction)
// ---------------------------------------------------------------------------

export type ImportPayload = {
  periods: (
    | { ref: string; id: string }
    | { ref: string; name: string; kind: PeriodKind; start_date: string; end_date: string }
  )[];
  slots: {
    period_ref: string;
    weekday: number;
    start_time: string;
    end_time: string;
    type: string;
    title: string;
    location: string | null;
  }[];
  cancellations: { schedule_id: string; date: string; reason: string | null }[];
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;

/** Contrôle la forme des données envoyées par le navigateur (la base vérifie ensuite droits et cohérence). */
function invalidPayload(payload: ImportPayload): string | null {
  const refs = new Set<string>();
  for (const period of payload.periods ?? []) {
    refs.add(period.ref);
    if ("id" in period) {
      if (!UUID.test(period.id)) return "Période inconnue.";
    } else if (!period.name?.trim() || !ISO_DATE.test(period.start_date) || !ISO_DATE.test(period.end_date)) {
      return `Indiquez le nom et les dates de la nouvelle période « ${period.name || "sans nom"} ».`;
    } else if (period.end_date < period.start_date) {
      return `La période « ${period.name} » se termine avant de commencer.`;
    } else if (period.kind !== "normal" && period.kind !== "holidays") {
      return "Type de période invalide.";
    }
  }
  for (const slot of payload.slots ?? []) {
    if (
      !TIME.test(slot.start_time) ||
      !TIME.test(slot.end_time) ||
      slot.end_time <= slot.start_time ||
      !(slot.type in scheduleTypeLabels) ||
      !slot.title?.trim() ||
      !Number.isInteger(slot.weekday) ||
      slot.weekday < 1 ||
      slot.weekday > 7 ||
      !refs.has(slot.period_ref)
    ) {
      return `Créneau invalide : ${slot.title || "sans intitulé"}.`;
    }
  }
  for (const cancellation of payload.cancellations ?? []) {
    if (!UUID.test(cancellation.schedule_id) || !ISO_DATE.test(cancellation.date)) {
      return "Annulation invalide.";
    }
  }
  return null;
}

export async function importPlanning(
  payload: ImportPayload
): Promise<{ error: string } | { result: { periods: number; slots: number; cancellations: number } }> {
  await requireAnyPermission(SCHEDULE_PERMISSIONS);
  const invalid = invalidPayload(payload);
  if (invalid) return { error: invalid };
  if (payload.slots.length === 0 && payload.cancellations.length === 0 && payload.periods.every((p) => "id" in p)) {
    return { error: "Rien à importer : cochez au moins un élément." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_planning", { payload: payload as unknown as Json });
  if (error) return { error: toErrorMessage(error) };
  refresh();
  return { result: data as { periods: number; slots: number; cancellations: number } };
}
