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
        .order('is_account_holder', { ascending: false })
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

/** Le titulaire du compte, en ignorant les demandes refusées remplacées depuis. */
export function selectAccountHolder(members: Member[] | undefined) {
  const holders = members?.filter((member) => member.is_account_holder) ?? [];
  return holders.find((member) => member.status !== 'rejected') ?? holders.at(-1);
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
