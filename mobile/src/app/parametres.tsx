import { Stack } from 'expo-router';

import { useStackHeaderOptions } from '@/components/stack-header';
import { NotificationSettingsScreen } from '@/screens/settings/notification-settings-screen';

export default function ParametresScreen() {
  const headerOptions = useStackHeaderOptions();

  return (
    <>
      <Stack.Screen options={{ ...headerOptions, title: 'Paramètres' }} />
      <NotificationSettingsScreen />
    </>
  );
}
