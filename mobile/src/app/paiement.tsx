import { Stack, useLocalSearchParams } from 'expo-router';

import { useStackHeaderOptions } from '@/components/stack-header';
import { PaymentScreen } from '@/screens/payment/payment-screen';

/** Suivi d'un paiement HelloAsso (ouvert après le paiement, ou par le lien de retour bcc73://paiement). */
export default function PaiementScreen() {
  const { order } = useLocalSearchParams<{ order?: string }>();
  const headerOptions = useStackHeaderOptions();

  return (
    <>
      <Stack.Screen options={{ ...headerOptions, title: 'Paiement' }} />
      <PaymentScreen orderId={order} />
    </>
  );
}
