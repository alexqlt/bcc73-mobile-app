"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { ActionForm } from "@/components/action-form";
import { Button, Input, Label, Textarea } from "@/components/ui";
import type { ActionState } from "@/lib/action-state";
import { NEWS_TITLE_MAX_LENGTH } from "@/lib/news";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export type NewsFormValues = {
  id: string;
  title: string;
  content: string;
  photoUrl: string | null;
  isPublished: boolean;
};

/**
 * P3-05 : formulaire d'une actualité (titre, photo, contenu), comme dans APP.md §13.
 * Sans `news`, c'est une création ; le bouton cliqué indique s'il faut publier tout de suite.
 */
export function NewsForm({ action, news, readOnly }: { action: Action; news?: NewsFormValues; readOnly?: boolean }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const photoUrl = preview ?? (removePhoto ? null : news?.photoUrl ?? null);

  return (
    <ActionForm action={action} className="flex flex-col gap-5">
      {news && <input type="hidden" name="newsId" value={news.id} />}
      <fieldset disabled={readOnly} className="contents">
        <div className="flex flex-col gap-1">
          <Label htmlFor="title">Titre</Label>
          <Input
            id="title"
            name="title"
            defaultValue={news?.title}
            maxLength={NEWS_TITLE_MAX_LENGTH}
            placeholder="Ex. Le tournoi interne aura lieu le 15 novembre !"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="photo">Photo</Label>
          {photoUrl && (
            <div className="relative aspect-[16/9] w-full max-w-xl overflow-hidden bg-surface">
              <Image src={photoUrl} alt="" fill unoptimized className="object-cover" />
            </div>
          )}
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm file:mr-3 file:cursor-pointer file:border-2 file:border-foreground file:bg-transparent file:px-3 file:py-1 file:font-heading file:text-xs file:uppercase file:tracking-wider"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
          <p className="text-xs text-muted">JPEG, PNG ou WebP, 5 Mo maximum. Format paysage conseillé.</p>
          {news?.photoUrl && !preview && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="removePhoto"
                checked={removePhoto}
                onChange={(event) => setRemovePhoto(event.target.checked)}
                className="accent-[var(--accent)]"
              />
              Retirer la photo
            </label>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="content">Contenu</Label>
          <Textarea id="content" name="content" defaultValue={news?.content} rows={12} required />
          <p className="text-xs text-muted">Texte simple : laissez une ligne vide entre deux paragraphes.</p>
        </div>

        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            {!news ? (
              <>
                <Button type="submit" name="intent" value="publish" variant="accent">
                  Publier
                </Button>
                <Button type="submit" name="intent" value="draft" variant="secondary">
                  Enregistrer le brouillon
                </Button>
              </>
            ) : news.isPublished ? (
              <>
                <Button type="submit" name="intent" value="save" variant="accent">
                  Enregistrer
                </Button>
                <Button type="submit" name="intent" value="unpublish" variant="secondary">
                  Repasser en brouillon
                </Button>
              </>
            ) : (
              <>
                <Button type="submit" name="intent" value="publish" variant="accent">
                  Publier
                </Button>
                <Button type="submit" name="intent" value="save" variant="secondary">
                  Enregistrer le brouillon
                </Button>
              </>
            )}
          </div>
        )}
      </fieldset>
    </ActionForm>
  );
}

/** Suppression, après confirmation (la photo est supprimée avec l'actualité). */
export function DeleteNewsForm({ action, newsId }: { action: Action; newsId: string }) {
  return (
    <ActionForm action={action}>
      <input type="hidden" name="newsId" value={newsId} />
      <Button
        type="submit"
        variant="danger"
        onClick={(event) => {
          if (!confirm("Supprimer définitivement cette actualité ?")) event.preventDefault();
        }}
      >
        Supprimer l&apos;actualité
      </Button>
    </ActionForm>
  );
}

export function BackLink() {
  return (
    <Link href="/actualites" className="text-sm underline decoration-accent decoration-2 underline-offset-4">
      Retour aux actualités
    </Link>
  );
}
