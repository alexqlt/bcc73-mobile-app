# Tableau des tâches — BCC73

Suivi des développements, tiré de [APP.md](APP.md). Fonctionne comme un tableau Trello :
une carte part du **Backlog**, passe dans **En cours**, puis arrive dans **Terminé** avec sa date et son commit.

## Mode d'emploi

- Chaque carte a un identifiant `Px-yy` (phase / numéro), à reprendre dans les messages de commit (ex. `P1-04 Écran de connexion`).
- Pour démarrer une carte : la **déplacer** dans « En cours » (une ou deux à la fois maximum).
- Une fois finie : la cocher, la déplacer dans « Terminé » et compléter `date` + `commit`.
- Ce qui n'est pas encore cadré va dans « Idées / V2 ».

---

## 🔄 En cours

- [ ] **P6-01** Compte et accès API HelloAsso : créer l'association de test sur helloasso-sandbox.com, récupérer le client API, enregistrer les secrets et l'URL de notification (procédure dans `supabase/README.md`), puis la même chose en production
- [ ] **P6-17** Tester les paiements en sandbox : achat de volants, inscription à un stage (place réservée, complet), paiement abandonné, remise des articles, liste des inscrits et des paiements

---

## 📋 Backlog

### Phase 0 — Fondation

- [ ] **P0-06** Créer l'environnement Supabase de prod (projet `bcc73-prod`) — avant la publication

### Phase 1 — Authentification et comptes

- [ ] **P1-16** Sélecteur du membre actif (parent → enfants) — utile à partir des stages et de la boutique

### Phase 2 — Rôles, permissions et back-office utilisateurs

- [ ] **P2-12** Hébergement du back-office (ex. Vercel) sur `admin.bcc73.com` — à faire avant d'ouvrir l'accès aux bénévoles

### Phase 3 — Actualités

- [ ] **P3-06** Case « Envoyer une notification push » à la publication (dépend de P7-01)

### Phase 4 — Planning

_Toutes les cartes sont terminées (test en cours : P4-09)._

### Phase 6 — Paiements HelloAsso

_Reste P6-01 et le test P6-17, en cours._

### Phase 7 — Notifications

- [ ] **P7-01** Installer et configurer `expo-notifications` + enregistrement du token push
- [ ] **P7-02** Envoi des push depuis le serveur (Expo Push Service)
- [ ] **P7-03** Push : nouvelle actualité
- [ ] **P7-04** Push : stage ouvert
- [ ] **P7-05** Push : inscription confirmée / paiement confirmé
- [ ] **P7-06** Push : créneau annulé
- [ ] **P7-07** Push : rappel de stage (optionnel)
- [ ] **P7-08** Mobile : écran Paramètres des notifications
- [ ] **P7-09** Intégration Brevo pour les emails transactionnels
- [ ] **P7-10** Emails : bienvenue, compte validé, paiement reçu, inscription au stage

### Phase 8 — Publication

- [ ] **P8-01** Comptes Apple Developer et Google Play Console
- [ ] **P8-02** Icône, splash screen, nom et identifiants de l'app (bundle iOS / package Android, ex. `com.bcc73.app` — définitifs après publication)
- [ ] **P8-03** EAS Build iOS / Android
- [ ] **P8-04** Distribution TestFlight
- [ ] **P8-05** Distribution Google Internal Testing
- [ ] **P8-06** Mises à jour OTA avec EAS Update
- [ ] **P8-07** Mise en production sur les stores

### Transverse — RGPD et sécurité

- [ ] **RG-01** Politique de confidentialité (accessible dans l'app)
- [ ] **RG-02** Gestion des comptes des mineurs (consentement, rattachement au parent)
- [ ] **RG-03** Export des données d'un utilisateur
- [ ] **RG-04** Suppression du compte et des données
- [ ] **RG-05** Revue de minimisation des données stockées
- [ ] **RG-06** Revue des policies RLS / permissions côté serveur

---

## 💡 Idées / V2

- [ ] Vérification automatique des licences via les **webservices officiels FFBaD** (`ws_getlicenceinfobylicence`, `ws_getlicenceinfolistbyinstance`) : demande d'accès à faire par le club sur support.ffbad.org. Remplacerait la validation manuelle (anciennes cartes P1-02 à P1-04 et P1-08). MyFFBaD n'a pas d'API publique et les CGU Poona interdisent les robots.

- [ ] Planning : reconnaissance automatique de l'image (OCR / IA) → créneaux détectés → validation humaine
- [ ] Classements FFBaD (ancienne phase 5, abandonnée le 2026-10-05) : classements simple / double / mixte, évolution, classements des enfants, synchronisation via les webservices FFBaD (identifiants à demander à la fédération) ; puis derniers matchs, adversaires, points gagnés / perdus
- [ ] Boutique : gestion du stock
- [ ] Backend NestJS dédié si les intégrations FFBaD / HelloAsso deviennent trop complexes

---

## ✅ Terminé

| ID | Tâche | Date | Commit |
|----|-------|------|--------|
| — | Création du projet Expo (TypeScript + Expo Router) | — | `b0171a0` |
| DS-01 | Design system validé : style « Club » (A), fidèle à bcc73.com — tokens + composants dans `mobile/src/design-system/` | 2026-10-05 | `fa74ca0` |
| P0-14 | Corriger l'erreur de lint du template (`use-color-scheme.web.ts`) | 2026-10-05 | `a33d098` |
| P0-02 | Nettoyer le template Expo (écran Explore, démos, script reset) | 2026-10-05 | `54b40c1` |
| P0-01 | Monorepo : app Expo déplacée dans `mobile/` | 2026-10-05 | `2c20c1f` |
| P0-03 | Architecture des dossiers mobile documentée (`mobile/README.md`) | 2026-10-05 | `013a144` |
| P0-04 | Projet Next.js du back-office (`admin/`) aux couleurs du club | 2026-10-05 | `2d941b7` |
| P0-07 | Variables d'environnement : `.env.example` mobile et admin | 2026-10-05 | `4e4bb94` |
| P0-08 | TanStack Query côté mobile (pause hors réseau, rafraîchissement au premier plan) | 2026-10-05 | `8f332dd` |
| P0-09 | React Hook Form + Zod, champ `FormTextField` | 2026-10-05 | `ede7d63` |
| P0-10 | Client Supabase mobile, session persistée (`expo-sqlite/localStorage`) | 2026-10-05 | `7da957f` |
| P0-13 | Barre d'onglets : 5 onglets aux couleurs du club | 2026-10-05 | `528b759` |
| P0-11 | CI GitHub Actions (lint, typecheck, build) active sur [alexqlt/bcc73-mobile-app](https://github.com/alexqlt/bcc73-mobile-app) — premier run vert | 2026-10-05 | `e2ae6db` |
| P0-05 | Projet Supabase dev (ref `avqfxxepxieugwgiidqa`) branché via `.env.local` et relié à `supabase/` (`supabase link`) | 2026-10-05 | `d1112f6` |
| P0-12 | EAS : `eas.json` + projet [@scunange/bcc73](https://expo.dev/accounts/scunange/projects/bcc73) (identifiants stores reportés à P8-02) | 2026-10-05 | `645ffd6` |
| P1-01 | Tables `accounts` / `members` + RLS, statut `pending` / `approved` / `rejected` non modifiable par l'app | 2026-10-05 | `94e7f5b` |
| P1-06 | Modèles d'email à code en français + config auth poussée (activation des modèles : P1-17) | 2026-10-05 | `d737f24` |
| P1-05 | Inscription email + mot de passe | 2026-10-05 | `f99e78e` |
| P1-07 | Saisie de la licence, prénom et nom du titulaire | 2026-10-05 | `f99e78e` |
| P1-08 | Licence « en attente de validation » (validation manuelle, pas de liste FFBaD) | 2026-10-05 | `f99e78e` |
| P1-10 | Connexion (renvoi du code si email non confirmé) | 2026-10-05 | `f99e78e` |
| P1-11 | Déconnexion | 2026-10-05 | `f99e78e` |
| P1-12 | Mot de passe oublié par code | 2026-10-05 | `f99e78e` |
| P1-13 | Navigation protégée : connexion / licence / onglets | 2026-10-05 | `f99e78e` |
| P1-14 | Profil (onglet Mon badminton) | 2026-10-05 | `f99e78e` |
| P1-15 | Ajouter / retirer un enfant rattaché au compte | 2026-10-05 | `f99e78e` |
| P1-09 | Validation manuelle des licences par SQL (procédure dans `supabase/README.md`) | 2026-10-05 | `427eff9` |
| P1-17 | Emails envoyés par Brevo (`info@bcc73.com`), modèles en français avec code à 6 chiffres | 2026-10-05 | `d9e9e1e` |
| P2-01 | Tables `roles`, `permissions`, `role_permissions`, `account_roles` + RLS | 2026-10-05 | `76184bf` |
| P2-02 | 20 permissions d'APP.md | 2026-10-05 | `76184bf` |
| P2-03 | Rôles Administrateur, Secrétariat, Communication, Responsable stages, Responsable boutique | 2026-10-05 | `76184bf` |
| P2-04 | Vérification côté serveur (`has_permission`), pas d'escalade, toujours un administrateur | 2026-10-05 | `76184bf` |
| P2-11 | Journal `audit_logs` (rôles, permissions, validations de licences) | 2026-10-05 | `76184bf` |
| P2-06 | Back-office : connexion, proxy de session, menu selon les permissions | 2026-10-05 | `8e66d20` |
| P2-07 | Back-office : adhérents, validation / refus des licences | 2026-10-05 | `8e66d20` |
| P2-08 | Back-office : utilisateurs | 2026-10-05 | `8e66d20` |
| P2-09 | Back-office : rôles et permissions | 2026-10-05 | `8e66d20` |
| P2-10 | Back-office : attribution des rôles | 2026-10-05 | `8e66d20` |
| P2-05 | `my_permissions()` + hook `usePermissions` dans l'app | 2026-10-05 | `a61727f` |
| P1-19 | Licence du parent facultative : accès dès qu'une licence du compte (parent ou enfant) est en attente ou validée | 2026-10-05 | `4ccface` |
| DS-02 | Logo du club (clair / sombre) dans l'app, le splash et le back-office ; écrans de connexion centrés | 2026-10-05 | `da04539` |
| DS-03 | Animation d'introduction : logo plein écran (splash jaune) qui rejoint le bandeau de connexion | 2026-10-05 | `5a7727d` |
| P3-01 | Table `news` (brouillon / publiée) + RLS par permissions `NEWS_*` + bucket public `news-photos` (5 Mo) | 2026-10-05 | `b44f018` |
| P3-02 | Accueil : salutation, bandeau de validation, 3 dernières actualités | 2026-10-05 | `b44f018` |
| P3-03 | Liste des actualités paginée, tirer pour rafraîchir | 2026-10-05 | `b44f018` |
| P3-04 | Détail d'une actualité (photo, date, paragraphes) | 2026-10-05 | `b44f018` |
| P3-05 | Back-office : créer, modifier, publier / dépublier, supprimer une actualité avec photo | 2026-10-05 | `b44f018` |
| P4-01 | Tables `schedule_periods` (normal / vacances), `schedules` (récurrent ou exceptionnel), `schedule_cancellations` + RLS `SCHEDULE_*` | 2026-10-05 | `e3d1e7b` |
| P4-02 | Fonctions `schedule_period_on()` et `planning(du, au)` : vacances prioritaires, exceptions et annulations | 2026-10-05 | `e3d1e7b` |
| P4-03 | Mobile : écran Planning, vue du jour et de la semaine avec navigation | 2026-10-05 | `e3d1e7b` |
| P4-04 | Mobile : filtres Jeu libre / Entraînements / Vacances, créneaux exceptionnels et annulés signalés | 2026-10-05 | `e3d1e7b` |
| P4-05 | Back-office : ajouter / modifier / supprimer un créneau de la semaine | 2026-10-05 | `e3d1e7b` |
| P4-06 | Back-office : périodes (normal, vacances, dates) et aperçu des 7 prochains jours | 2026-10-05 | `e3d1e7b` |
| P4-07 | Créneaux exceptionnels, annulation d'un créneau pour une date et rétablissement | 2026-10-05 | `e3d1e7b` |
| P4-08 | ~~Image du planning~~ remplacée par l'import du fichier .xlsx du club (voir P4-10) | 2026-10-05 | `e3d1e7b` |
| P4-10 | Import du planning depuis le fichier .xlsx du club : aperçu, choix des périodes, créneaux / vacances / événements / annulations, en une transaction | 2026-10-05 | `915aeec` |
| P3-07 | Actualités testées (publication avec photo, accueil / liste / détail) | 2026-10-05 | — |
| P4-09 | Planning testé (saison, vacances, créneaux, annulations, import) | 2026-10-05 | — |
| P4-11 | Bucket `planning-images` supprimé dans le tableau de bord Supabase | 2026-10-05 | — |
| P6-02 | Tables `orders` (type, statut, provider, provider_order_id, paid_at…) et `order_items`, montants calculés par la base | 2026-10-06 | `2a76675` |
| P6-03 | Edge Function `helloasso-checkout` : commande + intention de paiement HelloAsso | 2026-10-06 | `2a76675` |
| P6-04 | Edge Functions `helloasso-webhook` et `helloasso-return` : payé uniquement après relecture auprès de l'API HelloAsso | 2026-10-06 | `2a76675` |
| P6-05 | Table `products` + back-office des articles | 2026-10-06 | `47a0af6` |
| P6-06 | Mobile : boutique (quantités, total, paiement) | 2026-10-06 | `66977a9` |
| P6-07 | Mobile : « Mes achats » (paiement en cours, à récupérer, récupéré) | 2026-10-06 | `66977a9` |
| P6-08 | Back-office : ventes à remettre, marquer comme remis | 2026-10-06 | `47a0af6` |
| P6-09 | Tables `stages`, `stage_prices`, `stage_registrations` | 2026-10-06 | `2a76675` |
| P6-10 | Back-office : créer / modifier / publier un stage et ses tarifs | 2026-10-06 | `47a0af6` |
| P6-11 | Mobile : stages à venir + détail | 2026-10-06 | `66977a9` |
| P6-12 | Mobile : inscription d'un membre (licence validée) + paiement | 2026-10-06 | `66977a9` |
| P6-13 | Capacité : places restantes, place réservée 45 min pendant le paiement, contrôle sous verrou | 2026-10-06 | `2a76675` |
| P6-14 | Mobile : « Mes inscriptions » | 2026-10-06 | `66977a9` |
| P6-15 | Back-office : inscrits d'un stage | 2026-10-06 | `47a0af6` |
| P6-16 | Back-office : liste des paiements | 2026-10-06 | `47a0af6` |
| P1-18 | Ajout d'un enfant testé (parcours mobile complet validé) | 2026-10-06 | — |
| P2-13 | Back-office testé : connexion, validation de licence, création de rôle, attribution, journal | 2026-10-06 | — |
