"use client";

import Link from "next/link";
import { useState } from "react";

import { ActionForm } from "@/components/action-form";
import type { EventDefaults } from "@/lib/event-defaults";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import {
  eurosInputValue,
  eventKindLabels,
  formatStageDay,
  eventBounds,
  eventSchedule,
  parseEuros,
  stageDays,
  type EventKind,
  type EventSchedule,
} from "@/lib/shop";

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
  kind: EventKind;
};

/**
 * P6-10 : informations d'un événement. Le type ajuste le formulaire et les tarifs générés à la
 * création : un stage reçoit un tarif par jour (même montant) et un pour tous les jours (proposé à
 * « tarif du jour × nombre de jours ») ; un repas du club, un tarif Adulte et un tarif Enfant.
 */
export function StageForm({
  action,
  stage,
  readOnly,
  defaults,
}: {
  action: Action;
  stage?: StageValues;
  readOnly?: boolean;
  /** Tarifs par défaut (Paramètres), proposés à la création. */
  defaults?: EventDefaults;
}) {
  const initial = (cents: number | null | undefined) => (cents ? eurosInputValue(cents) : "");
  const [schedule, setSchedule] = useState<EventSchedule>(
    stage ? eventSchedule(stage.start_at, stage.end_at) : { startDate: "", endDate: "", startTime: "", endTime: "" }
  );
  const [dayPrice, setDayPrice] = useState(initial(defaults?.stageDay));
  // Sans tarif « tous les jours » par défaut : proposé à « un jour × nombre de jours ».
  const [allDaysPrice, setAllDaysPrice] = useState<string | null>(defaults?.stageAllDays ? initial(defaults.stageAllDays) : null);
  const [kind, setKind] = useState<EventKind>(stage?.kind ?? "stage");
  const meal = kind === "meal";
  const bounds = eventBounds(kind, schedule);
  const days = bounds ? stageDays(bounds.startAt, bounds.endAt) : [];
  const setField = (field: keyof EventSchedule) => (event: { target: { value: string } }) =>
    setSchedule({ ...schedule, [field]: event.target.value });
  const dayCents = parseEuros(dayPrice);
  const suggestedAllDays = dayCents && days.length > 1 ? eurosInputValue(dayCents * days.length) : "";

  return (
    <ActionForm action={action} className="flex flex-col gap-4">
      {stage && <input type="hidden" name="stageId" value={stage.id} />}
      <fieldset disabled={readOnly} className="contents">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="kind">Type</Label>
            <Select id="kind" name="kind" value={kind} onChange={(event) => setKind(event.target.value as EventKind)}>
              {Object.entries(eventKindLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              name="title"
              defaultValue={stage?.title}
              placeholder={meal ? "Ex. Repas de fin de saison" : "Ex. Stage perfectionnement"}
              maxLength={150}
              required
            />
          </div>
          {meal ? (
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Label htmlFor="startDate">Date</Label>
              <Input id="startDate" name="startDate" type="date" value={schedule.startDate} onChange={setField("startDate")} required />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <Label htmlFor="startDate">Premier jour</Label>
                <Input id="startDate" name="startDate" type="date" value={schedule.startDate} onChange={setField("startDate")} required />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="endDate">Dernier jour</Label>
                <Input id="endDate" name="endDate" type="date" value={schedule.endDate} onChange={setField("endDate")} required />
              </div>
            </>
          )}
          <div className="flex flex-col gap-1">
            <Label htmlFor="startTime">{meal ? "Heure de début" : "Début de la journée"}</Label>
            <Input id="startTime" name="startTime" type="time" value={schedule.startTime} onChange={setField("startTime")} required />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="endTime">{meal ? "Heure de fin" : "Fin de la journée"}</Label>
            <Input id="endTime" name="endTime" type="time" value={schedule.endTime} onChange={setField("endTime")} required />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="location">Lieu</Label>
            <Input id="location" name="location" defaultValue={stage?.location ?? undefined} placeholder="Ex. Gymnase du Bon Pasteur" maxLength={150} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="capacity">{meal ? "Places" : "Places par jour"}</Label>
            <Input id="capacity" name="capacity" type="number" min={1} defaultValue={stage?.capacity ?? (meal ? 60 : 16)} required />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={5} defaultValue={stage?.description ?? undefined} maxLength={5000} />
          </div>
        </div>

        {!meal && days.length > 0 && (
          <p className="text-sm text-muted">
            {days.length} jour(s) : {days.map(formatStageDay).join(", ")}, de {schedule.startTime} à {schedule.endTime}. Les
            places s&apos;entendent pour chaque jour.
          </p>
        )}

        {!stage && meal && (
          <fieldset className="flex flex-col gap-3 border-l-4 border-accent bg-background p-4">
            <legend className="sr-only">Tarifs</legend>
            <p className="font-heading text-xs uppercase tracking-widest">Tarifs générés</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="adultPrice">Tarif adulte (€)</Label>
                <Input id="adultPrice" name="adultPrice" inputMode="decimal" placeholder="25,00" defaultValue={initial(defaults?.mealAdult)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="childPrice">Tarif enfant (€)</Label>
                <Input id="childPrice" name="childPrice" inputMode="decimal" placeholder="12,00" defaultValue={initial(defaults?.mealChild)} />
              </div>
            </div>
            <p className="text-xs text-muted">
              À l&apos;inscription, le tarif adulte est proposé pour le titulaire du compte et le tarif enfant pour les
              enfants rattachés (modifiable).
            </p>
          </fieldset>
        )}

        {!stage && !meal && (
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
              D&apos;autres tarifs peuvent être ajoutés ensuite sur la page de l&apos;événement.
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
              {stage ? "Enregistrer" : "Créer l'événement"}
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
      Retour aux événements
    </Link>
  );
}
