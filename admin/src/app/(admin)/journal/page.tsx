import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { Button, EmptyState, formatDate, PageHeader, Select } from "@/components/ui";
import { isAdmin, JOURNAL_PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { loadJournalContext, parseCategory, readableCategories } from "@/lib/journal";
import { createClient } from "@/lib/supabase/server";

import { clearJournal } from "./actions";

export const metadata = { title: "Journal — BCC73 Administration" };

const PAGE_SIZE = 100;

/** P2-11 : journal des actions administratives de son domaine (100 dernières), filtre, export, effacement. */
export default async function JournalPage({ searchParams }: PageProps<"/journal">) {
  const viewer = await requireAnyPermission(JOURNAL_PERMISSIONS);
  const params = await searchParams;
  const categories = readableCategories(viewer.permissions);
  const category = parseCategory(params.categorie);
  const supabase = await createClient();

  let query = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(PAGE_SIZE);
  if (category) query = query.in("target_type", category.targetTypes);

  const [{ data: logs, error }, journal, admin] = await Promise.all([
    query,
    loadJournalContext(supabase),
    isAdmin(),
  ]);
  if (error) throw error;

  const exportHref = category ? `/journal/export?categorie=${category.value}` : "/journal/export";

  return (
    <>
      <PageHeader eyebrow="Sécurité" title="Journal">
        <div className="flex flex-wrap gap-2">
          <a
            href={exportHref}
            download
            className="border-2 border-foreground px-4 py-2 font-heading text-sm uppercase tracking-wider transition hover:bg-surface"
          >
            Télécharger (CSV)
          </a>
          {admin && (
            <ActionForm action={clearJournal}>
              <ConfirmButton
                variant="danger"
                message="Effacer définitivement tout le journal ? Pensez à le télécharger avant. Une ligne indiquera que vous l'avez vidé."
              >
                Tout effacer
              </ConfirmButton>
            </ActionForm>
          )}
        </div>
      </PageHeader>

      <form action="/journal" className="mb-6 flex flex-wrap items-center gap-2">
        <Select name="categorie" defaultValue={category?.value ?? ""} aria-label="Catégorie" className="min-w-0 sm:w-64">
          <option value="">Toutes les catégories</option>
          {categories.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Button type="submit">Filtrer</Button>
        {category && (
          <Link href="/journal" className="text-sm underline decoration-accent decoration-2 underline-offset-4">
            Effacer le filtre
          </Link>
        )}
      </form>

      {logs.length === 0 ? (
        <EmptyState>
          {category ? "Aucun événement dans cette catégorie." : "Aucune action enregistrée pour l'instant."}
        </EmptyState>
      ) : (
        <>
          <ol className="flex flex-col divide-y divide-border bg-surface">
            {logs.map((log) => (
              <li key={log.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-4">
                <time className="w-36 shrink-0 text-sm text-muted">{formatDate(log.created_at)}</time>
                <p>
                  <strong>{journal.actor(log)}</strong> {journal.action(log)}
                  <span className="text-muted"> {journal.describe(log)}</span>
                </p>
              </li>
            ))}
          </ol>
          {logs.length === PAGE_SIZE && (
            <p className="mt-3 text-sm text-muted">
              Seuls les {PAGE_SIZE} derniers événements sont affichés : le fichier téléchargé les contient tous.
            </p>
          )}
        </>
      )}
    </>
  );
}
