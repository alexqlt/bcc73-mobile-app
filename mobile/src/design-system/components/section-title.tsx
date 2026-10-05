import { StyleSheet, View } from 'react-native';

import { useDS } from '../theme-context';
import { Space } from '../tokens';
import { Text } from './text';

export type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  /** Centre le titre et son soulignement (écrans de connexion). Aligné à gauche par défaut. */
  centered?: boolean;
};

export function SectionTitle({ eyebrow, title, centered }: SectionTitleProps) {
  const { colors } = useDS();

  return (
    <View style={[styles.container, centered && styles.centered]}>
      {eyebrow && (
        <Text variant="label" color="textMuted">
          {eyebrow}
        </Text>
      )}
      <Text variant="title" style={centered && styles.centeredText}>
        {title}
      </Text>
      <View style={[styles.underline, { backgroundColor: colors.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Space.xs,
  },
  centered: {
    alignItems: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
  underline: {
    width: 48,
    height: 5,
    marginTop: Space.xs,
    transform: [{ skewX: '-20deg' }],
  },
});
