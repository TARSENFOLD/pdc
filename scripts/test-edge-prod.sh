#!/bin/bash

# PDC v2 — Production Edge Telemetry Validator (B3)
# Faz um teste de fumaça na ingestão de telemetria em produção.

BFF_URL=${1:-"https://api.usepdc.com"}
EDGE_URL=${2:-"https://edge.usepdc.com"}
TOKEN=$3

if [ -z "$TOKEN" ]; then
  echo "❌ Erro: Token de telemetria não fornecido."
  echo "Uso: ./scripts/test-edge-prod.sh [BFF_URL] [EDGE_URL] [TOKEN]"
  exit 1
fi

EVENT_ID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "123e4567-e89b-12d3-a456-426614174000")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "🚀 A testar ingestão na Edge: $EDGE_URL"

RESPONSE=$(curl -s -w "%{http_code}" -X POST "$EDGE_URL/telemetria/batch" \
  -H "Content-Type: application/json" \
  -H "X-Telemetry-Token: $TOKEN" \
  -d "{
    \"events\": [
      {
        \"eventId\": \"$EVENT_ID\",
        \"tipo\": \"page.viewed\",
        \"timestamp\": \"$TIMESTAMP\",
        \"url\": \"https://usepdc.com/test-health\",
        \"payload\": { \"source\": \"health-check-script\" }
      }
    ]
  }")

HTTP_CODE="${RESPONSE: -3}"

if [ "$HTTP_CODE" == "202" ] || [ "$HTTP_CODE" == "200" ]; then
  echo "✅ Sucesso! Resposta HTTP $HTTP_CODE (Accepted)"
  exit 0
else
  echo "❌ Falha! Resposta HTTP $HTTP_CODE"
  echo "Corpo da resposta: ${RESPONSE:0:-3}"
  exit 1
fi
