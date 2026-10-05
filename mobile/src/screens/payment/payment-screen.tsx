import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from '@/components/query-status';
import { MaxContentWidth } from '@/constants/theme';
import { Button, Card, SectionTitle, Space, Text, useDS } from '@/design-system';
import { formatEuros, useOrder } from '@/features/payments/api';

/** Délai après lequel on prévient que la confirmation de HelloAsso tarde. */
const SLOW_CONFIRMATION_MS = 30_000;

/**
 * Suivi d'un paiement : la commande est relue jusqu'à ce que HelloAsso ait confirmé le paiement
 * (webhook ou retour vérifiés côté serveur). Le retour du navigateur ne suffit jamais.
 */
export function PaymentScreen({ orderId }: { orderId: string | undefined }) {
  const insets = useSafeAreaInsets();
  const { colors } = useDS();
  const order = useOrder(orderId);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_CONFIRMATION_MS);
    return () => clearTimeout(timer);
  }, [orderId]);


  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Space.xxl }]}>
      <View style={styles.inner}>
        {!orderId || (!order.isPending && !order.data) ? (
          <Card>
            <Text color="textMuted">Commande introuvable.</Text>
          </Card>
        ) : order.isPending ? (
          <LoadingState />
        ) : order.isError ? (
          <ErrorState onRetry={() => order.refetch()} />
        ) : (
          <>
            {order.data!.status === 'paid' && <SectionTitle eyebrow="Merci !" title="Paiement confirmé" />}
            {order.data!.status === 'pending' && <SectionTitle eyebrow="Un instant" title="Paiement en cours" />}
            {order.data!.status === 'cancelled' && <SectionTitle eyebrow="Rien n’a été débité" title="Paiement annulé" />}

            <Card highlighted={order.data!.status === 'paid'}>
              {order.data!.order_items.map((item) => (
                <Text key={item.label}>
                  {item.quantity > 1 ? `${item.quantity} × ` : ''}
                  {item.label}
                </Text>
              ))}
              <Text variant="bodyStrong">{formatEuros(order.data!.total_cents)}</Text>
            </Card>

            {order.data!.status === 'pending' && (
              <View style={styles.waiting}>
                <ActivityIndicator color={colors.text} />
                <Text color="textMuted" style={styles.waitingText}>
                  {slow
                    ? 'La confirmation de HelloAsso tarde un peu. Si vous avez payé, elle arrivera d’elle-même : vous pouvez quitter cet écran.'
                    : 'Nous attendons la confirmation de HelloAsso…'}
                </Text>
              </View>
            )}

            {order.data!.status === 'paid' && (
              <Text>
                {order.data!.type === 'stage'
                  ? 'L’inscription est confirmée.'
                  : 'Vos articles sont à récupérer au club.'}
              </Text>
            )}

            {order.data!.status === 'paid' ? (
              <Button title="Voir mon historique" fullWidth onPress={() => router.navigate('/boutique')} />
            ) : (
              <Button title="Retour" variant="secondary" fullWidth onPress={() => router.back()} />
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Space.lg,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Space.lg,
  },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  waitingText: {
    flex: 1,
  },
});
