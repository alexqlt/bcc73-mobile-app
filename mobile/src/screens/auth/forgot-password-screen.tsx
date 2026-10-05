import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { FormError } from '@/components/form/form-error';
import { FormTextField } from '@/components/form/form-text-field';
import { Button, Space } from '@/design-system';
import { useRequestPasswordReset } from '@/features/auth/api';
import { forgotPasswordSchema, type ForgotPasswordForm } from '@/features/auth/schemas';

import { AuthScreen, authStyles } from './auth-screen';

export function ForgotPasswordScreen() {
  const requestReset = useRequestPasswordReset();
  const { control, handleSubmit } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit((values) =>
    requestReset.mutate(values, {
      onSuccess: () =>
        router.replace({ pathname: '/nouveau-mot-de-passe', params: { email: values.email } }),
    })
  );

  return (
    <AuthScreen
      title="Mot de passe oublié"
      description="Indiquez votre email : vous recevrez un code pour choisir un nouveau mot de passe.">
      <View style={styles.form}>
        <FormTextField
          control={control}
          name="email"
          label="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          onSubmitEditing={onSubmit}
        />
        <FormError error={requestReset.error} />
        <Button title="Recevoir un code" fullWidth disabled={requestReset.isPending} onPress={onSubmit} />
      </View>
      <Button title="Retour à la connexion" variant="ghost" style={authStyles.link} onPress={() => router.back()} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Space.lg,
  },
});
