import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NewsSummaryCard } from '@/components/news-summary-card';
import { ErrorState, LoadingState } from '@/components/query-status';
import { MaxContentWidth } from '@/constants/theme';
import { Card, Space, Text, useDS } from '@/design-system';
import { useNewsList } from '@/features/news/api';

/** P3-03 : toutes les actualités publiées, de la plus récente à la plus ancienne. */
export function NewsListScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useDS();
  const news = useNewsList();

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Space.xxl }]}
      data={news.data?.pages.flat()}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <NewsSummaryCard news={item} />
        </View>
      )}
      onEndReached={() => {
        if (news.hasNextPage && !news.isFetchingNextPage) news.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={news.isRefetching && !news.isFetchingNextPage}
          onRefresh={() => news.refetch()}
          tintColor={colors.text}
        />
      }
      ListEmptyComponent={
        <View style={styles.item}>
          {news.isPending ? (
            <LoadingState />
          ) : news.isError ? (
            <ErrorState onRetry={() => news.refetch()} />
          ) : (
            <Card>
              <Text color="textMuted">Aucune actualité pour le moment.</Text>
            </Card>
          )}
        </View>
      }
      ListFooterComponent={news.isFetchingNextPage ? <LoadingState /> : null}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Space.lg,
    gap: Space.lg,
  },
  item: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
