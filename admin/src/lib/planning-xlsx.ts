import * as XLSX from "xlsx";

import type { ScheduleType } from "@/lib/planning";
import { normalize } from "@/lib/text";

/**
 * Lecture du fichier .xlsx du planning du club (P4-08).
 *
 * Le fichier mélange plusieurs mises en page ; chaque onglet est reconnu par sa structure :
 * - grille : une ligne d'en-tête LUNDI … DIMANCHE, une activité par ligne, et dans chaque case
 *   « Lieu » puis « 20h00 - 22h00 » (plusieurs lieux possibles). Avec une ligne de dates sous
 *   l'en-tête, c'est une période de vacances : les dates donnent seulement le début et la fin de la
 *   période, les créneaux restent par jour de la semaine (le planning est le même chaque semaine) ;
 * - liste : une ligne d'en-tête Jour / début / fin, le jour étant un jour de la semaine (les lignes
 *   datées sont ignorées : un programme particulier se crée en période de vacances) ; un onglet
 *   « Annulations » donne des annulations.
 * Dans un onglet qui a une grille, la liste en dessous (demandes à la ville) est ignorée.
 */

export type ParsedSlot = {
  weekday: number;
  start_time: string;
  end_time: string;
  type: ScheduleType;
  title: string;
  location: string | null;
};

export type ParsedCancellation = {
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  reason: string | null;
};

export type SuggestedPeriod = { name: string; start_date: string; end_date: string };

export type ParsedSheet =
  | { kind: "weekly"; sheet: string; title: string; period: SuggestedPeriod; slots: ParsedSlot[]; ignored: string[] }
  | { kind: "holidays"; sheet: string; title: string; period: SuggestedPeriod; slots: ParsedSlot[]; ignored: string[] }
  | { kind: "cancellations"; sheet: string; title: string; rows: ParsedCancellation[]; ignored: string[] }
  | { kind: "unknown"; sheet: string; title: string };

type Cell = string | number | boolean | null;
type Row = Cell[];

const WEEKDAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const TIME_RANGE = /(\d{1,2})\s*[hH:]\s*(\d{2})?\s*(?:-|–|—|à|a)\s*(\d{1,2})\s*[hH:]\s*(\d{2})?/;
const SINGLE_TIME = /^(\d{1,2})\s*[hH:]\s*(\d{2})?$/;

function text(cell: Cell) {
  return typeof cell === "string" ? cell.trim() : "";
}

function isBlankRow(row: Row | undefined) {
  return !row || row.every((cell) => cell === null || String(cell).trim() === "");
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toTime(hours: number, minutes: number) {
  return hours <= 23 && minutes <= 59 ? `${pad(hours)}:${pad(minutes)}` : null;
}

/** Heure d'une cellule : nombre Excel (fraction de jour) ou texte « 22h », « 20h30 », « 13:45 ». */
function parseTime(cell: Cell): string | null {
  if (typeof cell === "number") {
    const minutes = Math.round((cell % 1) * 24 * 60);
    return toTime(Math.floor(minutes / 60), minutes % 60);
  }
  const match = SINGLE_TIME.exec(text(cell));
  return match ? toTime(Number(match[1]), Number(match[2] ?? 0)) : null;
}

/** Date d'une cellule : numéro de série Excel ou texte JJ/MM/AAAA. */
function parseDate(cell: Cell): string | null {
  if (typeof cell === "number" && cell > 1) {
    const date = XLSX.SSF.parse_date_code(cell);
    return date ? `${date.y}-${pad(date.m)}-${pad(date.d)}` : null;
  }
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text(cell));
  return match ? `${match[3]}-${pad(Number(match[2]))}-${pad(Number(match[1]))}` : null;
}

function weekdayOf(cell: Cell) {
  const index = WEEKDAYS.indexOf(normalize(cell));
  return index === -1 ? null : index + 1;
}

/** « ** Entraînement\nCollectif Régional » → « Entraînement Collectif Régional » ; « JEU LIBRE » → « Jeu libre ». */
function cleanTitle(value: string) {
  const title = value.replace(/^\*+/, "").replace(/\s+/g, " ").trim();
  const sentence = title === title.toUpperCase() ? title.charAt(0) + title.slice(1).toLowerCase() : title;
  return sentence.slice(0, 100);
}

/** Lignes d'un lieu : « Gymnase de Mérande » + « (4 terrains) » ; le renvoi « * » des notes est retiré. */
function cleanLocation(lines: string[]) {
  const location = lines
    .map((line) => line.replace(/\*/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .reduce((joined, line) => (!joined ? line : line.startsWith("(") ? `${joined} ${line}` : `${joined} – ${line}`), "");
  return location ? location.slice(0, 150) : null;
}

const typeCodes: Record<string, ScheduleType> = { J: "training", E: "training", A: "free_play" };

/** Type d'après l'intitulé, sinon d'après le code de l'onglet « Récurrents » (J, E : entraînement ; A : jeu libre). */
function inferType(title: string, code: Cell = null): ScheduleType {
  const value = normalize(title);
  if (value.includes("jeu libre")) return "free_play";
  if (/entrainement|collectif|initiation|niveau \d/.test(value)) return "training";
  return typeCodes[text(code).toUpperCase()] ?? "other";
}

/** Saison déduite d'un titre « 2026-2027 » ou « 26-27 » : de septembre à juin. */
function seasonPeriod(...labels: string[]): SuggestedPeriod {
  for (const label of labels) {
    const match = /(?:20)?(\d{2})\s*[-/]\s*(?:20)?(\d{2})\b/.exec(label);
    if (match && Number(match[2]) === Number(match[1]) + 1) {
      const [start, end] = [`20${match[1]}`, `20${match[2]}`];
      return { name: `Saison ${start}-${end}`, start_date: `${start}-09-01`, end_date: `${end}-06-30` };
    }
  }
  return { name: labels.find(Boolean) ?? "Planning", start_date: "", end_date: "" };
}

/** Créneaux d'une case de grille : des lignes de lieu, puis une ligne d'horaires, éventuellement répétées. */
function parseGridCell(value: string) {
  const slots: { location: string | null; start_time: string; end_time: string }[] = [];
  let locationLines: string[] = [];
  for (const line of value.split(/\r?\n/)) {
    const match = TIME_RANGE.exec(line);
    const start = match && toTime(Number(match[1]), Number(match[2] ?? 0));
    const end = match && toTime(Number(match[3]), Number(match[4] ?? 0));
    if (start && end && end > start) {
      slots.push({ location: cleanLocation(locationLines), start_time: start, end_time: end });
      locationLines = [];
    } else {
      locationLines.push(line);
    }
  }
  return slots;
}

function findGridHeaders(rows: Row[]) {
  return rows.flatMap((row, index) => {
    const columns = new Map<number, number>();
    row.forEach((cell, column) => {
      const weekday = weekdayOf(cell);
      if (weekday) columns.set(column, weekday);
    });
    return columns.size >= 5 ? [{ index, columns }] : [];
  });
}

function parseGrid(sheet: string, title: string, rows: Row[], headers: ReturnType<typeof findGridHeaders>): ParsedSheet {
  const slots: ParsedSlot[] = [];
  const ignored: string[] = [];
  const dates: string[] = [];
  const seen = new Set<string>();

  for (const { index, columns } of headers) {
    const firstDay = Math.min(...columns.keys());
    const activityColumn = firstDay - 1;
    const groupColumn = firstDay - 2;
    const dateRow = rows[index + 1] ?? [];
    const dateByColumn = new Map(
      [...columns.keys()].flatMap((column) => {
        const date = parseDate(dateRow[column] ?? null);
        return date ? [[column, date] as const] : [];
      })
    );
    dates.push(...dateByColumn.values());

    let group = "";
    for (let r = index + (dateByColumn.size > 0 ? 2 : 1); r < rows.length && !isBlankRow(rows[r]); r++) {
      const row = rows[r];
      group = text(row[groupColumn] ?? null) || group;
      const activity = cleanTitle(text(row[activityColumn] ?? null) || group);
      for (const [column, weekday] of columns) {
        const value = text(row[column] ?? null);
        if (!value) continue;
        const cellSlots = parseGridCell(value);
        if (cellSlots.length === 0) {
          ignored.push(`${activity} · ${WEEKDAYS[weekday - 1]} : « ${value.replace(/\s+/g, " ")} »`);
        }
        if (dateByColumn.size > 0 && !dateByColumn.has(column)) continue;
        for (const slot of cellSlots) {
          const key = [weekday, slot.start_time, slot.end_time, activity, normalize(slot.location)].join("|");
          // Une grille de vacances répète souvent la même semaine : chaque créneau n'est gardé qu'une fois.
          if (seen.has(key)) continue;
          seen.add(key);
          slots.push({ ...slot, weekday, type: inferType(activity), title: activity });
        }
      }
    }
  }

  if (dates.length > 0) {
    dates.sort();
    return {
      kind: "holidays",
      sheet,
      title,
      period: { name: sheet, start_date: dates[0], end_date: dates[dates.length - 1] },
      slots,
      ignored,
    };
  }
  return { kind: "weekly", sheet, title, period: seasonPeriod(title, sheet), slots, ignored };
}

function parseList(sheet: string, title: string, rows: Row[]): ParsedSheet {
  const headerIndex = rows.findIndex((row) => {
    const cells = row.map(normalize);
    return cells.includes("jour") && cells.includes("debut") && cells.includes("fin");
  });
  if (headerIndex === -1) return { kind: "unknown", sheet, title };

  const header = rows[headerIndex].map(normalize);
  const labels = (rows[headerIndex - 1] ?? []).map(normalize);
  const columnOf = (test: (label: string) => boolean) => {
    const index = header.findIndex(test);
    return index !== -1 ? index : labels.findIndex(test);
  };
  const day = header.indexOf("jour");
  const start = header.indexOf("debut");
  const end = header.indexOf("fin");
  const location = columnOf((label) => label.startsWith("installation"));
  const subject = columnOf((label) => label.startsWith("objet"));
  const code = columnOf((label) => label === "type");

  const isCancellations = normalize(sheet).includes("annul");
  const slots: ParsedSlot[] = [];
  const rowsOut: ParsedCancellation[] = [];
  const ignored: string[] = [];

  for (const row of rows.slice(headerIndex + 1)) {
    if (isBlankRow(row) || row.every((cell) => text(cell) === "" && typeof cell !== "number")) continue;
    const cell = (column: number) => (column === -1 ? null : (row[column] ?? null));
    const label = cleanTitle(text(cell(subject))) || "Créneau";
    const date = parseDate(cell(day));
    const weekday = date ? null : weekdayOf(cell(day));
    const startTime = parseTime(cell(start));
    const endTime = parseTime(cell(end));
    const place = cleanLocation(text(cell(location)).split(/\r?\n/));

    if (isCancellations) {
      if (date) rowsOut.push({ date, start_time: startTime, end_time: endTime, location: place, reason: label });
      else ignored.push(`${label} : date illisible`);
      continue;
    }
    if (date) {
      ignored.push(`${label} (${date}) : créneau daté ignoré (créez plutôt une période de vacances)`);
    } else if (!weekday) {
      ignored.push(`${label} : jour illisible`);
    } else if (!startTime || !endTime || endTime <= startTime) {
      ignored.push(`${label} : horaires manquants ou illisibles`);
    } else {
      slots.push({
        weekday,
        start_time: startTime,
        end_time: endTime,
        type: inferType(label, cell(code)),
        title: label,
        location: place,
      });
    }
  }

  if (isCancellations) return { kind: "cancellations", sheet, title, rows: rowsOut, ignored };
  if (slots.length > 0) {
    return { kind: "weekly", sheet, title, period: seasonPeriod(title, sheet), slots, ignored };
  }
  return { kind: "unknown", sheet, title };
}

/** Lit tout le classeur ; chaque onglet donne une proposition d'import (ou « inconnu »). */
export function parsePlanningWorkbook(data: ArrayBuffer): ParsedSheet[] {
  const workbook = XLSX.read(data, { type: "array", cellDates: false });

  return workbook.SheetNames.map((sheet) => {
    const rows = XLSX.utils.sheet_to_json<Row>(workbook.Sheets[sheet], {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });
    const headers = findGridHeaders(rows);
    // Titre : le premier texte de l'onglet (ex. « Créneaux saison 2026-2027 »).
    const firstText = rows.flat().find((cell) => typeof cell === "string" && cell.trim()) as string | undefined;
    const title = headers.length > 0 && firstText ? firstText.trim() : sheet;

    return headers.length > 0 ? parseGrid(sheet, title, rows, headers) : parseList(sheet, title, rows);
  });
}
