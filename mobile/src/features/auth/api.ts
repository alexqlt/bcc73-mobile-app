import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import type { ForgotPasswordForm, ResetPasswordForm, SignInForm, SignUpForm } from './schemas';

/** Lève l'erreur Supabase pour que TanStack Query la place dans `mutation.error`. */
async function throwOnError<T extends { error: unknown }>(request: Promise<T>) {
  const result = await request;
  if (result.error) throw result.error;
  return result;
}

export function useSignIn() {
  return useMutation({
    mutationFn: async ({ email, password }: SignInForm) =>
      throwOnError(supabase.auth.signInWithPassword({ email, password })),
  });
}

/** Crée le compte : Supabase envoie alors un code de confirmation par email. */
export function useSignUp() {
  return useMutation({
    mutationFn: async ({ email, password }: SignUpForm) =>
      throwOnError(supabase.auth.signUp({ email, password })),
  });
}

/** Valide le code reçu par email : l'utilisateur est alors connecté. */
export function useVerifyEmail() {
  return useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) =>
      throwOnError(supabase.auth.verifyOtp({ email, token: code, type: 'email' })),
    // P7-10 : email de bienvenue (envoyé une seule fois par le serveur, sans bloquer l'inscription).
    onSuccess: () => {
      supabase.functions.invoke('send-email', { body: { kind: 'welcome' } }).catch(() => undefined);
    },
  });
}

export function useResendSignUpCode() {
  return useMutation({
    mutationFn: async (email: string) => throwOnError(supabase.auth.resend({ email, type: 'signup' })),
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async ({ email }: ForgotPasswordForm) =>
      throwOnError(supabase.auth.resetPasswordForEmail(email)),
  });
}

/** Valide le code de réinitialisation puis enregistre le nouveau mot de passe. */
export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ email, code, password }: ResetPasswordForm & { email: string }) => {
      await throwOnError(supabase.auth.verifyOtp({ email, token: code, type: 'recovery' }));
      return throwOnError(supabase.auth.updateUser({ password }));
    },
  });
}

export function useSignOut() {
  return useMutation({
    mutationFn: async () => throwOnError(supabase.auth.signOut()),
  });
}
