# 1. Vision de l'application

Je verrais **3 produits qui communiquent entre eux** :

```

```

```
                    ┌─────────────────────────┐
                    │       FFBaD / e-Bad     │
                    │ Licences + classements  │
                    └────────────┬────────────┘
                                 │
                                 ▼
┌─────────────────┐      ┌─────────────────────┐
│                 │      │                     │
│ App mobile      │◄────►│ Backend / API       │
│ React Native    │      │                     │
│ Expo            │      │                     │
│                 │      └──────────┬──────────┘
└─────────────────┘                 │
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                         ▼                     ▼
                  ┌─────────────┐      ┌──────────────┐
                  │ PostgreSQL  │      │ Back-office  │
                  │             │      │ Web          │
                  └─────────────┘      └──────────────┘
                         │
                         │
                ┌────────┴─────────┐
                ▼                  ▼
          ┌───────────┐      ┌─────────────┐
          │ HelloAsso │      │ Notifications│
          │ Paiements │      │ Push / Email │
          └───────────┘      └─────────────┘
```

Et surtout, **je ne mettrais aucune logique sensible directement dans l'application mobile**.

L'application serait un client de ton API.

---

# 2. L'application mobile

Je partirais sur :

- **React Native** 
- **Expo** 
- **TypeScript** 
- **Expo Router** 
- `expo-notifications` 
-  une librairie de gestion de données serveur comme TanStack Query 
-  un système de formulaires/validation 
-  stockage sécurisé du token d'authentification 

Expo est particulièrement adapté ici : EAS permet ensuite de construire et publier les applications iOS et Android, et de gérer les credentials de publication. 

### Navigation possible

```

```

```
Accueil
│
├── Actualités
│
├── Planning
│   ├── Jeu libre
│   ├── Entraînements
│   └── Vacances / créneaux exceptionnels
│
├── Boutique
│   └── Volants
│
├── Stages
│   ├── À venir
│   ├── Détail du stage
│   └── Mes inscriptions
│
├── Mon badminton
│   ├── Classements
│   ├── Évolution
│   └── Profil
│
└── Plus
    ├── Mes achats
    ├── Notifications
    └── Paramètres
```

Et selon les droits de l'utilisateur, certaines fonctionnalités peuvent apparaître.

---

# 3. Une vraie gestion des rôles

Je te conseille **de ne surtout pas faire simplement** :

```

```

```
isAdmin = true
```

Tu risques rapidement de te retrouver bloqué.

Il faut plutôt avoir un système de **permissions**.

Par exemple :

```

```

```
Permissions

NEWS_READ
NEWS_CREATE
NEWS_UPDATE
NEWS_DELETE

SCHEDULE_READ
SCHEDULE_CREATE
SCHEDULE_UPDATE
SCHEDULE_DELETE

STAGE_READ
STAGE_CREATE
STAGE_UPDATE
STAGE_DELETE
STAGE_VIEW_REGISTRATIONS

VOLANT_VIEW_SALES
VOLANT_MANAGE

MEMBER_VIEW
MEMBER_MANAGE

PAYMENT_VIEW

USER_MANAGE
ROLE_MANAGE
```

Et ensuite des rôles :

```

```

```
Administrateur
  → toutes les permissions

Communication
  → NEWS_CREATE
  → NEWS_UPDATE
  → NEWS_DELETE

Responsable stages
  → STAGE_CREATE
  → STAGE_UPDATE
  → STAGE_VIEW_REGISTRATIONS

Responsable boutique
  → VOLANT_VIEW_SALES

etc.
```

Avec 20–30 personnes susceptibles d'avoir des droits, ce système sera **beaucoup plus souple**.

---

# 4. Gestion des familles

Ta réponse concernant les enfants est importante.

Je ne ferais pas :

```

```

```
User = adhérent
```

mais plutôt :

```

```

```
Account
   │
   ├── Member
   ├── Member
   └── Member
```

Par exemple :

```

```

```
Compte de Jean Dupont

Jean Dupont
Licence : 12345678

  ├── Lucas Dupont
  │   Licence : 87654321
  │
  └── Emma Dupont
      Licence : 11223344
```

Le parent pourrait donc :

-  acheter des volants pour Lucas 
-  inscrire Emma à un stage 
-  consulter les classements des enfants 
-  etc. 

C'est une décision d'architecture qu'il vaut mieux prendre **dès le début**.

---

# 5. Inscription avec numéro de licence

Je ferais quelque chose comme :

### Étape 1

```

```

```
Créer mon compte

Email
Mot de passe

[Continuer]
```

### Étape 2

```

```

```
Numéro de licence

08XXXXXXXX

[Vérifier]
```

Ton backend interroge la FFBaD ou ta propre base de licenciés.

La FFBaD propose notamment `ws_getlicenceinfobylicence` et des fonctions permettant de récupérer les licenciés d'une instance/club. 

On pourrait donc obtenir :

```

```

```
Licence : 12345678
Nom : DUPONT
Prénom : Jean
Club : XXX
Statut : actif
```

Puis :

```

```

```
Cette licence correspond à :

Jean DUPONT

[Oui, c'est moi]
```

Cela évite qu'un utilisateur puisse simplement saisir :

```

```

```
Licence : 12345678
Nom : Jean
```

et usurper quelqu'un.

---

# 6. Mais je ne ferais pas dépendre l'inscription de la FFBaD en temps réel

Je préfère une architecture avec une **base locale des licenciés**.

Par exemple :

```

```

```
FFBaD
   ↓
Synchronisation périodique
   ↓
Notre base
   ↓
Inscription utilisateur
```

Cela permet :

-  de ne pas dépendre de la disponibilité de l'API FFBaD 
-  de contrôler précisément les adhérents du club 
-  d'avoir un historique 
-  de gérer les cas particuliers 
-  de permettre une validation manuelle 

Et surtout, ça nous permettra de dire :

> « Cette licence appartient bien à notre club. »

---

# 7. Les classements

Là, on peut faire quelque chose de vraiment sympa.

La FFBaD expose notamment des services pour récupérer les trois classements d'un licencié et l'évolution de ses classements. 

On pourrait avoir :

### Mon classement

```

```

```
             MON CLASSEMENT

Simple
┌─────────────────────────┐
│ R5                      │
│ 1584 points             │
└─────────────────────────┘

Double
┌─────────────────────────┐
│ R6                      │
│ 1432 points             │
└─────────────────────────┘

Mixte
┌─────────────────────────┐
│ D7                      │
│ 1128 points             │
└─────────────────────────┘
```

Puis :

```

```

```
Évolution

R6 ───── R6 ───── R5
                 ↑
             septembre
```

Et éventuellement plus tard :

```

```

```
Mes derniers matchs
Mes adversaires
Mes points gagnés/perdus
```

Mais je laisserais ça pour une V2.

---

# 8. Le planning

C'est un point où je pense qu'on peut améliorer considérablement l'existant.

Au lieu de conserver une image du planning comme source principale, je stockerais les créneaux **dans la base de données**.

Par exemple :

```

```

```
Lundi
18:00 → 20:00
Jeu libre

20:00 → 22:00
Entraînement
```

L'administrateur aurait :

```

```

```
Planning

Semaine normale
[Importer depuis une image]

Semaine du 20/10
[Modifier]

+ Ajouter un créneau
```

### Et pour les vacances

On pourrait avoir un système de **périodes spéciales** :

```

```

```
Planning normal
      ↓
du 01/09 au 30/06

Planning vacances
      ↓
du 20/10 au 02/11
```

L'utilisateur voit toujours simplement :

> **Aujourd'hui — lundi 20 octobre**

et l'application sait quel planning afficher.

---

# 9. Import de l'image du planning

Ton idée d'importation est intéressante.

Je ne commencerais toutefois **pas par de la reconnaissance automatique d'image**.

Dans le MVP :

```

```

```
Administration
      ↓
Importer une image
      ↓
Image du planning affichée dans l'application
```

Puis, dans une version ultérieure, on pourrait éventuellement avoir :

```

```

```
Image
 ↓
OCR / IA
 ↓
Créneaux détectés
 ↓
Validation humaine
 ↓
Planning structuré
```

Mais je ne mettrais surtout pas cette complexité dans le premier sprint.

---

# 10. Les stages

Je créerais une vraie entité `Stage`.

Par exemple :

```

```

```
Stage
────────────────────
Stage perfectionnement

12 novembre 2026
09:00 → 17:00

16 places

Adhérent : 35 €
Non adhérent : 50 €
Jeune : 25 €

[ S'inscrire ]
```

Puis :

```

```

```
Inscription

Jean Dupont
Stage : Perfectionnement
Tarif : Adhérent
Prix : 35 €

[ Payer ]
```

L'application lance alors le paiement HelloAsso.

---

# 11. HelloAsso est une très bonne piste

Je suis plutôt rassuré sur ce point.

L'API actuelle de HelloAsso permet de créer un **Checkout**, de rediriger l'utilisateur vers la page de paiement, puis de recevoir un webhook lorsque le paiement est réellement effectué. 

C'est exactement le fonctionnement que je voudrais.

### Important

Je ne ferais **jamais** :

```

```

```
Utilisateur revient dans l'application
        ↓
"success=true"
        ↓
On considère que c'est payé
```

HelloAsso indique justement que ce mécanisme n'est pas suffisamment fiable.

À la place :

```

```

```
App
 ↓
Backend
 ↓
HelloAsso Checkout
 ↓
Paiement
 ↓
Webhook HelloAsso
 ↓
Backend
 ↓
Payment = PAID
 ↓
Notification
 ↓
App
```

HelloAsso recommande les webhooks pour cette réconciliation. 

---

# 12. Les volants

Même système.

```

```

```
Boutique

Tube de volants
25 €

Quantité
[-] 1 [+]

Total : 25 €

[Payer avec HelloAsso]
```

Après paiement :

```

```

```
Mes achats

✓ Tube de volants
25 €
05/10/2026

À récupérer
```

Et côté administration :

```

```

```
Ventes de volants

Jean Dupont     2 tubes    50 €
Paul Martin     1 tube    25 €
...
```

Pas besoin de gestion de stock pour la V1.

---

# 13. Les notifications

Je recommande clairement les notifications push.

Par exemple :

> 🏸 Nouvelle actualité  
>  Le tournoi interne aura lieu le 15 novembre !

ou :

> 🏸 Entraînement annulé  
>  L'entraînement de mardi 20h est exceptionnellement annulé.

Expo fournit `expo-notifications` pour gérer les notifications iOS/Android et son service permet de les envoyer depuis ton backend. 

On pourra donc avoir dans l'administration :

```

```

```
Publier une actualité

Titre
Photo
Contenu

☑ Envoyer une notification push

[Publier]
```

Très simple pour les responsables du club.

---

# 14. Brevo

Je conserverais également **Brevo** pour les emails.

Par exemple :

```

```

```
Bienvenue dans l'application
```

```

```

```
Votre paiement a bien été reçu
```

```

```

```
Vous êtes inscrit au stage
```

```

```

```
Votre compte a été validé
```

L'application pourrait donc utiliser :

```

```

```
Push → communication rapide

Email → informations importantes / confirmation
```

---

# 15. Le back-office

À mon avis, c'est **le deuxième produit le plus important après l'application mobile**.

Je ferais une application web :

```

```

```
admin.nomduclub.fr
```

Avec une interface du genre :

```

```

```
┌────────────────────────────────────────────┐
│ 🏸 Club Badminton                          │
├──────────────┬─────────────────────────────┤
│              │                             │
│ Tableau de   │  Bonjour Jean 👋            │
│ bord         │                             │
│              │                             │
│ Actualités   │  487 adhérents              │
│ Planning     │  3 stages ouverts            │
│ Stages       │  12 ventes aujourd'hui      │
│ Volants      │                             │
│ Adhérents    │                             │
│ Paiements    │                             │
│ Utilisateurs │                             │
│ Paramètres   │                             │
│              │                             │
└──────────────┴─────────────────────────────┘
```

---

# 16. La stack que je choisirais

Comme tu développes seul et que tu n'as pas encore d'expérience React/TypeScript/Node, je chercherais **à limiter le nombre de technologies différentes**.

### Mobile

**React Native + Expo + TypeScript**

### Web admin

**Next.js + TypeScript**

Pourquoi Next.js plutôt qu'une autre solution ?

Parce que tu vas apprendre :

```

```

```
TypeScript
React
```

et réutiliser énormément de connaissances entre :

```

```

```
React Native
      ↕
React / Next.js
```

### Backend

Je partirais sur :

**NestJS + TypeScript**

ou, si on veut énormément simplifier le démarrage :

**Supabase**

Et là, il y a un choix architectural important.

---

# 17. Supabase ou backend NestJS ?

Pour ton projet, je serais tenté de commencer avec **Supabase**.

Tu as besoin de :

-  PostgreSQL 
-  authentification 
-  stockage des photos 
-  API 
-  sécurité 
-  temps réel éventuellement 

Supabase peut couvrir une grande partie de ça.

On aurait :

```

```

```
Expo
  │
  ▼
Supabase
  │
  ├── PostgreSQL
  ├── Auth
  ├── Storage
  └── Edge Functions
```

Puis les intégrations externes :

```

```

```
                ┌── FFBaD
                │
Supabase ───────┼── HelloAsso
                │
                ├── Brevo
                │
                └── Expo Push
```

Cela permettrait de **ne pas construire un backend complet avant d'avoir une application**.

En revanche, si l'intégration FFBaD/HelloAsso devient très complexe, on pourra ajouter un backend dédié.

---

# 18. Architecture que je recommande pour démarrer

Je partirais donc sur :

```

```

```
                ┌───────────────────────┐
                │      Expo App         │
                │   React Native        │
                │     TypeScript        │
                └───────────┬───────────┘
                            │
                            │ API
                            ▼
                ┌───────────────────────┐
                │       Supabase        │
                │                       │
                │ PostgreSQL            │
                │ Auth                  │
                │ Storage               │
                │ Edge Functions        │
                └───────┬───────┬───────┘
                        │       │
              ┌─────────┘       └──────────┐
              ▼                            ▼
        ┌───────────┐                 ┌───────────┐
        │ FFBaD     │                 │ HelloAsso │
        └───────────┘                 └───────────┘

                        ▲
                        │
                ┌───────┴────────┐
                │   Next.js       │
                │ Back-office     │
                └─────────────────┘
```

---

# 19. Modèle de données initial

On pourrait avoir quelque chose comme :

```

```

```
accounts
────────────
id
email
phone
created_at


members
────────────
id
account_id
license_number
first_name
last_name
is_active
created_at


roles
────────────
id
name


permissions
────────────
id
name


role_permissions
────────────
role_id
permission_id


account_roles
────────────
account_id
role_id
```

Puis :

```

```

```
news
────────────
id
title
content
image_url
published_at
author_id


schedules
────────────
id
date
start_time
end_time
type
title
is_cancelled


schedule_periods
────────────
id
name
start_date
end_date
```

Et :

```

```

```
stages
────────────
id
title
description
start_at
end_at
capacity
image_url


stage_prices
────────────
id
stage_id
name
amount


stage_registrations
────────────
id
stage_id
member_id
stage_price_id
payment_status
```

Enfin :

```

```

```
products
────────────
id
name
price
active


orders
────────────
id
account_id
total
status
helloasso_id


order_items
────────────
id
order_id
product_id
quantity
unit_price
```

Et :

```

```

```
rankings
────────────
id
member_id
discipline
ranking
points
updated_at
```

---

# 20. Une chose importante : historique des paiements

Je garderais **notre propre historique**, même si HelloAsso reste la source du paiement.

Exemple :

```

```

```
orders

id
account_id
type
total
status
provider
provider_order_id
created_at
paid_at
```

Avec :

```

```

```
provider = HELLOASSO
```

Cela permettra demain de remplacer HelloAsso si nécessaire sans réécrire toute l'application.

---

# 21. RGPD et sécurité

Comme on manipule :

-  identité 
-  email 
-  téléphone 
-  numéro de licence 
-  paiements 
-  potentiellement données de mineurs 

il faudra intégrer le RGPD **dès la conception**, pas à la fin.

En particulier :

-  minimiser les données stockées 
-  ne jamais stocker les données bancaires 
-  mots de passe gérés par le système d'authentification 
-  permissions côté serveur 
-  journalisation des actions administratives 
-  possibilité de supprimer/exporter les données 
-  politique de confidentialité 
-  gestion des comptes des mineurs 

Et surtout :

> **L'application mobile ne doit jamais décider elle-même qu'un utilisateur est administrateur.**

Elle demande au backend ce que l'utilisateur a le droit de faire.

---

# 22. La roadmap que je te recommande

Je **ne commencerais surtout pas** par les paiements.

### Phase 0 — Fondation

Créer :

```

```

```
GitHub
│
├── mobile/
│
├── admin/
│
└── supabase/
```

Mettre en place :

-  TypeScript 
-  Expo 
-  Next.js 
-  Supabase 
-  environnements dev/prod 
-  CI/CD 
-  variables d'environnement 
-  architecture du projet 

---

## Phase 1 — Authentification

Objectif :

> Un adhérent peut créer son compte et se connecter.

Fonctionnalités :

-  inscription 
-  email 
-  mot de passe 
-  vérification email 
-  licence 
-  vérification club 
-  connexion 
-  déconnexion 
-  mot de passe oublié 
-  profil 

Puis :

```

```

```
Compte
 └── Membres
      ├── Jean
      ├── Lucas
      └── Emma
```

---

# Phase 2 — Back-office utilisateurs

Avant même les actualités.

Créer :

```

```

```
/administration

Adhérents
Utilisateurs
Rôles
Permissions
```

Et pouvoir :

```

```

```
Créer un rôle
Ajouter des permissions
Attribuer un rôle
```

Une fois ça terminé, **toutes les fonctionnalités suivantes pourront utiliser le même système de permissions.**

---

# Phase 3 — Actualités

Mobile :

```

```

```
Accueil
 ↓
Actualités
```

Admin :

```

```

```
Créer
Modifier
Publier
Supprimer
```

Puis :

```

```

```
☑ Envoyer une notification push
```

---

# Phase 4 — Planning

Créer le planning structuré.

Puis :

```

```

```
Planning normal
Planning vacances
Créneaux exceptionnels
Annulation
```

L'import d'image peut être ajouté dès cette phase, mais comme une **fonction complémentaire**, pas comme la source principale.

---

# Phase 5 — Classements

Synchronisation FFBaD.

```

```

```
Licence
 ↓
FFBaD
 ↓
Classements
 ↓
Base locale
 ↓
Application
```

Je ferais une synchronisation périodique plutôt qu'une requête FFBaD à chaque ouverture de l'application.

---

# Phase 6 — HelloAsso

Une fois le reste stable :

### Volants

```

```

```
Produit
 ↓
Commande
 ↓
HelloAsso
 ↓
Webhook
 ↓
Commande PAYÉE
```

### Stages

```

```

```
Stage
 ↓
Tarif
 ↓
Inscription
 ↓
HelloAsso
 ↓
Webhook
 ↓
Inscription confirmée
```

---

# Phase 7 — Notifications

On ajoute :

-  nouvelle actualité 
-  stage ouvert 
-  inscription confirmée 
-  paiement confirmé 
-  créneau annulé 
-  éventuellement rappel de stage 

Expo permet de gérer les push iOS/Android via `expo-notifications`, avec l'envoi déclenché depuis le serveur. 

---

# Phase 8 — Publication

Enfin :

```

```

```
Apple Developer
Google Play Console
        ↓
EAS Build
        ↓
TestFlight
        ↓
Google Internal Testing
        ↓
Production
```

EAS est justement conçu pour construire les binaires Android/iOS et automatiser une partie de la distribution. 

---

# 23. Ce que je ferais comme premier MVP

Je réduirais le premier objectif à :

### 📱 Application

```

```

```
Accueil
│
├── Actualités
│
├── Planning
│
├── Stages
│
└── Mon profil
     └── Classements
```

### 🖥️ Administration

```

```

```
Dashboard
│
├── Actualités
├── Planning
├── Stages
├── Adhérents
├── Utilisateurs
└── Rôles / permissions
```

### 🔐 Authentification

```

```

```
Email
+
Mot de passe
+
Numéro de licence
```

### 🏸 FFBaD

```

```

```
Licence
 ↓
Vérification
 ↓
Classement
```

**Pas encore de paiement.**

Une fois cette version fonctionnelle, on aura déjà une véritable application du club utilisable par 500 adhérents.

Puis :

```

```

```
                    MVP
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
       Volants                Stages
          │                     │
          └──────────┬──────────┘
                     ▼
                 HelloAsso
                     │
                     ▼
               Notifications
```

---

# 24. Et surtout : je te conseille de ne pas tout coder d'un coup

Comme tu m'as dit **« je n'en ai pas [d'expérience React/TypeScript] »**, je pense qu'on peut transformer ce projet en un excellent projet d'apprentissage.

Je te proposerais de le construire ensemble **fonctionnalité par fonctionnalité**, plutôt que de te donner 15 000 lignes de code.

Par exemple, notre première étape pourrait être :

```

```

```
Étape 1
Créer le projet Expo
        ↓
Étape 2
Créer le projet Next.js
        ↓
Étape 3
Créer le projet Supabase
        ↓
Étape 4
Créer la première table
        ↓
Étape 5
Créer l'inscription
        ↓
Étape 6
Faire communiquer Expo ↔ Supabase
```

À chaque étape, je peux t'expliquer **ce qu'on fait, pourquoi on le fait, où placer le code et comment tester**.

### Ma recommandation finale

Pour ton contexte, je choisirais donc :


| Élément     | Choix                     |
| ----------- | ------------------------- |
| Mobile      | **React Native + Expo**   |
| Langage     | **TypeScript**            |
| Navigation  | **Expo Router**           |
| Données     | **PostgreSQL / Supabase** |
| Auth        | **Supabase Auth**         |
| Photos      | **Supabase Storage**      |
| Back-office | **Next.js**               |
| Paiement    | **HelloAsso Checkout**    |
| Classements | **Webservices FFBaD**     |
| Email       | **Brevo**                 |
| Push        | **Expo Notifications**    |
| Build       | **EAS**                   |
| iOS         | App Store                 |
| Android     | Google Play               |


