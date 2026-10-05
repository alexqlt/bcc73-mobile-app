"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ActionForm } from "@/components/action-form";
import { Button, Input, Label, Select } from "@/components/ui";
import type { ActionState } from "@/lib/action-state";
import { periodKindLabels, scheduleTypeLabels, weekdays, type PeriodKind, type ScheduleType } from "@/lib/planning";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export type PeriodValues = {
  id: string;
  name: string;
  kind: PeriodKind;
  start_date: string;
  end_date: string;
};

/** P4-06 : nom, type et dates d'une période. */
export function PeriodForm({ action, period, readOnly }: { action: Action; period?: PeriodValues; readOnly?: boolean }) {
  return (
    <ActionForm action={action} className="flex flex-col gap-5">
      {period && <input type="hidden" name="periodId" value={period.id} />}
      <fieldset disabled={readOnly} className="contents">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" htmlFor="name">
            <Input id="name" name="name" defaultValue={period?.name} placeholder="Ex. Saison 2026-2027" maxLength={100} required />
          </Field>
          <Field label="Type" htmlFor="kind">
            <Select id="kind" name="kind" defaultValue={period?.kind ?? "normal"}>
              {Object.entries(periodKindLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Du" htmlFor="startDate">
            <Input id="startDate" name="startDate" type="date" defaultValue={period?.start_date} required />
          </Field>
          <Field label="Au" htmlFor="endDate">
            <Input id="endDate" name="endDate" type="date" defaultValue={period?.end_date} required />
          </Field>
        </div>
        <p className="text-xs text-muted">
          Pendant une période de vacances, ses créneaux remplacent ceux du planning normal.
        </p>

        {!readOnly && (
          <div>
            <Button type="submit" variant="accent">
              {period ? "Enregistrer la période" : "Créer la période"}
            </Button>
          </div>
        )}
      </fieldset>
    </ActionForm>
  );
}

export type SlotValues = {
  id: string;
  weekday: number | null;
  date: string | null;
  start_time: string;
  end_time: string;
  type: ScheduleType;
  title: string;
  location: string | null;
};

/**
 * P4-05 / P4-07 : un créneau. Avec `periodId`, il est récurrent (jour de la semaine) ;
 * sans, il est exceptionnel (une date).
 */
export function SlotForm({
  action,
  periodId,
  slot,
  submitLabel,
}: {
  action: Action;
  periodId?: string;
  slot?: SlotValues;
  submitLabel: string;
}) {
  const id = slot?.id ?? "new";

  return (
    <ActionForm action={action} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {slot && <input type="hidden" name="scheduleId" value={slot.id} />}
      {periodId && <input type="hidden" name="periodId" value={periodId} />}
      {periodId ? (
        <Field label="Jour" htmlFor={`weekday-${id}`}>
          <Select id={`weekday-${id}`} name="weekday" defaultValue={slot?.weekday ?? 1}>
            {weekdays.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field label="Date" htmlFor={`date-${id}`}>
          <Input id={`date-${id}`} name="date" type="date" defaultValue={slot?.date ?? undefined} required />
        </Field>
      )}
      <Field label="Début" htmlFor={`start-${id}`}>
        <Input id={`start-${id}`} name="startTime" type="time" defaultValue={slot?.start_time.slice(0, 5)} required />
      </Field>
      <Field label="Fin" htmlFor={`end-${id}`}>
        <Input id={`end-${id}`} name="endTime" type="time" defaultValue={slot?.end_time.slice(0, 5)} required />
      </Field>
      <Field label="Type" htmlFor={`type-${id}`}>
        <Select id={`type-${id}`} name="type" defaultValue={slot?.type ?? "free_play"}>
          {Object.entries(scheduleTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Intitulé" htmlFor={`title-${id}`}>
        <Input
          id={`title-${id}`}
          name="title"
          defaultValue={slot?.title}
          placeholder="Ex. Entraînement adultes"
          maxLength={100}
        />
      </Field>
      <Field label="Lieu" htmlFor={`location-${id}`}>
        <Input
          id={`location-${id}`}
          name="location"
          defaultValue={slot?.location ?? undefined}
          placeholder="Ex. Gymnase du Bon Pasteur"
          maxLength={150}
        />
      </Field>
      <div className="sm:col-span-2 lg:col-span-6">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </ActionForm>
  );
}

/** Annule un créneau récurrent pour une date (gymnase fermé, compétition…). */
export function CancelDateForm({ action, scheduleId }: { action: Action; scheduleId: string }) {
  return (
    <ActionForm action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="scheduleId" value={scheduleId} />
      <Input name="date" type="date" aria-label="Date à annuler" required />
      <Input name="reason" placeholder="Motif (facultatif)" aria-label="Motif de l'annulation" maxLength={200} className="min-w-0 flex-1" />
      <Button type="submit" variant="danger">
        Annuler ce jour-là
      </Button>
    </ActionForm>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function BackLink() {
  return (
    <Link href="/planning" className="text-sm underline decoration-accent decoration-2 underline-offset-4">
      Retour au planning
    </Link>
  );
}
