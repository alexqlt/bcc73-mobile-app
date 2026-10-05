"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Badge, Button, Card, EmptyState, Input, Label, Select } from "@/components/ui";
import { formatShortDate, periodKindLabels, scheduleTypeLabels, weekdays } from "@/lib/planning";
import type { ParsedSlot } from "@/lib/planning-xlsx";
import { normalize } from "@/lib/text";

import {
  analyzePlanningFile,
  importPlanning,
  type Analysis,
  type AnalyzedSheet,
  type ImportPayload,
} from "./actions";

const NEW = "new";

type SheetConfig = {
  include: boolean;
  /** Période cible : `new` ou l'id d'une période existante (grilles de la semaine et vacances). */
  target: string;
  period: { name: string; start_date: string; end_date: string };
};

const kindLabels: Record<AnalyzedSheet["kind"], string> = {
  weekly: "Créneaux de la semaine",
  holidays: "Programme de vacances",
  cancellations: "Annulations",
  unknown: "Onglet non reconnu",
};

/** P4-08 : import du fichier .xlsx du club, avec un aperçu à valider avant l'enregistrement. */
export function ImportPlanning() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [configs, setConfigs] = useState<SheetConfig[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function analyze(formData: FormData) {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const response = await analyzePlanningFile(formData);
      if ("error" in response) {
        setError(response.error);
        return;
      }
      const initial = initialConfigs(response.analysis);
      setAnalysis(response.analysis);
      setConfigs(initial);
      setSelected(defaultSelection(response.analysis, initial));
    });
  }

  function updateConfig(index: number, change: Partial<SheetConfig>) {
    const next = configs.map((config, i) => (i === index ? { ...config, ...change } : config));
    setConfigs(next);
    // Les doublons dépendent de la période cible : la sélection de l'onglet est recalculée.
    if (analysis && change.target !== undefined) {
      setSelected({ ...selected, ...defaultSelection(analysis, next, index) });
    }
  }

  function submit() {
    if (!analysis) return;
    setError(null);
    const payload = buildPayload(analysis, configs, selected);
    startTransition(async () => {
      const response = await importPlanning(payload);
      if ("error" in response) {
        setError(response.error);
        return;
      }
      const { periods, slots, cancellations } = response.result;
      setResult(
        `Import terminé : ${periods} période(s) créée(s), ${slots} créneau(x) ajouté(s), ${cancellations} annulation(s).`
      );
      setAnalysis(null);
    });
  }

  const payload = analysis ? buildPayload(analysis, configs, selected) : null;
  const total = payload ? payload.slots.length + payload.cancellations.length : 0;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <form action={analyze} className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="file">Fichier du planning (.xlsx)</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              className="text-sm file:mr-3 file:cursor-pointer file:border-2 file:border-foreground file:bg-transparent file:px-3 file:py-1 file:font-heading file:text-xs file:uppercase file:tracking-wider"
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending && !analysis ? "Analyse…" : "Analyser le fichier"}
          </Button>
        </form>
        <p className="mt-3 text-sm text-muted">
          Rien n&apos;est enregistré à cette étape : un aperçu s&apos;affiche, vous choisissez ce qui est importé. Les
          créneaux s&apos;ajoutent à ceux qui existent déjà.
        </p>
      </Card>

      {error && (
        <p role="alert" className="bg-red-50 p-4 text-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {result && (
        <p role="status" className="bg-green-50 p-4 text-green-900 dark:bg-green-950 dark:text-green-300">
          {result}{" "}
          <Link href="/planning" className="underline decoration-accent decoration-2 underline-offset-4">
            Voir le planning
          </Link>
        </p>
      )}

      {analysis && (
        <>
          <h2 className="text-xl">Aperçu de « {analysis.fileName} »</h2>
          {analysis.sheets.map((sheet, index) => (
            <SheetPreview
              key={sheet.sheet}
              analysis={analysis}
              sheet={sheet}
              index={index}
              config={configs[index]}
              selected={selected}
              onConfig={(change) => updateConfig(index, change)}
              onSelect={(changes) => setSelected({ ...selected, ...changes })}
            />
          ))}
          <div className="sticky bottom-0 flex flex-wrap items-center gap-4 border-t-2 border-accent bg-background py-4">
            <Button type="button" variant="accent" disabled={pending || total === 0} onClick={submit}>
              {pending ? "Import…" : `Importer ${total} élément(s)`}
            </Button>
            <span className="text-sm text-muted">Tout est enregistré d&apos;un coup : en cas d&apos;erreur, rien n&apos;est importé.</span>
          </div>
        </>
      )}
    </div>
  );
}

function SheetPreview({
  analysis,
  sheet,
  index,
  config,
  selected,
  onConfig,
  onSelect,
}: {
  analysis: Analysis;
  sheet: AnalyzedSheet;
  index: number;
  config: SheetConfig;
  selected: Record<string, boolean>;
  onConfig: (change: Partial<SheetConfig>) => void;
  onSelect: (changes: Record<string, boolean>) => void;
}) {
  const keys = itemKeys(sheet, index);

  return (
    <Card className={config.include ? "" : "opacity-60"}>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg">{sheet.sheet}</h3>
        <Badge tone={sheet.kind === "unknown" ? "neutral" : "accent"}>{kindLabels[sheet.kind]}</Badge>
        {sheet.kind !== "unknown" && keys.length > 0 && (
          <label className="ml-auto flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.include}
              onChange={(event) => onConfig({ include: event.target.checked })}
              className="accent-[var(--accent)]"
            />
            Importer cet onglet
          </label>
        )}
      </div>
      {sheet.title !== sheet.sheet && <p className="mt-1 text-sm text-muted">{sheet.title}</p>}

      {sheet.kind === "unknown" ? (
        <p className="mt-3 text-sm text-muted">Mise en page non reconnue : cet onglet est ignoré.</p>
      ) : keys.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Rien à importer dans cet onglet.</p>
      ) : (
        config.include && (
          <div className="mt-4 flex flex-col gap-4">
            {(sheet.kind === "weekly" || sheet.kind === "holidays") && (
              <PeriodTarget id={`sheet-${index}`} analysis={analysis} kind={sheet.kind === "weekly" ? "normal" : "holidays"} config={config} onConfig={onConfig} />
            )}
            <div className="flex gap-3 text-sm">
              <button type="button" className="cursor-pointer underline" onClick={() => onSelect(Object.fromEntries(keys.map((key) => [key, true])))}>
                Tout cocher
              </button>
              <button type="button" className="cursor-pointer underline" onClick={() => onSelect(Object.fromEntries(keys.map((key) => [key, false])))}>
                Tout décocher
              </button>
            </div>
            <ItemList analysis={analysis} sheet={sheet} index={index} config={config} selected={selected} onSelect={onSelect} />
          </div>
        )
      )}

      {"ignored" in sheet && sheet.ignored.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-muted">{sheet.ignored.length} ligne(s) ignorée(s)</summary>
          <ul className="mt-2 list-disc pl-5 text-muted">
            {sheet.ignored.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}

function PeriodTarget({
  id,
  analysis,
  kind,
  config,
  onConfig,
}: {
  id: string;
  analysis: Analysis;
  kind: "normal" | "holidays";
  config: SheetConfig;
  onConfig: (change: Partial<SheetConfig>) => void;
}) {
  const periods = analysis.periods.filter((period) => period.kind === kind);

  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-target`}>Ajouter à</Label>
        <Select id={`${id}-target`} value={config.target} onChange={(event) => onConfig({ target: event.target.value })}>
          <option value={NEW}>Nouvelle période ({periodKindLabels[kind].toLowerCase()})</option>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name} (du {formatShortDate(period.start_date)} au {formatShortDate(period.end_date)})
            </option>
          ))}
        </Select>
      </div>
      {config.target === NEW && (
        <>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-name`}>Nom</Label>
            <Input id={`${id}-name`} value={config.period.name} onChange={(event) => onConfig({ period: { ...config.period, name: event.target.value } })} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-start`}>Du</Label>
            <Input id={`${id}-start`} type="date" value={config.period.start_date} onChange={(event) => onConfig({ period: { ...config.period, start_date: event.target.value } })} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-end`}>Au</Label>
            <Input id={`${id}-end`} type="date" value={config.period.end_date} onChange={(event) => onConfig({ period: { ...config.period, end_date: event.target.value } })} />
          </div>
        </>
      )}
    </div>
  );
}

function ItemList({
  analysis,
  sheet,
  index,
  config,
  selected,
  onSelect,
}: {
  analysis: Analysis;
  sheet: AnalyzedSheet;
  index: number;
  config: SheetConfig;
  selected: Record<string, boolean>;
  onSelect: (changes: Record<string, boolean>) => void;
}) {
  if (sheet.kind === "cancellations") {
    return (
      <ul className="flex flex-col divide-y divide-border">
        {sheet.rows.map((row, rowIndex) => {
          const matches = sheet.matches?.[rowIndex] ?? [];
          return (
            <li key={rowIndex} className="py-2 text-sm">
              <p>
                <strong>{formatShortDate(row.date)}</strong>
                {row.start_time && row.end_time && ` · ${row.start_time} → ${row.end_time}`}
                {row.location && ` · ${row.location}`}
                {row.reason && <span className="text-muted"> · {row.reason}</span>}
                {row.date < analysis.today && <span className="ml-2"><Badge>Passé</Badge></span>}
              </p>
              {matches.length === 0 ? (
                <p className="text-muted">Aucun créneau correspondant dans le planning enregistré.</p>
              ) : (
                matches.map((match, matchIndex) => {
                  const key = `${index}:${rowIndex}:${matchIndex}`;
                  return (
                    <label key={key} className="mt-1 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!selected[key]}
                        onChange={(event) => onSelect({ [key]: event.target.checked })}
                        className="accent-[var(--accent)]"
                      />
                      Annuler {match.label}
                      {match.already_cancelled && <Badge>Déjà annulé</Badge>}
                    </label>
                  );
                })
              )}
            </li>
          );
        })}
      </ul>
    );
  }
  if (!("slots" in sheet)) return <EmptyState>Rien à importer.</EmptyState>;

  return (
    <ul className="flex flex-col divide-y divide-border">
      {sheet.slots.map((slot, slotIndex) => {
        const key = `${index}:${slotIndex}`;
        return (
          <li key={key}>
            <label className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <input
                type="checkbox"
                checked={!!selected[key]}
                onChange={(event) => onSelect({ [key]: event.target.checked })}
                className="accent-[var(--accent)]"
              />
              <span className="w-32 font-heading">{weekdays[slot.weekday - 1]}</span>
              <span className="w-28 font-heading">
                {slot.start_time} → {slot.end_time}
              </span>
              <span className="font-bold">{slot.title}</span>
              <Badge tone={slot.type === "training" ? "accent" : "neutral"}>{scheduleTypeLabels[slot.type]}</Badge>
              {slot.location && <span className="text-muted">{slot.location}</span>}
              {isDuplicate(analysis, sheet, slot, config) && <Badge tone="warning">Déjà présent</Badge>}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Sélection par défaut et construction de l'import
// ---------------------------------------------------------------------------

function isDuplicate(analysis: Analysis, sheet: AnalyzedSheet, slot: ParsedSlot, config: SheetConfig) {
  const periodId = config.target === NEW ? undefined : config.target;
  if (periodId === undefined) return false;
  return analysis.existing.some(
    (existing) =>
      existing.period_id === periodId &&
      existing.weekday === slot.weekday &&
      existing.start_time.slice(0, 5) === slot.start_time &&
      existing.end_time.slice(0, 5) === slot.end_time &&
      normalize(existing.title) === normalize(slot.title)
  );
}

function itemKeys(sheet: AnalyzedSheet, index: number) {
  if (sheet.kind === "cancellations") {
    return (sheet.matches ?? []).flatMap((matches, rowIndex) => matches.map((_, matchIndex) => `${index}:${rowIndex}:${matchIndex}`));
  }
  return "slots" in sheet ? sheet.slots.map((_, slotIndex) => `${index}:${slotIndex}`) : [];
}

/** Même nom, à la ponctuation et aux espaces près (« Saison 2026 - 2027 » = « Saison 2026-2027 »). */
function sameName(a: string, b: string) {
  const key = (value: string) => normalize(value).replace(/[^a-z0-9]/g, "");
  return key(a) === key(b);
}

/**
 * Période cible proposée : une période existante du même type qui porte le même nom ou chevauche les
 * mêmes dates (deux périodes qui se chevauchent se masquent l'une l'autre), sinon une nouvelle.
 */
function initialConfigs(analysis: Analysis): SheetConfig[] {
  const hasWeeklyGrid = analysis.sheets.some((sheet) => sheet.kind === "weekly" && sheet.title !== sheet.sheet);

  return analysis.sheets.map((sheet) => {
    if (sheet.kind !== "weekly" && sheet.kind !== "holidays") {
      return { include: sheet.kind !== "unknown", target: NEW, period: { name: "", start_date: "", end_date: "" } };
    }
    const kind = sheet.kind === "weekly" ? "normal" : "holidays";
    const existing = analysis.periods.find(
      (period) =>
        period.kind === kind &&
        (sameName(period.name, sheet.period.name) ||
          (!!sheet.period.start_date &&
            period.start_date <= sheet.period.end_date &&
            sheet.period.start_date <= period.end_date))
    );
    // La liste « Récurrents annuels » double la grille de la saison : décochée si une grille existe.
    const duplicateList = sheet.kind === "weekly" && sheet.title === sheet.sheet && hasWeeklyGrid;
    const past = sheet.kind === "holidays" && sheet.period.end_date < analysis.today;
    return { include: !duplicateList && !past, target: existing?.id ?? NEW, period: sheet.period };
  });
}

/** Coche tout sauf le passé, les doublons et ce qui est déjà annulé (pour un onglet, ou tous). */
function defaultSelection(analysis: Analysis, configs: SheetConfig[], only?: number) {
  const selection: Record<string, boolean> = {};
  analysis.sheets.forEach((sheet, index) => {
    if (only !== undefined && index !== only) return;
    if (sheet.kind === "cancellations") {
      sheet.rows.forEach((row, rowIndex) =>
        (sheet.matches?.[rowIndex] ?? []).forEach((match, matchIndex) => {
          selection[`${index}:${rowIndex}:${matchIndex}`] = row.date >= analysis.today && !match.already_cancelled;
        })
      );
    } else if ("slots" in sheet) {
      sheet.slots.forEach((slot, slotIndex) => {
        selection[`${index}:${slotIndex}`] = !isDuplicate(analysis, sheet, slot, configs[index]);
      });
    }
  });
  return selection;
}

function buildPayload(analysis: Analysis, configs: SheetConfig[], selected: Record<string, boolean>): ImportPayload {
  const payload: ImportPayload = { periods: [], slots: [], cancellations: [] };

  analysis.sheets.forEach((sheet, index) => {
    const config = configs[index];
    if (!config?.include) return;

    if (sheet.kind === "cancellations") {
      sheet.rows.forEach((row, rowIndex) =>
        (sheet.matches?.[rowIndex] ?? []).forEach((match, matchIndex) => {
          if (!selected[`${index}:${rowIndex}:${matchIndex}`]) return;
          payload.cancellations.push({
            schedule_id: match.schedule_id,
            date: row.date,
            reason: row.reason,
          });
        })
      );
      return;
    }
    if (!("slots" in sheet)) return;

    const slots = sheet.slots.filter((_, slotIndex) => selected[`${index}:${slotIndex}`]);
    if (slots.length === 0) return;

    const periodRef = `sheet-${index}`;
    payload.periods.push(
      config.target === NEW
        ? { ref: periodRef, kind: sheet.kind === "weekly" ? "normal" : "holidays", ...config.period }
        : { ref: periodRef, id: config.target }
    );
    for (const slot of slots) {
      payload.slots.push({ ...slot, period_ref: periodRef });
    }
  });
  return payload;
}
