import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { isoToParisLocal } from "@/lib/shop";

type Action = Parameters<typeof ActionForm>[0]["action"];

export type StageValues = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  capacity: number;
  is_published: boolean;
};

/** P6-10 : informations d'un stage (les tarifs se gèrent sur la page du stage). */
export function StageForm({ action, stage, readOnly }: { action: Action; stage?: StageValues; readOnly?: boolean }) {
  return (
    <ActionForm action={action} className="flex flex-col gap-4">
      {stage && <input type="hidden" name="stageId" value={stage.id} />}
      <fieldset disabled={readOnly} className="contents">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label htmlFor="title">Titre</Label>
            <Input id="title" name="title" defaultValue={stage?.title} placeholder="Ex. Stage perfectionnement" maxLength={150} required />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="startAt">Début</Label>
            <Input id="startAt" name="startAt" type="datetime-local" defaultValue={stage && isoToParisLocal(stage.start_at)} required />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="endAt">Fin</Label>
            <Input id="endAt" name="endAt" type="datetime-local" defaultValue={stage && isoToParisLocal(stage.end_at)} required />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="location">Lieu</Label>
            <Input id="location" name="location" defaultValue={stage?.location ?? undefined} placeholder="Ex. Gymnase du Bon Pasteur" maxLength={150} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="capacity">Places</Label>
            <Input id="capacity" name="capacity" type="number" min={1} defaultValue={stage?.capacity ?? 16} required />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={5} defaultValue={stage?.description ?? undefined} maxLength={5000} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPublished" defaultChecked={stage?.is_published ?? false} className="accent-[var(--accent)]" />
          Publié : visible dans l&apos;app et ouvert aux inscriptions (ajoutez d&apos;abord au moins un tarif)
        </label>
        {!readOnly && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="notify" defaultChecked className="accent-[var(--accent)]" />
            Prévenir les adhérents par notification quand le stage est publié (une seule fois)
          </label>
        )}
        {!readOnly && (
          <div>
            <Button type="submit" variant="accent">
              {stage ? "Enregistrer" : "Créer le stage"}
            </Button>
          </div>
        )}
      </fieldset>
    </ActionForm>
  );
}

export function BackLink() {
  return (
    <Link href="/stages" className="text-sm underline decoration-accent decoration-2 underline-offset-4">
      Retour aux stages
    </Link>
  );
}
