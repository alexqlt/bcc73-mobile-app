import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import type { MemberForm } from '@/features/auth/schemas';
import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type Member = Tables<'members'>;

const membersKey = (accountId: string | undefined) => ['members', accountId] as const;

/** Membres rattachés au compte connecté (titulaire en premier). */
export function useMembers() {
  const { session } = useAuth();
  const accountId = session?.user.id;

  return useQuery({
    queryKey: membersKey(accountId),
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        // Les responsables (MEMBER_VIEW) peuvent lire tous les adhérents : on ne garde que ce compte.
        .eq('account_id', accountId!)
        .order('is_account_holder', { ascending: false })
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Le compte accède au contenu du club dès qu'au moins une licence (celle du parent ou d'un
 * enfant rattaché) est validée ou en cours de validation. La licence du parent est facultative.
 */
export function hasClubAccess(members: Member[] | undefined) {
  return members?.some((member) => member.status !== 'rejected') ?? false;
}

/** Le titulaire du compte, s'il a indiqué sa propre licence (et qu'elle n'est pas refusée). */
export function selectAccountHolder(members: Member[] | undefined) {
  return members?.find((member) => member.is_account_holder && member.status !== 'rejected');
}

/** Rattache un membre au compte. Il reste « en attente » jusqu'à la validation par le club. */
export function useAddMember() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const accountId = session?.user.id;

  return useMutation({
    mutationFn: async ({ isAccountHolder, ...form }: MemberForm & { isAccountHolder: boolean }) => {
      if (!accountId) throw new Error('Utilisateur non connecté');
      const { error } = await supabase.from('members').insert({
        account_id: accountId,
        license_number: form.licenceNumber,
        first_name: form.firstName,
        last_name: form.lastName,
        is_account_holder: isAccountHolder,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: membersKey(accountId) }),
  });
}

/** Retire un membre non validé (en attente ou refusé). */
export function useRemoveMember() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const accountId = session?.user.id;

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: membersKey(accountId) }),
  });
}
