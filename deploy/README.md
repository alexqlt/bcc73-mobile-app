# Déploiement du back-office (VPS OVH)

Le back-office (`admin/`) tourne sur le VPS OVH `vps-9a6368a1.vps.ovh.net` (Ubuntu 26.04, IP `57.129.174.240`) :

- **Docker** : image `bcc73-admin` (Next.js `output: "standalone"`, voir `admin/Dockerfile`).
- **Caddy** devant, avec certificat HTTPS Let's Encrypt automatique (`deploy/Caddyfile`).
- Dossier sur le serveur : `/opt/bcc73-admin` (`compose.yml`, `Caddyfile`, `.env`).
- Pare-feu `ufw` : 22, 80, 443 ouverts ; `fail2ban` sur SSH ; mises à jour de sécurité automatiques.

Les variables `NEXT_PUBLIC_SUPABASE_*` sont **intégrées au build** de l'image : changer de projet Supabase (dev → prod) demande un nouveau déploiement.

## Domaine

Le domaine servi est dans `/opt/bcc73-admin/.env` sur le serveur :

```bash
ADMIN_DOMAIN=vps-9a6368a1.vps.ovh.net
```

Pour passer sur `admin.bcc73.com` (P2-12) :

1. Zone DNS de `bcc73.com` : `admin` en `A` → `57.129.174.240` et `AAAA` → `2001:41d0:801:2000::3b1b`.
2. Sur le serveur : `ADMIN_DOMAIN=admin.bcc73.com` dans `.env`, puis `docker compose up -d` (Caddy obtient le certificat tout seul).
3. Dans GitHub, variable `ADMIN_URL_HOST` = `admin.bcc73.com`.
4. Côté app mobile : `EXPO_PUBLIC_ADMIN_URL=https://admin.bcc73.com` dans les environnements EAS.

## Déploiement automatique (GitHub Actions)

`.github/workflows/deploy-admin.yml` construit l'image et la déploie à chaque push sur `main` touchant `admin/` ou `deploy/` (ou à la main : onglet Actions → « Déploiement back-office » → Run workflow).

Configuration une fois pour toutes, dans GitHub → Settings → Environments → `production` :

| Type | Nom | Valeur |
|------|-----|--------|
| Secret | `VPS_SSH_KEY` | clé privée SSH dédiée au déploiement (voir ci-dessous) |
| Secret | `VPS_KNOWN_HOSTS` | sortie de `ssh-keyscan -t ed25519 vps-9a6368a1.vps.ovh.net` |
| Variable | `VPS_HOST` | `vps-9a6368a1.vps.ovh.net` |
| Variable | `VPS_USER` | `ubuntu` |
| Variable | `ADMIN_URL_HOST` | `vps-9a6368a1.vps.ovh.net` (puis `admin.bcc73.com`) |
| Variable | `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase (dev pour l'instant) |
| Variable | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clé publishable du même projet |

Clé de déploiement (sur ton poste) :

```bash
ssh-keygen -t ed25519 -f bcc73_deploy -N "" -C "github-actions@bcc73-admin"
# bcc73_deploy.pub → ajouter à /home/ubuntu/.ssh/authorized_keys sur le VPS
# bcc73_deploy     → contenu dans le secret VPS_SSH_KEY, puis supprimer le fichier local
```

## Commandes utiles sur le serveur

```bash
cd /opt/bcc73-admin
docker compose ps                 # état
docker compose logs -f admin      # logs Next.js
docker compose logs -f caddy      # logs HTTPS / proxy
docker compose restart admin      # redémarrer le back-office
```
