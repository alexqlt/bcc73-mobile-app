import { StyleSheet, View, type ViewProps } from 'react-native';

import { useDS } from '../theme-context';
import { Space } from '../tokens';

export type CardProps = ViewProps & {
  /** Ajoute le coin jaune en biseau, signature du style Club. */
  highlighted?: boolean;
  padded?: boolean;
};

export function Card({ highlighted, padded = true, style, children, ...rest }: CardProps) {
  const { colors, radii } = useDS();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderRadius: radii.lg },
        padded && styles.padded,
        style,
      ]}
      {...rest}>
      {children}
      {highlighted && <DiagonalCorner color={colors.accent} />}
    </View>
  );
}

/** Coin jaune en biseau, rappel de la bande diagonale du site. */
export function DiagonalCorner({ color, size = 32 }: { color: string; size?: number }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.corner,
        {
          borderTopWidth: size,
          borderLeftWidth: size,
          borderTopColor: color,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  padded: {
    padding: Space.lg,
    gap: Space.sm,
  },
  corner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
  },
});
