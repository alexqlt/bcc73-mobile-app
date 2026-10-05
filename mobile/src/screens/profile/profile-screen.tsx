import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MemberFormFields } from '@/components/form/member-form';
import { PendingValidationBanner } from '@/components/pending-validation-banner';
import { BottomTabInset, MaxContentWidth, WebTopInset } from '@/constants/theme';
import {
  Badge,
  Button,
  Card,
  SectionTitle,
  Space,
  Text,
  useDesignSystem,
} from '@/design-system';
import { useSignOut } from '@/features/auth/api';
import { useAuth } from '@/features/auth/auth-provider';
import {
  selectAccountHolder,
  useAddMember,
  useMembers,
  useRemoveMember,
  type Member,
} from '@/features/members/api';
import { memberStatusLabel, memberStatusTone } from '@/features/members/status';
import { usePermissions, type Permission } from '@/features/permissions/api';
import { env } from '@/lib/env';

/** Profil (APP.md : Mon badminton > Profil) : compte, membres rattachés et déconnexion. */
export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { tokens, mode } = useDesignSystem();
  const { session } = useAuth();
  const members = useMembers();
  const signOut = useSignOut();
  const permissions = usePermissions();

  return (
    <ScrollView
      style={{ backgroundColor: tokens.colors.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + WebTopInset + Space.lg,
          paddingBottom: insets.bottom + BottomTabInset + Space.xxl,
        },
      ]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.inner}>
        <SectionTitle eyebrow="Mon badminton" title="Mon profil" />
        <Text color="textMuted">{session?.user.email}</Text>

        <PendingValidationBanner />

        <View style={styles.section}>
          <Text variant="subtitle">Membres du compte</Text>
          {members.data?.map((member) => <MemberCard key={member.id} member={member} />)}
          <AddMemberSection kind="child" />
          {/* La licence du parent est facultative : il peut l'ajouter plus tard. */}
          {!selectAccountHolder(members.data) && <AddMemberSection kind="self" />}
        </View>

        {!!permissions.data?.length && <BackOfficeSection permissions={permissions.data} />}

        <View style={styles.section}>
          <Text variant="subtitle">Bientôt</Text>
          <Text color="textMuted">Classements et évolution (phase 5).</Text>
        </View>

        <Button
          title="Se déconnecter"
          variant="secondary"
          fullWidth
          disabled={signOut.isPending}
          onPress={() => signOut.mutate()}
        />
      </View>
    </ScrollView>
  );
}

/** Bénévoles : ce que leurs rôles leur permettent, et l'accès au back-office. */
function BackOfficeSection({ permissions }: { permissions: Permission[] }) {
  return (
    <View style={styles.section}>
      <Text variant="subtitle">Back-office du club</Text>
      <Card highlighted>
        <Text variant="small" color="textMuted">
          Vos rôles vous permettent de :
        </Text>
        {permissions.map((permission) => (
          <Text key={permission.code}>— {permission.description}</Text>
        ))}
      </Card>
      {env.adminUrl && (
        <Button
          title="Ouvrir le back-office"
          fullWidth
          onPress={() => WebBrowser.openBrowserAsync(env.adminUrl!)}
        />
      )}
    </View>
  );
}

function MemberCard({ member }: { member: Member }) {
  const removeMember = useRemoveMember();
  // Une licence validée ne se retire plus depuis l'app (le club doit intervenir).
  const canRemove = member.status !== 'approved';

  return (
    <Card highlighted={member.is_account_holder}>
      <Text variant="bodyStrong">
        {member.first_name} {member.last_name}
      </Text>
      <Text variant="small" color="textMuted">
        Licence {member.license_number} · {member.is_account_holder ? 'Votre licence' : 'Enfant rattaché'}
      </Text>
      <Badge label={memberStatusLabel[member.status]} tone={memberStatusTone[member.status]} />
      {member.status === 'rejected' && member.rejection_reason && (
        <Text variant="small" color="danger">
          {member.rejection_reason}
        </Text>
      )}
      {canRemove && (
        <Button
          title="Retirer"
          variant="ghost"
          disabled={removeMember.isPending}
          onPress={() => removeMember.mutate(member.id)}
        />
      )}
    </Card>
  );
}

const addMemberTexts = {
  child: {
    button: 'Ajouter un enfant',
    title: 'Ajouter un enfant',
    hint: 'Sa licence sera vérifiée par le club.',
  },
  self: {
    button: 'Ajouter ma licence (facultatif)',
    title: 'Ajouter ma licence',
    hint: 'Facultatif si vous ne jouez pas : vos enfants licenciés suffisent pour accéder à l’application.',
  },
};

/** Ajout d'un enfant (P1-15) ou de la licence du parent, rattachés au compte. */
function AddMemberSection({ kind }: { kind: 'child' | 'self' }) {
  const [isOpen, setIsOpen] = useState(false);
  const addMember = useAddMember();
  const texts = addMemberTexts[kind];

  if (!isOpen) {
    return <Button title={texts.button} variant="secondary" fullWidth onPress={() => setIsOpen(true)} />;
  }

  return (
    <Card>
      <Text variant="subtitle">{texts.title}</Text>
      <Text variant="small" color="textMuted">
        {texts.hint}
      </Text>
      <MemberFormFields
        submitLabel="Ajouter"
        isSubmitting={addMember.isPending}
        error={addMember.error}
        onSubmit={(values) =>
          addMember.mutate({ ...values, isAccountHolder: kind === 'self' }, { onSuccess: () => setIsOpen(false) })
        }
      />
      <Button title="Annuler" variant="ghost" onPress={() => setIsOpen(false)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Space.lg,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Space.xl,
  },
  section: {
    gap: Space.md,
  },
});
