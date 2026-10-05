"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { toActionState, type ActionState } from "@/lib/action-state";
import { parisLocalToISO, parseEuros } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";

// STAGE_CREATE / STAGE_UPDATE / STAGE_DELETE sont vérifiés par la RLS.

const noRightError = { error: "Vous n'avez pas le droit d'effectuer cette action." };

function readStage(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const startAt = parisLocalToISO(formData.get("startAt"));
  const endAt = parisLocalToISO(formData.get("endAt"));
  const capacity = Number(formData.get("capacity"));

  if (!title) return { error: "Donnez un titre au stage." };
  if (!startAt || !endAt) return { error: "Indiquez le début et la fin du stage." };
  if (endAt <= startAt) return { error: "La fin du stage doit être après son début." };
  if (!Number.isInteger(capacity) || capacity < 1) return { error: "Indiquez le nombre de places (au moins 1)." };

  return {
    values: {
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      start_at: startAt,
      end_at: endAt,
      capacity,
      is_published: formData.get("isPublished") === "on",
    },
  };
}

export async function createStage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const stage = readStage(formData);
  if ("error" in stage) return stage;
  const supabase = await createClient();
  const { data, error } = await supabase.from("stages").insert(stage.values).select("id").single();
  if (error) return toActionState(error);
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
    return { error: "Ce stage a des inscriptions : il ne peut plus être supprimé. Retirez-le de l'app en le dépubliant." };
  }
  if (error) return toActionState(error);
  if (data.length === 0) return noRightError;
  redirect("/stages");
}

function readPrice(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const amount = parseEuros(formData.get("amount"));
  if (!name) return { error: "Nommez le tarif (ex. Adhérent, Jeune)." };
  if (!amount) return { error: "Indiquez un montant valide (ex. 35 ou 35,50)." };
  return { values: { name, amount_cents: amount } };
}

export async function addPrice(_state: ActionState, formData: FormData): Promise<ActionState> {
  const price = readPrice(formData);
  if ("error" in price) return price;
  const supabase = await createClient();
  const { error } = await supabase
    .from("stage_prices")
    .insert({ ...price.values, stage_id: String(formData.get("stageId")), position: Number(formData.get("position")) || 0 });
  if (error) return toActionState(error);
  refresh();
  return null;
}

export async function updatePrice(_state: ActionState, formData: FormData): Promise<ActionState> {
  const price = readPrice(formData);
  if ("error" in price) return price;
  const supabase = await createClient();
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
