import { StyleSheet, View } from 'react-native';

import { useDS } from '../theme-context';
import { Space } from '../tokens';
import { Badge } from './badge';
import { Text } from './text';

export type ScheduleSlotProps = {
  start: string;
  end: string;
  title: string;
  location: string;
  cancelled?: boolean;
};

export function ScheduleSlot({ start, end, title, location, cancelled }: ScheduleSlotProps) {
  const { colors, radii } = useDS();
  const lineThrough = cancelled ? styles.cancelled : undefined;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderRadius: radii.md },
        cancelled && { opacity: 0.7 },
      ]}>
      <View style={styles.time}>
        <Text variant="subtitle" style={lineThrough}>
          {start}
        </Text>
        <Text variant="caption" color="textMuted">
          {end}
        </Text>
      </View>
      <View style={[styles.divider, { backgroundColor: cancelled ? colors.danger : colors.accent }]} />
      <View style={styles.details}>
        <Text variant="bodyStrong" style={lineThrough}>
          {title}
        </Text>
        <Text variant="small" color="textMuted">
          {location}
        </Text>
      </View>
      {cancelled && <Badge label="Annulé" tone="danger" />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Space.md,
    gap: Space.md,
  },
  time: {
    width: 56,
    alignItems: 'center',
  },
  divider: {
    width: 3,
    alignSelf: 'stretch',
  },
  details: {
    flex: 1,
    gap: 2,
  },
  cancelled: {
    textDecorationLine: 'line-through',
  },
});
