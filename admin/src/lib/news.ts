import { env } from "@/lib/env";

/** Bucket Supabase Storage des photos d'actualités (public, voir la migration news). */
export const NEWS_BUCKET = "news-photos";

/** Mêmes limites que le bucket : 5 Mo, JPEG / PNG / WebP. */
export const NEWS_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const NEWS_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const NEWS_TITLE_MAX_LENGTH = 150;

export function newsPhotoUrl(path: string) {
  return `${env.supabaseUrl}/storage/v1/object/public/${NEWS_BUCKET}/${path}`;
}
