import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { Badge, Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import { requireAnyPermission, SCHEDULE_PERMISSIONS } from "@/lib/auth";
import { addDays, formatDateRange, formatDay, formatShortDate, periodKindLabels, todayInParis } from "@/lib/planning";
import { createClient } from "@/lib/supabase/server";

import {
  createSlot,
  deleteSlot,
  restoreSlot,
  setExceptionalSlotCancelled,
  updateSlot,
} from "./actions";
import { SlotForm } from "./planning-forms";
import { SlotLine } from "./slot-line";

export const metadata = { title: "Planning — BCC73 Administration" };

/** Planning : aperçu des 7 prochains jours, périodes, créneaux exceptionnels et annulations. */
export default async function PlanningPage() {
  const viewer = await requireAnyPermission(SCHEDULE_PERMISSIONS);
  const canCreate = viewer.permissions.has("SCHEDULE_CREATE");
  const canUpdate = viewer.permissions.has("SCHEDULE_UPDATE");
  const canDelete = viewer.permissions.has("SCHEDULE_DELETE");
  const today = todayInParis();
  const supabase = await createClient();

  const [periods, week, exceptional, cancellations] = await Promise.all([
    supabase
      .from("schedule_periods")
      .select("id, name, kind, start_date, end_date, schedules (count)")
      .order("start_date", { ascending: false }),
    supabase.rpc("planning", { from_date: today, to_date: addDays(today, 6) }),
    supabase
      .from("schedules")
      .select("id, weekday, date, start_time, end_time, type, title, location, is_cancelled, cancellation_reason")
      .is("period_id", null)
      .gte("date", today)
      .order("date")
      .order("start_time"),
    supabase
      .from("schedule_cancellations")
      .select("id, start_date, end_date, reason, schedules (start_time, end_time, type, title, location)")
      .gte("end_date", today)
      .order("start_date"),
  ]);
  for (const result of [periods, week, exceptional, cancellations]) {
    if (result.error) throw result.error;
  }

  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index));

  return (
    <>
      <PageHeader eyebrow="Club" title="Planning">
        {canCreate && (
          <Link
            href="/planning/import"
            className="border-2 border-foreground px-4 py-2 font-heading text-sm uppercase tracking-wider transition hover:bg-surface"
          >
            Importer un fichier .xlsx
          </Link>
        )}
        {canCreate && (
          <Link
            href="/planning/periodes/nouvelle"
            className="border-2 border-accent bg-accent px-4 py-2 font-heading text-sm uppercase tracking-wider text-on-accent transition hover:opacity-85"
          >
            Nouvelle période
          </Link>
        )}
      </PageHeader>

      <section className="mb-10">
        <h2 className="mb-3 text-xl">Les 7 prochains jours</h2>
        <p className="mb-4 text-sm text-muted">Ce que voient les adhérents dans l&apos;application.</p>
        <ol className="flex flex-col divide-y divide-border bg-surface">
          {days.map((day) => {
            const slots = week.data!.filter((slot) => slot.day === day);
            return (
              <li key={day} className="flex flex-col gap-2 p-4 md:flex-row md:gap-6">
                <p className="w-56 shrink-0 font-heading text-sm uppercase tracking-wider">
                  {formatDay(day, { year: false })}
                  {slots[0]?.period_kind === "holidays" && (
                    <span className="ml-2 align-middle">
                      <Badge tone="warning">Vacances</Badge>
                    </span>
                  )}
                </p>
                <div className="flex flex-1 flex-col gap-2">
                  {slots.length === 0 ? (
                    <span className="text-sm text-muted">Aucun créneau</span>
                  ) : (
                    slots.map((slot) => (
                      <SlotLine
                        key={`${slot.schedule_id}-${day}`}
                        slot={slot}
                        cancelled={slot.is_cancelled}
                        reason={slot.cancellation_reason}
                      >
                        {slot.is_exceptional && <Badge tone="warning">Exceptionnel</Badge>}
                      </SlotLine>
                    ))
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl">Périodes</h2>
        <p className="mb-4 text-sm text-muted">
          Le planning normal couvre la saison ; une période de vacances le remplace sur ses dates.
        </p>
        {periods.data!.length === 0 ? (
          <EmptyState>Aucune période : commencez par créer la saison (planning normal).</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {periods.data!.map((period) => {
              const current = period.start_date <= today && today <= period.end_date;
              // Deux périodes du même type qui se chevauchent : seule la plus récente s'applique.
              const overlapping = periods.data!.find(
                (other) =>
                  other.id !== period.id &&
                  other.kind === period.kind &&
                  other.start_date <= period.end_date &&
                  period.start_date <= other.end_date
              );
              const past = period.end_date < today;
              return (
                <li key={period.id}>
                  <Link
                    href={`/planning/periodes/${period.id}`}
                    className={`flex flex-wrap items-center gap-3 bg-surface p-4 transition hover:opacity-80 ${past ? "opacity-60" : ""}`}
                  >
                    <span className="font-bold">{period.name}</span>
                    <Badge tone={period.kind === "holidays" ? "warning" : "neutral"}>{periodKindLabels[period.kind]}</Badge>
                    {current && <Badge tone="success">En cours</Badge>}
                    {overlapping && <Badge tone="danger">Chevauche « {overlapping.name} »</Badge>}
                    <span className="text-sm text-muted">
                      du {formatShortDate(period.start_date)} au {formatShortDate(period.end_date)} ·{" "}
                      {period.schedules[0]?.count ?? 0} créneau(x)
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl">Créneaux exceptionnels</h2>
        <p className="mb-4 text-sm text-muted">Un créneau ponctuel, en plus du planning (tournoi interne, séance de rattrapage…).</p>
        {canCreate && (
          <Card className="mb-4">
            <SlotForm action={createSlot} submitLabel="Ajouter le créneau exceptionnel" />
          </Card>
        )}
        {exceptional.data!.length === 0 ? (
          <EmptyState>Aucun créneau exceptionnel à venir.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {exceptional.data!.map((slot) => (
              <li key={slot.id} className="flex flex-col gap-3 bg-surface p-4">
                <p className="font-heading text-sm uppercase tracking-wider">{formatDay(slot.date!)}</p>
                <SlotLine slot={slot} cancelled={slot.is_cancelled} reason={slot.cancellation_reason} />
                <div className="flex flex-wrap items-start gap-2">
                  {canUpdate && (
                    <ActionForm action={setExceptionalSlotCancelled} className="flex flex-wrap gap-2">
                      <input type="hidden" name="scheduleId" value={slot.id} />
                      <input type="hidden" name="cancelled" value={String(!slot.is_cancelled)} />
                      {!slot.is_cancelled && (
                        <Input name="reason" placeholder="Motif (facultatif)" aria-label="Motif de l'annulation" maxLength={200} />
                      )}
                      <Button type="submit" variant={slot.is_cancelled ? "secondary" : "danger"}>
                        {slot.is_cancelled ? "Rétablir" : "Annuler"}
                      </Button>
                    </ActionForm>
                  )}
                  {canDelete && (
                    <ActionForm action={deleteSlot}>
                      <input type="hidden" name="scheduleId" value={slot.id} />
                      <ConfirmButton variant="danger" message="Supprimer ce créneau exceptionnel ?">
                        Supprimer
                      </ConfirmButton>
                    </ActionForm>
                  )}
                </div>
                {canUpdate && (
                  <details>
                    <summary className="cursor-pointer text-sm underline decoration-accent decoration-2 underline-offset-4">
                      Modifier
                    </summary>
                    <div className="mt-3">
                      <SlotForm action={updateSlot} slot={slot} submitLabel="Enregistrer" />
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl">Annulations à venir</h2>
        <p className="mb-4 text-sm text-muted">Créneaux habituels annulés pendant une période (à faire depuis la page de la période).</p>
        {cancellations.data!.length === 0 ? (
          <EmptyState>Aucune annulation à venir.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {cancellations.data!.map((cancellation) => (
              <li key={cancellation.id} className="flex flex-col gap-3 bg-surface p-4 lg:flex-row lg:items-center">
                <p className="w-64 shrink-0 font-heading text-sm uppercase tracking-wider">
                  {formatDateRange(cancellation.start_date, cancellation.end_date)}
                </p>
                <div className="flex-1">
                  {cancellation.schedules && (
                    <SlotLine slot={cancellation.schedules} cancelled reason={cancellation.reason} />
                  )}
                </div>
                {canUpdate && (
                  <ActionForm action={restoreSlot}>
                    <input type="hidden" name="cancellationId" value={cancellation.id} />
                    <Button type="submit" variant="secondary">
                      Rétablir
                    </Button>
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
