---
description: Extrair o consumer de telemetria para um worker Railway independente, isolando o event loop do BFF principal
---

# Telemetry Worker Isolator

## Contexto
O `consumer.ts` processa telemetria num loop `while(true)` com `rpoplpush` bloqueante.
Se correr no mesmo processo que o BFF (Hono), satura o event loop do Node.js durante picos,
causando latência para utilizadores reais (dashboards, API calls).

O `outbox-worker.ts` já está isolado como daemon — o consumer de telemetria precisa do mesmo tratamento.

## Sealed Envelope

```
[SEALED ENVELOPE — PDC v2 INTEGRITY]

Spec Soberana: ADR 001 (Hono is the Brain), Spec 04 (Telemetria Pipeline)
Wave/Contexto: Wave 3 (Resiliência & Performance)
Caixa Autorizada: B (Código mais maduro que doc — consumer já é isolável via CLI)

Scope IN (Ficheiros permitidos):
- apps/api/src/modules/telemetria/consumer.ts (refactor para worker puro)
- apps/api/src/workers/telemetry-worker.ts (NOVO — entry point)
- apps/api/src/index.ts (REMOVER invocação inline do consumer, se existir)
- apps/api/package.json (adicionar script de worker)
- railway.toml ou Procfile (configurar segundo processo)

Scope OUT (PROIBIDO TOCAR):
- apps/edge/* (Edge não muda)
- apps/web/* (Frontend não muda)
- packages/shared/* (Schemas não mudam)
- apps/api/src/modules/events/* (Outbox não muda)

Blacklist Nominal (AP-01 a AP-07): Aplicável na totalidade.

Critério Done:
[ ] consumer.ts exporta apenas funções (não auto-executa)
[ ] Novo entry point telemetry-worker.ts com graceful shutdown
[ ] BFF index.ts NÃO importa/invoca consumer
[ ] Script `npm run worker:telemetry` no package.json
[ ] Configuração Railway para 2 processos (web + worker)
[ ] Health check do worker (heartbeat Redis)
[ ] Chunked processing (max 100 eventos por ciclo, yield ao event loop)
[ ] Typecheck verde
[ ] Lint limpo
[ ] STATE.md actualizado com status do worker e referência ao ADR
```

## Passos

1. **Auditar `apps/api/src/index.ts`**
   - Verificar se `processTelemetryQueue` é invocado inline
   - Se sim, remover a invocação (o BFF não deve processar telemetria)

2. **Criar `apps/api/src/workers/telemetry-worker.ts`**
   - Entry point dedicado com:
     - Graceful shutdown (`SIGTERM`, `SIGINT`)
     - Heartbeat Redis (`SET telemetry:worker:heartbeat ${timestamp} EX 120`)
     - Logging estruturado com pino
     - Import e invocação de `processTelemetryQueue()`

3. **Refactoring de `consumer.ts`**
   - Adicionar chunked processing: processar max 100 eventos, depois `await setImmediate()`
   - Adicionar backpressure: se queue > 10000, log warning e processar em chunks maiores
   - Manter a flag `if (import.meta.url === ...)` para invocação directa via CLI

4. **Configurar package.json**
   ```json
   "scripts": {
     "worker:telemetry": "node --import tsx/esm src/workers/telemetry-worker.ts",
     "worker:outbox": "node --import tsx/esm src/modules/outbox/outbox-worker.ts",
     "worker:all": "npm run worker:outbox & npm run worker:telemetry"
   }
   ```

5. **Configurar Railway**
   - Adicionar segundo serviço ou Procfile com `worker: npm run worker:telemetry`
   - Documentar em README ou ADR

6. **Health check**
   - Worker escreve heartbeat no Redis a cada 30s
   - BFF pode expor endpoint `/health/workers` que verifica heartbeats

---

## Sumário

O telemetry worker é extraído do BFF para um processo Railway independente. O worker processa a queue de telemetria em chunks de ≤ 100 eventos por ciclo, fazendo `yield` ao event loop entre chunks. Escreve heartbeat Redis a cada 30s; o endpoint `/health/workers` do BFF verifica esses heartbeats para monitoring de saúde.

## Rollback

Se o worker falhar em produção:
1. Parar o serviço Railway do worker (ou remover o segundo processo do `Procfile`)
2. Restaurar a invocação inline do consumer em `apps/api/src/index.ts` (reverter o commit de remoção)
3. Os eventos acumulados na queue Redis continuam persistentes — nenhuma perda de dados
4. Investigar logs pino do worker para identificar causa raiz antes de re-deploy

## Plano de Migração

1. **Pré-deploy:** verificar que `consumer.ts` exporta apenas funções (não auto-executa via `import.meta.url`)
2. **Deploy dual:** deploiar novo worker em Railway em paralelo com o BFF existente (sem remover ainda o consumer do BFF) — validar heartbeat Redis em `/health/workers`
3. **Cutover:** após 1 ciclo de monitoring sem erros, remover invocação inline do consumer do `index.ts` do BFF
4. **Validação pós-cutover:** confirmar que a queue de telemetria continua a diminuir e que os dashboards de telemetria não mostram lacunas

## Tracking

Registar rollout e incidentes em `STATE.md` (secção Wave 3 — Resiliência & Performance). Referência: este workflow e o heartbeat em `telemetry:worker:heartbeat` no Redis.
