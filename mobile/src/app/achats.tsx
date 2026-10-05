import { Stack } from 'expo-router';

import { useStackHeaderOptions } from '@/components/stack-header';
import { OrdersScreen } from '@/screens/shop/orders-screen';

export default function AchatsScreen() {
  const headerOptions = useStackHeaderOptions();

  return (
    <>
      <Stack.Screen options={{ ...headerOptions, title: 'Mes achats' }} />
      <OrdersScreen />
    </>
  );
}
