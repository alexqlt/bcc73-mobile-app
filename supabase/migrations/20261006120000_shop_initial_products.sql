-- P6-05 — Catalogue initial de la boutique : les boîtes de volants vendues sur
-- https://bcc73.com/vente-de-volants/ (page mise à jour le 21/09/2026).
--
-- Un article déjà présent sous le même nom n'est pas recréé : la migration peut être rejouée sans
-- doublon, et un prix déjà modifié depuis le back-office est conservé.

insert into public.products (name, description, price_cents)
select v.name, v.description, v.price_cents
from (values
  ('FORZA S-5000', 'Boîte de volants homologués Standard FFBaD, vitesse 77.', 2000),
  ('FORZA S-6000', 'Boîte de volants homologués Élite FFBaD, vitesse 77.', 2300),
  ('RSL 3 Pro', 'Boîte de volants homologués Élite FFBaD, vitesse 77.', 2900),
  ('Victor Champion 5', 'Boîte de volants homologués Standard FFBaD, vitesse 77.', 2200),
  ('Victor Carbonsonic', 'Boîte de volants homologués Standard FFBaD, vitesse 77.', 1500),
  ('Victor Carbonsonic Max', 'Boîte de volants homologués Élite FFBaD, vitesse 77.', 2100)
) as v (name, description, price_cents)
where not exists (
  select 1 from public.products p where lower(p.name) = lower(v.name)
);
