# BCC73 — Supabase

Base de données PostgreSQL, authentification, stockage et Edge Functions.

| Élément | Emplacement |
|---------|-------------|
| Configuration (auth, stockage…) | `config.toml` |
| Schéma de la base, versionné | `migrations/` (un fichier SQL par évolution) |
| Fonctions serveur (FFBaD, HelloAsso, Brevo…) | `functions/` |

## Environnements

| Environnement | Projet Supabase | Usage |
|---------------|-----------------|-------|
| dev | `bcc73-dev` | développement et tests |
| prod | `bcc73-prod` | application publiée |

Docker n'étant pas installé, on ne lance pas Supabase en local : on travaille directement
sur le projet **dev** hébergé.

## Secrets

Les secrets utilisés par `config.toml` (`env(...)`) sont lus dans `supabase/.env`, non versionné :

```bash
BREVO_SMTP_KEY=xsmtpsib-...   # Brevo > SMTP & API > clés SMTP
```

Les emails d'authentification partent par Brevo (`smtp-relay.brevo.com`, expéditeur `info@bcc73.com`).
Après une modification de la configuration : `npx supabase@latest config diff`, puis `config push`.

## Commandes

Toutes les commandes se lancent depuis la racine du dépôt (le dossier qui contient `supabase/`).

```bash
npx supabase@latest login                          # une seule fois : connexion au compte Supabase
npx supabase@latest link --project-ref <ref-dev>   # relier le dossier au projet dev
npx supabase@latest migration new <nom>            # créer une migration dans migrations/
npx supabase@latest db push                        # appliquer les migrations sur le projet lié
npx supabase@latest gen types typescript --linked > mobile/src/lib/database.types.ts
```

Le `<ref>` d'un projet est l'identifiant visible dans son URL : `https://<ref>.supabase.co`.

## Rôles et permissions

Les droits sont vérifiés dans la base (RLS et fonctions), jamais par l'application :
un compte reçoit des **rôles** (Administrateur, Secrétariat, Communication…), qui regroupent des
**permissions** (`MEMBER_MANAGE`, `NEWS_CREATE`…). Le rôle Administrateur a toutes les permissions ;
quand une migration ajoute une permission, elle doit aussi l'ajouter à ce rôle.

Garde-fous : seul un administrateur peut donner ou retirer le rôle Administrateur, et le dernier
administrateur ne peut pas être retiré. Les changements de rôles et les validations de licences sont
inscrits dans `audit_logs`.

Premier administrateur d'un nouveau projet (par exemple la prod), depuis le SQL Editor :

```sql
insert into public.account_roles (account_id, role_id, granted_by)
select u.id, r.id, null
from auth.users u, public.roles r
where u.email = 'adresse@exemple.fr' and r.is_system;
```

## Valider les licences (en attendant le back-office)

Chaque nouvel adhérent saisit son numéro de licence dans l'app : sa fiche est créée avec le statut
`pending`. Un responsable vérifie la licence (par exemple dans Poona) puis la valide depuis
**SQL Editor** dans le tableau de bord Supabase :

```sql
-- Demandes en attente, avec l'email du compte
select m.id, m.license_number, m.first_name, m.last_name, m.is_account_holder, u.email, m.created_at
from public.members m
join auth.users u on u.id = m.account_id
where m.status = 'pending'
order by m.created_at;

-- Valider
select public.approve_member('<id>');

-- Refuser, avec un motif affiché dans l'app
select public.reject_member('<id>', 'Licence introuvable au club : vérifiez le numéro.');
```

Ces fonctions ne sont pas accessibles depuis l'application. Le back-office (phase 2, carte P2-07)
remplacera cette procédure.

## Règles

- **Toute modification du schéma passe par une migration**, jamais par l'éditeur du tableau de bord
  (sinon dev et prod divergent).
- **Row Level Security activée sur toutes les tables** : les droits sont vérifiés côté serveur,
  jamais dans l'application (voir APP.md, section RGPD et sécurité).
- Les clés secrètes (`service_role`, HelloAsso, Brevo, FFBaD) ne sortent jamais de Supabase :
  elles sont stockées en secrets des Edge Functions (`npx supabase@latest secrets set`).

## Paiements HelloAsso (phase 6)

Boutique et stages sont payés par HelloAsso Checkout. Les montants sont calculés par la base
(`create_shop_order`, `create_stage_registration`) et une commande ne passe `paid` qu'après
relecture du paiement auprès de l'API HelloAsso (les webhooks HelloAsso ne sont pas signés).

| Edge Function | Rôle | JWT |
|---------------|------|-----|
| `helloasso-checkout` | crée la commande et l'intention de paiement, renvoie l'URL HelloAsso | oui (appelée par l'app) |
| `helloasso-return` | retour du navigateur après paiement, vérifie puis renvoie vers l'app | non |
| `helloasso-webhook` | notifications HelloAsso, vérifie puis confirme le paiement | non |

### Brancher HelloAsso

1. **Tests** : créer une association sur <https://www.helloasso-sandbox.com>, puis dans son
   back-office récupérer le client API (*Mon compte > Intégrations et API*). En production, même
   chose sur le compte HelloAsso du club.
2. Enregistrer les secrets (projet lié) :

   ```bash
   npx supabase@latest secrets set      HELLOASSO_API_URL=https://api.helloasso-sandbox.com      HELLOASSO_CLIENT_ID=...      HELLOASSO_CLIENT_SECRET=...      HELLOASSO_ORGANIZATION_SLUG=slug-de-l-association
   ```

   En production : `HELLOASSO_API_URL=https://api.helloasso.com`.
3. Dans le back-office HelloAsso, déclarer l'URL de notification :
   `https://<ref>.supabase.co/functions/v1/helloasso-webhook`.
4. Déployer les fonctions après une modification :

   ```bash
   npx supabase@latest functions deploy helloasso-checkout helloasso-return helloasso-webhook --use-api
   ```

Sans ces secrets, l'app affiche « Le paiement en ligne n'est pas encore configuré » et la commande
est aussitôt annulée (la place de stage est libérée).

Le retour dans l'app passe par le lien `bcc73://paiement` : il faut une build de développement ou
de production (dans Expo Go, le lien `exp://…` fonctionne aussi pendant le développement).

## Emails transactionnels (phase 7)

Bienvenue, licence validée, paiement reçu et inscription au stage partent par l'**API** Brevo
(les ports SMTP 25 et 587 sont fermés dans les Edge Functions). Un email n'est envoyé qu'une fois
par élément (`email_log`).

```bash
# Brevo > SMTP & API > Clés API (xkeysib-…), différente de la clé SMTP des emails de connexion
npx supabase@latest secrets set BREVO_API_KEY=xkeysib-...
# Facultatif : expéditeur (validé dans Brevo), info@bcc73.com par défaut
npx supabase@latest secrets set EMAIL_SENDER=info@bcc73.com
```

Sans `BREVO_API_KEY`, les emails sont simplement ignorés (message dans les logs de la fonction).

