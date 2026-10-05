import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { FormError } from '@/components/form/form-error';
import { FormTextField } from '@/components/form/form-text-field';
import { Button, Space } from '@/design-system';
import { useResendSignUpCode, useSignIn } from '@/features/auth/api';
import { useAuth } from '@/features/auth/auth-provider';
import { ACCOUNT_DISABLED_MESSAGE, isEmailNotConfirmed, UserFacingError } from '@/features/auth/errors';
import { signInSchema, type SignInForm } from '@/features/auth/schemas';

import { AuthScreen, authStyles } from './auth-screen';

/** L'introduction ne se joue qu'une fois par lancement de l'app (pas après une déconnexion). */
let hasPlayedIntro = false;

export function SignInScreen() {
  const [intro] = useState(() => !hasPlayedIntro);
  useEffect(() => {
    hasPlayedIntro = true;
  }, []);
  const signIn = useSignIn();
  const { accountDisabled } = useAuth();
  const resendCode = useResendSignUpCode();
  const { control, handleSubmit } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) =>
    signIn.mutate(values, {
      // Compte créé mais email jamais confirmé : on renvoie un code et on propose de le saisir.
      onError: (error) => {
        if (isEmailNotConfirmed(error)) {
          resendCode.mutate(values.email);
          router.push({ pathname: '/verification-email', params: { email: values.email } });
        }
      },
    })
  );

  return (
    <AuthScreen intro={intro} title="Connexion" description="Retrouvez l'actualité, le planning et les événements du club.">
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
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={onSubmit}
        />
        <FormError
          error={
            isEmailNotConfirmed(signIn.error)
              ? null
              : (signIn.error ?? (accountDisabled ? new UserFacingError(ACCOUNT_DISABLED_MESSAGE) : null))
          }
        />
        <Button title="Se connecter" fullWidth disabled={signIn.isPending} onPress={onSubmit} />
        <Button
          title="Mot de passe oublié ?"
          variant="ghost"
          style={authStyles.link}
          onPress={() => router.push('/mot-de-passe-oublie')}
        />
      </View>
      <Button
        title="Créer un compte"
        variant="secondary"
        fullWidth
        onPress={() => router.push('/inscription')}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Space.lg,
  },
});
