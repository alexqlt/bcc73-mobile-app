-- Photo de profil facultative du compte (onglet « Mon profil » de l'app).
--
-- La photo est dans le bucket public « avatars », sous <id du compte>/<uuid>.jpg : chacun ne peut
-- écrire, remplacer ou supprimer que dans son propre dossier. accounts.avatar_path pointe dessus.

alter table public.accounts add column avatar_path text;

comment on column public.accounts.avatar_path is
  'Chemin de la photo de profil dans le bucket avatars (<id du compte>/<uuid>.jpg), facultative.';

-- La règle « Modifier son compte » (migration accounts_and_members) limite déjà à sa propre ligne.
grant update (avatar_path) on public.accounts to authenticated;

-- Bucket public : la photo s'affiche par son URL, sans jeton. 2 Mo au plus (l'app l'envoie réduite).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Lister ses photos de profil"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Ajouter sa photo de profil"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Supprimer sa photo de profil"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
