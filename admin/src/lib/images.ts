import { env } from "@/lib/env";

/** Photos envoyées depuis le back-office : mêmes limites que les buckets (5 Mo, JPEG / PNG / WebP). */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const IMAGE_ACCEPT = Object.keys(IMAGE_TYPES).join(",");

/** Fichier choisi dans un champ `<input type="file">`, ou null si aucun. */
export function readImage(formData: FormData, name: string): File | null {
  const file = formData.get(name);
  return file instanceof File && file.size > 0 ? file : null;
}

/** Message d'erreur si l'image ne respecte pas les limites, sinon null. */
export function validateImage(file: File | null): string | null {
  if (file && !IMAGE_TYPES[file.type]) return "L'image doit être au format JPEG, PNG ou WebP.";
  if (file && file.size > IMAGE_MAX_BYTES) return "L'image ne doit pas dépasser 5 Mo.";
  return null;
}

/** URL publique d'un fichier dans un bucket public. */
export function publicImageUrl(bucket: string, path: string) {
  return `${env.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
