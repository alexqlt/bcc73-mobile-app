import { PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth";

import { BackLink } from "../planning-forms";
import { ImportPlanning } from "./import-planning";

export const metadata = { title: "Importer le planning — BCC73 Administration" };

/** P4-08 : import du planning depuis le fichier .xlsx du club. */
export default async function ImportPlanningPage() {
  await requirePermission("SCHEDULE_CREATE");

  return (
    <>
      <PageHeader eyebrow="Planning" title="Importer un planning (.xlsx)">
        <BackLink />
      </PageHeader>
      <ImportPlanning />
    </>
  );
}
