import { Card, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth";

import { createPeriod } from "../../actions";
import { BackLink, PeriodForm } from "../../planning-forms";

export const metadata = { title: "Nouvelle période — BCC73 Administration" };

/** P4-06 : nouvelle période (saison ou vacances). Les créneaux s'ajoutent ensuite sur sa page. */
export default async function NouvellePeriodePage() {
  await requirePermission("SCHEDULE_CREATE");

  return (
    <>
      <PageHeader eyebrow="Planning" title="Nouvelle période">
        <BackLink />
      </PageHeader>
      <Card className="max-w-3xl">
        <PeriodForm action={createPeriod} />
      </Card>
    </>
  );
}
