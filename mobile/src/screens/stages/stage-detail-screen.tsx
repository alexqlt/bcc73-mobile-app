import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormError } from '@/components/form/form-error';
import { ErrorState, LoadingState } from '@/components/query-status';
import { MaxContentWidth } from '@/constants/theme';
import { AlertBanner, Badge, Button, Card, Chip, SectionTitle, Space, Text, useDS } from '@/design-system';
import { useDevMode } from '@/features/dev-mode';
import { useMembers, type Member } from '@/features/members/api';
import { formatEuros, payButtonLabel, useCheckout } from '@/features/payments/api';
import { toISODate } from '@/features/schedule/api';
import {
  eventKindLabels,
  formatStageDates,
  formatStageDay,
  priceAvailability,
  priceDays,
  useMyRegistrations,
  useStage,
  type Stage,
  type StagePrice,
} from '@/features/stages/api';

/** Repas : tarif proposé d'office, Adulte pour le titulaire du compte, Enfant pour les enfants rattachés. */
function defaultMealPrice(stage: Stage, member: Member) {
  const wanted = member.is_account_holder ? /adulte/i : /enfant/i;
  return stage.stage_prices.find((price) => wanted.test(price.name)) ?? stage.stage_prices[0];
}

/**
 * P6-11 et P6-12 : détail d'un événement et inscription des membres du compte.
 * - Stage : places jour par jour, un tarif (un jour ou tous les jours) commun aux participants.
 * - Repas du club : une soirée, un tarif par participant (adulte / enfant).
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
  const [mealPrices, setMealPrices] = useState<Record<string, string>>({});
  const today = toISODate(new Date());

  const event = stage.data;
  const meal = event?.kind === 'meal';
  const approved = (members.data ?? []).filter((member) => member.status === 'approved');

  // Tarif de chaque participant : commun (stage) ou propre à chacun (repas).
  const priceOf = (member: Member): StagePrice | undefined =>
    !event
      ? undefined
      : meal
        ? (event.stage_prices.find((price) => price.id === mealPrices[member.id]) ?? defaultMealPrice(event, member))
        : event.stage_prices.find((price) => price.id === priceId);

  // Jours où chaque membre est déjà inscrit à cet événement (ou paiement en cours).
  const takenDays = (memberId: string) =>
    (registrations.data ?? [])
      .filter((registration) => registration.stages?.id === id && registration.member_id === memberId)
      .flatMap((registration) => registration.days);
  const alreadyIn = (member: Member) => {
    const price = priceOf(member) ?? event?.stage_prices[0];
    return !!event && !!price && priceDays(event, price).some((day) => takenDays(member.id).includes(day));
  };

  const participants = approved.filter((member) => memberIds.includes(member.id) && !alreadyIn(member));
  const entries = participants.flatMap((member) => {
    const price = priceOf(member);
    return price ? [{ memberId: member.id, priceId: price.id, amount: price.amount_cents }] : [];
  });
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  // Chaque tarif choisi doit être disponible pour tous les participants (places comptées ensemble).
  const unavailable = event
    ? entries
        .map((entry) => event.stage_prices.find((price) => price.id === entry.priceId)!)
        .map((price) => ({ price, state: priceAvailability(event, price, entries.length, today) }))
        .find((item) => !item.state.available)
    : undefined;
  const complete = entries.length > 0 && entries.length === participants.length;
  const canPay = complete && !unavailable && !checkout.isPending;

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
        ) : !event ? (
          <Card>
            <Text color="textMuted">Cet événement n’existe pas ou n’est plus proposé.</Text>
          </Card>
        ) : (
          <>
            <SectionTitle eyebrow={formatStageDates(event.start_at, event.end_at).date} title={event.title} />
            <View style={styles.section}>
              <Badge label={eventKindLabels[event.kind]} tone="accent" />
              <Text>{formatStageDates(event.start_at, event.end_at).time}</Text>
              {event.location && <Text color="textMuted">{event.location}</Text>}
              {event.description && <Text selectable>{event.description}</Text>}
            </View>

            {/* Places restantes : par jour pour un stage, pour la soirée pour un repas. */}
            <Card>
              {meal || event.days.length === 1 ? (
                <View style={styles.dayRow}>
                  <Text variant="label" color="textMuted">
                    Places restantes
                  </Text>
                  {event.placesLeft <= 0 ? (
                    <Badge label="Complet" tone="danger" />
                  ) : (
                    <Text variant="bodyStrong">
                      {event.placesLeft} / {event.capacity}
                    </Text>
                  )}
                </View>
              ) : (
                <>
                  <Text variant="label" color="textMuted">
                    Places restantes ({event.capacity} par jour)
                  </Text>
                  {event.days.map((row) => (
                    <View key={row.day} style={styles.dayRow}>
                      <Text style={styles.dayLabel}>{formatStageDay(row.day)}</Text>
                      {row.day < today ? (
                        <Badge label="Passé" />
                      ) : row.placesLeft <= 0 ? (
                        <Badge label="Complet" tone="danger" />
                      ) : (
                        <Text variant="bodyStrong">
                          {row.placesLeft} / {event.capacity}
                        </Text>
                      )}
                    </View>
                  ))}
                </>
              )}
            </Card>

            {approved.length === 0 ? (
              <AlertBanner
                title="Inscription impossible pour le moment"
                message="Les inscriptions aux événements sont ouvertes une fois une licence du compte validée par le club."
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
                      label={`${member.first_name}${alreadyIn(member) ? ' · déjà inscrit' : ''}`}
                      selected={memberIds.includes(member.id) && !alreadyIn(member)}
                      disabled={alreadyIn(member)}
                      onPress={() => toggleMember(member.id)}
                    />
                  ))}
                </View>

                {meal ? (
                  // Repas : un tarif par participant.
                  participants.map((member) => (
                    <View key={member.id} style={styles.section}>
                      <Text variant="label" color="textMuted">
                        Tarif de {member.first_name}
                      </Text>
                      <View style={styles.chips}>
                        {event.stage_prices.map((item) => (
                          <Chip
                            key={item.id}
                            label={`${item.name} · ${formatEuros(item.amount_cents)}`}
                            selected={priceOf(member)?.id === item.id}
                            disabled={!priceAvailability(event, item, 1, today).available}
                            onPress={() => setMealPrices({ ...mealPrices, [member.id]: item.id })}
                          />
                        ))}
                      </View>
                    </View>
                  ))
                ) : (
                  <>
                    <Text variant="label" color="textMuted">
                      Tarif
                    </Text>
                    <View style={styles.prices}>
                      {event.stage_prices.map((item) => {
                        const state = priceAvailability(event, item, Math.max(1, participants.length), today);
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
                  </>
                )}

                {unavailable && (
                  <Text variant="small" color="danger">
                    Le tarif « {unavailable.price.name} » n’est plus disponible ({unavailable.state.reason}) : choisissez-en un
                    autre.
                  </Text>
                )}

                <FormError error={checkout.error} />
                <Button
                  title={
                    complete
                      ? payButtonLabel(total, devMode.enabled)
                      : meal
                        ? 'Choisissez les participants'
                        : 'Choisissez les participants et le tarif'
                  }
                  fullWidth
                  disabled={!canPay}
                  onPress={() =>
                    checkout.mutate({
                      kind: 'stage',
                      stageId: event.id,
                      entries: entries.map((entry) => ({ memberId: entry.memberId, priceId: entry.priceId })),
                    })
                  }
                />
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
