import { AlertBanner } from '@/design-system';
import { useMembers } from '@/features/members/api';

/** Rappelle qu'une licence du compte attend la validation du club. Rien n'est affiché sinon. */
export function PendingValidationBanner() {
  const members = useMembers();
  const hasPending = members.data?.some((member) => member.status === 'pending');

  if (!hasPending) {
    return null;
  }
  return (
    <AlertBanner
      title="Validation en cours"
      message="Un responsable du club va vérifier les licences de votre compte. Les stages et la boutique seront disponibles une fois la validation faite."
    />
  );
}
