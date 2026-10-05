"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { toActionState, type ActionState } from "@/lib/action-state";
import { scheduleTypeLabels, type PeriodKind, type ScheduleType } from "@/lib/planning";
import { createClient } from "@/lib/supabase/server";

// Les permissions SCHEDULE_CREATE / SCHEDULE_UPDATE / SCHEDULE_DELETE sont vérifiées par la RLS.
// Les annulations sont contrôlées par la base (jour de la semaine, dates de la période).

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

const noRightError = { error: "Vous n'avez pas le droit d'effectuer cette action." };

// ---------------------------------------------------------------------------
// Périodes (P4-06)
// ---------------------------------------------------------------------------

function readPeriodForm(formData: FormData) {
  const name = text(formData, "name");
  const kind = text(formData, "kind") as PeriodKind;
  const startDate = text(formData, "startDate");
  const endDate = text(formData, "endDate");

  if (!name) return { error: "Donnez un nom à la période (ex. Saison 2026-2027, Vacances de la Toussaint)." };
  if (kind !== "normal" && kind !== "holidays") return { error: "Choisissez le type de période." };
  if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) return { error: "Indiquez les dates de début et de fin." };
  if (endDate < startDate) return { error: "La date de fin doit être après la date de début." };

  return { values: { name, kind, start_date: startDate, end_date: endDate } };
}

export async function createPeriod(_state: ActionState, formData: FormData): Promise<ActionState> {
  const form = readPeriodForm(formData);
  if ("error" in form) return form;

  const supabase = await createClient();
  const { data, error } = await supabase.from("schedule_periods").insert(form.values).select("id").single();
  if (error) return toActionState(error);
  redirect(`/planning/periodes/${data.id}`);
}

export async function updatePeriod(_state: ActionState, formData: FormData): Promise<ActionState> {
  const form = readPeriodForm(formData);
  if ("error" in form) return form;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_periods")
    .update(form.values)
    .eq("id", text(formData, "periodId"))
    .select("id");
  if (error) return toActionState(error);
  if (data.length === 0) return noRightError;
  refresh();
  return null;
}

export async function deletePeriod(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_periods")
    .delete()
    .eq("id", text(formData, "periodId"))
    .select("id");
  if (error) return toActionState(error);
  if (data.length === 0) return noRightError;
  redirect("/planning");
}

// ---------------------------------------------------------------------------
// Créneaux de la semaine (P4-05)
// ---------------------------------------------------------------------------

function readSlotForm(formData: FormData) {
  const type = text(formData, "type") as ScheduleType;
  const startTime = text(formData, "startTime");
  const endTime = text(formData, "endTime");
  const title = text(formData, "title") || scheduleTypeLabels[type];

  if (!scheduleTypeLabels[type]) return { error: "Choisissez le type de créneau." };
  if (!TIME.test(startTime) || !TIME.test(endTime)) return { error: "Indiquez les heures de début et de fin." };
  if (endTime <= startTime) return { error: "L'heure de fin doit être après l'heure de début." };

  return {
    values: { type, start_time: startTime, end_time: endTime, title, location: text(formData, "location") || null },
  };
}

/** Période et jour de la semaine du créneau (il se répète chaque semaine de la période). */
function readWhen(formData: FormData) {
  const periodId = text(formData, "periodId");
  if (!periodId) return { error: "Le créneau doit appartenir à une période." };
  const weekday = Number(formData.get("weekday"));
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) return { error: "Choisissez le jour de la semaine." };
  return { values: { period_id: periodId, weekday } };
}

export async function createSlot(_state: ActionState, formData: FormData): Promise<ActionState> {
  const slot = readSlotForm(formData);
  if ("error" in slot) return slot;
  const when = readWhen(formData);
  if ("error" in when) return when;

  const supabase = await createClient();
  const { error } = await supabase.from("schedules").insert({ ...slot.values, ...when.values });
  if (error) return toActionState(error);
  refresh();
  return null;
}

export async function updateSlot(_state: ActionState, formData: FormData): Promise<ActionState> {
  const slot = readSlotForm(formData);
  if ("error" in slot) return slot;
  const when = readWhen(formData);
  if ("error" in when) return when;
  // La période d'un créneau ne change pas : seul le jour est modifiable.
  const whenValues = { weekday: when.values.weekday };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedules")
    .update({ ...slot.values, ...whenValues })
    .eq("id", text(formData, "scheduleId"))
    .select("id");
  if (error) return toActionState(error);
  if (data.length === 0) return noRightError;
  refresh();
  return null;
}

export async function deleteSlot(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("schedules").delete().eq("id", text(formData, "scheduleId")).select("id");
  if (error) return toActionState(error);
  if (data.length === 0) return noRightError;
  refresh();
  return null;
}

// ---------------------------------------------------------------------------
// Annulations (P4-07)
// ---------------------------------------------------------------------------

/** Annule un créneau récurrent pendant une période (un seul jour si la date de fin est vide). */
export async function cancelSlotForPeriod(_state: ActionState, formData: FormData): Promise<ActionState> {
  const startDate = text(formData, "startDate");
  const endDate = text(formData, "endDate") || startDate;
  if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) return { error: "Choisissez la période d'annulation." };
  if (endDate < startDate) return { error: "La date de fin doit être après la date de début." };

  const supabase = await createClient();
  const { error } = await supabase.from("schedule_cancellations").insert({
    schedule_id: text(formData, "scheduleId"),
    start_date: startDate,
    end_date: endDate,
    reason: text(formData, "reason") || null,
  });
  if (error) return toActionState(error);
  refresh();
  return null;
}

/** Rétablit un créneau récurrent annulé (supprime l'annulation). */
export async function restoreSlot(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_cancellations")
    .delete()
    .eq("id", text(formData, "cancellationId"))
    .select("id");
  if (error) return toActionState(error);
  if (data.length === 0) return noRightError;
  refresh();
  return null;
}
