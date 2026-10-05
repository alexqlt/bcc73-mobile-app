import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Prévient les adhérents par notification push (Edge Function send-push). La fonction vérifie la
 * permission du responsable, rédige le message à partir de la base et n'envoie qu'une fois par
 * élément. Un échec d'envoi ne bloque jamais l'enregistrement : il est seulement journalisé.
 */
export async function notifyMembers(supabase: Supabase, kind: "news" | "stage" | "cancellation" | "slot", id: string) {
  const { error } = await supabase.functions.invoke("send-push", { body: { kind, id } });
  if (error) console.error(`Notification ${kind} ${id} non envoyée`, error);
}
