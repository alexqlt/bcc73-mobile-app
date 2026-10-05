import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from '@/components/query-status';
import { MaxContentWidth } from '@/constants/theme';
import { Badge, Card, Space, Text, useDS, type BadgeTone } from '@/design-system';
import { formatEuros, formatOrderDate, useMyShopOrders } from '@/features/payments/api';

type ShopOrder = NonNullable<ReturnType<typeof useMyShopOrders>['data']>[number];

/** Statut affiché à l'adhérent : paiement en cours, à récupérer au club, récupéré. */
function orderBadge(order: ShopOrder): { label: string; tone: BadgeTone } {
  if (order.status === 'pending') return { label: 'Paiement en cours', tone: 'warning' };
  if (order.picked_up_at) return { label: `Récupéré le ${formatOrderDate(order.picked_up_at)}`, tone: 'neutral' };
  return { label: 'À récupérer au club', tone: 'success' };
}

/** P6-07 : achats de la boutique. */
export function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useDS();
  const orders = useMyShopOrders();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Space.xxl }]}
      refreshControl={
        <RefreshControl refreshing={orders.isRefetching} onRefresh={() => orders.refetch()} tintColor={colors.text} />
      }>
      <View style={styles.inner}>
        {orders.isPending ? (
          <LoadingState />
        ) : orders.isError ? (
          <ErrorState onRetry={() => orders.refetch()} />
        ) : orders.data.length === 0 ? (
          <Card>
            <Text color="textMuted">Aucun achat pour le moment.</Text>
          </Card>
        ) : (
          orders.data.map((order) => {
            const badge = orderBadge(order);
            return (
              <Card key={order.id} highlighted={order.status === 'paid' && !order.picked_up_at}>
                {order.order_items.map((item) => (
                  <Text key={item.label} variant="bodyStrong">
                    {item.quantity > 1 ? `${item.quantity} × ` : ''}
                    {item.label}
                  </Text>
                ))}
                <Text variant="small" color="textMuted">
                  {formatEuros(order.total_cents)} · {formatOrderDate(order.paid_at ?? order.created_at)}
                </Text>
                <Badge label={badge.label} tone={badge.tone} />
              </Card>
            );
          })
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
    gap: Space.md,
  },
});
