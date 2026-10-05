import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Space, Text, useDS } from '@/design-system';
import { parseISODate, toISODate, useCurrentCancellations } from '@/features/schedule/api';

/** Accueil : créneaux annulés en ce moment ou dans les 7 prochains jours (rien si aucun). Ouvre le planning. */
export function CancelledSlots() {
  const { colors, fonts } = useDS();
  const cancellations = useCurrentCancellations(parseISODate(toISODate(new Date())));

  if (!cancellations.data?.length) {
    return null;
  }
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityHint="Ouvre le planning"
      onPress={() => router.navigate('/planning')}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card style={[styles.card, { borderLeftColor: colors.danger }]}>
        <Text variant="label" color="danger">
          Créneaux annulés
        </Text>
        {cancellations.data.map((slot) => (
          <View key={slot.key} style={styles.row}>
            <Text variant="small">
              <Text variant="small" style={{ fontFamily: fonts.bodyStrong }}>
                {slot.title}
              </Text>
              {` · ${slot.when}`}
            </Text>
            <Text variant="caption" color="textMuted">
              {['Annulé', slot.period].filter(Boolean).join(' ')}
              {slot.reason ? ` · ${slot.reason}` : ''}
            </Text>
          </View>
        ))}
      </Card>
    </Pressable>
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
