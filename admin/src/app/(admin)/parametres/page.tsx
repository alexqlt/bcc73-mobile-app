import { redirect } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { Button, Card, formatDate, Input, Label, PageHeader } from "@/components/ui";
import { getViewer, isAdmin } from "@/lib/auth";
import { getEventDefaults } from "@/lib/event-defaults";
import { eurosInputValue } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";

import { saveEventDefaults } from "./actions";

export const metadata = { title: "Paramètres — BCC73 Administration" };

/**
 * Paramètres : chaque section n'apparaît qu'à ceux qui peuvent la modifier. Tarifs par défaut des
 * événements : responsables qui créent les événements (STAGE_CREATE).
 */
export default async function ParametresPage() {
  const [viewer, admin] = await Promise.all([getViewer(), isAdmin()]);
  const canEditEvents = viewer.permissions.has("STAGE_CREATE");
  if (!admin && !canEditEvents) redirect("/");

  const defaults = canEditEvents ? await getEventDefaults(await createClient()) : null;
  const value = (cents: number | null) => (cents ? eurosInputValue(cents) : "");

  return (
    <>
      <PageHeader eyebrow="Administration" title="Paramètres" />

      {defaults ? (
        <Card className="max-w-3xl">
          <h2 className="text-xl">Tarifs par défaut des événements</h2>
          <p className="mt-1 text-sm text-muted">
            Proposés à la création d&apos;un événement (modifiables à chaque fois). Laissez un champ vide pour ne rien
            proposer.
          </p>
          <ActionForm action={saveEventDefaults} className="mt-4 flex flex-col gap-5">
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 font-heading text-xs uppercase tracking-widest">Repas du club</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <PriceField id="mealAdult" label="Tarif adulte (€)" value={value(defaults.mealAdult)} placeholder="25,00" />
                <PriceField id="mealChild" label="Tarif enfant (€)" value={value(defaults.mealChild)} placeholder="12,00" />
              </div>
            </fieldset>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 font-heading text-xs uppercase tracking-widest">Stage</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <PriceField id="stageDay" label="Tarif un jour (€)" value={value(defaults.stageDay)} placeholder="35,00" />
                <PriceField
                  id="stageAllDays"
                  label="Tarif tous les jours (€)"
                  value={value(defaults.stageAllDays)}
                  placeholder="Vide : un jour × nombre de jours"
                />
              </div>
            </fieldset>
            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" variant="accent">
                Enregistrer les tarifs
              </Button>
              {defaults.updatedAt && <span className="text-xs text-muted">Modifiés le {formatDate(defaults.updatedAt)}</span>}
            </div>
          </ActionForm>
        </Card>
      ) : (
        <Card className="max-w-3xl">
          <p className="text-muted">Aucun paramètre général pour le moment.</p>
        </Card>
      )}
    </>
  );
}

function PriceField({ id, label, value, placeholder }: { id: string; label: string; value: string; placeholder: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} inputMode="decimal" defaultValue={value} placeholder={placeholder} />
    </div>
  );
}
