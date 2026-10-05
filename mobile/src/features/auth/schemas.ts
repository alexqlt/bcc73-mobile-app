import { z } from 'zod';

const email = z.email('Adresse email invalide.').trim().toLowerCase();

const password = z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.');

/** Code à 6 chiffres reçu par email. */
const otpCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Le code comporte 6 chiffres.');

/** Numéro de licence FFBaD : 8 chiffres. */
export const licenceNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{8}$/, 'Le numéro de licence comporte 8 chiffres.');

const personName = (label: string) =>
  z.string().trim().min(1, `${label} est obligatoire.`).max(100, `${label} est trop long.`);

export const licenceFormSchema = z.object({
  licenceNumber: licenceNumberSchema,
});
export type LicenceForm = z.infer<typeof licenceFormSchema>;

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Le mot de passe est obligatoire.'),
});
export type SignInForm = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    email,
    password,
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: 'Les deux mots de passe sont différents.',
    path: ['passwordConfirmation'],
  });
export type SignUpForm = z.infer<typeof signUpSchema>;

export const verifyEmailSchema = z.object({ code: otpCode });
export type VerifyEmailForm = z.infer<typeof verifyEmailSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    code: otpCode,
    password,
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: 'Les deux mots de passe sont différents.',
    path: ['passwordConfirmation'],
  });
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

/** Membre à rattacher au compte : le titulaire ou un enfant. */
export const memberFormSchema = z.object({
  licenceNumber: licenceNumberSchema,
  firstName: personName('Le prénom'),
  lastName: personName('Le nom'),
});
export type MemberForm = z.infer<typeof memberFormSchema>;
