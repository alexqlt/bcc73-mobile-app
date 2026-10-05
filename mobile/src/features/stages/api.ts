import { useQuery } from '@tanstack/react-query';

import { useMembers } from '@/features/members/api';
import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type RegistrationStatus = Database['public']['Enums']['registration_status'];

const STAGE_COLUMNS =
  'id, title, description, location, start_at, end_at, capacity, stage_prices (id, name, amount_cents, position, day)';

type StageRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  capacity: number;
  stage_prices: { id: string; name: string; amount_cents: number; position: number; day: string | null }[];
};

/**
 * Ajoute les places restantes de chaque jour (la capacité s'entend par jour ; inscriptions
 * confirmées ou en cours de paiement, calculées par la base) et celles du jour le plus rempli.
 */
async function withPlacesLeft(stages: StageRow[]) {
  return Promise.all(
    stages.map(async (stage) => {
      const { data, error } = await supabase.rpc('stage_day_places', { stage: stage.id });
      if (error) throw error;
      const days = data.map((row) => ({ day: row.day, placesLeft: Math.max(0, row.places_left) }));
      return {
        ...stage,
        stage_prices: [...stage.stage_prices].sort((a, b) => a.position - b.position),
        days,
        placesLeft: days.length ? Math.min(...days.map((row) => row.placesLeft)) : 0,
      };
    })
  );
}

export type Stage = Awaited<ReturnType<typeof withPlacesLeft>>[number];

/** P6-11 : stages publiés à venir ou en cours (les brouillons, visibles des responsables, sont filtrés). */
export function useUpcomingStages() {
  return useQuery({
    queryKey: ['stages', 'upcoming'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stages')
        .select(STAGE_COLUMNS)
        .eq('is_published', true)
        // Un stage de plusieurs jours déjà commencé reste proposé pour ses jours suivants.
        .gt('end_at', new Date().toISOString())
        .order('start_at');
      if (error) throw error;
      return withPlacesLeft(data);
    },
  });
}

export function useStage(id: string) {
  return useQuery({
    queryKey: ['stages', 'item', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('stages').select(STAGE_COLUMNS).eq('id', id).eq('is_published', true).maybeSingle();
      // 22P02 : identifiant mal formé (lien invalide) → même affichage qu'un stage introuvable.
      if (error && error.code !== '22P02') throw error;
      return data ? (await withPlacesLeft([data]))[0] : null;
    },
  });
}

/** P6-14 : inscriptions des membres du compte (hors annulées), du stage le plus proche au plus lointain. */
export function useMyRegistrations() {
  const members = useMembers();
  const memberIds = (members.data ?? []).map((member) => member.id);

  return useQuery({
    queryKey: ['stages', 'registrations', memberIds],
    enabled: memberIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stage_registrations')
        .select('id, status, price_name, amount_cents, member_id, member_name, days, stages (id, title, start_at, end_at, location)')
        // Les responsables voient toutes les inscriptions (RLS) : on ne garde que celles du compte.
        .in('member_id', memberIds)
        .neq('status', 'cancelled');
      if (error) throw error;
      return data
        .filter((registration) => registration.stages)
        .sort((a, b) => a.stages!.start_at.localeCompare(b.stages!.start_at));
    },
  });
}

/** Ex. « jeu. 12 nov. 2026 » et « 09:00 → 17:00 » (ou les deux dates si le stage dure plusieurs jours). */
export function formatStageDates(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const day = (date: Date) => date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const time = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return day(start) === day(end)
    ? { date: day(start), time: `${time(start)} → ${time(end)}` }
    : { date: `${day(start)} → ${day(end)}`, time: `${time(start)} → ${time(end)}` };
}

export type StagePrice = Stage['stage_prices'][number];

/** Jours couverts par un tarif : son jour, ou tous les jours du stage. */
export function priceDays(stage: Stage, price: StagePrice) {
  return price.day ? [price.day] : stage.days.map((row) => row.day);
}

/**
 * Un tarif est proposé si aucun de ses jours n'est passé et s'il reste, chaque jour, assez de places
 * pour toutes les personnes choisies (la base refait ces contrôles à l'inscription).
 */
export function priceAvailability(stage: Stage, price: StagePrice, people: number, today: string) {
  const days = priceDays(stage, price);
  if (days.length === 0 || !days.every((day) => stage.days.some((row) => row.day === day))) {
    return { available: false, reason: 'Indisponible' };
  }
  if (days[0] < today) return { available: false, reason: price.day ? 'Jour passé' : 'Stage commencé' };
  const places = Math.min(...days.map((day) => stage.days.find((row) => row.day === day)!.placesLeft));
  if (places <= 0) return { available: false, reason: 'Complet' };
  if (places < people) return { available: false, reason: `${places} place(s) seulement` };
  return { available: true, reason: null };
}

/** « 2026-10-19 » → « lun. 19 oct. ». */
export function formatStageDay(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

