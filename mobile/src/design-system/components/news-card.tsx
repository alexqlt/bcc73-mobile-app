import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { useDS } from '../theme-context';
import { Space } from '../tokens';
import { Button } from './button';
import { Card } from './card';
import { Text } from './text';

export type NewsCardProps = {
  date: string;
  title: string;
  excerpt: string;
  /** Photo de l'actualité ; à défaut, l'emplacement à bande jaune. */
  imageUrl?: string;
  onPress?: () => void;
};

export function NewsCard({ date, title, excerpt, imageUrl, onPress }: NewsCardProps) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={title}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card padded={false}>
        {imageUrl ? <NewsPhoto uri={imageUrl} /> : <PhotoPlaceholder />}
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
    </Pressable>
  );
}

/** Photo d'une actualité, recadrée au format paysage. */
export function NewsPhoto({ uri, height = 150 }: { uri: string; height?: number }) {
  const { colors } = useDS();

  return (
    <Image
      source={uri}
      recyclingKey={uri}
      contentFit="cover"
      transition={200}
      style={{ height, backgroundColor: colors.surfaceAlt }}
      accessibilityIgnoresInvertColors
    />
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
  pressed: {
    opacity: 0.8,
  },
});
