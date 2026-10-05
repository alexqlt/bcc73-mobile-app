import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '@/features/auth/auth-provider';
import { supabase } from '@/lib/supabase';

const AVATAR_BUCKET = 'avatars';
/** Côté de la photo envoyée : assez net pour l'écran, léger pour le réseau et le stockage. */
const AVATAR_SIZE = 512;

const accountKey = (accountId: string | undefined) => ['account', accountId] as const;

/** Compte connecté (photo de profil). */
export function useAccount() {
  const { session } = useAuth();
  const accountId = session?.user.id;

  return useQuery({
    queryKey: accountKey(accountId),
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('id, avatar_path').eq('id', accountId!).single();
      if (error) throw error;
      return data;
    },
  });
}

/** URL publique de la photo de profil (bucket public). */
export function avatarUrl(path: string | null | undefined) {
  return path ? supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl : null;
}

/** Enregistre la nouvelle photo (ou aucune) sur le compte, puis supprime l'ancienne. */
async function replaceAvatar(accountId: string, previousPath: string | null, nextPath: string | null) {
  const { error } = await supabase.from('accounts').update({ avatar_path: nextPath }).eq('id', accountId);
  if (error) {
    if (nextPath) await supabase.storage.from(AVATAR_BUCKET).remove([nextPath]);
    throw error;
  }
  // Suppression au mieux : une ancienne photo orpheline ne gêne pas l'affichage.
  if (previousPath) await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
}

/**
 * Choisit une photo dans la galerie (recadrée en carré), la réduit à 512 px en JPEG puis l'envoie.
 * Renvoie false si l'utilisateur a annulé.
 */
export function useChangeAvatar() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const accountId = session?.user.id;
  const account = useAccount();

  return useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error('Utilisateur non connecté');
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (picked.canceled || !picked.assets[0]) return false;

      const rendered = await ImageManipulator.manipulate(picked.assets[0].uri)
        .resize({ width: AVATAR_SIZE, height: null })
        .renderAsync();
      const image = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
      const body = await (await fetch(image.uri)).arrayBuffer();

      // Nom unique : le cache d'images n'affiche jamais l'ancienne photo.
      const path = `${accountId}/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, body, { contentType: 'image/jpeg' });
      if (error) throw error;
      await replaceAvatar(accountId, account.data?.avatar_path ?? null, path);
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKey(accountId) }),
  });
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const accountId = session?.user.id;
  const account = useAccount();

  return useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error('Utilisateur non connecté');
      await replaceAvatar(accountId, account.data?.avatar_path ?? null, null);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKey(accountId) }),
  });
}
