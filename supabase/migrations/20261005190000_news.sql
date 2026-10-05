-- P3-01 — Actualités (APP.md §13 « Publier une actualité » et §19 « Modèle de données »).
--
-- Une actualité est un brouillon tant que published_at est vide. Les adhérents connectés ne voient
-- que les actualités publiées ; les responsables (permissions NEWS_*) voient aussi les brouillons.
-- La photo est stockée dans le bucket public « news-photos » : image_path contient son chemin.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 150),
  content text not null check (char_length(trim(content)) between 1 and 20000),
  image_path text,
  published_at timestamptz,
  author_id uuid references public.accounts (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.news is
  'Actualité du club. Brouillon tant que published_at est vide.';
comment on column public.news.image_path is
  'Chemin de la photo dans le bucket news-photos (ex. <id>/<uuid>.jpg).';

create index news_published_at_idx on public.news (published_at desc) where published_at is not null;

create trigger news_set_updated_at
  before update on public.news
  for each row execute function public.set_updated_at();

create trigger news_audit
  after insert or update or delete on public.news
  for each row execute function public.audit_change();

-- ---------------------------------------------------------------------------
-- Droits et RLS
-- ---------------------------------------------------------------------------

create function public.can_edit_news()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission('NEWS_CREATE')
      or public.has_permission('NEWS_UPDATE')
      or public.has_permission('NEWS_DELETE');
$$;

revoke execute on function public.can_edit_news() from public, anon;
grant execute on function public.can_edit_news() to authenticated;

revoke all on public.news from anon, authenticated;

grant select, delete on public.news to authenticated;
grant insert (id, title, content, image_path, published_at) on public.news to authenticated;
grant update (title, content, image_path, published_at) on public.news to authenticated;

alter table public.news enable row level security;

create policy "Lire les actualités publiées (ou toutes pour les responsables)"
  on public.news for select
  to authenticated
  using (published_at is not null or (select public.can_edit_news()));

create policy "Créer une actualité"
  on public.news for insert
  to authenticated
  with check ((select public.has_permission('NEWS_CREATE')));

create policy "Modifier une actualité"
  on public.news for update
  to authenticated
  using ((select public.has_permission('NEWS_UPDATE')))
  with check ((select public.has_permission('NEWS_UPDATE')));

create policy "Supprimer une actualité"
  on public.news for delete
  to authenticated
  using ((select public.has_permission('NEWS_DELETE')));

-- ---------------------------------------------------------------------------
-- Photos (Supabase Storage)
-- ---------------------------------------------------------------------------

-- Bucket public : l'app affiche les photos par leur URL publique, sans jeton (cache d'images simple).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('news-photos', 'news-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Lister les photos d'actualités (responsables)"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'news-photos' and (select public.can_edit_news()));

create policy "Ajouter une photo d'actualité"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'news-photos'
    and ((select public.has_permission('NEWS_CREATE')) or (select public.has_permission('NEWS_UPDATE')))
  );

create policy "Supprimer une photo d'actualité"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'news-photos'
    and ((select public.has_permission('NEWS_UPDATE')) or (select public.has_permission('NEWS_DELETE')))
  );
