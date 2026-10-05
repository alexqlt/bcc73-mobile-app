-- Archivage des actualités et des événements : un élément archivé n'est plus affiché (app, listes du
-- back-office) mais rien n'est supprimé (inscriptions, paiements et historique conservés).
-- Archiver relève de la modification : NEWS_UPDATE / STAGE_UPDATE (RLS existante).

alter table public.news add column archived_at timestamptz;
alter table public.stages add column archived_at timestamptz;

comment on column public.news.archived_at is 'Date d''archivage : l''actualité n''est plus affichée.';
comment on column public.stages.archived_at is 'Date d''archivage : l''événement n''est plus affiché (inscriptions conservées).';

grant update (archived_at) on public.news to authenticated;
grant update (archived_at) on public.stages to authenticated;

create index news_archived_at_idx on public.news (archived_at) where archived_at is null;
create index stages_archived_at_idx on public.stages (archived_at) where archived_at is null;
