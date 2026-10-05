import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormError } from '@/components/form/form-error';
import { MemberFormFields } from '@/components/form/member-form';
import { PendingValidationBanner } from '@/components/pending-validation-banner';
import { BottomTabInset, MaxContentWidth, WebTopInset } from '@/constants/theme';
import {
  Avatar,
  Badge,
  Button,
  Card,
  SectionTitle,
  Space,
  Text,
  useDesignSystem,
  useDS,
} from '@/design-system';
import { avatarUrl, useAccount, useChangeAvatar, useRemoveAvatar } from '@/features/account/api';
import { useSignOut } from '@/features/auth/api';
import { useDevMode } from '@/features/dev-mode';
import { useAuth } from '@/features/auth/auth-provider';
import {
  selectAccountHolder,
  useAddMember,
  useMembers,
  useRemoveMember,
  type Member,
} from '@/features/members/api';
import { memberStatusLabel, memberStatusTone } from '@/features/members/status';
import { useMyRoles, type Role } from '@/features/permissions/api';
import { env } from '@/lib/env';

/** Onglet « Mon profil » (APP.md : Mon badminton > Profil) : compte, membres rattachés et déconnexion. */
export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { tokens, mode } = useDesignSystem();
  const { session } = useAuth();
  const members = useMembers();
  const signOut = useSignOut();
  const roles = useMyRoles();

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
        <SectionTitle title="Mon profil" />
        <ProfilePhoto email={session?.user.email ?? ''} holder={selectAccountHolder(members.data)} />
        {!!roles.data?.length && <RolesSection roles={roles.data} />}
        <DevModeSetting />

        <PendingValidationBanner />

        <View style={styles.section}>
          <Text variant="subtitle">Membres du compte</Text>
          {members.data?.map((member) => <MemberCard key={member.id} member={member} />)}
          <AddMemberSection kind="child" />
          {/* La licence du parent est facultative : il peut l'ajouter plus tard. */}
          {!selectAccountHolder(members.data) && <AddMemberSection kind="self" />}
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

/** Photo de profil facultative (ou initiales) et email du compte. */
function ProfilePhoto({ email, holder }: { email: string; holder: Member | undefined }) {
  const account = useAccount();
  const changeAvatar = useChangeAvatar();
  const removeAvatar = useRemoveAvatar();
  const uri = avatarUrl(account.data?.avatar_path);
  const initials = holder ? `${holder.first_name[0]}${holder.last_name[0]}` : (email[0] ?? '?');
  const busy = changeAvatar.isPending || removeAvatar.isPending;

  return (
    <View style={styles.photo}>
      <Avatar uri={uri} initials={initials.toUpperCase()} size={84} />
      <View style={styles.photoText}>
        {holder && (
          <Text variant="bodyStrong">
            {holder.first_name} {holder.last_name}
          </Text>
        )}
        <Text color="textMuted">{email}</Text>
        <View style={styles.photoActions}>
          <Button
            title={uri ? 'Changer la photo' : 'Ajouter une photo'}
            variant="ghost"
            disabled={busy}
            onPress={() => changeAvatar.mutate()}
          />
          {uri && <Button title="Retirer" variant="ghost" disabled={busy} onPress={() => removeAvatar.mutate()} />}
        </View>
        <FormError error={changeAvatar.error ?? removeAvatar.error} />
      </View>
    </View>
  );
}

/**
 * Mode développeur (administrateurs) : les boutons de paiement des stages et de la boutique valident
 * la commande sans HelloAsso. Gardé sur cet appareil ; la base refuse ces commandes aux autres comptes.
 */
function DevModeSetting() {
  const { colors } = useDS();
  const devMode = useDevMode();
  if (!devMode.available) return null;

  return (
    <Card highlighted={devMode.enabled}>
      <View style={styles.setting}>
        <View style={styles.settingText}>
          <Text variant="bodyStrong">Mode développeur</Text>
          <Text variant="small" color="textMuted">
            Les paiements des stages et des volants sont validés sans HelloAsso : commandes marquées « Test », exclues des
            ventes et annulables depuis l’historique. Aucun email n’est envoyé.
          </Text>
        </View>
        <Switch
          accessibilityLabel="Mode développeur"
          value={devMode.enabled}
          onValueChange={devMode.setEnabled}
          trackColor={{ true: colors.accent, false: colors.surfaceAlt }}
          thumbColor={colors.background}
          ios_backgroundColor={colors.surfaceAlt}
        />
      </View>
    </Card>
  );
}

/** Bénévoles : leurs rôles (comme dans la liste des utilisateurs du back-office) et l'accès au back-office. */
function RolesSection({ roles }: { roles: Role[] }) {
  return (
    <View style={styles.roles}>
      <View style={styles.badges}>
        {roles.map((role) => (
          <Badge key={role.id} label={role.name} tone={role.is_system ? 'accent' : 'neutral'} />
        ))}
      </View>
      {env.adminUrl && (
        <Button
          title="Ouvrir le back-office"
          variant="secondary"
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
  roles: {
    gap: Space.md,
  },
  setting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  settingText: {
    flex: 1,
    gap: Space.xs,
  },
  photo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.lg,
  },
  photoText: {
    flex: 1,
    gap: Space.xs,
  },
  photoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Space.lg,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
});
