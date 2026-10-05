import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { FormError } from '@/components/form/form-error';
import { FormTextField } from '@/components/form/form-text-field';
import { Button, Space } from '@/design-system';
import { useResetPassword } from '@/features/auth/api';
import { resetPasswordSchema, type ResetPasswordForm } from '@/features/auth/schemas';

import { AuthScreen, authStyles } from './auth-screen';

/** Code reçu par email + nouveau mot de passe. En cas de succès, l'utilisateur est connecté. */
export function ResetPasswordScreen({ email }: { email: string }) {
  const resetPassword = useResetPassword();
  const { control, handleSubmit } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', password: '', passwordConfirmation: '' },
  });

  const onSubmit = handleSubmit((values) => resetPassword.mutate({ ...values, email }));

  return (
    <AuthScreen
      title="Nouveau mot de passe"
      description={`Saisissez le code à 6 chiffres envoyé à ${email}, puis votre nouveau mot de passe.`}>
      <View style={styles.form}>
        <FormTextField
          control={control}
          name="code"
          label="Code reçu par email"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
        />
        <FormTextField
          control={control}
          name="password"
          label="Nouveau mot de passe"
          hint="8 caractères minimum."
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <FormTextField
          control={control}
          name="passwordConfirmation"
          label="Confirmer le mot de passe"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={onSubmit}
        />
        <FormError error={resetPassword.error} />
        <Button title="Enregistrer" fullWidth disabled={resetPassword.isPending} onPress={onSubmit} />
      </View>
      <Button title="Retour à la connexion" variant="ghost" style={authStyles.link} onPress={() => router.dismissTo('/connexion')} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Space.lg,
  },
});
