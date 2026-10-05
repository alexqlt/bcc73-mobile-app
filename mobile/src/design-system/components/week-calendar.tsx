import { useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useDS } from '../theme-context';
import { Space, type ColorTokens } from '../tokens';
import { Text } from './text';

export type CalendarTone = 'free_play' | 'training' | 'other';

export type CalendarItem = {
  key: string;
  /** 1 = lundi … 7 = dimanche. */
  weekday: number;
  /** « HH:MM ». */
  start: string;
  end: string;
  title: string;
  tone: CalendarTone;
  cancelled?: boolean;
  exceptional?: boolean;
};

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const TIME_COLUMN = 30;
const HOUR_HEIGHT = 44;

/** Couleurs de fond et de texte de chaque type de créneau (réutilisées par la légende). */
export const calendarToneColors: Record<CalendarTone, [keyof ColorTokens, keyof ColorTokens]> = {
  free_play: ['accent', 'onAccent'],
  training: ['primary', 'onPrimary'],
  other: ['surfaceAlt', 'text'],
};

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Colonnes côte à côte pour les créneaux d'un même jour qui se chevauchent. */
function layoutDay(items: CalendarItem[]) {
  const sorted = [...items].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  const placed: { item: CalendarItem; lane: number; lanes: number }[] = [];
  let cluster: typeof placed = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];

  const closeCluster = () => {
    for (const entry of cluster) entry.lanes = laneEnds.length;
    placed.push(...cluster);
    cluster = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    const start = toMinutes(item.start);
    const end = toMinutes(item.end);
    if (start >= clusterEnd) closeCluster();
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) lane = laneEnds.push(end) - 1;
    else laneEnds[lane] = end;
    cluster.push({ item, lane, lanes: 0 });
    clusterEnd = Math.max(clusterEnd, end);
  }
  closeCluster();
  return placed;
}

export type WeekCalendarProps = {
  items: CalendarItem[];
  /** Jour mis en avant (aujourd'hui), 1 = lundi. */
  highlightedWeekday?: number;
  selectedKey?: string;
  onSelect?: (item: CalendarItem) => void;
};

/** Semaine type en calendrier : une colonne par jour, les créneaux placés selon leurs horaires. */
export function WeekCalendar({ items, highlightedWeekday, selectedKey, onSelect }: WeekCalendarProps) {
  const { colors } = useDS();
  const [width, setWidth] = useState(0);

  const starts = items.map((item) => toMinutes(item.start));
  const ends = items.map((item) => toMinutes(item.end));
  const firstHour = items.length ? Math.floor(Math.min(...starts) / 60) : 8;
  const lastHour = items.length ? Math.ceil(Math.max(...ends) / 60) : 22;
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, index) => firstHour + index);
  const dayWidth = (width - TIME_COLUMN) / 7;
  const height = (lastHour - firstHour) * HOUR_HEIGHT;

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={styles.header}>
        <View style={{ width: TIME_COLUMN }} />
        {DAY_LABELS.map((label, index) => {
          const highlighted = index + 1 === highlightedWeekday;
          return (
            <View
              key={label}
              style={[styles.dayHeader, highlighted && { backgroundColor: colors.accent }]}
              accessibilityLabel={highlighted ? `${DAY_NAMES[index]}, aujourd'hui` : DAY_NAMES[index]}>
              <Text variant="label" style={{ color: highlighted ? colors.onAccent : colors.text }}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {width > 0 && (
        <View style={{ height, marginTop: Space.xs }}>
          {hours.map((hour) => (
            <View
              key={hour}
              style={[styles.hourLine, { top: (hour - firstHour) * HOUR_HEIGHT, borderTopColor: colors.border }]}>
              <Text variant="micro" color="textMuted" style={styles.hourLabel}>
                {hour}h
              </Text>
            </View>
          ))}

          {highlightedWeekday && (
            <View
              style={[
                styles.highlightedDay,
                {
                  left: TIME_COLUMN + (highlightedWeekday - 1) * dayWidth,
                  width: dayWidth,
                  backgroundColor: colors.accentSoft,
                },
              ]}
            />
          )}

          {DAY_LABELS.map((_, index) =>
            layoutDay(items.filter((item) => item.weekday === index + 1)).map(({ item, lane, lanes }) => {
              const top = ((toMinutes(item.start) - firstHour * 60) / 60) * HOUR_HEIGHT;
              const blockHeight = ((toMinutes(item.end) - toMinutes(item.start)) / 60) * HOUR_HEIGHT;
              const laneWidth = dayWidth / lanes;
              const [background, foreground] = item.cancelled
                ? (['dangerSoft', 'danger'] as const)
                : calendarToneColors[item.tone];
              const selected = item.key === selectedKey;
              const block: ViewStyle = {
                top: top + 1,
                height: blockHeight - 2,
                left: TIME_COLUMN + index * dayWidth + lane * laneWidth + 1,
                width: laneWidth - 2,
                backgroundColor: colors[background],
                borderColor: selected ? colors.danger : item.exceptional ? colors.text : 'transparent',
                borderStyle: item.exceptional && !selected ? 'dashed' : 'solid',
              };
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${DAY_NAMES[index]}, ${item.start} à ${item.end}, ${item.title}${item.cancelled ? ', annulé' : ''}`}
                  onPress={() => onSelect?.(item)}
                  style={[styles.block, block]}>
                  <Text
                    variant="micro"
                    numberOfLines={Math.max(1, Math.floor((blockHeight - 6) / 12))}
                    style={{ color: colors[foreground], textDecorationLine: item.cancelled ? 'line-through' : 'none' }}>
                    {item.title}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

/** Légende des couleurs du calendrier. */
export function CalendarLegend({ labels }: { labels: Record<CalendarTone, string> }) {
  const { colors } = useDS();

  return (
    <View style={styles.legend}>
      {(Object.keys(labels) as CalendarTone[]).map((tone) => (
        <View key={tone} style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors[calendarToneColors[tone][0]], borderColor: colors.border }]} />
          <Text variant="small">{labels[tone]}</Text>
        </View>
      ))}
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, { backgroundColor: colors.dangerSoft, borderColor: colors.border }]} />
        <Text variant="small">Annulé</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, styles.legendDashed, { borderColor: colors.text }]} />
        <Text variant="small">Exceptionnel</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Space.xs,
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hourLabel: {
    width: TIME_COLUMN - 4,
    marginTop: -6,
  },
  highlightedDay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  block: {
    position: 'absolute',
    padding: 2,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderWidth: 1,
  },
  legendDashed: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
});
