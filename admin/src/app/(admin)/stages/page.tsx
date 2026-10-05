import Link from "next/link";

import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { requireAnyPermission, STAGE_PERMISSIONS } from "@/lib/auth";
import { formatStageDates } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Stages — BCC73 Administration" };

/** P6-10 : stages à venir puis passés, avec le remplissage. */
export default async function StagesPage() {
  const viewer = await requireAnyPermission(STAGE_PERMISSIONS);
  const supabase = await createClient();

  const { data: stages, error } = await supabase
    .from("stages")
    .select("id, title, start_at, end_at, capacity, is_published, stage_prices (id), stage_registrations (status)")
    .order("start_at", { ascending: false });
  if (error) throw error;

  const now = new Date().toISOString();
  const upcoming = stages.filter((stage) => stage.end_at >= now).reverse();
  const past = stages.filter((stage) => stage.end_at < now);

  return (
    <>
      <PageHeader eyebrow="Club" title="Stages">
        {viewer.permissions.has("STAGE_CREATE") && (
          <Link
            href="/stages/nouveau"
            className="border-2 border-accent bg-accent px-4 py-2 font-heading text-sm uppercase tracking-wider text-on-accent transition hover:opacity-85"
          >
            Nouveau stage
          </Link>
        )}
      </PageHeader>

      <h2 className="mb-3 text-xl">À venir</h2>
      <StageList stages={upcoming} empty="Aucun stage à venir." />
      {past.length > 0 && (
        <>
          <h2 className="mt-10 mb-3 text-xl">Passés</h2>
          <StageList stages={past} empty="" />
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
  stage_prices: { id: string }[];
  stage_registrations: { status: string }[];
};

function StageList({ stages, empty }: { stages: ListedStage[]; empty: string }) {
  if (stages.length === 0) return <EmptyState>{empty}</EmptyState>;
  return (
    <ul className="flex flex-col gap-3">
      {stages.map((stage) => {
        const confirmed = stage.stage_registrations.filter((registration) => registration.status === "confirmed").length;
        return (
          <li key={stage.id}>
            <Link href={`/stages/${stage.id}`} className="flex flex-wrap items-center gap-3 bg-surface p-4 transition hover:opacity-80">
              <span className="font-bold">{stage.title}</span>
              {stage.is_published ? <Badge tone="success">Publié</Badge> : <Badge tone="warning">Brouillon</Badge>}
              {stage.stage_prices.length === 0 && <Badge tone="danger">Aucun tarif</Badge>}
              <span className="text-sm text-muted">{formatStageDates(stage.start_at, stage.end_at)}</span>
              <span className="ml-auto font-heading text-sm">
                {confirmed} / {stage.capacity} inscrit(s)
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
