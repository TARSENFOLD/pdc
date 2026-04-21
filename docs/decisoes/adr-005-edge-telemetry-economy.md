# ADR-005: Edge Telemetry Economy (Pipeline L1)

## Status
Ratificada em 21 de Abril de 2026.

## Contexto
O PDC v2 exige a captura de telemetria de alta fidelidade (biomecânica, foco, hesitação) em tempo real. O custo de processar estes milhares de pequenos eventos diretamente no Railway (BFF/Postgres) é proibitivo e desnecessário para a camada de ingestão.

## Decisão
Implementar um **Ingestor de Camada 1 (L1)** utilizando Cloudflare Workers (`apps/edge`).
- **Escala:** Aproveitar os 100k requests/dia gratuitos do plano Free da Cloudflare.
- **Isolamento:** O Worker atua apenas como buffer, enviando os dados para uma fila no Upstash Redis.
- **Identidade Total:** O Worker valida o `Telemetry-Token` (RS256) gerado pelo BFF, garantindo que nenhum rasto é anónimo.
- **Sanidade L1:** Aplicação de regras básicas de conformidade (`EDGE_SANITY_RULES`) antes do buffer.

## Consequências
- **Positivas:** Redução drástica de custos operacionais; latência p99 < 100ms; proteção contra picos de tráfego.
- **Negativas:** Complexidade adicional na gestão de chaves (JWKS) entre BFF e Edge; necessidade de um consumer no BFF para drenar o Redis.
- **Segurança:** O uso de tokens RS256 isolados garante que o Edge não tem acesso aos cookies `httpOnly` do utilizador, mantendo o `SameSite=Strict`.

---
*Assinado: Gemini CLI · Guardião da Arquitetura*