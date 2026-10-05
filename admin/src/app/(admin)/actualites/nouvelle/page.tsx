import { Card, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth";

import { createNews } from "../actions";
import { BackLink, NewsForm } from "../news-form";

export const metadata = { title: "Nouvelle actualité — BCC73 Administration" };

export default async function NouvelleActualitePage() {
  await requirePermission("NEWS_CREATE");

  return (
    <>
      <PageHeader eyebrow="Actualités" title="Nouvelle actualité">
        <BackLink />
      </PageHeader>
      <Card className="max-w-3xl">
        <NewsForm action={createNews} />
      </Card>
    </>
  );
}
