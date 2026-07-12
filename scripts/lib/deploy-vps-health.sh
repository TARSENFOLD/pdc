#!/usr/bin/env bash
# Health e diagnostico partilhados pelo deploy-vps.sh. Este ficheiro e sourced.

redact() {
  sed -E \
    -e 's#(https?://)[^/@[:space:]]+:[^/@[:space:]]+@#\1[REDACTED]@#g' \
    -e 's#(Bearer|Basic)[[:space:]]+[A-Za-z0-9._~+/=-]+#\1 [REDACTED]#Ig' \
    -e 's#((token|secret|password|api[_-]?key|private[_-]?key|cookie)[=:][[:space:]]*)[^,[:space:]]+#\1[REDACTED]#Ig' \
    -e 's#("(token|secret|password|api[_-]?key|private[_-]?key|cookie)"[[:space:]]*:[[:space:]]*")[^"]*"#\1[REDACTED]"#Ig' \
    -e 's#eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+#[REDACTED_JWT]#g'
}

collect_diagnostics() {
  {
    echo "[deploy-vps] Diagnostico: estado do compose"
    compose ps || true

    local service container_id
    for service in traefik api strapi; do
      container_id="$(compose ps -a -q "${service}" 2>/dev/null | head -1 || true)"
      if [[ -n "${container_id}" ]]; then
        docker inspect \
          --format='container={{.Name}} image={{.Image}} status={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} restarts={{.RestartCount}}' \
          "${container_id}" || true
      else
        echo "service=${service} container=missing"
      fi
    done

    echo "[deploy-vps] Diagnostico: ultimas 120 linhas de logs"
    compose logs --no-color --tail=120 traefik api strapi || true
  } 2>&1 | redact >&2 || true

  return 0
}

wait_for_container_health() {
  local service="$1" tries="${2:-30}"
  local attempt container_id status

  for ((attempt = 1; attempt <= tries; attempt += 1)); do
    container_id="$(compose ps -q "${service}" 2>/dev/null | head -1 || true)"
    if [[ -n "${container_id}" ]]; then
      status="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "${container_id}" 2>/dev/null || true)"
      if [[ "${status}" == "healthy" ]]; then
        echo "[deploy-vps] ${service}: container healthy."
        return 0
      fi
    else
      status="missing"
    fi
    sleep 5
  done

  echo "[deploy-vps] ERRO: ${service} nao ficou healthy (ultimo estado: ${status})." >&2
  return 1
}

wait_for_internal() {
  local service="$1" description="$2" tries="$3"
  shift 3

  local attempt
  for ((attempt = 1; attempt <= tries; attempt += 1)); do
    if compose exec -T "${service}" "$@" >/dev/null 2>&1; then
      echo "[deploy-vps] ${description}: check interno OK."
      return 0
    fi
    sleep 3
  done

  echo "[deploy-vps] ERRO: check interno falhou: ${description}." >&2
  return 1
}

wait_for_external() {
  local url="$1" tries="${2:-18}"
  local attempt

  for ((attempt = 1; attempt <= tries; attempt += 1)); do
    if curl -fsS --max-time 10 "${url}" >/dev/null 2>&1; then
      echo "[deploy-vps] ${url}: check externo OK."
      return 0
    fi
    sleep 5
  done

  echo "[deploy-vps] ERRO: check externo falhou: ${url}." >&2
  return 1
}

wait_for_external_cors() {
  local url="$1" origin="$2" description="$3" tries="${4:-18}"
  local attempt headers allowed_origin

  for ((attempt = 1; attempt <= tries; attempt += 1)); do
    if headers="$(curl -fsS --max-time 10 -D - -o /dev/null -H "Origin: ${origin}" "${url}" 2>/dev/null)"; then
      allowed_origin="$(printf '%s\n' "${headers}" | awk 'tolower($1) == "access-control-allow-origin:" { sub(/\r$/, "", $2); print $2; exit }')"
      if [[ "${allowed_origin}" == "${origin}" ]]; then
        echo "[deploy-vps] ${description}: endpoint externo e CORS OK."
        return 0
      fi
    fi
    sleep 5
  done

  echo "[deploy-vps] ERRO: endpoint externo/CORS falhou: ${description}." >&2
  return 1
}

validate_stack_health() {
  local native_tries="${1:-30}" external_tries="${2:-18}"

  wait_for_container_health traefik "${native_tries}" || return 1
  wait_for_container_health strapi "${native_tries}" || return 1
  wait_for_container_health api "${native_tries}" || return 1

  wait_for_internal api "API /health" 6 node -e \
    "fetch('http://localhost:3001/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))" || return 1
  wait_for_internal strapi "Strapi /_health" 6 curl -fsS \
    http://localhost:1337/_health || return 1

  wait_for_external https://api.usepdc.com/health "${external_tries}" || return 1
  wait_for_external https://cms.usepdc.com/_health "${external_tries}" || return 1
  wait_for_external_cors https://api.usepdc.com/bootstrap https://usepdc.com \
    "API /bootstrap" "${external_tries}" || return 1
  wait_for_external_cors 'https://api.usepdc.com/socket.io/?EIO=4&transport=polling' https://usepdc.com \
    "Socket.IO polling" "${external_tries}" || return 1
}
