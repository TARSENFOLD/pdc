#!/usr/bin/env bash
# ─── PDC v2 — Deploy manual no VPS Hetzner ───────────────────────────────────
# Uso: ssh <vps> 'bash -s' < scripts/deploy-vps.sh
# Ou: copiar para /opt/pdc/scripts/deploy-vps.sh e correr localmente no VPS.

set -euo pipefail

DEPLOY_DIR="/opt/pdc"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.prod.yml"
ENV_FILE="${DEPLOY_DIR}/.env"
DEPLOY_ID="${GITHUB_SHA:-$(date -u +%Y%m%d%H%M%S)}"
ROLLBACK_DIR="${DEPLOY_DIR}/.rollback"
ROLLBACK_ACTIVE="false"

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

current_image_tag() {
  local service="$1" image_id tag
  image_id="$(docker compose -f "${COMPOSE_FILE}" images -q "${service}" 2>/dev/null | head -1 || true)"
  if [[ -z "${image_id}" ]]; then
    return 1
  fi
  tag="$(docker image inspect "${image_id}" --format '{{ range .RepoTags }}{{ . }}{{ "\n" }}{{ end }}' 2>/dev/null | head -1 || true)"
  if [[ -n "${tag}" && "${tag}" != "<none>:<none>" ]]; then
    printf '%s\n' "${tag}"
    return 0
  fi
  # Dangling/untagged image: fall back to the concrete image id so tagging succeeds.
  printf '%s\n' "${image_id}"
}

backup_images() {
  mkdir -p "${ROLLBACK_DIR}"
  : > "${ROLLBACK_DIR}/images.env"
  local backed_up="false"
  for service in api strapi; do
    local current backup
    current="$(current_image_tag "${service}" || true)"
    if [[ -z "${current}" ]]; then
      echo "[deploy-vps] AVISO: sem imagem anterior para ${service}; rollback desse serviço indisponível." >&2
      continue
    fi
    backup="pdc-${service}:rollback-${DEPLOY_ID}"
    docker image tag "${current}" "${backup}"
    printf '%s_CURRENT=%q\n%s_BACKUP=%q\n' "${service^^}" "${current}" "${service^^}" "${backup}" >> "${ROLLBACK_DIR}/images.env"
    backed_up="true"
  done
  ROLLBACK_ACTIVE="${backed_up}"
}

restore_images() {
  if [[ "${ROLLBACK_ACTIVE}" != "true" || ! -f "${ROLLBACK_DIR}/images.env" ]]; then
    return 0
  fi
  # shellcheck disable=SC1091
  source "${ROLLBACK_DIR}/images.env"
  for service in api strapi; do
    local current_var backup_var current backup
    current_var="${service^^}_CURRENT"
    backup_var="${service^^}_BACKUP"
    current="${!current_var:-}"
    backup="${!backup_var:-}"
    if [[ -n "${current}" && -n "${backup}" ]]; then
      echo "[deploy-vps] Rollback: restaurando ${service} para ${current}"
      docker image tag "${backup}" "${current}"
    fi
  done
  docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans
}

on_error() {
  local exit_code="$?"
  echo "[deploy-vps] ERRO: deploy falhou; a tentar rollback das imagens anteriores." >&2
  restore_images || true
  exit "${exit_code}"
}

trap on_error ERR

echo "[deploy-vps] A fazer pull da última imagem e rebuild..."
backup_images
docker compose -f "${COMPOSE_FILE}" pull
docker compose -f "${COMPOSE_FILE}" build

# Cleanup limitado: remove apenas imagens dangling, preservando cache de build e tags de rollback.
docker image prune -f

echo "[deploy-vps] A reiniciar serviços..."
docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans

echo "[deploy-vps] A validar health checks..."
wait_for() {
  local url="$1" service="$2" tries="${3:-24}"
  for i in $(seq 1 "${tries}"); do
    if curl -sf --max-time 5 "${url}" >/dev/null; then
      return 0
    fi
    sleep 5
  done

  echo "[deploy-vps] ERRO: Health check falhou: ${url}" >&2
  docker compose -f "${COMPOSE_FILE}" logs --tail=80 "${service}" >&2
  return 1
}

wait_for http://localhost:3001/health api
wait_for http://localhost:1337/_health strapi

echo "[deploy-vps] A limpar containers, redes e imagens dangling antigas..."
if ! docker container prune -f || ! docker network prune -f || ! docker image prune -f; then
  echo "[deploy-vps] AVISO: limpeza parcial falhou; deploy saudável mantido." >&2
fi

echo "[deploy-vps] A limpar tags de rollback antigas (mantendo 2 mais recentes)..."
for service in api strapi; do
  docker image ls --format '{{.Tag}}:{{.CreatedAt}}' "pdc-${service}" 2>/dev/null     | grep -E '^rollback-'     | sort -t ':' -k2 -r     | tail -n +3     | cut -d ':' -f1     | xargs -r -I {} docker image rm "pdc-${service}:{}" >/dev/null 2>&1 || true
done

ROLLBACK_ACTIVE="false"

echo "[deploy-vps] Deploy concluído em $(date -u +%Y-%m-%dT%H:%M:%SZ)"
