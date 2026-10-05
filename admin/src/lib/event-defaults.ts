import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Tarifs proposés à la création d'un événement (centimes, null = rien de proposé). */
export type EventDefaults = {
  mealAdult: number | null;
  mealChild: number | null;
  stageDay: number | null;
  stageAllDays: number | null;
  updatedAt: string | null;
};

/** Lus par les responsables des événements (RLS) ; vides pour les autres. */
export async function getEventDefaults(supabase: Supabase): Promise<EventDefaults> {
  const { data } = await supabase
    .from("event_default_prices")
    .select("meal_adult_cents, meal_child_cents, stage_day_cents, stage_all_days_cents, updated_at")
    .maybeSingle();
  return {
    mealAdult: data?.meal_adult_cents ?? null,
    mealChild: data?.meal_child_cents ?? null,
    stageDay: data?.stage_day_cents ?? null,
    stageAllDays: data?.stage_all_days_cents ?? null,
    updatedAt: data?.updated_at ?? null,
  };
}
