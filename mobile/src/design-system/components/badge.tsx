import { Pressable, StyleSheet, View } from 'react-native';

import { useDS } from '../theme-context';
import type { ColorTokens } from '../tokens';
import { Text } from './text';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const toneColors: Record<BadgeTone, [keyof ColorTokens, keyof ColorTokens]> = {
  neutral: ['surfaceAlt', 'text'],
  accent: ['accent', 'onAccent'],
  success: ['successSoft', 'success'],
  warning: ['warningSoft', 'warning'],
  danger: ['dangerSoft', 'danger'],
};

/** Étiquette de statut, non interactive (Payé, En attente, Annulé…). */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const { colors, radii } = useDS();
  const [background, foreground] = toneColors[tone];

  return (
    <View style={[styles.badge, { backgroundColor: colors[background], borderRadius: radii.sm }]}>
      <Text variant="label" color={foreground} style={styles.badgeLabel}>
        {label}
      </Text>
    </View>
  );
}

/** Filtre sélectionnable (Jeu libre, Entraînement…). */
export function Chip({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected?: boolean;
  /** Choix indisponible : grisé et inactif. */
  disabled?: boolean;
  onPress?: () => void;
}) {
  const { colors, radii } = useDS();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.chip,
        { borderRadius: radii.pill, borderColor: selected ? colors.accent : colors.border },
        selected && { backgroundColor: colors.accent },
        disabled && styles.chipDisabled,
      ]}>
      <Text variant="label" style={{ color: selected ? colors.onAccent : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  chip: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipDisabled: {
    opacity: 0.4,
  },
});
