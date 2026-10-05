import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button, Space } from '@/design-system';
import { memberFormSchema, type MemberForm } from '@/features/auth/schemas';

import { FormError } from './form-error';
import { FormTextField } from './form-text-field';

export type MemberFormFieldsProps = {
  submitLabel: string;
  isSubmitting: boolean;
  error: unknown;
  onSubmit: (values: MemberForm) => void;
  defaultValues?: Partial<MemberForm>;
};

/** Formulaire licence + prénom + nom, partagé entre l'inscription et l'ajout d'un enfant. */
export function MemberFormFields({
  submitLabel,
  isSubmitting,
  error,
  onSubmit,
  defaultValues,
}: MemberFormFieldsProps) {
  const { control, handleSubmit } = useForm<MemberForm>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: { licenceNumber: '', firstName: '', lastName: '', ...defaultValues },
  });
  const submit = handleSubmit(onSubmit);

  return (
    <View style={styles.form}>
      <FormTextField
        control={control}
        name="licenceNumber"
        label="Numéro de licence FFBaD"
        hint="8 chiffres, indiqués sur la licence ou sur myffbad.fr."
        placeholder="08XXXXXX"
        keyboardType="number-pad"
        maxLength={8}
      />
      <FormTextField
        control={control}
        name="firstName"
        label="Prénom"
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
      />
      <FormTextField
        control={control}
        name="lastName"
        label="Nom"
        autoCapitalize="characters"
        autoComplete="family-name"
        textContentType="familyName"
        onSubmitEditing={submit}
      />
      <FormError error={error} />
      <Button title={submitLabel} fullWidth disabled={isSubmitting} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Space.lg,
  },
});
