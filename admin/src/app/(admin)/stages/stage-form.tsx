"use client";

import Link from "next/link";
import { useState } from "react";

import { ActionForm } from "@/components/action-form";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { eurosInputValue, formatStageDay, isoToParisLocal, parisLocalToISO, parseEuros, stageDays } from "@/lib/shop";

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

/** Jours couverts par les dates saisies (vide tant qu'elles sont incomplètes ou incohérentes). */
function daysOf(startLocal: string, endLocal: string) {
  const start = parisLocalToISO(startLocal);
  const end = parisLocalToISO(endLocal);
  return start && end && end > start ? stageDays(start, end) : [];
}

/**
 * P6-10 : informations d'un stage. À la création, les tarifs sont générés : un par jour (même
 * montant) et un pour tous les jours, proposé à « tarif du jour × nombre de jours ».
 */
export function StageForm({ action, stage, readOnly }: { action: Action; stage?: StageValues; readOnly?: boolean }) {
  const [startAt, setStartAt] = useState(stage ? isoToParisLocal(stage.start_at) : "");
  const [endAt, setEndAt] = useState(stage ? isoToParisLocal(stage.end_at) : "");
  const [dayPrice, setDayPrice] = useState("");
  const [allDaysPrice, setAllDaysPrice] = useState<string | null>(null);
  const days = daysOf(startAt, endAt);
  const dayCents = parseEuros(dayPrice);
  const suggestedAllDays = dayCents && days.length > 1 ? eurosInputValue(dayCents * days.length) : "";

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
            <Input id="startAt" name="startAt" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} required />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="endAt">Fin</Label>
            <Input id="endAt" name="endAt" type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} required />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="location">Lieu</Label>
            <Input id="location" name="location" defaultValue={stage?.location ?? undefined} placeholder="Ex. Gymnase du Bon Pasteur" maxLength={150} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="capacity">Places par jour</Label>
            <Input id="capacity" name="capacity" type="number" min={1} defaultValue={stage?.capacity ?? 16} required />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={5} defaultValue={stage?.description ?? undefined} maxLength={5000} />
          </div>
        </div>

        {days.length > 0 && (
          <p className="text-sm text-muted">
            {days.length} jour(s) : {days.map(formatStageDay).join(", ")}. Les places s&apos;entendent pour chaque jour.
          </p>
        )}

        {!stage && (
          <fieldset className="flex flex-col gap-3 border-l-4 border-accent bg-background p-4">
            <legend className="sr-only">Tarifs</legend>
            <p className="font-heading text-xs uppercase tracking-widest">Tarifs générés</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="dayPrice">{days.length > 1 ? "Tarif par jour (€)" : "Tarif (€)"}</Label>
                <Input id="dayPrice" name="dayPrice" inputMode="decimal" placeholder="35,00" value={dayPrice} onChange={(event) => setDayPrice(event.target.value)} />
              </div>
              {days.length > 1 && (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="allDaysPrice">Tarif tous les jours (€)</Label>
                  <Input
                    id="allDaysPrice"
                    name="allDaysPrice"
                    inputMode="decimal"
                    placeholder={suggestedAllDays || "90,00"}
                    value={allDaysPrice ?? suggestedAllDays}
                    onChange={(event) => setAllDaysPrice(event.target.value)}
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-muted">
              {days.length > 1
                ? `Un tarif par jour (${days.length} tarifs au même montant) et un tarif pour les ${days.length} jours, proposé à ${days.length} × le tarif du jour : modifiez-le pour accorder une réduction.`
                : "Un tarif pour la journée."}{" "}
              D&apos;autres tarifs peuvent être ajoutés ensuite sur la page du stage.
            </p>
          </fieldset>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPublished" defaultChecked={stage?.is_published ?? false} className="accent-[var(--accent)]" />
          Publié : visible dans l&apos;app et ouvert aux inscriptions
        </label>
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
