import { useQuery } from '@tanstack/react-query';

import type { Database, Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type ScheduleType = Database['public']['Enums']['schedule_type'];
export type PeriodKind = Database['public']['Enums']['schedule_period_kind'];
export type SchedulePeriod = Tables<'schedule_periods'>;

/** Un créneau d'un jour donné, tel que calculé par la fonction SQL planning(). */
export type PlanningSlot = {
  schedule_id: string;
  day: string;
  start_time: string;
  end_time: string;
  type: ScheduleType;
  title: string;
  location: string | null;
  is_exceptional: boolean;
  is_cancelled: boolean;
  cancellation_reason: string | null;
  period_id: string | null;
  period_name: string | null;
  period_kind: PeriodKind | null;
};

export const scheduleTypeLabels: Record<ScheduleType, string> = {
  free_play: 'Jeu libre',
  training: 'Entraînement',
  other: 'Autre',
};

/** Jours ISO : 1 = lundi … 7 = dimanche. */
export const weekdayLabels = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// ---------------------------------------------------------------------------
// Dates locales (le club et ses adhérents sont à Chambéry : l'heure du téléphone suffit)
// ---------------------------------------------------------------------------

/** Date au format AAAA-MM-JJ, dans le fuseau du téléphone. */
export function toISODate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseISODate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Lundi de la semaine de la date. */
export function startOfWeek(date: Date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

/** Ex. « lundi 20 octobre ». */
export function formatDayLabel(date: Date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Ex. « 20 oct. ». */
export function formatShortDay(date: Date) {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** « 18:00:00 » → « 18:00 ». */
export function formatTime(time: string) {
  return time.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Requêtes
// ---------------------------------------------------------------------------

/** P4-02 : créneaux réels de la semaine qui commence le lundi `weekStart` (vacances, exceptions, annulations). */
export function usePlanningWeek(weekStart: Date) {
  const from = toISODate(weekStart);

  return useQuery({
    queryKey: ['planning', 'week', from],
    queryFn: async (): Promise<PlanningSlot[]> => {
      const { data, error } = await supabase.rpc('planning', {
        from_date: from,
        to_date: toISODate(addDays(weekStart, 6)),
      });
      if (error) throw error;
      return data;
    },
  });
}

/** Période qui s'applique un jour donné (vacances en priorité), ou null. */
export function usePeriodOn(day: Date) {
  const iso = toISODate(day);

  return useQuery({
    queryKey: ['planning', 'period', iso],
    queryFn: async (): Promise<SchedulePeriod | null> => {
      const { data, error } = await supabase.rpc('schedule_period_on', { day: iso });
      if (error) throw error;
      return data[0] ?? null;
    },
  });
}

/**
 * Périodes de vacances en cours ou à venir, avec leurs créneaux : ceux de la semaine (weekday)
 * et le programme jour par jour importé du fichier du club (date).
 */
export function useHolidayPeriods(today: Date) {
  const iso = toISODate(today);

  return useQuery({
    queryKey: ['planning', 'holidays', iso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_periods')
        .select(
          'id, name, kind, start_date, end_date, schedules (id, weekday, date, start_time, end_time, type, title, location, is_cancelled, cancellation_reason)'
        )
        .eq('kind', 'holidays')
        .gte('end_date', iso)
        .order('start_date')
        .order('date', { referencedTable: 'schedules' })
        .order('weekday', { referencedTable: 'schedules' })
        .order('start_time', { referencedTable: 'schedules' });
      if (error) throw error;
      return data;
    },
  });
}

