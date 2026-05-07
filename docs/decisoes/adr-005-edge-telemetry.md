# ADR-005 — Edge Telemetry Economy (Pipeline L1)

**Estado:** Ratificada  
**Data:** 2026-04-19 (original) · 2026-04-21 (refinada para JWS RS256) · 2026-04-30 (unificada)  
**Contexto:** Wave 1 — Pipeline de Ingestão de Dados  
**Supersede:** `adr-005-edge-telemetry-economy.md` (removido — conteúdo unificado aqui)

---

## Contexto

O PDC gera um volume massivo de eventos de telemetria (cliques, dwellTime, hesitação, foco, biomecânica). Processar cada evento no BFF principal (Railway/Node.js) consome recursos de CPU/RAM desnecessários e aumenta a latência para utilizadores em Angola (servidores US-East ~200-280ms).

**Argumento económico:** Telemetria é alto-volume + baixo-valor por evento. Centenas de eventos por sessão, cada um <1KB. Pagar runtime Railway para isto é "pagar um camião para levar uma pá de areia".

---

## Decisão

Adoptar **Cloudflare Workers** (`apps/edge/`) como Ingestor de Telemetria de Fronteira (Edge L1).

### Fronteira Estrita (O que vai para Workers)

| Endpoint | Auth | Descrição |
|---|---|---|
| `POST /telemetria/batch` | JWS RS256 (Telemetry Token) | Ingestão autenticada de batches |
| `POST /landing/pulse` | `rastoId` (sessão anónima) | Tracking de landing page |
| `GET /health` | Nenhum | Smoke test |

### O que NÃO vai para Workers (fica no Railway)

- **Todo o BFF principal** (`api.usepdc.com`): auth, cursos, simulações, vínculos, mensagens, projetos, conquistas, ranking, feed, admin
- **Socket.IO** (realtime): notificações + mensagens
- **Strapi** (`strapi.usepdc.com`): CMS + persistência

### Autenticação no Edge

O Worker **NÃO usa cookies**. Usa um **Telemetry Token JWS RS256** de curta duração (1h):

1. BFF emite o token no `/bootstrap` (keypair RSA partilhado via JWKS)
2. Frontend envia como header `X-Telemetry-Token` em cada batch
3. Worker valida via `jws-verify.ts` com cache de JWKS no isolate (1h)
4. Cookies `httpOnly` + `SameSite=Strict` do BFF ficam **intactos** (ADR-003 preservada)

### Persistência

Worker → `LPUSH telemetry_queue` no **Upstash Redis** → Consumer no Railway drena e persiste no Strapi/PostgreSQL.

---

## Justificação

- **Economia:** 100k req/dia gratuitos; $5/mês para 10M req/mês (~333k/dia). Para 1M+ req/dia o custo é ~$5-8/mês vs dezenas de dólares em Railway CPU.
- **Latência:** Cloudflare PoPs em Lagos, Joanesburgo, Cidade do Cabo. Latência Luanda→Edge ~50-80ms vs Railway US-East ~200-280ms. Melhora a precisão dos cálculos de $\phi$ (Fluidez) ao reduzir jitter.
- **Resiliência:** BFF não é sobrecarregado por picos. Se Strapi cair, eventos ficam no Redis (buffer).
- **Segurança:** Tokens RS256 isolados — Edge não tem acesso a cookies do utilizador. Deduplicação por `eventId` UUID com `SET NX EX 7d` (resolve midnight rollover D6).
- **Sanidade Dual-Layer:** Edge aplica `EDGE_SANITY_RULES` (CPU barato); BFF faz audit completo (forense). Regras idênticas via `@pdc/shared/sanity`.

---

## Consequências

- **Positivas:** Custo ~zero para telemetria; latência <100ms p99; pipeline resiliente; ADR-003 preservada.
- **Negativas:** Introduz Wrangler no deploy; gestão de JWKS entre BFF e Edge; necessidade de consumer no BFF para drenar Redis.

---

## Reavaliação

Se o volume saturar Upstash, ou se a latência Cloudflare→Redis for impeditiva, considerar Cloudflare Queues (nativo) como alternativa ao Upstash para este caminho específico.
