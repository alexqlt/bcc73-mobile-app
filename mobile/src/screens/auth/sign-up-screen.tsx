import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { FormError } from '@/components/form/form-error';
import { FormTextField } from '@/components/form/form-text-field';
import { Button, Space } from '@/design-system';
import { useSignUp } from '@/features/auth/api';
import { signUpSchema, type SignUpForm } from '@/features/auth/schemas';

import { AuthScreen } from './auth-screen';

/** Étape 1 de l'inscription : email + mot de passe. La licence est demandée après la confirmation. */
export function SignUpScreen() {
  const signUp = useSignUp();
  const { control, handleSubmit } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', passwordConfirmation: '' },
  });

  const onSubmit = handleSubmit((values) =>
    signUp.mutate(values, {
      onSuccess: () =>
        router.replace({ pathname: '/verification-email', params: { email: values.email } }),
    })
  );

  return (
    <AuthScreen
      title="Créer mon compte"
      description="Vous recevrez un code par email pour confirmer votre adresse.">
      <View style={styles.form}>
        <FormTextField
          control={control}
          name="email"
          label="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <FormTextField
          control={control}
          name="password"
          label="Mot de passe"
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
        <FormError error={signUp.error} />
        <Button title="Continuer" fullWidth disabled={signUp.isPending} onPress={onSubmit} />
      </View>
      <Button title="J'ai déjà un compte" variant="ghost" onPress={() => router.back()} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Space.lg,
  },
});
