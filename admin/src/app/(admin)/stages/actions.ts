"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { toActionState, type ActionState } from "@/lib/action-state";
import { dayPriceName, parisLocalToISO, parseEuros, stageDays, type EventKind } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";

// STAGE_CREATE / STAGE_UPDATE / STAGE_DELETE sont vérifiés par la RLS.

const noRightError = { error: "Vous n'avez pas le droit d'effectuer cette action." };

function readStage(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const startAt = parisLocalToISO(formData.get("startAt"));
  const endAt = parisLocalToISO(formData.get("endAt"));
  const capacity = Number(formData.get("capacity"));
  const kind: EventKind = formData.get("kind") === "meal" ? "meal" : "stage";

  if (!title) return { error: "Donnez un titre à l'événement." };
  if (!startAt || !endAt) return { error: "Indiquez le début et la fin de l'événement." };
  if (endAt <= startAt) return { error: "La fin de l'événement doit être après son début." };
  if (!Number.isInteger(capacity) || capacity < 1) return { error: "Indiquez le nombre de places par jour (au moins 1)." };

  return {
    values: {
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      start_at: startAt,
      end_at: endAt,
      capacity,
      is_published: formData.get("isPublished") === "on",
      kind,
    },
  };
}

/**
 * Tarifs générés à la création. Stage : un par jour (même montant) et un pour tous les jours (un
 * seul tarif pour une journée). Repas du club : Adulte et Enfant.
 */
function initialPrices(formData: FormData, days: string[], kind: EventKind) {
  if (kind === "meal") {
    const adult = parseEuros(formData.get("adultPrice"));
    const child = parseEuros(formData.get("childPrice"));
    if (String(formData.get("adultPrice") ?? "").trim() && !adult) return { error: "Tarif adulte invalide (ex. 25 ou 25,50)." };
    if (String(formData.get("childPrice") ?? "").trim() && !child) return { error: "Tarif enfant invalide (ex. 12 ou 12,50)." };
    return {
      prices: [
        ...(adult ? [{ name: "Adulte", day: null, amount_cents: adult, position: 0 }] : []),
        ...(child ? [{ name: "Enfant", day: null, amount_cents: child, position: 1 }] : []),
      ],
    };
  }
  const dayPrice = parseEuros(formData.get("dayPrice"));
  const allDaysPrice = parseEuros(formData.get("allDaysPrice"));
  if (String(formData.get("dayPrice") ?? "").trim() && !dayPrice) return { error: "Tarif par jour invalide (ex. 35 ou 35,50)." };
  if (String(formData.get("allDaysPrice") ?? "").trim() && !allDaysPrice) {
    return { error: "Tarif tous les jours invalide (ex. 90 ou 90,50)." };
  }
  if (days.length === 1) {
    return { prices: dayPrice ? [{ name: "Journée", day: null, amount_cents: dayPrice, position: 0 }] : [] };
  }
  return {
    prices: [
      ...(dayPrice ? days.map((day, index) => ({ name: dayPriceName(days, day), day, amount_cents: dayPrice, position: index })) : []),
      ...(allDaysPrice
        ? [{ name: `Tous les jours (${days.length} jours)`, day: null, amount_cents: allDaysPrice, position: days.length }]
        : []),
    ],
  };
}

export async function createStage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const stage = readStage(formData);
  if ("error" in stage) return stage;
  const generated = initialPrices(formData, stageDays(stage.values.start_at, stage.values.end_at), stage.values.kind);
  if ("error" in generated) return generated;

  const supabase = await createClient();
  const { data, error } = await supabase.from("stages").insert(stage.values).select("id").single();
  if (error) return toActionState(error);
  if (generated.prices.length > 0) {
    const { error: pricesError } = await supabase
      .from("stage_prices")
      .insert(generated.prices.map((price) => ({ ...price, stage_id: data.id })));
    // Le stage existe : les tarifs manquants pourront être ajoutés depuis sa page.
    if (pricesError) console.error("Tarifs de l'événement non créés", pricesError);
  }
  redirect(`/stages/${data.id}`);
}

export async function updateStage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const stage = readStage(formData);
  if ("error" in stage) return stage;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stages")
    .update(stage.values)
    .eq("id", String(formData.get("stageId")))
    .select("id");
  if (error) return toActionState(error);
  if (data.length === 0) return noRightError;
  refresh();
  return null;
}

export async function deleteStage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("stages").delete().eq("id", String(formData.get("stageId"))).select("id");
  if (error?.code === "23503") {
    return { error: "Cet événement a des inscriptions : il ne peut plus être supprimé. Retirez-le de l'app en le dépubliant." };
  }
  if (error) return toActionState(error);
  if (data.length === 0) return noRightError;
  redirect("/stages");
}

/** Tarif saisi : nom, montant et jour couvert (vide = tous les jours), qui doit être un jour du stage. */
async function readPrice(formData: FormData, supabase: Awaited<ReturnType<typeof createClient>>) {
  const name = String(formData.get("name") ?? "").trim();
  const amount = parseEuros(formData.get("amount"));
  const day = String(formData.get("day") ?? "") || null;
  if (!name) return { error: "Nommez le tarif (ex. Jour 1, Tous les jours, Jeune)." };
  if (!amount) return { error: "Indiquez un montant valide (ex. 35 ou 35,50)." };
  if (day) {
    const { data: stage } = await supabase
      .from("stages")
      .select("start_at, end_at")
      .eq("id", String(formData.get("stageId")))
      .maybeSingle();
    if (!stage || !stageDays(stage.start_at, stage.end_at).includes(day)) {
      return { error: "Ce jour ne fait pas partie de l'événement." };
    }
  }
  return { values: { name, amount_cents: amount, day } };
}

export async function addPrice(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const price = await readPrice(formData, supabase);
  if ("error" in price) return price;
  const { error } = await supabase
    .from("stage_prices")
    .insert({ ...price.values, stage_id: String(formData.get("stageId")), position: Number(formData.get("position")) || 0 });
  if (error) return toActionState(error);
  refresh();
  return null;
}

export async function updatePrice(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const price = await readPrice(formData, supabase);
  if ("error" in price) return price;
  const { data, error } = await supabase
    .from("stage_prices")
    .update(price.values)
    .eq("id", String(formData.get("priceId")))
    .select("id");
  if (error) return toActionState(error);
  if (data.length === 0) return noRightError;
  refresh();
  return null;
}

export async function deletePrice(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("stage_prices").delete().eq("id", String(formData.get("priceId"))).select("id");
  if (error) return toActionState(error);
  if (data.length === 0) return noRightError;
  refresh();
  return null;
}

/** Annule une inscription du mode test (administrateurs, vérifié par la base) et libère ses places. */
export async function cancelTestOrder(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_cancel_test_order", { order_id: String(formData.get("orderId")) });
  if (error) return toActionState(error);
  refresh();
  return null;
}

