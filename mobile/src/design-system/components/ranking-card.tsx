import { StyleSheet, View } from 'react-native';

import { useDS } from '../theme-context';
import { Space } from '../tokens';
import { Text } from './text';

export type Ranking = {
  discipline: string;
  level: string;
  points: number;
  trend?: 'up' | 'down' | 'stable';
};

const trendLabel = { up: '▲', down: '▼', stable: '—' } as const;

export function RankingTile({ discipline, level, points, trend = 'stable' }: Ranking) {
  const { colors, radii } = useDS();
  const trendColor = trend === 'up' ? colors.success : trend === 'down' ? colors.danger : colors.textMuted;

  return (
    <View style={[styles.tile, { backgroundColor: colors.surface, borderRadius: radii.lg }]}>
      <Text variant="label" color="textMuted">
        {discipline}
      </Text>
      <View style={[styles.level, { backgroundColor: colors.accent, borderRadius: radii.sm }]}>
        <Text variant="display" color="onAccent">
          {level}
        </Text>
      </View>
      <Text variant="small">
        {points.toLocaleString('fr-FR')} pts{' '}
        <Text variant="small" style={{ color: trendColor }}>
          {trendLabel[trend]}
        </Text>
      </Text>
    </View>
  );
}

export function RankingRow({ rankings }: { rankings: Ranking[] }) {
  return (
    <View style={styles.row}>
      {rankings.map((ranking) => (
        <RankingTile key={ranking.discipline} {...ranking} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Space.lg,
    paddingHorizontal: Space.sm,
    gap: Space.sm,
  },
  level: {
    minWidth: 64,
    alignItems: 'center',
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xs,
  },
});
