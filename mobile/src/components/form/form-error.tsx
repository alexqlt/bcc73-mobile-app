import { Text } from '@/design-system';
import { getErrorMessage } from '@/features/auth/errors';

/** Message d'erreur renvoyé par le serveur, affiché au-dessus du bouton d'envoi. */
export function FormError({ error }: { error: unknown }) {
  if (!error) {
    return null;
  }
  return (
    <Text variant="small" color="danger" accessibilityRole="alert">
      {getErrorMessage(error)}
    </Text>
  );
}
