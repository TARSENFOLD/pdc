#!/usr/bin/env bash
# ─── PDC v2 — Setup inicial do VPS Hetzner ──────────────────────────────────
# Uso: correr como root no VPS uma única vez.
# O utilizador cj deve já existir e ter acesso SSH.

set -euo pipefail

PDC_USER="cj"
DEPLOY_DIR="/opt/pdc"

echo "[setup-vps] A criar diretório de deploy ${DEPLOY_DIR}..."
mkdir -p "${DEPLOY_DIR}"
chown "${PDC_USER}:${PDC_USER}" "${DEPLOY_DIR}"

echo "[setup-vps] A instalar Docker (se ainda não estiver instalado)..."
if ! command -v docker &>/dev/null; then
  apt update
  apt install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt update
  apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
usermod -aG docker "${PDC_USER}"

echo "[setup-vps] A configurar firewall (UFW) — apenas 22, 80, 443..."
if ! command -v ufw &>/dev/null; then
  apt update
  apt install -y ufw || {
    echo "[setup-vps] ERRO: não foi possível instalar UFW. Firewall não configurado." >&2
    exit 1
  }
fi

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "[setup-vps] A criar ficheiro de env de exemplo em ${DEPLOY_DIR}/.env.example..."
if [[ -f ".env.hetzner.example" ]]; then
  cp .env.hetzner.example "${DEPLOY_DIR}/.env.example"
  chown "${PDC_USER}:${PDC_USER}" "${DEPLOY_DIR}/.env.example"
  echo "[setup-vps] Template copiado de .env.hetzner.example."
else
cat <<EOENV > "${DEPLOY_DIR}/.env.example"
# Copiar para ${DEPLOY_DIR}/.env e preencher com valores reais
NODE_ENV=production
PORT=3001
API_URL=https://api.usepdc.com
FRONTEND_URL=https://usepdc.com
STRAPI_URL=https://cms.usepdc.com
STRAPI_API_TOKEN=<token>
JWT_SECRET=<secret>
DATABASE_URL=<neon-url>
DATABASE_SSL=true
APP_KEYS=<k1>,<k2>,<k3>,<k4>
API_TOKEN_SALT=<salt>
ADMIN_JWT_SECRET=<secret>
TRANSFER_TOKEN_SALT=<salt>
ENCRYPTION_KEY=<secret>
UPSTASH_REDIS_REST_URL=<url>
UPSTASH_REDIS_REST_TOKEN=<token>
R2_ACCOUNT_ID=<id>
R2_ACCESS_KEY_ID=<key>
R2_SECRET_ACCESS_KEY=<secret>
R2_BUCKET=pdc-media
R2_PUBLIC_URL=<url>
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=<key>
SENTRY_DSN=<dsn>
RESEND_API_KEY=<key>
RESEND_FROM_EMAIL=no-reply@usepdc.com
EOENV
fi

echo "[setup-vps] Setup concluído. Cria ${DEPLOY_DIR}/.env e corre 'docker compose up -d'."
