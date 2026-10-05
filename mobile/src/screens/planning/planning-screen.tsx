import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from '@/components/query-status';
import { BottomTabInset, MaxContentWidth, WebTopInset } from '@/constants/theme';
import { Card, Chip, ScheduleSlot, SectionTitle, Space, Text, useDesignSystem } from '@/design-system';
import {
  addDays,
  formatCancellation,
  formatDayLabel,
  formatShortDay,
  formatTime,
  parseISODate,
  startOfWeek,
  toISODate,
  usePeriodOn,
  usePlanningWeek,
  useUpcomingCancellations,
  useUpcomingPeriods,
  weekdayLabels,
  type ScheduleType,
} from '@/features/schedule/api';

/** Cette semaine (dates réelles), ou l'horaire type d'une période : normal ou vacances. */
type ViewMode = 'week' | 'normal' | 'holidays';
type TypeFilter = 'all' | 'free_play' | 'training';

/** Un créneau rattaché à son jour de la semaine. */
type WeekSlot = {
  key: string;
  /** 1 = lundi … 7 = dimanche. */
  weekday: number;
  start: string;
  end: string;
  title: string;
  tone: ScheduleType;
  cancelled?: boolean;
  location: string | null;
  note: string | null;
};

const typeFilters: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'free_play', label: 'Jeu libre' },
  { value: 'training', label: 'Entraînements' },
];

/** Jour ISO (1 = lundi … 7 = dimanche) d'une date. */
function isoWeekday(date: Date) {
  return ((date.getDay() + 6) % 7) + 1;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * P4-03 et P4-04 : planning jour par jour, en liste, avec trois vues :
 * - Cette semaine (par défaut) : les jours datés, vacances et annulations comprises ;
 * - Horaire normal : la semaine type de la saison ;
 * - Horaire vacances : la semaine type d'une période de vacances (une puce par période).
 * Une annulation s'affiche sur le créneau : barré si elle touche le jour affiché, en avertissement
 * si elle est à venir.
 */
export function PlanningScreen({ initialWeekday }: { initialWeekday?: number } = {}) {
  const insets = useSafeAreaInsets();
  const { tokens, mode } = useDesignSystem();
  const today = parseISODate(toISODate(new Date()));
  const todayIso = toISODate(today);
  const todayWeekday = isoWeekday(today);
  const weekStart = startOfWeek(today);

  const [view, setView] = useState<ViewMode>('week');
  const [holidayId, setHolidayId] = useState<string>();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [listWeekday, setListWeekday] = useState(initialWeekday ?? todayWeekday);

  const week = usePlanningWeek(weekStart);
  const currentPeriod = usePeriodOn(today);
  const periods = useUpcomingPeriods(today);
  const cancellations = useUpcomingCancellations(today);

  // Horaire normal : la saison en cours (la plus récente), sinon la prochaine.
  const normalPeriods = (periods.data ?? []).filter((period) => period.kind === 'normal');
  const normalPeriod = [...normalPeriods].reverse().find((period) => period.start_date <= todayIso) ?? normalPeriods[0];
  // Horaire vacances : vacances en cours ou à venir, la première par défaut.
  const holidayPeriods = (periods.data ?? []).filter((period) => period.kind === 'holidays');
  const holidayPeriod = holidayPeriods.find((period) => period.id === holidayId) ?? holidayPeriods[0];
  const shownPeriod = view === 'normal' ? normalPeriod : view === 'holidays' ? holidayPeriod : undefined;

  /** Annulation à venir d'un créneau, hors celle qui touche déjà le jour affiché. */
  const upcomingNote = (scheduleId: string, day?: string) => {
    const next = cancellations.data?.find(
      (cancellation) =>
        cancellation.schedule_id === scheduleId && !(day && cancellation.start_date <= day && day <= cancellation.end_date)
    );
    return next ? formatCancellation(next.start_date, next.end_date, next.reason) : null;
  };

  const query = view === 'week' ? week : periods;
  const allSlots: WeekSlot[] =
    view === 'week'
      ? (week.data ?? []).map((slot) => ({
          key: `${slot.schedule_id}-${slot.day}`,
          weekday: isoWeekday(parseISODate(slot.day)),
          start: formatTime(slot.start_time),
          end: formatTime(slot.end_time),
          title: slot.title,
          tone: slot.type,
          cancelled: slot.is_cancelled,
          location: slot.location,
          note: slot.is_cancelled
            ? formatCancellation(slot.cancellation_start, slot.cancellation_end, slot.cancellation_reason)
            : upcomingNote(slot.schedule_id, slot.day),
        }))
      : (shownPeriod?.schedules ?? []).map((slot) => ({
          key: slot.id,
          weekday: slot.weekday,
          start: formatTime(slot.start_time),
          end: formatTime(slot.end_time),
          title: slot.title,
          tone: slot.type,
          location: slot.location,
          note: upcomingNote(slot.id),
        }));
  const slots = allSlots.filter((slot) => typeFilter === 'all' || slot.tone === typeFilter);

  const weekHolidays = view === 'week' && currentPeriod.data?.kind === 'holidays' ? currentPeriod.data : undefined;
  const dayOf = (weekday: number) => addDays(weekStart, weekday - 1);

  return (
    <ScrollView
      style={{ backgroundColor: tokens.colors.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + WebTopInset + Space.lg,
          paddingBottom: insets.bottom + BottomTabInset + Space.xxl,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={week.isRefetching || currentPeriod.isRefetching || periods.isRefetching || cancellations.isRefetching}
          onRefresh={() => Promise.all([week.refetch(), currentPeriod.refetch(), periods.refetch(), cancellations.refetch()])}
          tintColor={tokens.colors.text}
        />
      }>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.inner}>
        <SectionTitle
          eyebrow={view === 'week' ? (weekHolidays?.name ?? 'Cette semaine') : (shownPeriod?.name ?? 'Horaire')}
          title="Planning"
        />

        <View style={styles.chips}>
          <Chip label="Cette semaine" selected={view === 'week'} onPress={() => setView('week')} />
          {normalPeriod && <Chip label="Horaire normal" selected={view === 'normal'} onPress={() => setView('normal')} />}
          {holidayPeriods.length > 0 && (
            <Chip label="Horaire vacances" selected={view === 'holidays'} onPress={() => setView('holidays')} />
          )}
        </View>

        {view === 'holidays' && holidayPeriods.length > 1 && (
          <View style={styles.chips}>
            {holidayPeriods.map((period) => (
              <Chip
                key={period.id}
                label={period.name}
                selected={period.id === holidayPeriod?.id}
                onPress={() => setHolidayId(period.id)}
              />
            ))}
          </View>
        )}

        {weekHolidays && (
          <Card highlighted>
            <Text variant="subtitle">Planning des vacances</Text>
            <Text color="textMuted">
              Du {formatShortDay(parseISODate(weekHolidays.start_date))} au{' '}
              {formatShortDay(parseISODate(weekHolidays.end_date))}, il remplace le planning habituel.
            </Text>
          </Card>
        )}
        {shownPeriod && (
          <Text color="textMuted">
            {shownPeriod.kind === 'holidays'
              ? `Du ${formatShortDay(parseISODate(shownPeriod.start_date))} au ${formatShortDay(parseISODate(shownPeriod.end_date))}, à la place du planning habituel.`
              : `Chaque semaine, du ${formatShortDay(parseISODate(shownPeriod.start_date))} au ${formatShortDay(parseISODate(shownPeriod.end_date))}.`}
          </Text>
        )}

        <View style={styles.chips}>
          {typeFilters.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={item.value === typeFilter}
              onPress={() => setTypeFilter(item.value)}
            />
          ))}
        </View>

        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : allSlots.length === 0 ? (
          <Card>
            <Text color="textMuted">Aucun créneau pour le moment.</Text>
          </Card>
        ) : (
          <>
            <View style={styles.chips}>
              {weekdayLabels.map((label, index) => (
                <Chip
                  key={label}
                  // Cette semaine : jours datés (« Lun 12 ») ; horaire type : jours de la semaine.
                  label={view === 'week' ? `${label.slice(0, 3)} ${dayOf(index + 1).getDate()}` : label.slice(0, 3)}
                  selected={listWeekday === index + 1}
                  onPress={() => setListWeekday(index + 1)}
                />
              ))}
            </View>
            <Text variant="subtitle">
              {view === 'week'
                ? `${capitalize(formatDayLabel(dayOf(listWeekday)))}${listWeekday === todayWeekday ? ' (aujourd’hui)' : ''}`
                : weekdayLabels[listWeekday - 1]}
            </Text>
            <DayList slots={slots.filter((slot) => slot.weekday === listWeekday)} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

function DayList({ slots }: { slots: WeekSlot[] }) {
  if (slots.length === 0) {
    return (
      <Card>
        <Text color="textMuted">Aucun créneau ce jour-là.</Text>
      </Card>
    );
  }
  return (
    <View style={styles.slots}>
      {[...slots]
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((slot) => (
          <ScheduleSlot
            key={slot.key}
            start={slot.start}
            end={slot.end}
            title={slot.title}
            location={slot.location}
            cancelled={slot.cancelled}
            note={slot.note}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Space.lg,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Space.lg,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  slots: {
    gap: Space.sm,
  },
});
