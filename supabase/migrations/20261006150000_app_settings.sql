-- Paramètres généraux de l'application, modifiables par le rôle Administrateur (back-office).
--
-- push_notifications_enabled : tant que le club n'a pas de build de l'app (les push ne marchent pas
-- dans Expo Go sur Android), les notifications restent coupées : l'app ne demande pas l'autorisation
-- et le serveur n'envoie rien.

create table public.app_settings (
  -- Une seule ligne.
  id boolean primary key default true check (id),
  push_notifications_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.accounts (id) on delete set null default auth.uid()
);

comment on table public.app_settings is 'Paramètres généraux (une ligne), modifiables par l''administrateur.';

insert into public.app_settings (id) values (true);

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Auteur de la dernière modification.
create function public.set_updated_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by = auth.uid();
  return new;
end;
$$;

revoke execute on function public.set_updated_by() from public, anon, authenticated;

create trigger app_settings_set_updated_by
  before update on public.app_settings
  for each row execute function public.set_updated_by();

-- audit_change() lit la colonne id : ici « true », suffisant pour le journal.
create trigger app_settings_audit
  after update on public.app_settings
  for each row execute function public.audit_change();

revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to authenticated;
grant update (push_notifications_enabled) on public.app_settings to authenticated;

alter table public.app_settings enable row level security;

create policy "Lire les paramètres"
  on public.app_settings for select to authenticated
  using (true);

create policy "Modifier les paramètres (administrateur)"
  on public.app_settings for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
