# BCC73 — application du Badminton Club de Chambéry

Monorepo de l'application du club : app mobile, back-office web et backend Supabase.
La vision produit est décrite dans [APP.md](APP.md), l'avancement dans [TASKS.md](TASKS.md).

## Structure

| Dossier | Contenu | Stack |
|---------|---------|-------|
| [`mobile/`](mobile/README.md) | Application iOS / Android | Expo, React Native, TypeScript, Expo Router |
| `admin/` | Back-office web | Next.js, TypeScript |
| `supabase/` | Base de données, migrations, Edge Functions | Supabase (PostgreSQL) |

Chaque projet a son propre `package.json` : on lance les commandes depuis son dossier.

## Conventions

- Chaque développement correspond à une carte de [TASKS.md](TASKS.md) (`P1-04`, `RG-02`…).
- Les messages de commit commencent par l'identifiant de la carte : `P1-04 Écran de connexion`.
- Les secrets ne sont jamais versionnés : chaque projet fournit un `.env.example` à copier en `.env.local`.
