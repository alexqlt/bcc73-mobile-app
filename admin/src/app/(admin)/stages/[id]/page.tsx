import { notFound } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { Badge, Button, Card, EmptyState, formatDate, Input, Label, PageHeader, Select } from "@/components/ui";
import { isAdmin, requireAnyPermission, STAGE_PERMISSIONS } from "@/lib/auth";
import {
  eurosInputValue,
  eventKindLabels,
  formatEuros,
  formatStageDates,
  formatStageDay,
  registrationStatusLabels,
  stageDays,
} from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";

import { addPrice, cancelTestOrder, deletePrice, deleteStage, updatePrice, updateStage } from "../actions";
import { BackLink, StageForm } from "../stage-form";

export const metadata = { title: "Événement — BCC73 Administration" };

/** P6-10 et P6-15 : un stage, ses places par jour, ses tarifs et ses inscrits. */
export default async function StagePage({ params }: PageProps<"/stages/[id]">) {
  const viewer = await requireAnyPermission(STAGE_PERMISSIONS);
  const canUpdate = viewer.permissions.has("STAGE_UPDATE");
  const canCreate = viewer.permissions.has("STAGE_CREATE");
  const canSeeRegistrations = viewer.permissions.has("STAGE_VIEW_REGISTRATIONS");
  const admin = await isAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: stage, error } = await supabase
    .from("stages")
    .select(
      `id, title, description, location, start_at, end_at, capacity, is_published, kind,
       stage_prices (id, name, amount_cents, position, day),
       stage_registrations (id, status, price_name, amount_cents, created_at, confirmed_at, days,
                            member_name, member_license, orders (id, payer_email, provider))`
    )
    .eq("id", id)
    .order("position", { referencedTable: "stage_prices" })
    .order("created_at", { referencedTable: "stage_registrations" })
    .maybeSingle();
  if (error && error.code !== "22P02") throw error; // 22P02 : identifiant mal formé
  if (!stage) notFound();

  const days = stageDays(stage.start_at, stage.end_at);
  const { data: dayPlaces } = await supabase.rpc("stage_day_places", { stage: stage.id });
  const placesByDay = new Map((dayPlaces ?? []).map((row) => [row.day, row.places_left]));
  const active = stage.stage_registrations.filter((registration) => registration.status !== "cancelled");
  const allDays = (registrationDays: string[]) => registrationDays.length === days.length && days.length > 1;
  // Repas du club : une soirée, tarifs Adulte / Enfant valables pour l'événement entier.
  const meal = stage.kind === "meal";

  return (
    <>
      <PageHeader eyebrow="Événements" title={stage.title}>
        <BackLink />
      </PageHeader>
      <p className="mb-4 flex flex-wrap items-center gap-2 text-muted">
        <Badge tone="accent">{eventKindLabels[stage.kind]}</Badge>
        {formatStageDates(stage.start_at, stage.end_at)} · {stage.capacity} place(s){meal ? "" : " par jour"}
      </p>

      {/* Remplissage de chaque jour : inscriptions confirmées et paiements en cours. */}
      <ul className="mb-6 grid max-w-3xl gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {days.map((day) => {
          const left = placesByDay.get(day) ?? stage.capacity;
          const taken = stage.capacity - left;
          return (
            <li key={day} className="bg-surface p-3">
              <p className="font-heading text-sm uppercase tracking-wider">{formatStageDay(day)}</p>
              <div className="mt-2 h-2 bg-border">
                <div className="h-full bg-accent" style={{ width: `${Math.min(100, (taken / stage.capacity) * 100)}%` }} />
              </div>
              <p className="mt-1 text-sm">
                {taken} / {stage.capacity} place(s) prise(s)
                {left <= 0 && <span className="ml-2"><Badge tone="danger">Complet</Badge></span>}
              </p>
            </li>
          );
        })}
      </ul>

      <Card className="mb-6 max-w-3xl">
        <StageForm action={updateStage} readOnly={!canUpdate} stage={stage} />
      </Card>

      <section className="mb-10 max-w-3xl">
        <h2 className="mb-3 text-xl">Tarifs</h2>
        <p className="mb-3 text-sm text-muted">
          {meal
            ? "Chaque participant choisit son tarif (adulte ou enfant) à l'inscription."
            : "Un tarif couvre un jour ou tous les jours. Dans l'app, il n'est plus proposé si l'un de ses jours est passé ou complet."}
        </p>
        {stage.stage_prices.length === 0 && (
          <EmptyState>Aucun tarif : l&apos;événement ne peut pas recevoir d&apos;inscriptions.</EmptyState>
        )}
        <ul className="flex flex-col gap-2">
          {stage.stage_prices.map((price) => (
            <li key={price.id} className="bg-surface p-3">
              {canUpdate ? (
                <div className="flex flex-wrap items-center gap-2">
                  <ActionForm action={updatePrice} className="flex flex-1 flex-wrap items-center gap-2">
                    <input type="hidden" name="priceId" value={price.id} />
                    <input type="hidden" name="stageId" value={stage.id} />
                    <Input name="name" defaultValue={price.name} aria-label="Nom du tarif" maxLength={60} className="min-w-0 flex-1" />
                    {meal ? <input type="hidden" name="day" value="" /> : <DaySelect days={days} value={price.day} />}
                    <Input
                      name="amount"
                      defaultValue={eurosInputValue(price.amount_cents)}
                      aria-label="Montant en euros"
                      inputMode="decimal"
                      className="w-28"
                    />
                    <Button type="submit" variant="secondary">
                      Enregistrer
                    </Button>
                  </ActionForm>
                  <ActionForm action={deletePrice}>
                    <input type="hidden" name="priceId" value={price.id} />
                    <ConfirmButton variant="danger" message="Supprimer ce tarif ?">
                      Supprimer
                    </ConfirmButton>
                  </ActionForm>
                </div>
              ) : (
                <span>
                  {price.name} · {price.day ? formatStageDay(price.day) : "tous les jours"} ·{" "}
                  <span className="font-heading">{formatEuros(price.amount_cents)}</span>
                </span>
              )}
              {price.day && !days.includes(price.day) && (
                <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                  Ce jour ne fait plus partie de l&apos;événement (dates modifiées) : ce tarif n&apos;est plus proposé.
                </p>
              )}
            </li>
          ))}
        </ul>
        {(canCreate || canUpdate) && (
          <ActionForm action={addPrice} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="stageId" value={stage.id} />
            <input type="hidden" name="position" value={stage.stage_prices.length} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Label htmlFor="price-name">Nouveau tarif</Label>
              <Input id="price-name" name="name" placeholder={meal ? "Ex. Étudiant" : "Ex. Jeune, tous les jours"} maxLength={60} />
            </div>
            {meal ? (
              <input type="hidden" name="day" value="" />
            ) : (
              <div className="flex flex-col gap-1">
                <Label htmlFor="price-day">Jour</Label>
                <DaySelect id="price-day" days={days} value={null} />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <Label htmlFor="price-amount">Montant (€)</Label>
              <Input id="price-amount" name="amount" placeholder="35,00" inputMode="decimal" className="w-28" />
            </div>
            <Button type="submit">Ajouter</Button>
          </ActionForm>
        )}
      </section>

      {canSeeRegistrations && (
        <section className="mb-10">
          <h2 className="mb-3 text-xl">Inscrits</h2>
          {active.length === 0 ? (
            <EmptyState>Aucune inscription pour le moment.</EmptyState>
          ) : (
            <ol className="flex flex-col divide-y divide-border bg-surface">
              {[...active]
                .sort((a, b) => Number(a.status !== "confirmed") - Number(b.status !== "confirmed"))
                .map((registration, index) => (
                  <li key={registration.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4">
                    <span className="w-6 font-heading text-muted">{index + 1}</span>
                    <span className="font-bold">{registration.member_name}</span>
                    {registration.member_license && (
                      <span className="text-sm text-muted">Licence {registration.member_license}</span>
                    )}
                    <span className="text-sm">
                      {allDays(registration.days) ? "Tous les jours" : registration.days.map(formatStageDay).join(", ")} ·{" "}
                      {registration.price_name} · {formatEuros(registration.amount_cents)}
                    </span>
                    <Badge tone={registrationStatusLabels[registration.status].tone}>
                      {registrationStatusLabels[registration.status].label}
                    </Badge>
                    {registration.orders?.provider === "test" && <Badge tone="accent">Test</Badge>}
                    {admin && registration.orders?.provider === "test" && (
                      <ActionForm action={cancelTestOrder}>
                        <input type="hidden" name="orderId" value={registration.orders.id} />
                        <Button type="submit" variant="secondary" className="py-1">
                          Annuler le test
                        </Button>
                      </ActionForm>
                    )}
                    <span className="ml-auto text-xs text-muted">
                      {registration.orders?.payer_email} · {formatDate(registration.confirmed_at ?? registration.created_at)}
                    </span>
                  </li>
                ))}
            </ol>
          )}
        </section>
      )}

      {viewer.permissions.has("STAGE_DELETE") && (
        <ActionForm action={deleteStage}>
          <input type="hidden" name="stageId" value={stage.id} />
          <ConfirmButton variant="danger" message="Supprimer définitivement cet événement ?">
            Supprimer l&apos;événement
          </ConfirmButton>
        </ActionForm>
      )}
    </>
  );
}

/** Jour couvert par un tarif : tous les jours, ou l'un des jours du stage. */
function DaySelect({ id, days, value }: { id?: string; days: string[]; value: string | null }) {
  return (
    <Select id={id} name="day" defaultValue={value ?? ""} aria-label="Jour couvert par le tarif">
      <option value="">Tous les jours</option>
      {days.map((day, index) => (
        <option key={day} value={day}>
          Jour {index + 1} · {formatStageDay(day)}
        </option>
      ))}
      {value && !days.includes(value) && <option value={value}>{formatStageDay(value)} (hors dates)</option>}
    </Select>
  );
}
