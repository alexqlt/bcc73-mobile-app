import { Card, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { getEventDefaults } from "@/lib/event-defaults";
import { createClient } from "@/lib/supabase/server";

import { createStage } from "../actions";
import { BackLink, StageForm } from "../stage-form";

export const metadata = { title: "Nouvel événement — BCC73 Administration" };

export default async function NouveauStagePage() {
  await requirePermission("STAGE_CREATE");
  const defaults = await getEventDefaults(await createClient());

  return (
    <>
      <PageHeader eyebrow="Événements" title="Nouvel événement">
        <BackLink />
      </PageHeader>
      <Card className="max-w-3xl">
        <StageForm action={createStage} defaults={defaults} />
      </Card>
    </>
  );
}
