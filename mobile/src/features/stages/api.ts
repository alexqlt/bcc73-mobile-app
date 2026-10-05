import { useQuery } from '@tanstack/react-query';

import { useMembers } from '@/features/members/api';
import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type RegistrationStatus = Database['public']['Enums']['registration_status'];

const STAGE_COLUMNS = 'id, title, description, location, start_at, end_at, capacity, stage_prices (id, name, amount_cents, position)';

type StageRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  capacity: number;
  stage_prices: { id: string; name: string; amount_cents: number; position: number }[];
};

/** Ajoute les places restantes (inscriptions confirmées ou en cours de paiement, calculées par la base). */
async function withPlacesLeft(stages: StageRow[]) {
  return Promise.all(
    stages.map(async (stage) => {
      const { data, error } = await supabase.rpc('stage_places_left', { stage: stage.id });
      if (error) throw error;
      return {
        ...stage,
        stage_prices: [...stage.stage_prices].sort((a, b) => a.position - b.position),
        placesLeft: Math.max(0, data ?? 0),
      };
    })
  );
}

export type Stage = Awaited<ReturnType<typeof withPlacesLeft>>[number];

/** P6-11 : stages publiés à venir (les brouillons, visibles des responsables, sont filtrés). */
export function useUpcomingStages() {
  return useQuery({
    queryKey: ['stages', 'upcoming'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stages')
        .select(STAGE_COLUMNS)
        .eq('is_published', true)
        .gt('start_at', new Date().toISOString())
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
        .select('id, status, price_name, amount_cents, member_id, member_name, stages (id, title, start_at, end_at, location)')
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
