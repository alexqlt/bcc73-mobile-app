import { Stack } from 'expo-router';

import { useStackHeaderOptions } from '@/components/stack-header';
import { ShopScreen } from '@/screens/shop/shop-screen';

export default function BoutiqueScreen() {
  const headerOptions = useStackHeaderOptions();

  return (
    <>
      <Stack.Screen options={{ ...headerOptions, title: 'Boutique' }} />
      <ShopScreen />
    </>
  );
}
