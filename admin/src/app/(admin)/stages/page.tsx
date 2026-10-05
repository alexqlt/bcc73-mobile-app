import Link from "next/link";

import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { requireAnyPermission, STAGE_PERMISSIONS } from "@/lib/auth";
import { formatStageDates, eventKindLabels, type EventKind } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Événements — BCC73 Administration" };

/** P6-10 : stages à venir puis passés, avec le remplissage. */
export default async function StagesPage() {
  const viewer = await requireAnyPermission(STAGE_PERMISSIONS);
  const supabase = await createClient();

  const { data: stages, error } = await supabase
    .from("stages")
    .select("id, title, start_at, end_at, capacity, is_published, kind, stage_prices (id)")
    .order("start_at", { ascending: false });
  if (error) throw error;

  // Places du jour le plus rempli (la capacité s'entend par jour).
  const placesLeft = new Map(
    await Promise.all(
      stages.map(async (stage) => [stage.id, (await supabase.rpc("stage_places_left", { stage: stage.id })).data ?? 0] as const)
    )
  );

  const now = new Date().toISOString();
  const upcoming = stages.filter((stage) => stage.end_at >= now).reverse();
  const past = stages.filter((stage) => stage.end_at < now);

  return (
    <>
      <PageHeader eyebrow="Club" title="Événements">
        {viewer.permissions.has("STAGE_CREATE") && (
          <Link
            href="/stages/nouveau"
            className="border-2 border-accent bg-accent px-4 py-2 font-heading text-sm uppercase tracking-wider text-on-accent transition hover:opacity-85"
          >
            Nouvel événement
          </Link>
        )}
      </PageHeader>

      <h2 className="mb-3 text-xl">À venir</h2>
      <StageList stages={upcoming} placesLeft={placesLeft} empty="Aucun événement à venir." />
      {past.length > 0 && (
        <>
          <h2 className="mt-10 mb-3 text-xl">Passés</h2>
          <StageList stages={past} placesLeft={placesLeft} empty="" />
        </>
      )}
    </>
  );
}

type ListedStage = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  capacity: number;
  is_published: boolean;
  kind: EventKind;
  stage_prices: { id: string }[];
};

function StageList({ stages, placesLeft, empty }: { stages: ListedStage[]; placesLeft: Map<string, number>; empty: string }) {
  if (stages.length === 0) return <EmptyState>{empty}</EmptyState>;
  return (
    <ul className="flex flex-col gap-3">
      {stages.map((stage) => {
        const left = placesLeft.get(stage.id) ?? stage.capacity;
        return (
          <li key={stage.id}>
            <Link href={`/stages/${stage.id}`} className="flex flex-wrap items-center gap-3 bg-surface p-4 transition hover:opacity-80">
              <span className="font-bold">{stage.title}</span>
              <Badge>{eventKindLabels[stage.kind]}</Badge>
              {stage.is_published ? <Badge tone="success">Publié</Badge> : <Badge tone="warning">Brouillon</Badge>}
              {stage.stage_prices.length === 0 && <Badge tone="danger">Aucun tarif</Badge>}
              <span className="text-sm text-muted">{formatStageDates(stage.start_at, stage.end_at, stage.kind)}</span>
              <span className="ml-auto font-heading text-sm">
                {left <= 0
                  ? "Complet"
                  : `${stage.capacity - left} / ${stage.capacity}${stage.kind === "stage" ? " le jour le plus rempli" : " place(s) prise(s)"}`}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
