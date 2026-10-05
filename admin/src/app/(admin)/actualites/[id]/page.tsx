import { notFound } from "next/navigation";

import { Badge, Card, formatDate, PageHeader } from "@/components/ui";
import { NEWS_PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { newsPhotoUrl } from "@/lib/news";
import { createClient } from "@/lib/supabase/server";

import { deleteNews, updateNews } from "../actions";
import { BackLink, DeleteNewsForm, NewsForm } from "../news-form";

export const metadata = { title: "Actualité — BCC73 Administration" };

/** P3-05 : modifier, publier / dépublier ou supprimer une actualité. */
export default async function ActualitePage({ params }: PageProps<"/actualites/[id]">) {
  const viewer = await requireAnyPermission(NEWS_PERMISSIONS);
  const { id } = await params;
  const supabase = await createClient();

  const { data: news, error } = await supabase
    .from("news")
    .select("id, title, content, image_path, published_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error && error.code !== "22P02") throw error; // 22P02 : identifiant mal formé
  if (!news) notFound();

  const canUpdate = viewer.permissions.has("NEWS_UPDATE");

  return (
    <>
      <PageHeader eyebrow="Actualités" title={canUpdate ? "Modifier l'actualité" : "Actualité"}>
        <BackLink />
      </PageHeader>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {news.published_at ? <Badge tone="success">Publiée</Badge> : <Badge tone="warning">Brouillon</Badge>}
        <span className="text-sm text-muted">
          {news.published_at ? `Publiée le ${formatDate(news.published_at)} · ` : ""}
          modifiée le {formatDate(news.updated_at)}
        </span>
      </div>
      <Card className="max-w-3xl">
        <NewsForm
          action={updateNews}
          readOnly={!canUpdate}
          news={{
            id: news.id,
            title: news.title,
            content: news.content,
            photoUrl: news.image_path ? newsPhotoUrl(news.image_path) : null,
            isPublished: !!news.published_at,
          }}
        />
      </Card>
      {viewer.permissions.has("NEWS_DELETE") && (
        <div className="mt-6">
          <DeleteNewsForm action={deleteNews} newsId={news.id} />
        </div>
      )}
    </>
  );
}
