import Image from "next/image";
import Link from "next/link";

import { Badge, EmptyState, formatDate, PageHeader } from "@/components/ui";
import { NEWS_PERMISSIONS, requireAnyPermission } from "@/lib/auth";
import { newsPhotoUrl } from "@/lib/news";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Actualités — BCC73 Administration" };

/** P3-05 : actualités du club, brouillons en tête ; les archivées à part (?archives=1). */
export default async function ActualitesPage({ searchParams }: PageProps<"/actualites">) {
  const viewer = await requireAnyPermission(NEWS_PERMISSIONS);
  const archives = (await searchParams).archives === "1";
  const supabase = await createClient();

  const query = supabase.from("news").select("id, title, image_path, published_at, updated_at");
  const { data: news, error } = await (archives ? query.not("archived_at", "is", null) : query.is("archived_at", null))
    .order("published_at", { ascending: false, nullsFirst: true })
    .order("updated_at", { ascending: false });
  if (error) throw error;

  return (
    <>
      <PageHeader eyebrow="Communication" title={archives ? "Actualités archivées" : "Actualités"}>
        <Link
          href={archives ? "/actualites" : "/actualites?archives=1"}
          className="text-sm underline decoration-accent decoration-2 underline-offset-4"
        >
          {archives ? "Retour aux actualités" : "Voir les archives"}
        </Link>
        {viewer.permissions.has("NEWS_CREATE") && (
          <Link
            href="/actualites/nouvelle"
            className="border-2 border-accent bg-accent px-4 py-2 font-heading text-sm uppercase tracking-wider text-on-accent transition hover:opacity-85"
          >
            Nouvelle actualité
          </Link>
        )}
      </PageHeader>

      {news.length === 0 ? (
        <EmptyState>{archives ? "Aucune actualité archivée." : "Aucune actualité pour le moment."}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {news.map((item) => (
            <li key={item.id}>
              <Link
                href={`/actualites/${item.id}`}
                className="flex items-center gap-4 bg-surface p-4 transition hover:opacity-80"
              >
                <div className="relative aspect-[16/9] w-28 shrink-0 overflow-hidden bg-border">
                  {item.image_path && (
                    <Image src={newsPhotoUrl(item.image_path)} alt="" fill unoptimized className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{item.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {item.published_at ? (
                      <Badge tone="success">Publiée</Badge>
                    ) : (
                      <Badge tone="warning">Brouillon</Badge>
                    )}
                    <span className="text-xs text-muted">
                      {item.published_at
                        ? `le ${formatDate(item.published_at)}`
                        : `modifié le ${formatDate(item.updated_at)}`}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
