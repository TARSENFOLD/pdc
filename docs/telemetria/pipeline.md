# Pipeline de Telemetria PDC v2 — Definição Soberana (B4)

O PDC captura o "músculo comportamental" através de um pipeline distribuído em 4 camadas, garantindo latência zero na ingestão e integridade absoluta no processamento de mérito.

---

## 🏗️ Diagrama de Fluxo (Dual-Layer Sanity)

O sistema utiliza a estratégia **"Tag-don't-drop"**: o Edge etiqueta eventos suspeitos, mas não os descarta, permitindo auditoria forense posterior. Em caso de falha no Edge, o BFF atua como um proxy burro para a mesma fila.

```mermaid
sequenceDiagram
    participant Browser as apps/web (PWA)
    participant Edge as apps/edge (Cloudflare)
    participant BFF as apps/api (Fallback Proxy)
    participant Upstash as Upstash Redis (Queue)
    participant Consumer as Telemetry Consumer (Worker)
    participant Strapi as Strapi v5 (Postgres)
    participant Bus as Event Bus (Hooks)

    Browser->>Edge: 1a. Telemetria Batch (Primary)
    Note over Edge: Sanity L1 (applySanityRules)
    Edge->>Upstash: 2a. LPUSH (Tag-don't-drop)
    
    Browser->>BFF: 1b. Fallback (if Edge > 5s)
    Note over BFF: Proxy Burro (No logic)
    BFF->>Upstash: 2b. LPUSH (Single Queue)
    
    Edge-->>Browser: 202 Accepted
    
    loop Atómico
        Consumer->>Upstash: 3. RPOPLPUSH (Processing Queue)
        Note over Consumer: Sanity L2 (Deep Audit)
        Consumer->>Strapi: 4. Persistência de Mérito
        Consumer->>Bus: 5. Disparar Eventos
        Bus->>Bus: Conquistas, Reputação, Feed
        Consumer->>Upstash: 6. LREM (ACK)
    end
```

---

## 🔐 Idempotência e a Falha da Meia-Noite (D6)

O PDC v2 resolve a dívida técnica **D6 (Midnight Rollover)** abandonando chaves baseadas em data (`tel:2026-04-21:...`). Consulte [why-edge-telemetry-pipelines-fail-at-midnight.txt](../../specs/IMPORTANTE/why-edge-telemetry-pipelines-fail-at-midnight.txt) para a análise completa.

### Estratégia SET NX EX 7d
Cada evento de telemetria possui um `eventId` (UUIDv4) gerado no cliente. O Consumer utiliza o padrão atómico do Redis:
- **Chave**: `tel:evt:{eventId}`
- **Comando**: `SET key 1 NX EX 604800` (7 dias)
- **Porquê?**: Chaves por data falham quando um batch cruza a meia-noite (eventos de ontem vs hoje). O TTL de 7 dias garante protecção contra replays de rede e duplicação no Outbox sem janelas de erro. Esta implementação é **soberana** e ignora janelas temporais de calendário.

---

## 🔄 Outbox Replay (Sovereign Replay)

Para garantir a entrega **at-least-once**, o sistema implementa o **Outbox Pattern** no Strapi (`domain-events`).

1.  **Worker Isolado**: O replay não corre no processo principal da API (evita D5). É invocado via `npm run start:outbox-worker`.
2.  **Lock Distribuído + Fencing Token**: `apps/api/src/lib/distributed-lock.ts` usa `SET NX EX + INCR counter` para prevenir stale lock writes em caso de TTL expirado. A release verifica o token antes de `DEL`. (Upstash single-node — RedLock com quórum não aplicável.)
3.  **Exponential Backoff**: Falhas no processamento incrementam `attempts`. O replay ignora eventos falhados recentemente baseado em `2^attempts * 1min`.
4.  **Chunk Size**: Processamento em blocos de 50 eventos para manter o event loop desimpedido.

## 🧊 Telemetry Worker Isolado

O consumer de telemetria corre como **processo independente** (`apps/api/src/workers/telemetry-worker.ts`), separado do BFF (Hono), para não saturar o event loop durante picos.

- **Entry point:** `npm run worker:telemetry -w apps/api`
- **Graceful shutdown:** SIGTERM/SIGINT finalizam o worker sem perda de eventos em buffer
- **Heartbeat Redis:** Escreve `telemetry:worker:heartbeat` a cada 30s (TTL 120s) — monitorizável via `/health/workers`
- **Chunked processing:** 100 eventos por ciclo + `setImmediate` yield — previne block do event loop
- **Backpressure:** Aviso de log se queue > 10.000 eventos
- **Railway Procfile:** `worker: node dist/workers/telemetry-worker.js`

## 🧳 Cold Storage (Compliance Forense)

Eventos inválidos (fraude, bots, dados corrompidos) são arquivados em Cloudflare R2 para auditoria forense.

- **Schema:** `ColdStorageEventSchema` em `@pdc/shared/src/cold-storage.ts`
- **Formato:** NDJSON batch, key pattern `cold-storage/YYYY/MM/DD/HH-mm-ss-{uuid}.ndjson`
- **Buffer:** até 100 eventos ou 60s, depois flush atómico via `uploadColdBatch()`
- **Fallback:** Se R2 indisponível, escreve em `/tmp/pdc-cold-storage/` com log de erro
- **Fire-and-forget:** Não bloqueia o consumer (`.catch()` registado)

---

## 📱 Resiliência no Cliente (PWA)

O `useTelemetry` hook em `apps/web` implementa garantias de entrega de classe mundial:

- **Offline Buffer**: Até 500 eventos guardados em `localStorage` se a rede estiver indisponível.
- **Keepalive**: Usa a flag `keepalive: true` no `fetch`. Essencial para garantir que eventos críticos de fecho de página (ex: `simulacao.abandonada`) cheguem à Edge mesmo que a aba seja encerrada.
- **Backoff Exponencial**: Se a Edge retornar `503`, o cliente aguarda intervalos crescentes antes de tentar re-sincronizar.
- **Tagging Forense**: Eventos detectados como "lentos" ou "fora de ordem" no browser são etiquetados com `metadata.clientFlagged`.

---
*Doc is Law — Última auditoria: 30 de Abril de 2026.*
