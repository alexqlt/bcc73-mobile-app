import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components/query-status';
import { Card, Space, StageCard, Text } from '@/design-system';
import { formatStageDates, useUpcomingStages } from '@/features/stages/api';

/** P6-11 : stages à venir, avec les places restantes et les tarifs. */
export function StagesCatalog({ stages }: { stages: ReturnType<typeof useUpcomingStages> }) {
  if (stages.isPending) return <LoadingState />;
  if (stages.isError) return <ErrorState onRetry={() => stages.refetch()} />;
  if (stages.data.length === 0) {
    return (
      <Card>
        <Text color="textMuted">Aucun stage prévu pour le moment.</Text>
      </Card>
    );
  }
  return (
    <View style={styles.section}>
      {stages.data.map((stage) => {
        const dates = formatStageDates(stage.start_at, stage.end_at);
        return (
          <StageCard
            key={stage.id}
            date={dates.date}
            title={stage.title}
            time={[dates.time, stage.location].filter(Boolean).join(' · ')}
            capacity={stage.capacity}
            registered={stage.capacity - stage.placesLeft}
            prices={stage.stage_prices.map((price) => ({ label: price.name, amount: price.amount_cents / 100 }))}
            perDay={stage.days.length > 1}
            registerLabel={stage.placesLeft > 0 ? "Voir et s'inscrire" : 'Complet · voir le stage'}
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
