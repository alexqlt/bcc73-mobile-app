import { notFound } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import { requireAnyPermission, SCHEDULE_PERMISSIONS } from "@/lib/auth";
import { formatDateRange, formatDay, todayInParis, weekdays } from "@/lib/planning";
import { createClient } from "@/lib/supabase/server";

import {
  cancelSlotForPeriod,
  createSlot,
  deletePeriod,
  deleteSlot,
  restoreSlot,
  setExceptionalSlotCancelled,
  updatePeriod,
  updateSlot,
} from "../../actions";
import { BackLink, CancelPeriodForm, PeriodForm, SlotForm } from "../../planning-forms";
import { SlotLine } from "../../slot-line";

export const metadata = { title: "Période du planning — BCC73 Administration" };

/** P4-05, P4-06, P4-07 : une période, ses créneaux de la semaine et leurs annulations. */
export default async function PeriodePage({ params }: PageProps<"/planning/periodes/[id]">) {
  const viewer = await requireAnyPermission(SCHEDULE_PERMISSIONS);
  const canCreate = viewer.permissions.has("SCHEDULE_CREATE");
  const canUpdate = viewer.permissions.has("SCHEDULE_UPDATE");
  const canDelete = viewer.permissions.has("SCHEDULE_DELETE");
  const { id } = await params;
  const today = todayInParis();
  const supabase = await createClient();

  const { data: period, error } = await supabase
    .from("schedule_periods")
    .select(
      `id, name, kind, start_date, end_date,
       schedules (id, weekday, date, start_time, end_time, type, title, location, is_cancelled, cancellation_reason,
                  schedule_cancellations (id, start_date, end_date, reason))`
    )
    .eq("id", id)
    .order("date", { referencedTable: "schedules" })
    .order("weekday", { referencedTable: "schedules" })
    .order("start_time", { referencedTable: "schedules" })
    .maybeSingle();
  if (error && error.code !== "22P02") throw error; // 22P02 : identifiant mal formé
  if (!period) notFound();

  const recurring = period.schedules.filter((slot) => slot.weekday !== null);
  // Programme daté (vacances importées du fichier du club) : les créneaux à venir.
  const dated = period.schedules.filter((slot) => slot.date !== null && slot.date >= today);

  return (
    <>
      <PageHeader eyebrow="Planning" title={period.name}>
        <BackLink />
      </PageHeader>

      <Card className="mb-6 max-w-3xl">
        <PeriodForm
          action={updatePeriod}
          readOnly={!canUpdate}
          period={{
            id: period.id,
            name: period.name,
            kind: period.kind,
            start_date: period.start_date,
            end_date: period.end_date,
          }}
        />
      </Card>
      {canDelete && (
        <ActionForm action={deletePeriod} className="mb-10">
          <input type="hidden" name="periodId" value={period.id} />
          <ConfirmButton variant="danger" message="Supprimer cette période et tous ses créneaux ?">
            Supprimer la période
          </ConfirmButton>
        </ActionForm>
      )}

      <h2 className="mb-3 text-xl">Créneaux de la semaine</h2>
      <p className="mb-4 text-sm text-muted">Ils se répètent chaque semaine, du premier au dernier jour de la période.</p>

      {canCreate && (
        <Card className="mb-6">
          <h3 className="mb-3 font-heading text-sm uppercase tracking-widest">Ajouter un créneau</h3>
          <SlotForm action={createSlot} periodId={period.id} submitLabel="Ajouter" />
        </Card>
      )}

      {recurring.length === 0 ? (
        <EmptyState>Aucun créneau de la semaine dans cette période.</EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {weekdays.map((label, index) => {
            const slots = recurring.filter((slot) => slot.weekday === index + 1);
            if (slots.length === 0) return null;
            return (
              <section key={label}>
                <h3 className="mb-2 font-heading text-sm uppercase tracking-widest">{label}</h3>
                <ul className="flex flex-col gap-3">
                  {slots.map((slot) => {
                    const upcoming = slot.schedule_cancellations
                      .filter((cancellation) => cancellation.end_date >= today)
                      .sort((a, b) => a.start_date.localeCompare(b.start_date));
                    return (
                      <li key={slot.id} className="flex flex-col gap-3 bg-surface p-4">
                        <SlotLine slot={slot}>
                          {canDelete && (
                            <ActionForm action={deleteSlot} className="ml-auto">
                              <input type="hidden" name="scheduleId" value={slot.id} />
                              <ConfirmButton variant="danger" message="Supprimer ce créneau de toutes les semaines ?">
                                Supprimer
                              </ConfirmButton>
                            </ActionForm>
                          )}
                        </SlotLine>

                        {upcoming.map((cancellation) => (
                          <div key={cancellation.id} className="flex flex-wrap items-center gap-3 text-sm">
                            <span>
                              Annulé <strong>{formatDateRange(cancellation.start_date, cancellation.end_date)}</strong>
                              {cancellation.reason && <span className="text-muted"> · {cancellation.reason}</span>}
                            </span>
                            {canUpdate && (
                              <ActionForm action={restoreSlot}>
                                <input type="hidden" name="cancellationId" value={cancellation.id} />
                                <Button type="submit" variant="secondary" className="py-1">
                                  Rétablir
                                </Button>
                              </ActionForm>
                            )}
                          </div>
                        ))}

                        {canUpdate && (
                          <details>
                            <summary className="cursor-pointer text-sm underline decoration-accent decoration-2 underline-offset-4">
                              Modifier ou annuler
                            </summary>
                            <div className="mt-3 flex flex-col gap-4">
                              <SlotForm action={updateSlot} periodId={period.id} slot={slot} submitLabel="Enregistrer" />
                              <CancelPeriodForm action={cancelSlotForPeriod} scheduleId={slot.id} />
                            </div>
                          </details>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {dated.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-xl">Créneaux datés à venir</h2>
          <p className="mb-4 text-sm text-muted">
            Programme jour par jour, importé du fichier du club : il s&apos;ajoute aux créneaux de la semaine.
          </p>
          <ul className="flex flex-col gap-3">
            {dated.map((slot) => (
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
                      {!slot.is_cancelled && (
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="notify" defaultChecked className="accent-[var(--accent)]" />
                          Prévenir
                        </label>
                      )}
                      <Button type="submit" variant={slot.is_cancelled ? "secondary" : "danger"}>
                        {slot.is_cancelled ? "Rétablir" : "Annuler"}
                      </Button>
                    </ActionForm>
                  )}
                  {canDelete && (
                    <ActionForm action={deleteSlot}>
                      <input type="hidden" name="scheduleId" value={slot.id} />
                      <ConfirmButton variant="danger" message="Supprimer ce créneau ?">
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
        </section>
      )}
    </>
  );
}
