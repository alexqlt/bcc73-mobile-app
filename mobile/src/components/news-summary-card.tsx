import { router } from 'expo-router';

import { NewsCard } from '@/design-system';
import { formatNewsDate, newsImageUrl, type News } from '@/features/news/api';

/** Carte d'une actualité (accueil et liste) ; ouvre son détail. */
export function NewsSummaryCard({ news }: { news: News }) {
  return (
    <NewsCard
      date={formatNewsDate(news.published_at)}
      title={news.title}
      excerpt={news.content}
      imageUrl={newsImageUrl(news.image_path)}
      onPress={() => router.push(`/actualites/${news.id}`)}
    />
  );
}
