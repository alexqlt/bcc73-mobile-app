import { notFound } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";

import { Badge, Button, Card, formatDate, PageHeader } from "@/components/ui";
import { NEWS_PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { newsPhotoUrl } from "@/lib/news";
import { createClient } from "@/lib/supabase/server";

import { deleteNews, setNewsArchived, updateNews } from "../actions";
import { BackLink, DeleteNewsForm, NewsForm } from "../news-form";

export const metadata = { title: "Actualité — BCC73 Administration" };

/** P3-05 : modifier, publier / dépublier ou supprimer une actualité. */
export default async function ActualitePage({ params }: PageProps<"/actualites/[id]">) {
  const viewer = await requireAnyPermission(NEWS_PERMISSIONS);
  const { id } = await params;
  const supabase = await createClient();

  const { data: news, error } = await supabase
    .from("news")
    .select("id, title, content, image_path, published_at, updated_at, archived_at")
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
        {news.archived_at && <Badge tone="warning">Archivée le {formatDate(news.archived_at)}</Badge>}
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
      {canUpdate && (
        <div className="mt-6">
          <ActionForm action={setNewsArchived}>
            <input type="hidden" name="newsId" value={news.id} />
            <input type="hidden" name="archive" value={news.archived_at ? "0" : "1"} />
            {news.archived_at ? (
              <Button type="submit" variant="secondary">
                Désarchiver l&apos;actualité
              </Button>
            ) : (
              <ConfirmButton variant="secondary" message="Archiver cette actualité ? Elle ne sera plus affichée dans l'app.">
                Archiver l&apos;actualité
              </ConfirmButton>
            )}
          </ActionForm>
        </div>
      )}
      {viewer.permissions.has("NEWS_DELETE") && (
        <div className="mt-6">
          <DeleteNewsForm action={deleteNews} newsId={news.id} />
        </div>
      )}
    </>
  );
}
