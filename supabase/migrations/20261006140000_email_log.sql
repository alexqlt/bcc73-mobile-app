-- P7-09 et P7-10 — Emails transactionnels (Brevo) : journal des envois.
--
-- Un email n'est envoyé qu'une fois par élément (bienvenue d'un compte, licence validée, commande
-- payée…), même si l'action qui le déclenche est rejouée. Table réservée aux Edge Functions.

create table public.email_log (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('welcome', 'member_approved', 'payment_received', 'stage_registration')),
  ref_id uuid not null,
  to_email text not null,
  subject text not null,
  provider_message_id text,
  created_at timestamptz not null default now(),
  unique (kind, ref_id)
);

comment on table public.email_log is 'Emails transactionnels envoyés (Brevo), un par élément.';

revoke all on public.email_log from anon, authenticated;
alter table public.email_log enable row level security;
