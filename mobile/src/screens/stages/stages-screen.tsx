import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PendingValidationBanner } from '@/components/pending-validation-banner';
import { ErrorState, LoadingState } from '@/components/query-status';
import { BottomTabInset, MaxContentWidth, WebTopInset } from '@/constants/theme';
import { Badge, Card, SectionTitle, Space, StageCard, Text, useDesignSystem } from '@/design-system';
import { formatEuros } from '@/features/payments/api';
import { formatStageDates, useMyRegistrations, useUpcomingStages } from '@/features/stages/api';

/** P6-11 et P6-14 : onglet Stages — mes inscriptions puis les stages à venir. */
export function StagesScreen() {
  const insets = useSafeAreaInsets();
  const { tokens, mode } = useDesignSystem();
  const stages = useUpcomingStages();
  const registrations = useMyRegistrations();
  const upcomingRegistrations = (registrations.data ?? []).filter(
    (registration) => registration.stages!.end_at >= new Date().toISOString()
  );

  return (
    <ScrollView
      style={{ backgroundColor: tokens.colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + WebTopInset + Space.lg, paddingBottom: insets.bottom + BottomTabInset + Space.xxl },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={stages.isRefetching || registrations.isRefetching}
          onRefresh={() => Promise.all([stages.refetch(), registrations.refetch()])}
          tintColor={tokens.colors.text}
        />
      }>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.inner}>
        <SectionTitle title="Stages" />
        <PendingValidationBanner />

        {upcomingRegistrations.length > 0 && (
          <View style={styles.section}>
            <Text variant="subtitle">Mes inscriptions</Text>
            {upcomingRegistrations.map((registration) => {
              const dates = formatStageDates(registration.stages!.start_at, registration.stages!.end_at);
              return (
                <Card key={registration.id} highlighted={registration.status === 'confirmed'}>
                  <Text variant="bodyStrong">{registration.stages!.title}</Text>
                  <Text variant="small" color="textMuted">
                    {dates.date} · {dates.time}
                    {registration.stages!.location ? ` · ${registration.stages!.location}` : ''}
                  </Text>
                  <Text variant="small">
                    {registration.member_name} · {registration.price_name} · {formatEuros(registration.amount_cents)}
                  </Text>
                  <Badge
                    label={registration.status === 'confirmed' ? 'Inscription confirmée' : 'Paiement en cours'}
                    tone={registration.status === 'confirmed' ? 'success' : 'warning'}
                  />
                </Card>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text variant="subtitle">À venir</Text>
          {stages.isPending ? (
            <LoadingState />
          ) : stages.isError ? (
            <ErrorState onRetry={() => stages.refetch()} />
          ) : stages.data.length === 0 ? (
            <Card>
              <Text color="textMuted">Aucun stage prévu pour le moment.</Text>
            </Card>
          ) : (
            stages.data.map((stage) => {
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
                  registerLabel={stage.placesLeft > 0 ? "Voir et s'inscrire" : 'Complet · voir le stage'}
                  onRegister={() => router.push(`/stage/${stage.id}`)}
                />
              );
            })
          )}
        </View>
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
    gap: Space.xl,
  },
  section: {
    gap: Space.md,
  },
});
