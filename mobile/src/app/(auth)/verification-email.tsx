import { useLocalSearchParams } from 'expo-router';

import { VerifyEmailScreen } from '@/screens/auth/verify-email-screen';

export default function VerificationEmailRoute() {
  const { email } = useLocalSearchParams<{ email: string }>();
  return <VerifyEmailScreen email={email ?? ''} />;
}
