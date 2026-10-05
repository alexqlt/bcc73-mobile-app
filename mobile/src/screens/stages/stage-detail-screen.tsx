import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormError } from '@/components/form/form-error';
import { ErrorState, LoadingState } from '@/components/query-status';
import { MaxContentWidth } from '@/constants/theme';
import { AlertBanner, Badge, Button, Card, Chip, SectionTitle, Space, Text, useDS } from '@/design-system';
import { useMembers } from '@/features/members/api';
import { formatEuros, useCheckout } from '@/features/payments/api';
import { formatStageDates, useMyRegistrations, useStage } from '@/features/stages/api';

/** P6-11 et P6-12 : détail d'un stage, choix du membre et du tarif, paiement HelloAsso. */
export function StageDetailScreen({ id }: { id: string }) {
  const insets = useSafeAreaInsets();
  const { colors } = useDS();
  const stage = useStage(id);
  const members = useMembers();
  const registrations = useMyRegistrations();
  const checkout = useCheckout();
  const [memberId, setMemberId] = useState<string>();
  const [priceId, setPriceId] = useState<string>();

  const approved = (members.data ?? []).filter((member) => member.status === 'approved');
  const registeredIds = new Set(
    (registrations.data ?? []).filter((registration) => registration.stages?.id === id).map((registration) => registration.member_id)
  );
  const price = stage.data?.stage_prices.find((item) => item.id === priceId);
  const canPay = !!stage.data && stage.data.placesLeft > 0 && !!memberId && !!price && !checkout.isPending;

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
              <Badge
                label={stage.data.placesLeft > 0 ? `${stage.data.placesLeft} place(s) restante(s)` : 'Complet'}
                tone={stage.data.placesLeft > 0 ? 'success' : 'danger'}
              />
              {stage.data.description && <Text selectable>{stage.data.description}</Text>}
            </View>

            {approved.length === 0 ? (
              <AlertBanner
                title="Inscription impossible pour le moment"
                message="Les inscriptions aux stages sont ouvertes une fois une licence du compte validée par le club."
              />
            ) : stage.data.placesLeft === 0 ? null : (
              <Card highlighted>
                <Text variant="subtitle">S’inscrire</Text>

                <Text variant="label" color="textMuted">
                  Qui participe ?
                </Text>
                <View style={styles.chips}>
                  {approved.map((member) => (
                    <Chip
                      key={member.id}
                      label={`${member.first_name}${registeredIds.has(member.id) ? ' (inscrit)' : ''}`}
                      selected={member.id === memberId}
                      onPress={() => setMemberId(member.id)}
                    />
                  ))}
                </View>

                <Text variant="label" color="textMuted">
                  Tarif
                </Text>
                <View style={styles.chips}>
                  {stage.data.stage_prices.map((item) => (
                    <Chip
                      key={item.id}
                      label={`${item.name} · ${formatEuros(item.amount_cents)}`}
                      selected={item.id === priceId}
                      onPress={() => setPriceId(item.id)}
                    />
                  ))}
                </View>
                <Text variant="small" color="textMuted">
                  Le club peut vérifier que le tarif choisi correspond au participant.
                </Text>

                <FormError error={checkout.error} />
                <Button
                  title={price ? `Payer ${formatEuros(price.amount_cents)} avec HelloAsso` : 'Choisissez le participant et le tarif'}
                  fullWidth
                  disabled={!canPay}
                  onPress={() =>
                    checkout.mutate({ kind: 'stage', stageId: stage.data!.id, memberId: memberId!, priceId: priceId! })
                  }
                />
                <Text variant="caption" color="textMuted">
                  La place est réservée pendant le paiement (45 minutes au plus). L’inscription est confirmée dès que
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
});
