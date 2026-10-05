"use client";

import { useState } from "react";

export type ChartSeries = {
  key: string;
  label: string;
  /** Variable CSS de la couleur (palette validée, voir globals.css). */
  color: string;
};

export type ChartColumn = {
  label: string;
  /** Libellé complet pour l'infobulle et le tableau (ex. « octobre 2026 »). */
  longLabel?: string;
  values: Record<string, number>;
};

const HEIGHT = 180;

/** Unité des valeurs : montants en centimes (affichés en euros) ou nombres. */
export type ChartUnit = "euros" | "count";

function formatValue(value: number, unit: ChartUnit) {
  return unit === "euros"
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value / 100)
    : new Intl.NumberFormat("fr-FR").format(value);
}

/** Graduation « ronde » au-dessus du maximum (0, 50, 100, 150… ou 0, 200, 400…). */
function niceStep(max: number) {
  if (max <= 0) return 1;
  const raw = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= raw)!;
  return step;
}

/**
 * Histogramme en colonnes, empilées s'il y a plusieurs séries. Un seul axe, légende pour 2 séries
 * ou plus, infobulle au survol (et au clavier) de chaque colonne, tableau des valeurs dépliable.
 * Les textes restent dans les couleurs de texte ; seules les barres portent la couleur des séries.
 */
export function ColumnChart({
  columns,
  series,
  unit,
  caption,
}: {
  columns: ChartColumn[];
  series: ChartSeries[];
  unit: ChartUnit;
  /** Description pour les lecteurs d'écran et titre du tableau. */
  caption: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const format = (value: number) => formatValue(value, unit);
  const totals = columns.map((column) => series.reduce((sum, item) => sum + (column.values[item.key] ?? 0), 0));
  const step = niceStep(Math.max(...totals, 0));
  const top = step * Math.max(1, Math.ceil(Math.max(...totals, 0) / step));
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
  const stacked = series.length > 1;

  return (
    <figure className="flex flex-col gap-3">
      {stacked && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-hidden>
          {series.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: `var(${item.color})` }} />
              {item.label}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2" role="img" aria-label={caption}>
        {/* Axe des valeurs */}
        <div className="relative w-14 shrink-0 text-right text-xs text-muted" style={{ height: HEIGHT }}>
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(tick / top) * 100}%` }}>
              {format(tick)}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          {/* Grille discrète */}
          <div className="absolute inset-x-0 top-0" style={{ height: HEIGHT }}>
            {ticks.map((tick) => (
              <div
                key={tick}
                className={`absolute inset-x-0 border-t ${tick === 0 ? "border-muted" : "border-border"}`}
                style={{ bottom: `${(tick / top) * 100}%` }}
              />
            ))}
          </div>

          <div className="relative flex items-end gap-1" style={{ height: HEIGHT }}>
            {columns.map((column, index) => {
              const total = totals[index];
              const visible = series.filter((item) => (column.values[item.key] ?? 0) > 0);
              return (
                <div
                  key={column.label}
                  tabIndex={0}
                  className="group relative flex h-full flex-1 cursor-default flex-col justify-end outline-none"
                  onPointerEnter={() => setActive(index)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                >
                  {/* Segments, du bas vers le haut ; 2 px de fond entre eux, coins arrondis en haut seulement. */}
                  <div className="mx-auto flex w-full max-w-10 flex-col-reverse gap-[2px]">
                    {visible.map((item, position) => (
                      <div
                        key={item.key}
                        className={`transition-opacity ${active !== null && active !== index ? "opacity-60" : ""} ${
                          position === visible.length - 1 ? "rounded-t-[4px]" : ""
                        }`}
                        style={{
                          height: `${((column.values[item.key] ?? 0) / top) * HEIGHT}px`,
                          background: `var(${item.color})`,
                        }}
                      />
                    ))}
                  </div>

                  {active === index && (
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max min-w-36 -translate-x-1/2 border border-border bg-background p-3 text-sm shadow-lg"
                    >
                      <p className="mb-1 text-muted">{column.longLabel ?? column.label}</p>
                      {series.map((item) => (
                        <p key={item.key} className="flex items-center gap-2">
                          <span className="inline-block h-[2px] w-3" style={{ background: `var(${item.color})` }} />
                          <strong className="font-heading">{format(column.values[item.key] ?? 0)}</strong>
                          <span className="text-muted">{item.label}</span>
                        </p>
                      ))}
                      {stacked && (
                        <p className="mt-1 border-t border-border pt-1">
                          <strong className="font-heading">{format(total)}</strong> <span className="text-muted">au total</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Libellés des colonnes */}
          <div className="mt-1 flex gap-1 text-xs text-muted">
            {columns.map((column) => (
              <span key={column.label} className="flex-1 truncate text-center">
                {column.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Toutes les valeurs, sans survol (accessibilité, impression). */}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Afficher le tableau</summary>
        <table className="mt-2 w-full border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-1 font-normal">Période</th>
              {series.map((item) => (
                <th key={item.key} className="py-1 text-right font-normal">
                  {item.label}
                </th>
              ))}
              {stacked && <th className="py-1 text-right font-normal">Total</th>}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {columns.map((column, index) => (
              <tr key={column.label} className="border-b border-border">
                <td className="py-1">{column.longLabel ?? column.label}</td>
                {series.map((item) => (
                  <td key={item.key} className="py-1 text-right">
                    {format(column.values[item.key] ?? 0)}
                  </td>
                ))}
                {stacked && <td className="py-1 text-right font-bold">{format(totals[index])}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
