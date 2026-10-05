import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Card, Space, Text, useDS } from '@/design-system';
import { parseISODate, toISODate, useCurrentCancellations } from '@/features/schedule/api';

/** Accueil : créneaux annulés en ce moment ou dans les 7 prochains jours (rien si aucun). Chacun ouvre le planning sur son jour. */
export function CancelledSlots() {
  const { colors, fonts } = useDS();
  const cancellations = useCurrentCancellations(parseISODate(toISODate(new Date())));

  if (!cancellations.data?.length) {
    return null;
  }
  return (
    <Card style={[styles.card, { borderLeftColor: colors.danger }]}>
      <Text variant="label" color="danger">
        Créneaux annulés
      </Text>
      {cancellations.data.map((slot) => (
        <Pressable
          key={slot.key}
          accessibilityRole="link"
          accessibilityHint="Ouvre le planning sur ce jour"
          // Planning ouvert sur le jour du créneau, filtres réinitialisés.
          onPress={() => router.navigate({ pathname: '/planning', params: { jour: String(slot.weekday), t: String(Date.now()) } })}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <Text variant="small">
            <Text variant="small" style={{ fontFamily: fonts.bodyStrong }}>
              {slot.title}
            </Text>
            {` · ${slot.when}`}
          </Text>
          <Text variant="caption" color="textMuted">
            {['Annulé', slot.period].filter(Boolean).join(' ')}
            {slot.reason ? ` · ${slot.reason}` : ''} ›
          </Text>
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 4,
    gap: Space.sm,
  },
  row: {
    gap: 2,
  },
  pressed: {
    opacity: 0.8,
  },
});
