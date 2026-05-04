---
description: Implementar cold storage real em Cloudflare R2 para eventos de telemetria inválidos (substituir stub moveToColdStorage)
---

# Cold Storage Architect

## Contexto
O `moveToColdStorage` em `apps/api/src/modules/telemetria/consumer.ts` é um **stub** — apenas faz `log.info` sem persistir dados.
Eventos inválidos (fraude, bots, dados corrompidos) precisam ser preservados em Cloudflare R2 para auditoria forense e compliance.

## Sealed Envelope

```
[SEALED ENVELOPE — PDC v2 INTEGRITY]

Spec Soberana: ADR 005 (Outbox + Resiliência), Spec 04 (Telemetria)
Wave/Contexto: Wave 3 (Resiliência & Compliance)
Subdomínio: telemetria
Caixa Autorizada: A (Código viola lei — stub não cumpre promessa de zero data loss)

Scope IN (Ficheiros permitidos):
- apps/api/src/modules/telemetria/consumer.ts
- apps/api/src/lib/r2.ts (NOVO)
- apps/api/src/lib/r2.spec.ts (NOVO)
- packages/shared/src/cold-storage.ts (NOVO — schema Zod)
- apps/api/src/modules/telemetria/consumer.spec.ts (actualizar)

Scope OUT (PROIBIDO TOCAR):
- apps/edge/* (Edge não muda)
- apps/api/src/modules/events/* (Outbox não muda)
- apps/web/* (Frontend não muda)

Blacklist Nominal:
- AP-01: Não apagar exports para silenciar typecheck — corrigir na origem
- AP-02: Não criar stubs sem cruzar Spec — verificar schema.json do Strapi primeiro
- AP-03: Não usar casts cegos (`as any`, `as unknown as X`, `as string`) — usar type-guards ou Zod `.parse()`
- AP-04: Não usar fallbacks que mascaram bugs (`|| {}`, `?? null`) — validar com enum canónico
- AP-05: Não destruir logs estruturados com template strings — usar `log.error({ ctx }, 'msg')`
- AP-06: Não criar scripts `fix_*.js` ou debug files na raiz — usar `scripts/` com nome descritivo
- AP-07: Não remover exports públicos do `@pdc/shared` sem ADR — remoções cascateiam 4 workspaces

Critério Done:
[ ] moveToColdStorage faz upload real para R2 (NDJSON batch)
[ ] Schema Zod em @pdc/shared para ColdStorageEvent
[ ] Fallback local (PDC_COLD_STORAGE_PATH — volume persistente em produção) se R2 indisponível
[ ] Testes unitários com Vitest (mock de S3Client/R2)
[ ] Testes de integração com Vitest contra bucket R2 de teste
[ ] Métricas para falhas de upload e uso do fallback (pino structured log)
[ ] Alertas configurados para fallback persistente (> 5 min sem upload bem-sucedido)
[ ] Política de retenção documentada (quanto tempo manter eventos — ex: 90 dias)
[ ] npm run typecheck — verde em todos os workspaces
[ ] npm run lint — sem novos eslint-disable
[ ] npm run test — Vitest verde em todos os workspaces
[ ] npx playwright test --project=chromium — N/A (infra backend; sem alterações UI)
[ ] ADR documentando decisão de cold storage format (NDJSON vs JSON), key pattern, fallback e buffer config
[ ] STATE.md atualizado com resumo da mudança e referência ao ADR
```

## Passos

1. **Criar schema em `@pdc/shared`**
   - Definir `ColdStorageEventSchema` em `packages/shared/src/cold-storage.ts`
   - Campos: `eventId`, `perfilId` (obrigatório quando disponível — Constituição §0 Identidade Total; ver nota abaixo), `tipo`, `payload`, `timestamp`, `invalidReason`, `layer` (edge|bff), `archivedAt`
   - ⚠️ **`perfilId` e eventos inválidos sem identidade:** alguns eventos são arquivados precisamente porque carecem de um `perfilId` válido (ex: bots, dados corrompidos, requests malformados). Para garantir zero data loss sem violar a Constituição §0, adotar a seguinte política: (1) se `perfilId` for identificável, é **obrigatório**; (2) se não for identificável, usar o valor sentinela `"UNKNOWN"` e registar a razão em `invalidReason`; (3) **nunca rejeitar** um evento do cold storage por ausência de `perfilId` — fazer drop viola zero data loss. Documentar no ADR quais classes de eventos podem ser arquivadas com `perfilId = "UNKNOWN"`.
   - Exportar do barrel `packages/shared/src/index.ts`

2. **Criar cliente R2 em `apps/api/src/lib/r2.ts`**
   - Usar `@aws-sdk/client-s3` com endpoint Cloudflare R2
   - Env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
   - Validar env vars com Zod no boot
   - Função `uploadColdBatch(events: ColdStorageEvent[]): Promise<void>`
     - Key pattern: `cold-storage/YYYY/MM/DD/${uuid}.ndjson` (granularidade diária — reduz S3 API calls e melhora compressão; se compliance exigir granularidade horária, documentar no ADR)
     - UUID: **v4 (aleatório)**, gerado por `uploadColdBatch` por batch — não pelo caller/consumer. Geração dentro de `uploadColdBatch` garante unicidade em flushes concorrentes de múltiplas instâncias sem coordenação externa. (Alternativa v7 time-sortable documenta-se no ADR se ordenação cronológica dentro de partições diárias for requisito de auditoria.)
     - Formato: NDJSON (uma linha JSON por evento)
   - Função `listColdEvents(prefix: string): Promise<string[]>` para auditoria futura

3. **Implementar fallback local**
   - Se R2 falhar, escrever batch no caminho configurado via env var `PDC_COLD_STORAGE_PATH` (default: `/data/pdc-cold-storage/` em produção, `/tmp/pdc-cold-storage/` em desenvolvimento)
   - ⚠️ `/tmp` é efémero — reinício de container apaga os dados. Em produção, `PDC_COLD_STORAGE_PATH` deve apontar para volume persistente
   - Log com `pino` nível `error` para alertar ops, incluindo contagem de eventos em fallback
   - **Re-upload via outbox (preferido em vez de poller ad-hoc):** ao escrever para o fallback, enfileirar um evento outbox com referência ao ficheiro local; o outbox consumer tenta o upload para R2 no próximo ciclo, garantindo retry com a mesma resiliência dos restantes eventos assíncronos. Documentar esta decisão no ADR (referência: ADR 005 Outbox + Resiliência).
     - **Schema do evento outbox para retry de cold storage:**
       ```ts
       {
         type: 'COLD_STORAGE_RETRY',
         payload: {
           localPath: string,  // caminho absoluto para o ficheiro NDJSON local
           eventCount: number, // número de eventos no batch
           attemptedAt: string // ISO8601 do momento do upload falhado
         }
       }
       ```
     - O outbox consumer distingue retries de cold storage por `event.type === 'COLD_STORAGE_RETRY'` e chama `uploadColdBatch(await readFromLocalPath(payload.localPath))`. Em caso de sucesso, apaga o ficheiro local. Em caso de falha persistente (poison queue), mover para dead-letter e emitir alerta crítico.
   - Se o outbox não estiver disponível como fallback-do-fallback, usar polling local a cada 5 min como última linha de defesa — documentar no ADR como limitação aceite

4. **Refactoring do `consumer.ts`**
   - Substituir stub `moveToColdStorage` por import real
   - Acumular eventos inválidos num buffer in-memory e fazer flush quando **qualquer** das condições for atingida (lógica OR — padrão para buffering, evita crescimento ilimitado de memória e atrasos excessivos):
     - **Tamanho:** `buffer.length >= PDC_COLD_BUFFER_SIZE`
     - **Tempo:** `elapsed >= PDC_COLD_FLUSH_INTERVAL_MS` desde o último flush bem-sucedido
     - Defaults: `PDC_COLD_BUFFER_SIZE=100` eventos / `PDC_COLD_FLUSH_INTERVAL_MS=60000` ms; configuráveis via env para ajustar a taxa de eventos inválidos esperada e overhead de memória
   - Flush do buffer via `uploadColdBatch`
   - ⚠️ **Não usar fire-and-forget puro:** se o upload falhar e o catch apenas fizer log, os eventos perdem-se (viola Box A — zero data loss). Em vez disso: (1) tentar `uploadColdBatch`, (2) em caso de falha, persistir no fallback local E enfileirar evento outbox para retry garantido (schema `COLD_STORAGE_RETRY` — ver Passo 3), (3) emitir métrica/alerta de falha. O consumer pode continuar sem bloquear, mas o destino dos eventos deve ser persistente.
   - ⚠️ **Cenário de falha dupla (R2 + fallback local):** se `uploadColdBatch` falhar E a escrita no fallback local também falhar (disco cheio, erro de I/O, permissões), aplicar a seguinte hierarquia de último recurso:
     1. **Log crítico estruturado** com os payloads completos dos eventos para recuperação manual: `log.fatal({ events, r2Error, localError }, 'cold-storage double-failure')` — nunca template strings
     2. **Alerta crítico imediato** para ops (métrica `cold_storage_double_failure_total` + notificação)
     3. **Retenção em memória limitada** (opcional): manter os eventos no buffer até ao próximo flush bem-sucedido, com limite configurável via `PDC_COLD_MAX_MEMORY_MB` para evitar OOM. Se o limite for atingido, fazer log fatal dos eventos excedentes e descartá-los — é a única situação em que o drop é aceitável (melhor que crash do processo). Documentar esta decisão no ADR como limitação aceite.

5. **Testes**
   - Mock de S3Client para R2
   - Testar: upload sucesso, fallback disco, buffer flush, schema validation

6. **ADR**
   - Criar `docs/adr/ADR-XXX-cold-storage-r2.md` documentando formato NDJSON, retenção, e acesso
