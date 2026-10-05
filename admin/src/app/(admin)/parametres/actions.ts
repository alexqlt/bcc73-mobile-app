"use server";

import { refresh } from "next/cache";

import { toActionState, type ActionState } from "@/lib/action-state";
import { parseEuros } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";

const fields = {
  mealAdult: { column: "meal_adult_cents", label: "adulte" },
  mealChild: { column: "meal_child_cents", label: "enfant" },
  stageDay: { column: "stage_day_cents", label: "un jour" },
  stageAllDays: { column: "stage_all_days_cents", label: "tous les jours" },
} as const;

/** Tarifs par défaut des événements (STAGE_CREATE, vérifié par la RLS). Un champ vide n'en propose pas. */
export async function saveEventDefaults(_state: ActionState, formData: FormData): Promise<ActionState> {
  const values: Partial<Record<(typeof fields)[keyof typeof fields]["column"], number | null>> = {};
  for (const [name, field] of Object.entries(fields)) {
    const raw = String(formData.get(name) ?? "").trim();
    const cents = raw ? parseEuros(raw) : null;
    if (raw && !cents) return { error: `Tarif ${field.label} invalide (ex. 25 ou 25,50).` };
    values[field.column] = cents;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("event_default_prices").update(values).eq("id", true).select("id");
  if (error) return toActionState(error);
  if (data.length === 0) return { error: "Vous n'avez pas le droit de modifier ces tarifs." };
  refresh();
  return null;
}
