import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NewsSummaryCard } from '@/components/news-summary-card';
import { PendingValidationBanner } from '@/components/pending-validation-banner';
import { ErrorState, LoadingState } from '@/components/query-status';
import { BottomTabInset, MaxContentWidth, WebTopInset } from '@/constants/theme';
import { Button, Card, SectionTitle, Space, Text, useDesignSystem } from '@/design-system';
import { selectAccountHolder, useMembers } from '@/features/members/api';
import { useLatestNews } from '@/features/news/api';

/** P3-02 : onglet Accueil — accueil personnalisé et dernières actualités du club. */
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { tokens, mode } = useDesignSystem();
  const members = useMembers();
  const news = useLatestNews(3);
  const firstName = selectAccountHolder(members.data)?.first_name;

  return (
    <ScrollView
      style={{ backgroundColor: tokens.colors.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + WebTopInset + Space.lg,
          paddingBottom: insets.bottom + BottomTabInset + Space.xxl,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={news.isRefetching}
          onRefresh={() => news.refetch()}
          tintColor={tokens.colors.text}
        />
      }>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.inner}>
        <SectionTitle
          eyebrow="Badminton Club de Chambéry"
          title={firstName ? `Bonjour ${firstName}` : 'Bienvenue'}
        />

        <PendingValidationBanner />

        <View style={styles.section}>
          <Text variant="subtitle">Actualités</Text>
          {news.isPending ? (
            <LoadingState />
          ) : news.isError ? (
            <ErrorState onRetry={() => news.refetch()} />
          ) : news.data.length === 0 ? (
            <Card>
              <Text color="textMuted">Aucune actualité pour le moment.</Text>
            </Card>
          ) : (
            <>
              {news.data.map((item) => (
                <NewsSummaryCard key={item.id} news={item} />
              ))}
              <Button
                title="Toutes les actualités"
                variant="secondary"
                fullWidth
                onPress={() => router.push('/actualites')}
              />
            </>
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
