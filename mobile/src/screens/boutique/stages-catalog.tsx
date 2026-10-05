import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components/query-status';
import { Card, Space, StageCard, Text } from '@/design-system';
import { eventKindLabels, formatStageDates, useUpcomingStages, type Stage } from '@/features/stages/api';

/**
 * Tarifs résumés pour la carte : un seul tarif « Un jour » (le détail de chaque jour est sur l'écran
 * du stage) puis les tarifs valables tous les jours.
 */
function summaryPrices(stage: Stage) {
  // Repas du club : les tarifs tels quels (Adulte, Enfant…).
  if (stage.kind === 'meal') {
    return stage.stage_prices.map((price) => ({ label: price.name, amount: price.amount_cents / 100 }));
  }
  const dayPrices = stage.stage_prices.filter((price) => price.day).map((price) => price.amount_cents);
  const multiDay = stage.days.length > 1;
  const oneDay = dayPrices.length
    ? [
        {
          label: new Set(dayPrices).size > 1 ? 'Un jour (dès)' : 'Un jour',
          amount: Math.min(...dayPrices) / 100,
        },
      ]
    : [];
  const allDays = stage.stage_prices
    .filter((price) => !price.day)
    .map((price) => ({
      label: multiDay && price.name.startsWith('Tous les jours') ? 'Tous les jours' : price.name,
      amount: price.amount_cents / 100,
    }));
  return [...oneDay, ...allDays];
}

/** P6-11 : stages à venir, avec les places restantes et les tarifs. */
export function StagesCatalog({ stages }: { stages: ReturnType<typeof useUpcomingStages> }) {
  if (stages.isPending) return <LoadingState />;
  if (stages.isError) return <ErrorState onRetry={() => stages.refetch()} />;
  if (stages.data.length === 0) {
    return (
      <Card>
        <Text color="textMuted">Aucun événement prévu pour le moment.</Text>
      </Card>
    );
  }
  return (
    <View style={styles.section}>
      {stages.data.map((stage) => {
        const dates = formatStageDates(stage.start_at, stage.end_at, stage.kind);
        return (
          <StageCard
            key={stage.id}
            date={dates.date}
            title={stage.title}
            time={[stage.kind === 'meal' ? eventKindLabels.meal : null, dates.time, stage.location].filter(Boolean).join(' · ')}
            capacity={stage.capacity}
            registered={stage.capacity - stage.placesLeft}
            prices={summaryPrices(stage)}
            perDay={stage.kind === 'stage' && stage.days.length > 1}
            registerLabel={stage.placesLeft > 0 ? "Voir et s'inscrire" : 'Complet · voir l’événement'}
            onRegister={() => router.push(`/stage/${stage.id}`)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Space.md,
  },
});
