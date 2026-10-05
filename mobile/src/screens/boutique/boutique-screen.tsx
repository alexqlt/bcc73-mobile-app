import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PendingValidationBanner } from '@/components/pending-validation-banner';
import { BottomTabInset, MaxContentWidth, WebTopInset } from '@/constants/theme';
import { Chip, SectionTitle, Space, useDesignSystem } from '@/design-system';
import { useMyOrders } from '@/features/payments/api';
import { useProducts } from '@/features/shop/api';
import { useUpcomingStages } from '@/features/stages/api';

import { OrderHistory } from './order-history';
import { StagesCatalog } from './stages-catalog';
import { VolantsCatalog } from './volants-catalog';

type Catalog = 'stages' | 'volants';

/**
 * Onglet Boutique : les stages et les volants du club, payés par HelloAsso, et l'historique commun
 * des inscriptions et des achats.
 */
export function BoutiqueScreen() {
  const insets = useSafeAreaInsets();
  const { tokens, mode } = useDesignSystem();
  const [catalog, setCatalog] = useState<Catalog>('stages');
  const stages = useUpcomingStages();
  const products = useProducts();
  const orders = useMyOrders();

  return (
    <ScrollView
      style={{ backgroundColor: tokens.colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + WebTopInset + Space.lg, paddingBottom: insets.bottom + BottomTabInset + Space.xxl },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={stages.isRefetching || products.isRefetching || orders.isRefetching}
          onRefresh={() => Promise.all([stages.refetch(), products.refetch(), orders.refetch()])}
          tintColor={tokens.colors.text}
        />
      }>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.inner}>
        <SectionTitle title="Boutique" />
        <PendingValidationBanner />

        <View style={styles.catalog}>
          <View style={styles.chips}>
            <Chip label="Événements" selected={catalog === 'stages'} onPress={() => setCatalog('stages')} />
            <Chip label="Volants" selected={catalog === 'volants'} onPress={() => setCatalog('volants')} />
          </View>
          {catalog === 'stages' ? <StagesCatalog stages={stages} /> : <VolantsCatalog />}
        </View>

        <OrderHistory />
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
  catalog: {
    gap: Space.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
});
