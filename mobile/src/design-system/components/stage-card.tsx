import { StyleSheet, View } from 'react-native';

import { useDS } from '../theme-context';
import { Space } from '../tokens';
import { Badge } from './badge';
import { Button } from './button';
import { Card } from './card';
import { Text } from './text';

/** Montant en euros. */
export type StagePrice = { label: string; amount: number };

export type StageCardProps = {
  date: string;
  title: string;
  time: string;
  capacity: number;
  registered: number;
  prices: StagePrice[];
  onRegister?: () => void;
  /** Libellé du bouton (« S'inscrire » par défaut). Sans `onRegister`, pas de bouton. */
  registerLabel?: string;
};

export function StageCard({
  date,
  title,
  time,
  capacity,
  registered,
  prices,
  onRegister,
  registerLabel = "S'inscrire",
}: StageCardProps) {
  const { colors, radii } = useDS();
  const remaining = capacity - registered;

  return (
    <Card highlighted>
      <Badge label={date} tone="accent" />
      <Text variant="title">{title}</Text>
      <Text variant="small" color="textMuted">
        {time}
      </Text>

      <View style={styles.capacity}>
        <View style={[styles.track, { backgroundColor: colors.surfaceAlt, borderRadius: radii.pill }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${(registered / capacity) * 100}%`,
                backgroundColor: colors.accent,
                borderRadius: radii.pill,
              },
            ]}
          />
        </View>
        <Text variant="caption" color="textMuted">
          {remaining} places restantes sur {capacity}
        </Text>
      </View>

      <View style={[styles.prices, { borderColor: colors.border }]}>
        {prices.map((price) => (
          <View key={price.label} style={styles.priceRow}>
            <Text variant="small">{price.label}</Text>
            <Text variant="bodyStrong">
              {price.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </Text>
          </View>
        ))}
      </View>

      {onRegister && <Button title={registerLabel} fullWidth onPress={onRegister} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  capacity: {
    gap: Space.xs,
    marginTop: Space.xs,
  },
  track: {
    height: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  prices: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: Space.sm,
    marginVertical: Space.xs,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Space.xs,
  },
});
