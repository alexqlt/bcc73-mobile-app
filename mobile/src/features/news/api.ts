import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type News = Pick<Tables<'news'>, 'id' | 'title' | 'content' | 'image_path' | 'published_at'>;

const NEWS_BUCKET = 'news-photos';
const NEWS_COLUMNS = 'id, title, content, image_path, published_at';
const PAGE_SIZE = 20;

/**
 * Seules les actualités publiées et non archivées sont affichées dans l'app, y compris pour les responsables
 * de la communication (qui voient aussi les brouillons dans la base, pour le back-office).
 */
function publishedNews() {
  return supabase
    .from('news')
    .select(NEWS_COLUMNS)
    .not('published_at', 'is', null)
    .is('archived_at', null)
    .order('published_at', { ascending: false });
}

/** Dernières actualités, pour l'écran d'accueil. */
export function useLatestNews(count = 3) {
  return useQuery({
    queryKey: ['news', 'latest', count],
    queryFn: async () => {
      const { data, error } = await publishedNews().limit(count);
      if (error) throw error;
      return data;
    },
  });
}

/** Toutes les actualités publiées, chargées par pages de 20. */
export function useNewsList() {
  return useInfiniteQuery({
    queryKey: ['news', 'list'],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await publishedNews().range(pageParam, pageParam + PAGE_SIZE - 1);
      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
  });
}

export function useNewsItem(id: string) {
  return useQuery({
    queryKey: ['news', 'item', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news')
        .select(NEWS_COLUMNS)
        .eq('id', id)
        .not('published_at', 'is', null)
        .is('archived_at', null)
        .maybeSingle();
      // 22P02 : identifiant mal formé (lien invalide) → même affichage qu'une actualité introuvable.
      if (error && error.code !== '22P02') throw error;
      return data;
    },
  });
}

/** URL publique de la photo (bucket public, pas de jeton à rafraîchir). */
export function newsImageUrl(path: string | null) {
  return path ? supabase.storage.from(NEWS_BUCKET).getPublicUrl(path).data.publicUrl : undefined;
}

/** Ex. « 5 octobre 2026 ». */
export function formatNewsDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });
}

/** Paragraphes du contenu (séparés par une ligne vide dans le back-office). */
export function newsParagraphs(content: string) {
  return content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
