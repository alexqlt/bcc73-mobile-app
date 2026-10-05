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

## Règles

- **Toute modification du schéma passe par une migration**, jamais par l'éditeur du tableau de bord
  (sinon dev et prod divergent).
- **Row Level Security activée sur toutes les tables** : les droits sont vérifiés côté serveur,
  jamais dans l'application (voir APP.md, section RGPD et sécurité).
- Les clés secrètes (`service_role`, HelloAsso, Brevo, FFBaD) ne sortent jamais de Supabase :
  elles sont stockées en secrets des Edge Functions (`npx supabase@latest secrets set`).
