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

is_valid_release_date() {
  local value="$1" normalized
  [[ "${value}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]] || return 1
  normalized="$(date -u -d "${value}" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null)" || return 1
  [[ "${normalized}" == "${value}" ]]
}

if [[ ! "${RELEASE_SHA}" =~ ^[0-9a-fA-F]{40}$ ]]; then
  if [[ "${MODE}" == "diagnostics" ]]; then
    RELEASE_SHA="diagnostics-unlabelled"
  else
    echo "[deploy-vps] ERRO: RELEASE_SHA deve ser o SHA Git completo de 40 caracteres." >&2
    exit 1
  fi
fi

if ! is_valid_release_date "${RELEASE_DATE}"; then
  echo "[deploy-vps] ERRO: RELEASE_DATE deve usar UTC no formato YYYY-MM-DDTHH:MM:SSZ." >&2
  exit 1
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
    if [[ -n "${tag}" && "${tag}" != "<none>:<none>" ]]; then
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

  echo "[deploy-vps] ERRO: ${service} usa imagem sem tag; rollback seguro indisponivel." >&2
  return 2
}

current_image_id() {
  local service="$1" fallback_ref="$2" container_id image_id
  container_id="$(compose ps -q "${service}" 2>/dev/null | head -1 || true)"
  if [[ -n "${container_id}" ]]; then
    image_id="$(docker inspect --format='{{.Image}}' "${container_id}" 2>/dev/null || true)"
  elif [[ -n "${fallback_ref}" ]]; then
    image_id="$(docker image inspect --format='{{.Id}}' "${fallback_ref}" 2>/dev/null || true)"
  else
    return 1
  fi
  if [[ ! "${image_id}" =~ ^sha256:[0-9a-f]{64}$ ]]; then
    echo "[deploy-vps] ERRO: ${service} não possui image ID imutável verificável." >&2
    return 2
  fi
  printf '%s\n' "${image_id}"
}

backup_images() {
  mkdir -p "${ROLLBACK_DIR}"
  : > "${ROLLBACK_DIR}/images.env"

  local service current current_status source_id source_status backup backup_id previous_sha previous_date
  local rollback_release_sha="" rollback_release_date=""
  declare -A current_images=()
  declare -A source_image_ids=()
  declare -A previous_shas=()
  declare -A previous_dates=()

  # O rollback recebe uma única identidade de release. Validar a proveniência
  # antes de criar tags evita misturar API e Strapi de releases diferentes.
  for service in api strapi; do
    if current="$(current_image_tag "${service}")"; then
      current_status=0
    else
      current_status="$?"
      if [[ "${current_status}" -eq 2 ]]; then
        return 1
      fi
      current=""
    fi
    current_images["${service}"]="${current}"
    if [[ -n "${current}" ]]; then
      if source_id="$(current_image_id "${service}" "${current}")"; then
        source_status=0
      else
        source_status="$?"
        if [[ "${source_status}" -eq 2 ]]; then
          return 1
        fi
        echo "[deploy-vps] ERRO: ${service} não possui container para identificar a imagem." >&2
        return 1
      fi
      source_image_ids["${service}"]="${source_id}"
    else
      source_image_ids["${service}"]=""
    fi
  done

  if [[ -z "${current_images[api]}" && -z "${current_images[strapi]}" ]]; then
    echo "[deploy-vps] Instalação inicial: nenhuma imagem anterior para rollback."
    ROLLBACK_ACTIVE="false"
    return 0
  fi
  if [[ -z "${current_images[api]}" || -z "${current_images[strapi]}" ]]; then
    echo "[deploy-vps] ERRO: apenas um serviço tem imagem anterior; deploy parcial recusado." >&2
    return 1
  fi

  for service in api strapi; do
    current="${current_images[${service}]}"
    source_id="${source_image_ids[${service}]}"

    previous_sha="$(docker image inspect "${source_id}" --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' 2>/dev/null || true)"
    previous_date="$(docker image inspect "${source_id}" --format '{{ index .Config.Labels "org.opencontainers.image.created" }}' 2>/dev/null || true)"
    if [[ "${previous_sha}" == "<no value>" ]]; then
      previous_sha=""
    fi
    if [[ "${previous_date}" == "<no value>" ]]; then
      previous_date=""
    fi
    if [[ ! "${previous_sha}" =~ ^[0-9a-fA-F]{40}$ ]]; then
      echo "[deploy-vps] ERRO: ${service} não possui uma revisão OCI verificável; rollback seguro indisponível." >&2
      return 1
    fi
    if ! is_valid_release_date "${previous_date}"; then
      echo "[deploy-vps] ERRO: ${service} não possui uma data OCI verificável; rollback seguro indisponível." >&2
      return 1
    fi
    previous_shas["${service}"]="${previous_sha}"
    previous_dates["${service}"]="${previous_date}"
  done

  if [[ "${previous_shas[api]}" != "${previous_shas[strapi]}" ]]; then
    echo "[deploy-vps] ERRO: API e Strapi pertencem a revisoes diferentes; rollback misto recusado." >&2
    return 1
  fi
  if [[ "${previous_dates[api]}" != "${previous_dates[strapi]}" ]]; then
    echo "[deploy-vps] ERRO: API e Strapi têm datas de release diferentes; rollback misto recusado." >&2
    return 1
  fi
  rollback_release_sha="${previous_shas[api]}"
  rollback_release_date="${previous_dates[api]}"

  for service in api strapi; do
    current="${current_images[${service}]}"
    source_id="${source_image_ids[${service}]}"
    backup="pdc-${service}:rollback-${DEPLOY_ID}"
    docker image tag "${source_id}" "${backup}"
    backup_id="$(docker image inspect "${backup}" --format '{{.Id}}' 2>/dev/null || true)"
    if [[ "${backup_id}" != "${source_id}" ]]; then
      echo "[deploy-vps] ERRO: tag de rollback de ${service} não aponta para a imagem imutável esperada." >&2
      return 1
    fi
    printf '%s_CURRENT=%q\n%s_SOURCE=%q\n%s_BACKUP=%q\n' \
      "${service^^}" "${current}" \
      "${service^^}" "${source_id}" \
      "${service^^}" "${backup}" >> "${ROLLBACK_DIR}/images.env"
  done

  printf 'ROLLBACK_RELEASE_SHA=%q\nROLLBACK_RELEASE_DATE=%q\n' \
    "${rollback_release_sha}" \
    "${rollback_release_date}" >> "${ROLLBACK_DIR}/images.env"

  ROLLBACK_ACTIVE="true"
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

  local service current_var source_var backup_var current source_id backup backup_id
  for service in api strapi; do
    current_var="${service^^}_CURRENT"
    source_var="${service^^}_SOURCE"
    backup_var="${service^^}_BACKUP"
    current="${!current_var:-}"
    source_id="${!source_var:-}"
    backup="${!backup_var:-}"
    if [[ -n "${current}" && -n "${source_id}" && -n "${backup}" ]]; then
      backup_id="$(docker image inspect "${backup}" --format '{{.Id}}' 2>/dev/null || true)"
      if [[ "${backup_id}" != "${source_id}" ]]; then
        echo "[deploy-vps] ERRO: fonte imutável de rollback de ${service} não confere." >&2
        return 1
      fi
      echo "[deploy-vps] Rollback: restaurando ${service} para ${current}"
      docker image tag "${source_id}" "${current}" || return 1
    else
      echo "[deploy-vps] ERRO: metadados de rollback incompletos para ${service}." >&2
      return 1
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
