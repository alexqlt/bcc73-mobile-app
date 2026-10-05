import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { FormError } from '@/components/form/form-error';
import { FormTextField } from '@/components/form/form-text-field';
import { Button, Space, Text } from '@/design-system';
import { useResendSignUpCode, useVerifyEmail } from '@/features/auth/api';
import { verifyEmailSchema, type VerifyEmailForm } from '@/features/auth/schemas';

import { AuthScreen } from './auth-screen';

/** Saisie du code reçu par email. Une fois validé, l'utilisateur est connecté. */
export function VerifyEmailScreen({ email }: { email: string }) {
  const verifyEmail = useVerifyEmail();
  const resendCode = useResendSignUpCode();
  const { control, handleSubmit } = useForm<VerifyEmailForm>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { code: '' },
  });

  const onSubmit = handleSubmit(({ code }) => verifyEmail.mutate({ email, code }));

  return (
    <AuthScreen
      title="Confirmez votre email"
      description={`Saisissez le code à 6 chiffres envoyé à ${email}.`}>
      <View style={styles.form}>
        <FormTextField
          control={control}
          name="code"
          label="Code de confirmation"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
          onSubmitEditing={onSubmit}
        />
        <FormError error={verifyEmail.error ?? resendCode.error} />
        <Button title="Valider" fullWidth disabled={verifyEmail.isPending} onPress={onSubmit} />
      </View>
      <View style={styles.form}>
        {resendCode.isSuccess && (
          <Text variant="small" color="success">
            Un nouveau code vient d&apos;être envoyé.
          </Text>
        )}
        <Button
          title="Renvoyer le code"
          variant="secondary"
          fullWidth
          disabled={resendCode.isPending}
          onPress={() => resendCode.mutate(email)}
        />
        <Button title="Retour à la connexion" variant="ghost" onPress={() => router.dismissTo('/connexion')} />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Space.lg,
  },
});
