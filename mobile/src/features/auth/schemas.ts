import { z } from 'zod';

/** Numéro de licence FFBaD : 8 chiffres. */
export const licenceNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{8}$/, 'Le numéro de licence comporte 8 chiffres.');

export const licenceFormSchema = z.object({
  licenceNumber: licenceNumberSchema,
});

export type LicenceForm = z.infer<typeof licenceFormSchema>;
