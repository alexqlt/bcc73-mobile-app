import type { NextRequest } from "next/server";

import { formatDate } from "@/components/ui";
import { JOURNAL_PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { loadJournalContext, parseCategory, type AuditLog } from "@/lib/journal";
import { todayInParis } from "@/lib/planning";
import { createClient } from "@/lib/supabase/server";

const BATCH = 1000;
/** Marque UTF-8 en tête de fichier : Excel affiche alors correctement les accents. */
const BOM = String.fromCharCode(0xfeff);

/** Cellule CSV : entre guillemets, guillemets doublés. */
function cell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/**
 * Export du journal en CSV (tout l'historique, avec le filtre de la page), prêt pour Excel :
 * séparateur point-virgule et BOM UTF-8 pour les accents.
 */
export async function GET(request: NextRequest) {
  await requireAnyPermission(JOURNAL_PERMISSIONS);
  const category = parseCategory(request.nextUrl.searchParams.get("categorie"));
  const supabase = await createClient();
  const journal = await loadJournalContext(supabase);

  // PostgREST limite chaque réponse : le journal est lu par lots.
  const logs: AuditLog[] = [];
  for (let from = 0; ; from += BATCH) {
    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + BATCH - 1);
    if (category) query = query.in("target_type", category.targetTypes);
    const { data, error } = await query;
    if (error) return new Response("Le journal n'a pas pu être lu.", { status: 500 });
    logs.push(...data);
    if (data.length < BATCH) break;
  }

  const header = ["Date", "Auteur", "Action", "Élément", "Type", "Identifiant", "Détails (JSON)"];
  const rows = logs.map((log) => [
    formatDate(log.created_at),
    journal.actor(log),
    journal.action(log),
    journal.describe(log),
    `${log.action}:${log.target_type}`,
    log.target_id,
    JSON.stringify(log.details),
  ]);
  const csv = BOM + [header, ...rows].map((row) => row.map(cell).join(";")).join("\r\n");
  const suffix = category ? `-${category.value}` : "";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="journal-bcc73-${todayInParis()}${suffix}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
