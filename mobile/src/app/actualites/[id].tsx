import { useLocalSearchParams } from 'expo-router';

import { NewsDetailScreen } from '@/screens/news/news-detail-screen';

export default function ActualiteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NewsDetailScreen id={id} />;
}
