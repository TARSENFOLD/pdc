#!/usr/bin/env bash
# PDC v2 - Deploy manual no VPS Hetzner
# Uso no VPS: RELEASE_SHA=<sha-completo> bash scripts/deploy-vps.sh

set -Eeuo pipefail

DEPLOY_DIR="/opt/pdc"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.prod.yml"
ENV_FILE="${DEPLOY_DIR}/.env"
MODE="${1:-deploy}"
RELEASE_SHA="${RELEASE_SHA:-${GITHUB_SHA:-}}"
RELEASE_DATE="${RELEASE_DATE:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
ROLLBACK_DIR="${DEPLOY_DIR}/.rollback"
ROLLBACK_ACTIVE="false"

if [[ ! "${RELEASE_SHA}" =~ ^[0-9a-fA-F]{40}$ ]]; then
  if [[ "${MODE}" == "diagnostics" ]]; then
    RELEASE_SHA="diagnostics-unlabelled"
  else
    echo "[deploy-vps] ERRO: RELEASE_SHA deve ser o SHA Git completo de 40 caracteres." >&2
    exit 1
  fi
fi

DEPLOY_ID="${RELEASE_SHA:0:12}"
export RELEASE_SHA RELEASE_DATE

echo "[deploy-vps] Release ${RELEASE_SHA} iniciada em ${RELEASE_DATE}"

cd "${DEPLOY_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "[deploy-vps] ERRO: ${ENV_FILE} nao encontrado." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[deploy-vps] ERRO: Docker Compose plugin nao encontrado." >&2
  exit 1
fi

compose() {
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
}

redis_requires_recreate() {
  local container_id current_hash desired_hash
  container_id="$(compose ps -q redis 2>/dev/null | head -1 || true)"
  if [[ -z "${container_id}" ]]; then
    return 0
  fi

  current_hash="$(docker inspect --format='{{ index .Config.Labels "com.docker.compose.config-hash" }}' "${container_id}" 2>/dev/null || true)"
  desired_hash="$(compose config --hash redis 2>/dev/null | awk '$1 == "redis" { print $2; exit }')"
  [[ -z "${current_hash}" || -z "${desired_hash}" || "${current_hash}" != "${desired_hash}" ]]
}

ensure_redis_service() {
  if redis_requires_recreate; then
    echo "[deploy-vps] Redis ausente ou com configuração alterada; a aplicar mudança."
    compose up -d redis
  else
    echo "[deploy-vps] Redis sem alterações; container existente preservado."
    compose up -d --no-recreate redis
  fi
}

# shellcheck source=scripts/lib/deploy-vps-health.sh
source "${DEPLOY_DIR}/scripts/lib/deploy-vps-health.sh"

current_image_tag() {
  local service="$1" container_id image_id tag
  container_id="$(compose ps -q "${service}" 2>/dev/null | head -1 || true)"
  if [[ -n "${container_id}" ]]; then
    tag="$(docker inspect --format='{{.Config.Image}}' "${container_id}" 2>/dev/null || true)"
    if [[ -n "${tag}" ]]; then
      printf '%s\n' "${tag}"
      return 0
    fi
  fi

  image_id="$(compose images -q "${service}" 2>/dev/null | head -1 || true)"
  if [[ -z "${image_id}" ]]; then
    return 1
  fi

  tag="$(docker image inspect "${image_id}" --format '{{ range .RepoTags }}{{ . }}{{ "\n" }}{{ end }}' 2>/dev/null | head -1 || true)"
  if [[ -n "${tag}" && "${tag}" != "<none>:<none>" ]]; then
    printf '%s\n' "${tag}"
    return 0
  fi

  printf '%s\n' "${image_id}"
}

backup_images() {
  mkdir -p "${ROLLBACK_DIR}"
  : > "${ROLLBACK_DIR}/images.env"

  local backed_up="false" service current backup previous_sha previous_date
  local rollback_release_sha="" rollback_release_date=""
  for service in api strapi; do
    current="$(current_image_tag "${service}" || true)"
    if [[ -z "${current}" ]]; then
      echo "[deploy-vps] AVISO: sem imagem anterior para ${service}; rollback desse servico indisponivel." >&2
      continue
    fi

    backup="pdc-${service}:rollback-${DEPLOY_ID}"
    docker image tag "${current}" "${backup}"
    printf '%s_CURRENT=%q\n%s_BACKUP=%q\n' "${service^^}" "${current}" "${service^^}" "${backup}" >> "${ROLLBACK_DIR}/images.env"

    previous_sha="$(docker image inspect "${current}" --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' 2>/dev/null || true)"
    previous_date="$(docker image inspect "${current}" --format '{{ index .Config.Labels "org.opencontainers.image.created" }}' 2>/dev/null || true)"
    if [[ "${previous_sha}" == "<no value>" ]]; then
      previous_sha=""
    fi
    if [[ "${previous_date}" == "<no value>" ]]; then
      previous_date=""
    fi
    if [[ -z "${rollback_release_sha}" && -n "${previous_sha}" ]]; then
      rollback_release_sha="${previous_sha}"
    fi
    if [[ -z "${rollback_release_date}" && -n "${previous_date}" ]]; then
      rollback_release_date="${previous_date}"
    fi

    backed_up="true"
  done

  # Releases anteriores a este contrato nao possuem labels OCI recuperaveis.
  rollback_release_sha="${rollback_release_sha:-legacy-unlabelled}"
  rollback_release_date="${rollback_release_date:-unknown}"
  printf 'ROLLBACK_RELEASE_SHA=%q\nROLLBACK_RELEASE_DATE=%q\n' \
    "${rollback_release_sha}" \
    "${rollback_release_date}" >> "${ROLLBACK_DIR}/images.env"

  ROLLBACK_ACTIVE="${backed_up}"
}

restore_images() {
  if [[ "${ROLLBACK_ACTIVE}" != "true" || ! -f "${ROLLBACK_DIR}/images.env" ]]; then
    echo "[deploy-vps] Rollback indisponivel: nenhuma imagem anterior foi preservada." >&2
    return 1
  fi

  # shellcheck disable=SC1091
  source "${ROLLBACK_DIR}/images.env"

  RELEASE_SHA="${ROLLBACK_RELEASE_SHA}"
  RELEASE_DATE="${ROLLBACK_RELEASE_DATE}"
  export RELEASE_SHA RELEASE_DATE

  local service current_var backup_var current backup
  for service in api strapi; do
    current_var="${service^^}_CURRENT"
    backup_var="${service^^}_BACKUP"
    current="${!current_var:-}"
    backup="${!backup_var:-}"
    if [[ -n "${current}" && -n "${backup}" ]]; then
      echo "[deploy-vps] Rollback: restaurando ${service} para ${current}"
      docker image tag "${backup}" "${current}" || return 1
    fi
  done

  ensure_redis_service || return 1
  compose up -d --remove-orphans --force-recreate strapi api || return 1
}

on_error() {
  local exit_code="$?"
  trap - ERR

  echo "[deploy-vps] ERRO: deploy falhou; a recolher diagnostico e tentar rollback." >&2
  collect_diagnostics

  if restore_images && validate_stack_health 24 12; then
    echo "[deploy-vps] Rollback concluido e validado como saudavel." >&2
  else
    echo "[deploy-vps] ERRO: rollback ausente ou sem saude comprovada." >&2
    collect_diagnostics
  fi

  exit "${exit_code}"
}

if [[ "${MODE}" == "diagnostics" ]]; then
  collect_diagnostics
  exit 0
fi

if [[ "${MODE}" != "deploy" ]]; then
  echo "[deploy-vps] ERRO: modo desconhecido: ${MODE}." >&2
  exit 2
fi

trap on_error ERR

echo "[deploy-vps] A validar configuracao Docker Compose..."
compose config --quiet

echo "[deploy-vps] A preservar imagens atuais..."
backup_images

echo "[deploy-vps] A atualizar imagens base e construir release ${RELEASE_SHA}..."
compose pull
compose build

# Remove apenas imagens dangling; tags de rollback permanecem preservadas.
docker image prune -f

echo "[deploy-vps] A reiniciar servicos..."
compose up -d --remove-orphans traefik
ensure_redis_service
compose up -d --remove-orphans --force-recreate strapi api

echo "[deploy-vps] A validar saude nativa, interna e externa..."
validate_stack_health 30 18

echo "[deploy-vps] A limpar containers, redes e imagens dangling antigas..."
if ! docker container prune -f || ! docker network prune -f || ! docker image prune -f; then
  echo "[deploy-vps] AVISO: limpeza parcial falhou; deploy saudavel mantido." >&2
fi

echo "[deploy-vps] A limpar tags de rollback antigas (mantendo 2 mais recentes)..."
for service in api strapi; do
  docker image ls --format '{{.Tag}}:{{.CreatedAt}}' "pdc-${service}" 2>/dev/null \
    | grep -E '^rollback-' \
    | sort -t ':' -k2 -r \
    | tail -n +3 \
    | cut -d ':' -f1 \
    | xargs -r -I {} docker image rm "pdc-${service}:{}" >/dev/null 2>&1 || true
done

ROLLBACK_ACTIVE="false"

echo "[deploy-vps] Release ${RELEASE_SHA} concluida em $(date -u +%Y-%m-%dT%H:%M:%SZ)"
