import { AlertBanner, Button } from '@/design-system';
import { MemberFormFields } from '@/components/form/member-form';
import { useSignOut } from '@/features/auth/api';
import { selectAccountHolder, useAddMember, useMembers } from '@/features/members/api';
import { AuthScreen } from '@/screens/auth/auth-screen';

/**
 * Étape 2 de l'inscription : le titulaire du compte indique sa licence.
 * Elle sera vérifiée à la main par un responsable du club.
 */
export function LicenceScreen() {
  const members = useMembers();
  const addMember = useAddMember();
  const signOut = useSignOut();
  const rejected = selectAccountHolder(members.data);

  return (
    <AuthScreen
      title="Votre licence"
      description="Indiquez votre numéro de licence FFBaD : un responsable du club vérifiera que vous êtes bien adhérent.">
      {rejected?.status === 'rejected' && (
        <AlertBanner
          title="Demande refusée"
          message={
            rejected.rejection_reason ??
            "Le club n'a pas pu valider votre licence. Vérifiez votre numéro ou contactez le club."
          }
        />
      )}
      <MemberFormFields
        submitLabel="Envoyer"
        isSubmitting={addMember.isPending}
        error={addMember.error ?? members.error}
        onSubmit={(values) => addMember.mutate({ ...values, isAccountHolder: true })}
        defaultValues={
          rejected
            ? {
                licenceNumber: rejected.license_number,
                firstName: rejected.first_name,
                lastName: rejected.last_name,
              }
            : undefined
        }
      />
      <Button title="Se déconnecter" variant="ghost" onPress={() => signOut.mutate()} />
    </AuthScreen>
  );
}
