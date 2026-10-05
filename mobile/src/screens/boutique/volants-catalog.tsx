import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FormError } from '@/components/form/form-error';
import { ErrorState, LoadingState } from '@/components/query-status';
import { AlertBanner, Button, Card, Space, Text, useDS } from '@/design-system';
import { useMembers } from '@/features/members/api';
import { useDevMode } from '@/features/dev-mode';
import { formatEuros, payButtonLabel, useCheckout } from '@/features/payments/api';
import { useProducts } from '@/features/shop/api';

const MAX_QUANTITY = 50;

/** P6-06 : volants de la boutique — quantités, total, paiement HelloAsso. */
export function VolantsCatalog() {
  const products = useProducts();
  const members = useMembers();
  const checkout = useCheckout();
  const devMode = useDevMode();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const canBuy = (members.data ?? []).some((member) => member.status === 'approved');
  const items = (products.data ?? [])
    .map((product) => ({ product, quantity: quantities[product.id] ?? 0 }))
    .filter((item) => item.quantity > 0);
  const total = items.reduce((sum, item) => sum + item.quantity * item.product.price_cents, 0);

  const setQuantity = (productId: string, quantity: number) =>
    setQuantities({
      ...quantities,
      [productId]: Math.min(MAX_QUANTITY, Math.max(0, quantity)),
    });

  return (
    <View style={styles.section}>
      {!canBuy && (
        <AlertBanner
          title="Achats bientôt disponibles"
          message="La boutique est ouverte une fois une licence du compte validée par le club."
        />
      )}

      {products.isPending ? (
        <LoadingState />
      ) : products.isError ? (
        <ErrorState onRetry={() => products.refetch()} />
      ) : products.data.length === 0 ? (
        <Card>
          <Text color="textMuted">Aucun article en vente pour le moment.</Text>
        </Card>
      ) : (
        products.data.map((product) => (
          <Card key={product.id}>
            <View style={styles.productHeader}>
              <View style={styles.productText}>
                <Text variant="subtitle">{product.name}</Text>
                {product.description && (
                  <Text variant="small" color="textMuted">
                    {product.description}
                  </Text>
                )}
              </View>
              <Text variant="bodyStrong">{formatEuros(product.price_cents)}</Text>
            </View>
            <QuantityStepper
              label={product.name}
              value={quantities[product.id] ?? 0}
              disabled={!canBuy}
              onChange={(quantity) => setQuantity(product.id, quantity)}
            />
          </Card>
        ))
      )}

      {canBuy && (products.data?.length ?? 0) > 0 && (
        <Card highlighted>
          <View style={styles.total}>
            <Text variant="subtitle">Total</Text>
            <Text variant="title">{formatEuros(total)}</Text>
          </View>
          <FormError error={checkout.error} />
          <Button
            title={payButtonLabel(total || null, devMode.enabled)}
            fullWidth
            disabled={total === 0 || checkout.isPending}
            onPress={() =>
              checkout.mutate({
                kind: 'shop',
                items: items.map((item) => ({
                  product_id: item.product.id,
                  quantity: item.quantity,
                })),
              })
            }
          />
          <Text variant="caption" color="textMuted">
            Les articles sont à récupérer au club après le paiement.
          </Text>
        </Card>
      )}
    </View>
  );
}

function QuantityStepper({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const { colors } = useDS();

  return (
    <View style={styles.stepper} accessibilityLabel={`Quantité de ${label} : ${value}`}>
      {[
        { sign: '−', delta: -1, hint: `Retirer un ${label}`, off: value === 0 },
        {
          sign: '+',
          delta: 1,
          hint: `Ajouter un ${label}`,
          off: value >= MAX_QUANTITY,
        },
      ].map((button, index) => (
        <View key={button.sign} style={styles.stepperSlot}>
          {index === 1 && (
            <Text variant="title" style={styles.stepperValue}>
              {value}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={button.hint}
            disabled={disabled || button.off}
            onPress={() => onChange(value + button.delta)}
            style={({ pressed }) => [
              styles.stepperButton,
              { borderColor: colors.text },
              (disabled || button.off) && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <Text variant="title">{button.sign}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Space.lg,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.md,
  },
  productText: {
    flex: 1,
    gap: Space.xs,
  },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  stepperSlot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 48,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
