import { StyleSheet, View } from 'react-native';

import { useDS } from '../theme-context';
import { Space } from '../tokens';
import { Text } from './text';

export function SectionTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  const { colors } = useDS();

  return (
    <View style={styles.container}>
      {eyebrow && (
        <Text variant="label" color="textMuted">
          {eyebrow}
        </Text>
      )}
      <Text variant="title">{title}</Text>
      <View style={[styles.underline, { backgroundColor: colors.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Space.xs,
  },
  underline: {
    width: 48,
    height: 5,
    marginTop: Space.xs,
    transform: [{ skewX: '-20deg' }],
  },
});
