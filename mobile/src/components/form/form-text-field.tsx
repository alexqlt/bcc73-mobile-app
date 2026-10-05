import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { TextField, type TextFieldProps } from '@/design-system';

export type FormTextFieldProps<T extends FieldValues> = Omit<
  TextFieldProps,
  'value' | 'onChangeText' | 'onBlur' | 'error'
> & {
  control: Control<T>;
  name: FieldPath<T>;
};

/**
 * Champ texte du design system relié à React Hook Form.
 * Le message d'erreur vient du schéma Zod du formulaire.
 */
export function FormTextField<T extends FieldValues>({ control, name, ...rest }: FormTextFieldProps<T>) {
  const {
    field: { ref, value, onChange, onBlur },
    fieldState: { error },
  } = useController({ control, name });

  return (
    <TextField
      {...rest}
      ref={ref}
      value={value ?? ''}
      onChangeText={onChange}
      onBlur={onBlur}
      error={error?.message}
    />
  );
}
