#!/usr/bin/env bash

validate_rdb() {
  local rdb_path="$1" image_name="$2" directory filename output key_count
  directory="$(dirname "${rdb_path}")"
  filename="$(basename "${rdb_path}")"
  output="$(docker run --rm --entrypoint redis-check-rdb \
    --security-opt no-new-privileges:true --security-opt label=disable \
    -v "${directory}:/backup:ro" "${image_name}" "/backup/${filename}")"
  key_count="$(printf '%s\n' "${output}" | awk '$1 == "[info]" && $3 == "keys" && $4 == "read" { print $2; exit }')"
  [[ "${key_count}" =~ ^[0-9]+$ ]] || {
    echo "[redis-snapshot] ERRO: redis-check-rdb não informou a contagem de chaves." >&2
    return 1
  }
  printf '%s\n' "${key_count}"
}

snapshot_key_count() {
  local archive="$1" value
  value="$(awk -F= '$1 == "keys" { print $2; exit }' "${archive}.meta")"
  [[ "${value}" =~ ^[0-9]+$ ]] || {
    echo "[redis-snapshot] ERRO: metadados de contagem inválidos." >&2
    return 1
  }
  printf '%s\n' "${value}"
}

verify_archive() {
  local archive="$1" tmp_dir image_name expected_checksum actual_checksum
  local expected_meta_checksum actual_meta_checksum expected_keys actual_keys
  [[ -f "${archive}" ]] || { echo "[redis-snapshot] ERRO: snapshot ausente: ${archive}" >&2; return 1; }
  [[ -f "${archive}.sha256" ]] || { echo "[redis-snapshot] ERRO: checksum ausente: ${archive}.sha256" >&2; return 1; }
  [[ -f "${archive}.meta" ]] || { echo "[redis-snapshot] ERRO: metadados ausentes: ${archive}.meta" >&2; return 1; }

  expected_checksum="$(awk 'NR == 1 { print $1 }' "${archive}.sha256")"
  expected_meta_checksum="$(awk 'NR == 2 { print $1 }' "${archive}.sha256")"
  actual_checksum="$(sha256sum "${archive}" | awk '{ print $1 }')"
  actual_meta_checksum="$(sha256sum "${archive}.meta" | awk '{ print $1 }')"
  if [[ ! "${expected_checksum}" =~ ^[0-9a-fA-F]{64}$ \
    || ! "${expected_meta_checksum}" =~ ^[0-9a-fA-F]{64}$ \
    || "${actual_checksum}" != "${expected_checksum}" \
    || "${actual_meta_checksum}" != "${expected_meta_checksum}" ]]; then
    echo "[redis-snapshot] ERRO: checksum inválido para ${archive}." >&2
    return 1
  fi
  tmp_dir="$(mktemp -d "${BACKUP_DIR}/.verify.XXXXXX")"
  TEMP_DIRS+=("${tmp_dir}")
  gzip -dc "${archive}" > "${tmp_dir}/dump.rdb"
  image_name="$(redis_image)"
  expected_keys="$(snapshot_key_count "${archive}")"
  actual_keys="$(validate_rdb "${tmp_dir}/dump.rdb" "${image_name}")"
  [[ "${actual_keys}" == "${expected_keys}" ]] || {
    echo "[redis-snapshot] ERRO: contagem RDB diverge dos metadados." >&2
    return 1
  }
  rm -rf "${tmp_dir}"
  echo "[redis-snapshot] Snapshot íntegro: ${archive}"
}

rotate_backups() {
  local index
  local -a archives=()
  mapfile -t archives < <(
    find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'redis-*.rdb.gz' -printf '%T@ %p\n' \
      | sort -rn | cut -d ' ' -f2-
  )
  for ((index = RETENTION; index < ${#archives[@]}; index += 1)); do
    rm -f -- "${archives[${index}]}" \
      "${archives[${index}]}.sha256" "${archives[${index}]}.meta"
  done
}

rotate_pre_restore_backups() {
  local index
  local -a archives=()
  mapfile -t archives < <(
    find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'pre-restore-*.tar.gz' -printf '%T@ %p\n' \
      | sort -rn | cut -d ' ' -f2-
  )
  for ((index = RETENTION; index < ${#archives[@]}; index += 1)); do
    rm -f -- "${archives[${index}]}"
  done
}

start_bgsave() {
  local deadline output previous_lastsave current_epoch
  deadline=$((SECONDS + BGSAVE_TIMEOUT_SECONDS))
  while (( SECONDS < deadline )); do
    if ! previous_lastsave="$(redis_backup_cli LASTSAVE 2>&1)" \
      || [[ ! "${previous_lastsave}" =~ ^[0-9]+$ ]]; then
      echo "[redis-snapshot] ERRO: LASTSAVE devolveu um valor inválido." >&2
      return 1
    fi
    current_epoch="$(date -u +%s)"
    if (( current_epoch <= previous_lastsave )); then
      sleep 1
      continue
    fi
    if ! output="$(redis_backup_cli BGSAVE 2>&1)"; then
      echo "[redis-snapshot] ERRO: não foi possível solicitar BGSAVE." >&2
      return 1
    fi
    if [[ "${output}" == *"Background saving started"* ]]; then
      printf '%s\n' "${previous_lastsave}"
      return 0
    fi
    if [[ "${output}" != *"Background save already in progress"* ]]; then
      echo "[redis-snapshot] ERRO: BGSAVE devolveu uma resposta inválida." >&2
      return 1
    fi
    sleep 1
  done
  echo "[redis-snapshot] ERRO: BGSAVE não iniciou dentro de ${BGSAVE_TIMEOUT_SECONDS} segundos." >&2
  return 1
}

wait_for_bgsave_completion() {
  local previous_lastsave="$1" deadline current_lastsave
  deadline=$((SECONDS + BGSAVE_TIMEOUT_SECONDS))
  while (( SECONDS < deadline )); do
    if ! current_lastsave="$(redis_backup_cli LASTSAVE 2>&1)" \
      || [[ ! "${current_lastsave}" =~ ^[0-9]+$ ]]; then
      echo "[redis-snapshot] ERRO: LASTSAVE devolveu um valor inválido durante o BGSAVE." >&2
      return 1
    fi
    if (( current_lastsave > previous_lastsave )); then return 0; fi
    sleep 1
  done
  echo "[redis-snapshot] ERRO: BGSAVE não concluiu dentro de ${BGSAVE_TIMEOUT_SECONDS} segundos." >&2
  return 1
}

backup() {
  local tmp_dir timestamp archive checksum meta_checksum image_name key_count lastsave_before
  mkdir -p "${BACKUP_DIR}"
  tmp_dir="$(mktemp -d "${BACKUP_DIR}/.backup.XXXXXX")"
  TEMP_DIRS+=("${tmp_dir}")
  image_name="$(redis_image)"
  lastsave_before="$(start_bgsave)"
  wait_for_bgsave_completion "${lastsave_before}"

  docker cp "${REDIS_CONTAINER}:/data/dump.rdb" "${tmp_dir}/dump.rdb"
  key_count="$(validate_rdb "${tmp_dir}/dump.rdb" "${image_name}")"
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  archive="${BACKUP_DIR}/redis-${timestamp}.rdb.gz"
  gzip -n -9 -c "${tmp_dir}/dump.rdb" > "${archive}"
  printf 'keys=%s\ncreated=%s\n' "${key_count}" "${timestamp}" > "${archive}.meta"
  checksum="$(sha256sum "${archive}" | awk '{print $1}')"
  meta_checksum="$(sha256sum "${archive}.meta" | awk '{print $1}')"
  printf '%s  %s\n%s  %s\n' \
    "${checksum}" "$(basename "${archive}")" \
    "${meta_checksum}" "$(basename "${archive}.meta")" > "${archive}.sha256"
  verify_archive "${archive}"
  rotate_backups
  rm -rf "${tmp_dir}"
  echo "[redis-snapshot] Backup concluído: ${archive}"
}
