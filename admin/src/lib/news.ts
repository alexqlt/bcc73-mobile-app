import { publicImageUrl } from "@/lib/images";

/** Bucket Supabase Storage des photos d'actualités (public, voir la migration news). */
export const NEWS_BUCKET = "news-photos";

export const NEWS_TITLE_MAX_LENGTH = 150;

export function newsPhotoUrl(path: string) {
  return publicImageUrl(NEWS_BUCKET, path);
}
