import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from '@/components/query-status';
import { BottomTabInset, MaxContentWidth, WebTopInset } from '@/constants/theme';
import {
  Badge,
  Button,
  Card,
  Chip,
  ScheduleSlot,
  SectionTitle,
  Space,
  Text,
  useDesignSystem,
} from '@/design-system';
import {
  addDays,
  formatDayLabel,
  formatShortDay,
  formatTime,
  parseISODate,
  startOfWeek,
  toISODate,
  useHolidayPeriods,
  usePeriodOn,
  usePlanningWeek,
  weekdayLabels,
  type PlanningSlot,
  type SchedulePeriod,
} from '@/features/schedule/api';

type Filter = 'all' | 'free_play' | 'training' | 'holidays';
type ViewMode = 'day' | 'week';

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'free_play', label: 'Jeu libre' },
  { value: 'training', label: 'Entraînements' },
  { value: 'holidays', label: 'Vacances' },
];

/** P4-03 et P4-04 : planning du jour ou de la semaine, filtres, vacances et créneaux exceptionnels. */
export function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const { tokens, mode } = useDesignSystem();
  const today = parseISODate(toISODate(new Date()));
  const [filter, setFilter] = useState<Filter>('all');
  const [view, setView] = useState<ViewMode>('day');
  const [selected, setSelected] = useState(today);

  const weekStart = startOfWeek(selected);
  const week = usePlanningWeek(weekStart);
  const currentPeriod = usePeriodOn(today);
  const holidays = useHolidayPeriods(today);

  const refreshing = week.isRefetching || currentPeriod.isRefetching || holidays.isRefetching;
  const isToday = toISODate(selected) === toISODate(today);
  const step = view === 'day' ? 1 : 7;
  const visibleSlots = (week.data ?? []).filter((slot) => filter === 'all' || slot.type === filter);

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
          refreshing={refreshing}
          onRefresh={() => Promise.all([week.refetch(), currentPeriod.refetch(), holidays.refetch()])}
          tintColor={tokens.colors.text}
        />
      }>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.inner}>
        <SectionTitle eyebrow={`Aujourd'hui — ${formatDayLabel(today)}`} title="Planning" />

        {currentPeriod.data && <CurrentPeriod period={currentPeriod.data} />}

        <View style={styles.chips}>
          {filters.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={item.value === filter}
              onPress={() => setFilter(item.value)}
            />
          ))}
        </View>

        {filter === 'holidays' ? (
          <HolidaysView query={holidays} />
        ) : (
          <>
            <View style={styles.chips}>
              <Chip label="Jour" selected={view === 'day'} onPress={() => setView('day')} />
              <Chip label="Semaine" selected={view === 'week'} onPress={() => setView('week')} />
              {!isToday && <Chip label="Revenir à aujourd'hui" onPress={() => setSelected(today)} />}
            </View>

            <View style={styles.navigation}>
              <Button
                title="‹ Préc."
                variant="ghost"
                accessibilityLabel={view === 'day' ? 'Jour précédent' : 'Semaine précédente'}
                onPress={() => setSelected(addDays(selected, -step))}
              />
              <Text variant="label" style={styles.navigationLabel}>
                {view === 'day'
                  ? isToday
                    ? "Aujourd'hui"
                    : formatDayLabel(selected)
                  : `Du ${formatShortDay(weekStart)} au ${formatShortDay(addDays(weekStart, 6))}`}
              </Text>
              <Button
                title="Suiv. ›"
                variant="ghost"
                accessibilityLabel={view === 'day' ? 'Jour suivant' : 'Semaine suivante'}
                onPress={() => setSelected(addDays(selected, step))}
              />
            </View>

            {week.isPending ? (
              <LoadingState />
            ) : week.isError ? (
              <ErrorState onRetry={() => week.refetch()} />
            ) : view === 'day' ? (
              <DaySlots slots={visibleSlots.filter((slot) => slot.day === toISODate(selected))} />
            ) : (
              <WeekSlots weekStart={weekStart} slots={visibleSlots} />
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

/** Pendant les vacances, rappel de la période qui remplace le planning habituel. */
function CurrentPeriod({ period }: { period: SchedulePeriod }) {
  if (period.kind !== 'holidays') {
    return null;
  }
  return (
    <Card highlighted>
      <Text variant="subtitle">Planning des vacances</Text>
      <Text color="textMuted">
        {period.name} : jusqu’au {formatDayLabel(parseISODate(period.end_date))}.
      </Text>
    </Card>
  );
}

function Slot({ slot }: { slot: PlanningSlot }) {
  return (
    <ScheduleSlot
      start={formatTime(slot.start_time)}
      end={formatTime(slot.end_time)}
      title={slot.title}
      location={slot.location}
      cancelled={slot.is_cancelled}
      note={slot.cancellation_reason}
      exceptional={slot.is_exceptional}
    />
  );
}

function DaySlots({ slots }: { slots: PlanningSlot[] }) {
  if (slots.length === 0) {
    return (
      <Card>
        <Text color="textMuted">Aucun créneau ce jour-là.</Text>
      </Card>
    );
  }
  return (
    <View style={styles.slots}>
      {slots[0].period_kind === 'holidays' && <Badge label="Vacances" tone="warning" />}
      {slots.map((slot) => (
        <Slot key={slot.schedule_id} slot={slot} />
      ))}
    </View>
  );
}

function WeekSlots({ weekStart, slots }: { weekStart: Date; slots: PlanningSlot[] }) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)).map((date) => ({
    date,
    slots: slots.filter((slot) => slot.day === toISODate(date)),
  }));

  if (slots.length === 0) {
    return (
      <Card>
        <Text color="textMuted">Aucun créneau cette semaine.</Text>
      </Card>
    );
  }
  return (
    <View style={styles.days}>
      {days
        .filter((day) => day.slots.length > 0)
        .map((day) => (
          <View key={toISODate(day.date)} style={styles.slots}>
            <View style={styles.dayHeader}>
              <Text variant="subtitle">{formatDayLabel(day.date)}</Text>
              {day.slots[0].period_kind === 'holidays' && <Badge label="Vacances" tone="warning" />}
            </View>
            {day.slots.map((slot) => (
              <Slot key={slot.schedule_id} slot={slot} />
            ))}
          </View>
        ))}
    </View>
  );
}

/** Filtre « Vacances » : périodes de vacances en cours ou à venir et leurs créneaux habituels. */
function HolidaysView({ query }: { query: ReturnType<typeof useHolidayPeriods> }) {
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  if (query.data.length === 0) {
    return (
      <Card>
        <Text color="textMuted">Aucune période de vacances à venir.</Text>
      </Card>
    );
  }
  return (
    <View style={styles.days}>
      {query.data.map((period) => (
        <View key={period.id} style={styles.slots}>
          <Text variant="subtitle">{period.name}</Text>
          <Text color="textMuted">
            Du {formatDayLabel(parseISODate(period.start_date))} au {formatDayLabel(parseISODate(period.end_date))}
          </Text>
          {period.schedules.length === 0 ? (
            <Text color="textMuted">Pas de créneau pendant ces vacances.</Text>
          ) : (
            period.schedules
              // Programme daté : seulement les jours à venir.
              .filter((slot) => !slot.date || slot.date >= toISODate(new Date()))
              .map((slot) => (
                <View key={slot.id} style={styles.slots}>
                  <Text variant="label" color="textMuted">
                    {slot.date
                      ? formatDayLabel(parseISODate(slot.date))
                      : slot.weekday
                        ? `Chaque ${weekdayLabels[slot.weekday - 1].toLowerCase()}`
                        : ''}
                  </Text>
                  <ScheduleSlot
                    start={formatTime(slot.start_time)}
                    end={formatTime(slot.end_time)}
                    title={slot.title}
                    location={slot.location}
                    cancelled={slot.is_cancelled}
                    note={slot.cancellation_reason}
                  />
                </View>
              ))
          )}
        </View>
      ))}
      <Text variant="small" color="textMuted">
        Les annulations et créneaux exceptionnels apparaissent dans les vues Jour et Semaine.
      </Text>
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
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.sm,
  },
  navigationLabel: {
    flex: 1,
    textAlign: 'center',
  },
  slots: {
    gap: Space.sm,
  },
  days: {
    gap: Space.xl,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
});
