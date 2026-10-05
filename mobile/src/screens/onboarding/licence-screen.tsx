import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MemberFormFields } from '@/components/form/member-form';
import { AlertBanner, Button, Chip, Space, Text } from '@/design-system';
import { useSignOut } from '@/features/auth/api';
import { useAddMember, useMembers } from '@/features/members/api';
import { AuthScreen, authStyles } from '@/screens/auth/auth-screen';

type LicenceOwner = 'self' | 'child';

/**
 * Étape 2 de l'inscription. Le compte a besoin d'au moins une licence pour accéder au contenu :
 * celle du parent (facultative) ou celle d'un enfant rattaché. Le club vérifie ensuite à la main.
 */
export function LicenceScreen() {
  const members = useMembers();
  const addMember = useAddMember();
  const signOut = useSignOut();
  const [owner, setOwner] = useState<LicenceOwner>('self');
  const rejected = members.data?.filter((member) => member.status === 'rejected') ?? [];

  return (
    <AuthScreen
      title="Licence requise"
      description="L'application est réservée aux adhérents du club. Indiquez votre numéro de licence FFBaD, ou celui d'un enfant licencié au club que vous rattachez à votre compte.">
      {rejected.map((member) => (
        <AlertBanner
          key={member.id}
          title={`Licence de ${member.first_name} refusée`}
          message={
            member.rejection_reason ??
            "Le club n'a pas pu valider cette licence. Vérifiez le numéro ou contactez le club."
          }
        />
      ))}

      <View style={styles.choice}>
        <Text variant="label">Je renseigne</Text>
        <View style={styles.chips}>
          <Chip label="Ma licence" selected={owner === 'self'} onPress={() => setOwner('self')} />
          <Chip label="La licence d'un enfant" selected={owner === 'child'} onPress={() => setOwner('child')} />
        </View>
        {owner === 'child' && (
          <Text variant="small" color="textMuted">
            Vous pourrez ajouter d&apos;autres enfants, ou votre propre licence, depuis l&apos;onglet Mon badminton.
          </Text>
        )}
      </View>

      <MemberFormFields
        // Remonte le formulaire à chaque choix pour repartir de champs vides.
        key={owner}
        submitLabel="Envoyer"
        isSubmitting={addMember.isPending}
        error={addMember.error ?? members.error}
        onSubmit={(values) => addMember.mutate({ ...values, isAccountHolder: owner === 'self' })}
      />
      <Button title="Se déconnecter" variant="ghost" style={authStyles.link} onPress={() => signOut.mutate()} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  choice: {
    gap: Space.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
});
