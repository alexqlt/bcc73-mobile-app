import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components/query-status';
import { Badge, Card, Space, Text, type BadgeTone } from '@/design-system';
import { formatEuros, formatOrderDate, useMyOrders, type HistoryOrder } from '@/features/payments/api';
import { formatStageDates, formatStageDay } from '@/features/stages/api';

/** Statut affiché à l'adhérent, pour un achat de volants ou une inscription à un stage. */
function statusOf(order: HistoryOrder): { label: string; tone: BadgeTone } {
  if (order.status === 'pending') return { label: 'Paiement en cours', tone: 'warning' };
  if (order.type === 'stage') {
    const stage = order.stage_registrations[0]?.stages;
    return stage && stage.end_at < new Date().toISOString()
      ? { label: 'Stage terminé', tone: 'neutral' }
      : { label: 'Inscription confirmée', tone: 'success' };
  }
  if (order.picked_up_at) return { label: `Récupéré le ${formatOrderDate(order.picked_up_at)}`, tone: 'neutral' };
  return { label: 'À récupérer au club', tone: 'success' };
}

/** P6-07 et P6-14 : historique commun des achats de volants et des inscriptions aux stages. */
export function OrderHistory() {
  const orders = useMyOrders();

  return (
    <View style={styles.section}>
      <Text variant="subtitle">Mon historique</Text>
      {orders.isPending ? (
        <LoadingState />
      ) : orders.isError ? (
        <ErrorState onRetry={() => orders.refetch()} />
      ) : orders.data.length === 0 ? (
        <Card>
          <Text color="textMuted">Aucun achat ni inscription pour le moment.</Text>
        </Card>
      ) : (
        orders.data.map((order) => <HistoryItem key={order.id} order={order} />)
      )}
    </View>
  );
}

function HistoryItem({ order }: { order: HistoryOrder }) {
  const status = statusOf(order);
  const registration = order.stage_registrations[0];
  const stage = registration?.stages;
  // Une commande de stage peut inscrire plusieurs membres du compte, pour un jour ou tous les jours.
  const participants = order.stage_registrations.map((item) => item.member_name).join(', ');
  const stageDates = stage ? formatStageDates(stage.start_at, stage.end_at).date : '';
  // Un seul jour d'un stage qui en compte plusieurs (« … → … ») : on affiche ce jour.
  const days = registration?.days.length === 1 && stageDates.includes('→') ? formatStageDay(registration.days[0]) : stageDates;
  // À faire : une inscription à venir, des volants à récupérer.
  const actionNeeded = order.status === 'paid' && (status.label === 'Inscription confirmée' || !order.picked_up_at);

  const content = (
    <Card highlighted={actionNeeded}>
      <Text variant="label" color="textMuted">
        {order.type === 'stage' ? 'Stage' : 'Volants'} · {formatOrderDate(order.paid_at ?? order.created_at)}
      </Text>
      {order.type === 'stage' && stage ? (
        <>
          <Text variant="bodyStrong">{stage.title}</Text>
          <Text variant="small" color="textMuted">
            {days} · {participants} · {registration.price_name}
          </Text>
        </>
      ) : (
        order.order_items.map((item) => (
          <Text key={item.label} variant="bodyStrong">
            {item.quantity > 1 ? `${item.quantity} × ` : ''}
            {item.label}
          </Text>
        ))
      )}
      <View style={styles.footer}>
        <Badge label={status.label} tone={status.tone} />
        <Text variant="bodyStrong">{formatEuros(order.total_cents)}</Text>
      </View>
    </Card>
  );

  return order.type === 'stage' && stage ? (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(`/stage/${stage.id}`)}
      style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Space.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.sm,
  },
  pressed: {
    opacity: 0.8,
  },
});
