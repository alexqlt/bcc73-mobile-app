import { StyleSheet, View } from 'react-native';

import { useDS } from '../theme-context';
import { Space } from '../tokens';
import { Button } from './button';
import { Card } from './card';
import { Text } from './text';

export type NewsCardProps = {
  date: string;
  title: string;
  excerpt: string;
  onPress?: () => void;
};

export function NewsCard({ date, title, excerpt, onPress }: NewsCardProps) {
  return (
    <Card padded={false}>
      <PhotoPlaceholder />
      <View style={styles.content}>
        <Text variant="caption" color="textMuted">
          {date}
        </Text>
        <Text variant="subtitle">{title}</Text>
        <Text variant="small" color="textMuted" numberOfLines={3}>
          {excerpt}
        </Text>
        <Button title="Lire la suite" variant="ghost" onPress={onPress} />
      </View>
    </Card>
  );
}

/** Emplacement de photo, avec la bande diagonale jaune du slider du site. */
export function PhotoPlaceholder({ height = 150 }: { height?: number }) {
  const { colors } = useDS();

  return (
    <View style={[styles.photo, { height, backgroundColor: colors.surfaceAlt }]}>
      <View style={[styles.band, { backgroundColor: colors.accent }]} />
      <Text variant="label" color="textMuted" style={styles.photoLabel}>
        Photo
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Space.lg,
    gap: Space.sm,
  },
  photo: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: Space.lg,
  },
  band: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    left: -60,
    width: '55%',
    opacity: 0.87,
    transform: [{ skewX: '-20deg' }],
  },
  photoLabel: {
    opacity: 0.6,
  },
});
