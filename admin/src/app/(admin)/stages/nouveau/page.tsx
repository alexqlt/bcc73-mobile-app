import { Card, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth";

import { createStage } from "../actions";
import { BackLink, StageForm } from "../stage-form";

export const metadata = { title: "Nouveau stage — BCC73 Administration" };

export default async function NouveauStagePage() {
  await requirePermission("STAGE_CREATE");

  return (
    <>
      <PageHeader eyebrow="Stages" title="Nouveau stage">
        <BackLink />
      </PageHeader>
      <Card className="max-w-3xl">
        <StageForm action={createStage} />
      </Card>
    </>
  );
}
