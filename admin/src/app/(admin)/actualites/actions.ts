"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

import { toActionState, type ActionState } from "@/lib/action-state";
import { NEWS_BUCKET, NEWS_PHOTO_MAX_BYTES, NEWS_PHOTO_TYPES, NEWS_TITLE_MAX_LENGTH } from "@/lib/news";
import { createClient } from "@/lib/supabase/server";

// Les permissions NEWS_CREATE / NEWS_UPDATE / NEWS_DELETE sont vérifiées par la RLS (table et photos).

type Supabase = Awaited<ReturnType<typeof createClient>>;

type NewsFields = { title: string; content: string; photo: File | null; removePhoto: boolean };

function readNewsForm(formData: FormData): NewsFields | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const file = formData.get("photo");
  const photo = file instanceof File && file.size > 0 ? file : null;

  if (!title) return { error: "Donnez un titre à l'actualité." };
  if (title.length > NEWS_TITLE_MAX_LENGTH) {
    return { error: `Le titre ne doit pas dépasser ${NEWS_TITLE_MAX_LENGTH} caractères.` };
  }
  if (!content) return { error: "Rédigez le contenu de l'actualité." };
  if (photo && !NEWS_PHOTO_TYPES[photo.type]) return { error: "La photo doit être au format JPEG, PNG ou WebP." };
  if (photo && photo.size > NEWS_PHOTO_MAX_BYTES) return { error: "La photo ne doit pas dépasser 5 Mo." };

  return { title, content, photo, removePhoto: formData.get("removePhoto") === "on" };
}

/** Envoie la photo dans le bucket, sous un nom unique (le cache de l'app ne garde jamais l'ancienne). */
async function uploadPhoto(supabase: Supabase, newsId: string, photo: File) {
  const path = `${newsId}/${randomUUID()}.${NEWS_PHOTO_TYPES[photo.type]}`;
  const { error } = await supabase.storage.from(NEWS_BUCKET).upload(path, photo, { contentType: photo.type });
  return { path, error };
}

/** Suppression de photo au mieux : une photo orpheline ne gêne pas l'affichage. */
async function removePhoto(supabase: Supabase, path: string | null) {
  if (path) await supabase.storage.from(NEWS_BUCKET).remove([path]);
}

export async function createNews(_state: ActionState, formData: FormData): Promise<ActionState> {
  const fields = readNewsForm(formData);
  if ("error" in fields) return fields;

  const supabase = await createClient();
  const id = randomUUID();
  let imagePath: string | null = null;
  if (fields.photo) {
    const upload = await uploadPhoto(supabase, id, fields.photo);
    if (upload.error) return { error: "La photo n'a pas pu être envoyée. Réessayez." };
    imagePath = upload.path;
  }

  const { error } = await supabase.from("news").insert({
    id,
    title: fields.title,
    content: fields.content,
    image_path: imagePath,
    published_at: formData.get("intent") === "publish" ? new Date().toISOString() : null,
  });
  if (error) {
    await removePhoto(supabase, imagePath);
    return toActionState(error);
  }
  redirect("/actualites");
}

/** Enregistre les modifications ; le bouton utilisé peut aussi publier ou repasser en brouillon. */
export async function updateNews(_state: ActionState, formData: FormData): Promise<ActionState> {
  const fields = readNewsForm(formData);
  if ("error" in fields) return fields;

  const newsId = String(formData.get("newsId"));
  const intent = formData.get("intent");
  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("news")
    .select("image_path, published_at")
    .eq("id", newsId)
    .maybeSingle();
  if (readError) return toActionState(readError);
  if (!current) return { error: "Cette actualité n'existe plus." };

  let imagePath = fields.removePhoto ? null : current.image_path;
  if (fields.photo) {
    const upload = await uploadPhoto(supabase, newsId, fields.photo);
    if (upload.error) return { error: "La photo n'a pas pu être envoyée. Réessayez." };
    imagePath = upload.path;
  }

  // Une actualité déjà publiée garde sa date de publication d'origine.
  const publishedAt =
    intent === "publish" ? (current.published_at ?? new Date().toISOString()) : intent === "unpublish" ? null : current.published_at;

  const { data, error } = await supabase
    .from("news")
    .update({ title: fields.title, content: fields.content, image_path: imagePath, published_at: publishedAt })
    .eq("id", newsId)
    .select("id");
  if (error || data.length === 0) {
    if (imagePath !== current.image_path) await removePhoto(supabase, imagePath);
    return error ? toActionState(error) : { error: "Vous n'avez pas le droit de modifier cette actualité." };
  }
  if (imagePath !== current.image_path) await removePhoto(supabase, current.image_path);
  redirect("/actualites");
}

export async function deleteNews(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news")
    .delete()
    .eq("id", String(formData.get("newsId")))
    .select("image_path");
  if (error) return toActionState(error);
  if (data.length === 0) return { error: "Vous n'avez pas le droit de supprimer cette actualité." };
  await removePhoto(supabase, data[0].image_path);
  redirect("/actualites");
}
