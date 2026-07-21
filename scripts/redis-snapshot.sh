#!/usr/bin/env bash
# Backup e disaster recovery do Redis primário. Executar no VPS em /opt/pdc.

set -Eeuo pipefail
umask 077

DEPLOY_DIR="${PDC_DEPLOY_DIR:-/opt/pdc}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${PDC_COMPOSE_FILE:-${DEPLOY_DIR}/docker-compose.prod.yml}"
ENV_FILE="${PDC_ENV_FILE:-${DEPLOY_DIR}/.env}"
BACKUP_DIR="${PDC_REDIS_BACKUP_DIR:-${DEPLOY_DIR}/backups/redis}"
RETENTION="${PDC_REDIS_BACKUP_RETENTION:-14}"
BGSAVE_TIMEOUT_SECONDS="${PDC_REDIS_BGSAVE_TIMEOUT_SECONDS:-120}"
REDIS_CONTAINER="${PDC_REDIS_CONTAINER:-pdc-redis}"
MODE="${1:-}"
declare -a TEMP_DIRS=()

cleanup() {
  local directory
  for directory in "${TEMP_DIRS[@]}"; do
    rm -rf -- "${directory}"
  done
}

trap cleanup EXIT

usage() {
  cat <<'EOF'
Uso:
  bash scripts/redis-snapshot.sh backup
  bash scripts/redis-snapshot.sh verify /caminho/redis-UTC.rdb.gz
  bash scripts/redis-snapshot.sh restore /caminho/redis-UTC.rdb.gz --confirm
EOF
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[redis-snapshot] ERRO: comando obrigatório ausente: $1" >&2
    exit 1
  }
}

compose() {
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
}

redis_image() {
  docker inspect --format='{{.Config.Image}}' "${REDIS_CONTAINER}"
}

redis_backup_cli() {
  docker exec "${REDIS_CONTAINER}" /bin/sh -ec \
    'REDISCLI_AUTH="$REDIS_BACKUP_PASSWORD" redis-cli --user backup "$@"' -- "$@"
}

# shellcheck source=scripts/lib/redis-snapshot-lib.sh
source "${SCRIPT_DIR}/lib/redis-snapshot-lib.sh"

wait_for_redis_health() {
  local status
  for _attempt in {1..30}; do
    status="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "${REDIS_CONTAINER}" 2>/dev/null || true)"
    [[ "${status}" == "healthy" ]] && return 0
    sleep 2
  done
  return 1
}

redis_is_responding() {
  redis_backup_cli PING | grep -qx PONG
}

redis_backup_acl_is_scoped() {
  local lastsave_output dbsize_output
  if ! lastsave_output="$(redis_backup_cli LASTSAVE 2>&1)" \
    || [[ ! "${lastsave_output}" =~ ^[0-9]+$ ]]; then
    echo "[redis-snapshot] ERRO: utilizador backup não consegue executar LASTSAVE." >&2
    return 1
  fi
  if ! dbsize_output="$(redis_backup_cli DBSIZE 2>&1)" \
    || [[ ! "${dbsize_output}" =~ ^[0-9]+$ ]]; then
    echo "[redis-snapshot] ERRO: utilizador backup não consegue executar DBSIZE." >&2
    return 1
  fi
  redis_backup_command_must_be_denied 'INFO persistence' INFO persistence \
    && redis_backup_command_must_be_denied 'INFO server' INFO server \
    && redis_backup_command_must_be_denied 'INFO persistence server' INFO persistence server
}

redis_backup_command_must_be_denied() {
  local description="$1" output
  shift
  if ! output="$(redis_backup_cli "$@" 2>&1)"; then
    echo "[redis-snapshot] ERRO: probe ${description} não chegou ao Redis." >&2
    return 1
  fi
  if grep -q 'NOPERM' <<<"${output}"; then return 0; fi
  echo "[redis-snapshot] ERRO: utilizador backup executou comando proibido: ${description}." >&2
  return 1
}

replace_volume_data() {
  local source_dir="$1" source_file="$2" volume_name="$3" image_name="$4"
  docker run --rm --entrypoint /bin/sh \
    --security-opt no-new-privileges:true --security-opt label=disable \
    -v "${volume_name}:/data" -v "${source_dir}:/restore:ro" "${image_name}" -ec \
    'find /data -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
     mkdir -p /data/appendonlydir
     cp "/restore/$1" /data/dump.rdb
     cp "/restore/$1" /data/appendonlydir/appendonly.aof.1.base.rdb
     : > /data/appendonlydir/appendonly.aof.1.incr.aof
     printf "%s\n" \
       "file appendonly.aof.1.base.rdb seq 1 type b" \
       "file appendonly.aof.1.incr.aof seq 1 type i" \
       > /data/appendonlydir/appendonly.aof.manifest
     chown -R 999:1000 /data
     chmod 700 /data/appendonlydir
     chmod 600 /data/dump.rdb /data/appendonlydir/*' \
    -- "${source_file}"
}

restore_previous_volume() {
  local rollback_archive="$1" volume_name="$2" image_name="$3"
  docker run --rm --entrypoint /bin/sh \
    --security-opt no-new-privileges:true --security-opt label=disable \
    -v "${volume_name}:/data" -v "${BACKUP_DIR}:/backup:ro" "${image_name}" -ec \
    'find /data -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +; tar -xzf "/backup/$1" -C /data' \
    -- "$(basename "${rollback_archive}")"
}

recover_previous_volume() {
  local rollback_archive="$1" volume_name="$2" image_name="$3"
  compose stop redis || return 1
  restore_previous_volume "${rollback_archive}" "${volume_name}" "${image_name}" || return 1
  compose up -d redis || return 1
  if ! wait_for_redis_health || ! redis_is_responding; then
    echo "[redis-snapshot] ERRO: o volume anterior também não recuperou a saúde." >&2
    return 1
  fi
}

restart_existing_volume() {
  if ! compose up -d redis || ! wait_for_redis_health || ! redis_is_responding; then
    echo "[redis-snapshot] ERRO: Redis não reiniciou com o volume ainda intacto." >&2
    return 1
  fi
}

restore() {
  local archive="$1" confirmation="$2" tmp_dir image_name volume_name rollback_archive
  [[ "${confirmation}" == "--confirm" ]] || {
    echo "[redis-snapshot] ERRO: restore destrutivo requer --confirm." >&2
    return 1
  }
  mkdir -p "${BACKUP_DIR}"
  verify_archive "${archive}"
  tmp_dir="$(mktemp -d "${BACKUP_DIR}/.restore.XXXXXX")"
  TEMP_DIRS+=("${tmp_dir}")
  gzip -dc "${archive}" > "${tmp_dir}/dump.rdb"
  image_name="$(redis_image)"
  volume_name="$(docker inspect --format='{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' "${REDIS_CONTAINER}")"
  [[ -n "${volume_name}" ]] || { echo "[redis-snapshot] ERRO: volume /data não encontrado." >&2; return 1; }
  rollback_archive="${BACKUP_DIR}/pre-restore-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"

  if ! compose stop redis; then
    echo "[redis-snapshot] ERRO: não foi possível parar Redis de forma controlada." >&2
    restart_existing_volume || true
    return 1
  fi
  if ! docker run --rm --entrypoint /bin/sh \
    --security-opt no-new-privileges:true --security-opt label=disable \
    -v "${volume_name}:/data:ro" -v "${BACKUP_DIR}:/backup" "${image_name}" -ec \
    'umask 077; tar -czf "/backup/$1" -C /data .' -- "$(basename "${rollback_archive}")"; then
    echo "[redis-snapshot] ERRO: não foi possível salvaguardar o volume atual." >&2
    restart_existing_volume || true
    return 1
  fi
  rotate_pre_restore_backups
  if ! replace_volume_data "${tmp_dir}" dump.rdb "${volume_name}" "${image_name}" \
    || ! compose up -d redis \
    || ! wait_for_redis_health \
    || ! redis_is_responding; then
    echo "[redis-snapshot] ERRO: restore sem saúde; a repor volume anterior." >&2
    recover_previous_volume "${rollback_archive}" "${volume_name}" "${image_name}" || true
    return 1
  fi

  rm -rf "${tmp_dir}"
  echo "[redis-snapshot] Restore validado. Salvaguarda anterior: ${rollback_archive}"
}

case "${MODE}" in
  backup) [[ $# -eq 1 ]] || { usage; exit 2; } ;;
  verify) [[ $# -eq 2 ]] || { usage; exit 2; } ;;
  restore) [[ $# -eq 3 ]] || { usage; exit 2; } ;;
  *) usage; exit 2 ;;
esac

require_command docker
require_command gzip
require_command sha256sum
require_command flock
mkdir -p "${BACKUP_DIR}"
exec 9>"${BACKUP_DIR}/.redis-snapshot.lock"
flock 9
if [[ ! "${RETENTION}" =~ ^[1-9][0-9]*$ ]]; then
  echo "[redis-snapshot] ERRO: PDC_REDIS_BACKUP_RETENTION deve ser inteiro positivo." >&2
  exit 2
fi
if [[ ! "${BGSAVE_TIMEOUT_SECONDS}" =~ ^[1-9][0-9]*$ ]]; then
  echo "[redis-snapshot] ERRO: PDC_REDIS_BGSAVE_TIMEOUT_SECONDS deve ser inteiro positivo." >&2
  exit 2
fi

if [[ "${MODE}" == "backup" || "${MODE}" == "restore" ]]; then
  redis_backup_acl_is_scoped
fi

case "${MODE}" in
  backup) backup ;;
  verify) verify_archive "$2" ;;
  restore) restore "$2" "$3" ;;
esac
