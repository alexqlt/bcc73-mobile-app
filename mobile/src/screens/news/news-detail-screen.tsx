import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from '@/components/query-status';
import { MaxContentWidth } from '@/constants/theme';
import { Card, NewsPhoto, SectionTitle, Space, Text, useDS } from '@/design-system';
import { formatNewsDate, newsImageUrl, newsParagraphs, useNewsItem } from '@/features/news/api';

/** P3-04 : une actualité en entier (photo, date, titre, contenu). */
export function NewsDetailScreen({ id }: { id: string }) {
  const insets = useSafeAreaInsets();
  const { colors } = useDS();
  const news = useNewsItem(id);
  const imageUrl = newsImageUrl(news.data?.image_path ?? null);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + Space.xxl }}>
      {imageUrl && (
        <View style={styles.photo}>
          <NewsPhoto uri={imageUrl} height={260} />
        </View>
      )}
      <View style={styles.inner}>
        {news.isPending ? (
          <LoadingState />
        ) : news.isError ? (
          <ErrorState onRetry={() => news.refetch()} />
        ) : !news.data ? (
          <Card>
            <Text color="textMuted">Cette actualité n’existe pas ou n’est plus disponible.</Text>
          </Card>
        ) : (
          <>
            <SectionTitle eyebrow={formatNewsDate(news.data.published_at)} title={news.data.title} />
            {newsParagraphs(news.data.content).map((paragraph, index) => (
              <Text key={index} selectable>
                {paragraph}
              </Text>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Space.lg,
    gap: Space.lg,
  },
});
