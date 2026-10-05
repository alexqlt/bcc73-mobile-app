import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from '@/components/query-status';
import { BottomTabInset, MaxContentWidth, WebTopInset } from '@/constants/theme';
import {
  CalendarLegend,
  Card,
  Chip,
  ScheduleSlot,
  SectionTitle,
  Space,
  Text,
  useDesignSystem,
  WeekCalendar,
  type CalendarItem,
} from '@/design-system';
import {
  formatShortDay,
  formatTime,
  parseISODate,
  scheduleTypeLabels,
  startOfWeek,
  toISODate,
  useHolidayPeriods,
  usePeriodOn,
  usePlanningWeek,
  weekdayLabels,
} from '@/features/schedule/api';

type Source = 'week' | 'holidays';
type Display = 'calendar' | 'list';
type TypeFilter = 'all' | 'free_play' | 'training';

/** Un créneau de la semaine, rattaché à son jour (sans date). */
type WeekSlot = CalendarItem & { location: string | null; note: string | null };

const typeFilters: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'free_play', label: 'Jeu libre' },
  { value: 'training', label: 'Entraînements' },
];

/** Jour ISO (1 = lundi … 7 = dimanche) d'une date. */
function isoWeekday(date: Date) {
  return ((date.getDay() + 6) % 7) + 1;
}

/**
 * P4-03 et P4-04 : le planning est le même chaque semaine ; il est présenté par jour de la semaine,
 * en calendrier ou en liste. Les changements de la semaine en cours (annulations, créneaux
 * exceptionnels) y apparaissent ; pendant les vacances, le planning des vacances remplace l'habituel.
 */
export function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const { tokens, mode } = useDesignSystem();
  const today = parseISODate(toISODate(new Date()));
  const todayWeekday = isoWeekday(today);

  const [source, setSource] = useState<Source>('week');
  const [display, setDisplay] = useState<Display>('calendar');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedKey, setSelectedKey] = useState<string>();
  const [listWeekday, setListWeekday] = useState(todayWeekday);

  const week = usePlanningWeek(startOfWeek(today));
  const currentPeriod = usePeriodOn(today);
  const holidays = useHolidayPeriods(today);
  // Prochaines vacances (pas celles en cours : elles sont déjà le planning de la semaine).
  const nextHolidays = holidays.data?.find((period) => period.start_date > toISODate(today));

  const query = source === 'week' ? week : holidays;
  const allSlots: WeekSlot[] =
    source === 'week'
      ? (week.data ?? []).map((slot) => ({
          key: `${slot.schedule_id}-${slot.day}`,
          weekday: isoWeekday(parseISODate(slot.day)),
          start: formatTime(slot.start_time),
          end: formatTime(slot.end_time),
          title: slot.title,
          tone: slot.type,
          cancelled: slot.is_cancelled,
          exceptional: slot.is_exceptional,
          location: slot.location,
          note: slot.cancellation_reason,
        }))
      : (nextHolidays?.schedules ?? []).flatMap((slot) =>
          slot.weekday
            ? [
                {
                  key: slot.id,
                  weekday: slot.weekday,
                  start: formatTime(slot.start_time),
                  end: formatTime(slot.end_time),
                  title: slot.title,
                  tone: slot.type,
                  location: slot.location,
                  note: null,
                },
              ]
            : []
        );
  const slots = allSlots.filter((slot) => typeFilter === 'all' || slot.tone === typeFilter);
  const selected = slots.find((slot) => slot.key === selectedKey);
  const changes = source === 'week' ? allSlots.filter((slot) => slot.cancelled || slot.exceptional) : [];

  const period = source === 'holidays' ? nextHolidays : currentPeriod.data;
  const isHolidays = period?.kind === 'holidays' || source === 'holidays';

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
          refreshing={week.isRefetching || currentPeriod.isRefetching || holidays.isRefetching}
          onRefresh={() => Promise.all([week.refetch(), currentPeriod.refetch(), holidays.refetch()])}
          tintColor={tokens.colors.text}
        />
      }>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.inner}>
        <SectionTitle eyebrow={isHolidays && period ? period.name : 'Chaque semaine'} title="Planning" />

        {isHolidays && period && (
          <Card highlighted>
            <Text variant="subtitle">Planning des vacances</Text>
            <Text color="textMuted">
              Du {formatShortDay(parseISODate(period.start_date))} au {formatShortDay(parseISODate(period.end_date))}, il
              remplace le planning habituel.
            </Text>
          </Card>
        )}

        {nextHolidays && (
          <View style={styles.chips}>
            <Chip label="Cette semaine" selected={source === 'week'} onPress={() => setSource('week')} />
            <Chip label={nextHolidays.name} selected={source === 'holidays'} onPress={() => setSource('holidays')} />
          </View>
        )}

        <View style={styles.toolbar}>
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
          <View style={styles.chips}>
            <Chip label="Calendrier" selected={display === 'calendar'} onPress={() => setDisplay('calendar')} />
            <Chip label="Liste" selected={display === 'list'} onPress={() => setDisplay('list')} />
          </View>
        </View>

        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : allSlots.length === 0 ? (
          <Card>
            <Text color="textMuted">Aucun créneau pour le moment.</Text>
          </Card>
        ) : display === 'calendar' ? (
          <>
            <WeekCalendar
              items={slots}
              highlightedWeekday={source === 'week' ? todayWeekday : undefined}
              selectedKey={selected?.key}
              onSelect={(item) => setSelectedKey(item.key === selectedKey ? undefined : item.key)}
            />
            <CalendarLegend labels={scheduleTypeLabels} />
            {selected ? (
              <View style={styles.slots}>
                <Text variant="label" color="textMuted">
                  {weekdayLabels[selected.weekday - 1]}
                </Text>
                <Slot slot={selected} />
              </View>
            ) : (
              <Text variant="small" color="textMuted">
                Touchez un créneau pour voir l’horaire et le lieu.
              </Text>
            )}
          </>
        ) : (
          <>
            <View style={styles.chips}>
              {weekdayLabels.map((label, index) => (
                <Chip
                  key={label}
                  label={label.slice(0, 3)}
                  selected={listWeekday === index + 1}
                  onPress={() => setListWeekday(index + 1)}
                />
              ))}
            </View>
            <Text variant="subtitle">
              {weekdayLabels[listWeekday - 1]}
              {source === 'week' && listWeekday === todayWeekday ? ' (aujourd’hui)' : ''}
            </Text>
            <DayList slots={slots.filter((slot) => slot.weekday === listWeekday)} />
          </>
        )}

        {changes.length > 0 && (
          <View style={styles.slots}>
            <Text variant="subtitle">Changements cette semaine</Text>
            {changes.map((slot) => (
              <View key={slot.key} style={styles.slots}>
                <Text variant="label" color="textMuted">
                  {weekdayLabels[slot.weekday - 1]}
                </Text>
                <Slot slot={slot} />
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Slot({ slot }: { slot: WeekSlot }) {
  return (
    <ScheduleSlot
      start={slot.start}
      end={slot.end}
      title={slot.title}
      location={slot.location}
      cancelled={slot.cancelled}
      note={slot.note}
      exceptional={slot.exceptional}
    />
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
          <Slot key={slot.key} slot={slot} />
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
  toolbar: {
    gap: Space.sm,
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
