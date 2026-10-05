import { Stack, useLocalSearchParams } from 'expo-router';

import { useStackHeaderOptions } from '@/components/stack-header';
import { StageDetailScreen } from '@/screens/stages/stage-detail-screen';

export default function StageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const headerOptions = useStackHeaderOptions();

  return (
    <>
      <Stack.Screen options={{ ...headerOptions, title: 'Événement' }} />
      <StageDetailScreen id={id} />
    </>
  );
}
