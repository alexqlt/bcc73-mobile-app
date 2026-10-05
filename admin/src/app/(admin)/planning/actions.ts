"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { toActionState, type ActionState } from "@/lib/action-state";
import { IMAGE_TYPES, readImage, validateImage } from "@/lib/images";
import { PLANNING_BUCKET, scheduleTypeLabels, type PeriodKind, type ScheduleType } from "@/lib/planning";
import { createClient } from "@/lib/supabase/server";

// Les permissions SCHEDULE_CREATE / SCHEDULE_UPDATE / SCHEDULE_DELETE sont vérifiées par la RLS.
// Les annulations sont contrôlées par la base (jour de la semaine, dates de la période).

type Supabase = Awaited<ReturnType<typeof createClient>>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

const noRightError = { error: "Vous n'avez pas le droit d'effectuer cette action." };

// ---------------------------------------------------------------------------
// Périodes (P4-06) et image du planning (P4-08)
// ---------------------------------------------------------------------------

function readPeriodForm(formData: FormData) {
  const name = text(formData, "name");
  const kind = text(formData, "kind") as PeriodKind;
  const startDate = text(formData, "startDate");
  const endDate = text(formData, "endDate");
  const image = readImage(formData, "image");

  if (!name) return { error: "Donnez un nom à la période (ex. Saison 2026-2027, Vacances de la Toussaint)." };
  if (kind !== "normal" && kind !== "holidays") return { error: "Choisissez le type de période." };
  if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) return { error: "Indiquez les dates de début et de fin." };
  if (endDate < startDate) return { error: "La date de fin doit être après la date de début." };
  const imageError = validateImage(image);
  if (imageError) return { error: imageError };

  return {
    values: { name, kind, start_date: startDate, end_date: endDate },
    image,
    removeImage: formData.get("removeImage") === "on",
  };
}

async function uploadImage(supabase: Supabase, periodId: string, image: File) {
  const path = `${periodId}/${randomUUID()}.${IMAGE_TYPES[image.type]}`;
  const { error } = await supabase.storage.from(PLANNING_BUCKET).upload(path, image, { contentType: image.type });
  return { path, error };
}

/** Suppression au mieux : une image orpheline ne gêne pas l'affichage. */
async function removeImage(supabase: Supabase, path: string | null) {
  if (path) await supabase.storage.from(PLANNING_BUCKET).remove([path]);
}

export async function createPeriod(_state: ActionState, formData: FormData): Promise<ActionState> {
  const form = readPeriodForm(formData);
  if ("error" in form) return form;

  const supabase = await createClient();
  const { data, error } = await supabase.from("schedule_periods").insert(form.values).select("id").single();
  if (error) return toActionState(error);

  // La période est créée même si l'image échoue : elle pourra être ajoutée depuis la page de la période.
  if (form.image) {
    const upload = await uploadImage(supabase, data.id, form.image);
    if (!upload.error) {
      await supabase.from("schedule_periods").update({ image_path: upload.path }).eq("id", data.id);
    }
  }
  redirect(`/planning/periodes/${data.id}`);
}

export async function updatePeriod(_state: ActionState, formData: FormData): Promise<ActionState> {
  const form = readPeriodForm(formData);
  if ("error" in form) return form;

  const periodId = text(formData, "periodId");
  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("schedule_periods")
    .select("image_path")
    .eq("id", periodId)
    .maybeSingle();
  if (readError) return toActionState(readError);
  if (!current) return { error: "Cette période n'existe plus." };

  let imagePath = form.removeImage ? null : current.image_path;
  if (form.image) {
    const upload = await uploadImage(supabase, periodId, form.image);
    if (upload.error) return { error: "L'image n'a pas pu être envoyée. Réessayez." };
    imagePath = upload.path;
  }

  const { data, error } = await supabase
    .from("schedule_periods")
    .update({ ...form.values, image_path: imagePath })
    .eq("id", periodId)
    .select("id");
  if (error || data.length === 0) {
    if (imagePath !== current.image_path) await removeImage(supabase, imagePath);
    return error ? toActionState(error) : noRightError;
  }
  if (imagePath !== current.image_path) await removeImage(supabase, current.image_path);
  refresh();
  return null;
}

export async function deletePeriod(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_periods")
    .delete()
    .eq("id", text(formData, "periodId"))
    .select("image_path");
  if (error) return toActionState(error);
  if (data.length === 0) return noRightError;
  await removeImage(supabase, data[0].image_path);
  redirect("/planning");
}

// ---------------------------------------------------------------------------
// Créneaux récurrents (P4-05) et exceptionnels (P4-07)
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

/** Le créneau est récurrent (jour de la semaine) si le formulaire porte une période, exceptionnel sinon (date). */
function readWhen(formData: FormData) {
  const periodId = text(formData, "periodId");
  if (periodId) {
    const weekday = Number(formData.get("weekday"));
    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) return { error: "Choisissez le jour de la semaine." };
    return { values: { period_id: periodId, weekday } };
  }
  const date = text(formData, "date");
  if (!ISO_DATE.test(date)) return { error: "Indiquez la date du créneau exceptionnel." };
  return { values: { date } };
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
  // La période d'un créneau récurrent ne change pas : seul le jour est modifiable.
  const whenValues = "weekday" in when.values ? { weekday: when.values.weekday } : { date: when.values.date };

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

/** Annule un créneau récurrent pour une date. */
export async function cancelSlotOnDate(_state: ActionState, formData: FormData): Promise<ActionState> {
  const date = text(formData, "date");
  if (!ISO_DATE.test(date)) return { error: "Choisissez la date à annuler." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_cancellations")
    .insert({ schedule_id: text(formData, "scheduleId"), date, reason: text(formData, "reason") || null });
  if (error) {
    return error.code === "23505" ? { error: "Ce créneau est déjà annulé à cette date." } : toActionState(error);
  }
  refresh();
  return null;
}

/** Rétablit un créneau récurrent annulé. */
export async function restoreSlotOnDate(_state: ActionState, formData: FormData): Promise<ActionState> {
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

/** Annule ou rétablit un créneau exceptionnel. */
export async function setExceptionalSlotCancelled(_state: ActionState, formData: FormData): Promise<ActionState> {
  const cancelled = formData.get("cancelled") === "true";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedules")
    .update({ is_cancelled: cancelled, cancellation_reason: cancelled ? text(formData, "reason") || null : null })
    .eq("id", text(formData, "scheduleId"))
    .is("weekday", null)
    .select("id");
  if (error) return toActionState(error);
  if (data.length === 0) return noRightError;
  refresh();
  return null;
}
