import { useLocalSearchParams } from 'expo-router';

import { ResetPasswordScreen } from '@/screens/auth/reset-password-screen';

export default function NouveauMotDePasseRoute() {
  const { email } = useLocalSearchParams<{ email: string }>();
  return <ResetPasswordScreen email={email ?? ''} />;
}
