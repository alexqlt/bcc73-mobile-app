import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormError } from '@/components/form/form-error';
import { ErrorState, LoadingState } from '@/components/query-status';
import { MaxContentWidth } from '@/constants/theme';
import { AlertBanner, Badge, Button, Card, Chip, SectionTitle, Space, Text, useDS } from '@/design-system';
import { useMembers } from '@/features/members/api';
import { useDevMode } from '@/features/dev-mode';
import { formatEuros, payButtonLabel, useCheckout } from '@/features/payments/api';
import { toISODate } from '@/features/schedule/api';
import {
  formatStageDates,
  formatStageDay,
  priceAvailability,
  priceDays,
  useMyRegistrations,
  useStage,
} from '@/features/stages/api';

/**
 * P6-11 et P6-12 : détail d'un stage, places restantes jour par jour, choix des participants
 * (titulaire et enfants du compte) et du tarif (un jour ou tous les jours), paiement HelloAsso.
 */
export function StageDetailScreen({ id }: { id: string }) {
  const insets = useSafeAreaInsets();
  const { colors } = useDS();
  const stage = useStage(id);
  const members = useMembers();
  const registrations = useMyRegistrations();
  const checkout = useCheckout();
  const devMode = useDevMode();
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [priceId, setPriceId] = useState<string>();
  const today = toISODate(new Date());

  const approved = (members.data ?? []).filter((member) => member.status === 'approved');
  const price = stage.data?.stage_prices.find((item) => item.id === priceId);
  const selectedDays = stage.data && price ? priceDays(stage.data, price) : [];
  // Jours où chaque membre est déjà inscrit à ce stage (ou paiement en cours).
  const takenDays = (memberId: string) =>
    (registrations.data ?? [])
      .filter((registration) => registration.stages?.id === id && registration.member_id === memberId)
      .flatMap((registration) => registration.days);
  const alreadyIn = (memberId: string) => selectedDays.some((day) => takenDays(memberId).includes(day));
  const people = memberIds.filter((memberId) => !alreadyIn(memberId));
  const availability = stage.data && price ? priceAvailability(stage.data, price, Math.max(1, people.length), today) : null;
  const canPay = !!price && availability?.available && people.length > 0 && !checkout.isPending;

  const toggleMember = (memberId: string) =>
    setMemberIds(memberIds.includes(memberId) ? memberIds.filter((item) => item !== memberId) : [...memberIds, memberId]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Space.xxl }]}>
      <View style={styles.inner}>
        {stage.isPending ? (
          <LoadingState />
        ) : stage.isError ? (
          <ErrorState onRetry={() => stage.refetch()} />
        ) : !stage.data ? (
          <Card>
            <Text color="textMuted">Ce stage n’existe pas ou n’est plus proposé.</Text>
          </Card>
        ) : (
          <>
            <SectionTitle eyebrow={formatStageDates(stage.data.start_at, stage.data.end_at).date} title={stage.data.title} />
            <View style={styles.section}>
              <Text>{formatStageDates(stage.data.start_at, stage.data.end_at).time}</Text>
              {stage.data.location && <Text color="textMuted">{stage.data.location}</Text>}
              {stage.data.description && <Text selectable>{stage.data.description}</Text>}
            </View>

            {/* Places restantes de chaque jour : la capacité s'entend par jour. */}
            <Card>
              <Text variant="label" color="textMuted">
                Places restantes ({stage.data.capacity} par jour)
              </Text>
              {stage.data.days.map((row) => (
                <View key={row.day} style={styles.dayRow}>
                  <Text style={styles.dayLabel}>{formatStageDay(row.day)}</Text>
                  {row.day < today ? (
                    <Badge label="Passé" />
                  ) : row.placesLeft <= 0 ? (
                    <Badge label="Complet" tone="danger" />
                  ) : (
                    <Text variant="bodyStrong">
                      {row.placesLeft} / {stage.data!.capacity}
                    </Text>
                  )}
                </View>
              ))}
            </Card>

            {approved.length === 0 ? (
              <AlertBanner
                title="Inscription impossible pour le moment"
                message="Les inscriptions aux stages sont ouvertes une fois une licence du compte validée par le club."
              />
            ) : (
              <Card highlighted>
                <Text variant="subtitle">S’inscrire</Text>

                <Text variant="label" color="textMuted">
                  Qui participe ? (plusieurs choix possibles)
                </Text>
                <View style={styles.chips}>
                  {approved.map((member) => (
                    <Chip
                      key={member.id}
                      label={`${member.first_name}${alreadyIn(member.id) ? ' · déjà inscrit' : ''}`}
                      selected={memberIds.includes(member.id) && !alreadyIn(member.id)}
                      disabled={alreadyIn(member.id)}
                      onPress={() => toggleMember(member.id)}
                    />
                  ))}
                </View>

                <Text variant="label" color="textMuted">
                  Tarif
                </Text>
                <View style={styles.prices}>
                  {stage.data.stage_prices.map((item) => {
                    const state = priceAvailability(stage.data!, item, Math.max(1, people.length), today);
                    return (
                      <View key={item.id} style={styles.price}>
                        <Chip
                          label={`${item.name} · ${formatEuros(item.amount_cents)}`}
                          selected={item.id === priceId}
                          disabled={!state.available}
                          onPress={() => setPriceId(item.id)}
                        />
                        {!state.available && (
                          <Text variant="caption" color="textMuted">
                            {state.reason}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>

                {price && availability && !availability.available && (
                  <Text variant="small" color="danger">
                    Ce tarif n’est plus disponible ({availability.reason}) : choisissez-en un autre.
                  </Text>
                )}

                <FormError error={checkout.error} />
                <Button
                  title={
                    price && people.length > 0
                      ? payButtonLabel(price.amount_cents * people.length, devMode.enabled)
                      : 'Choisissez les participants et le tarif'
                  }
                  fullWidth
                  disabled={!canPay}
                  onPress={() => checkout.mutate({ kind: 'stage', stageId: stage.data!.id, memberIds: people, priceId: priceId! })}
                />
                {price && people.length > 1 && (
                  <Text variant="caption" color="textMuted">
                    {people.length} participants × {formatEuros(price.amount_cents)}
                  </Text>
                )}
                <Text variant="caption" color="textMuted">
                  Les places sont réservées pendant le paiement (45 minutes au plus). L’inscription est confirmée dès que
                  HelloAsso a validé le paiement.
                </Text>
              </Card>
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
    gap: Space.xl,
  },
  section: {
    gap: Space.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  prices: {
    gap: Space.sm,
  },
  price: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Space.sm,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Space.xs,
  },
  dayLabel: {
    textTransform: 'capitalize',
  },
});
