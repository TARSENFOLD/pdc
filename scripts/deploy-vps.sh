#!/usr/bin/env bash
# ─── PDC v2 — Deploy manual no VPS Hetzner ───────────────────────────────────
# Uso: ssh <vps> 'bash -s' < scripts/deploy-vps.sh
# Ou: copiar para /opt/pdc/scripts/deploy-vps.sh e correr localmente no VPS.

set -euo pipefail

DEPLOY_DIR="/opt/pdc"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.prod.yml"
ENV_FILE="${DEPLOY_DIR}/.env"

echo "[deploy-vps] A iniciar deploy em $(date -u +%Y-%m-%dT%H:%M:%SZ)"

cd "${DEPLOY_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "[deploy-vps] ERRO: ${ENV_FILE} não encontrado." >&2
  exit 1
fi

# Garantir que o Docker Compose plugin está disponível
if ! docker compose version >/dev/null 2>&1; then
  echo "[deploy-vps] ERRO: Docker Compose plugin não encontrado." >&2
  exit 1
fi

echo "[deploy-vps] A fazer pull da última imagem e rebuild..."
docker compose -f "${COMPOSE_FILE}" pull
docker compose -f "${COMPOSE_FILE}" build --no-cache

echo "[deploy-vps] A reiniciar serviços..."
docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans

echo "[deploy-vps] A limpar imagens e containers antigos..."
docker system prune -af --volumes=false

echo "[deploy-vps] A validar health checks..."
sleep 10
if ! curl -sf http://localhost:3001/health >/dev/null; then
  echo "[deploy-vps] AVISO: Health check do BFF falhou imediatamente. Verificar logs." >&2
  docker compose -f "${COMPOSE_FILE}" logs --tail=50 api
fi

echo "[deploy-vps] Deploy concluído em $(date -u +%Y-%m-%dT%H:%M:%SZ)"
