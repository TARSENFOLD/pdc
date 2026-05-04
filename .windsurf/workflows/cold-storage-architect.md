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

Blacklist Nominal (AP-01 a AP-07): Aplicável na totalidade.

Critério Done:
[ ] moveToColdStorage faz upload real para R2 (NDJSON batch)
[ ] Schema Zod em @pdc/shared para ColdStorageEvent
[ ] Fallback local (PDC_COLD_STORAGE_PATH — volume persistente em produção) se R2 indisponível
[ ] Testes unitários com mock de R2
[ ] Testes de integração contra bucket R2 de teste
[ ] Métricas para falhas de upload e uso do fallback (pino structured log)
[ ] Alertas configurados para fallback persistente (> 5 min sem upload bem-sucedido)
[ ] Política de retenção documentada (quanto tempo manter eventos — ex: 90 dias)
[ ] Typecheck verde
[ ] Lint sem novos eslint-disable
[ ] ADR documentando decisão de cold storage format (NDJSON vs JSON)
[ ] STATE.md atualizado com resumo da mudança e referência ao ADR
```

## Passos

1. **Criar schema em `@pdc/shared`**
   - Definir `ColdStorageEventSchema` em `packages/shared/src/cold-storage.ts`
   - Campos: `eventId`, `tipo`, `payload`, `timestamp`, `invalidReason`, `layer` (edge|bff), `archivedAt`
   - Exportar do barrel `packages/shared/src/index.ts`

2. **Criar cliente R2 em `apps/api/src/lib/r2.ts`**
   - Usar `@aws-sdk/client-s3` com endpoint Cloudflare R2
   - Env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
   - Validar env vars com Zod no boot
   - Função `uploadColdBatch(events: ColdStorageEvent[]): Promise<void>`
     - Key pattern: `cold-storage/YYYY/MM/DD/HH-mm-ss-${uuid}.ndjson`
     - Formato: NDJSON (uma linha JSON por evento)
   - Função `listColdEvents(prefix: string): Promise<string[]>` para auditoria futura

3. **Implementar fallback local**
   - Se R2 falhar, escrever batch no caminho configurado via env var `PDC_COLD_STORAGE_PATH` (default: `/data/pdc-cold-storage/` em produção, `/tmp/pdc-cold-storage/` em desenvolvimento)
   - ⚠️ `/tmp` é efémero — reinício de container apaga os dados. Em produção, `PDC_COLD_STORAGE_PATH` deve apontar para volume persistente
   - Log com `pino` nível `error` para alertar ops, incluindo contagem de eventos em fallback
   - Background job para re-upload de ficheiros em fallback quando R2 recuperar (polling a cada 5 min)

4. **Refactoring do `consumer.ts`**
   - Substituir stub `moveToColdStorage` por import real
   - Acumular eventos inválidos num buffer in-memory (max 100 ou 60s)
   - Flush do buffer via `uploadColdBatch`
   - Garantir que o consumer não bloqueia no upload (fire-and-forget com catch)

5. **Testes**
   - Mock de S3Client para R2
   - Testar: upload sucesso, fallback disco, buffer flush, schema validation

6. **ADR**
   - Criar `docs/adr/ADR-XXX-cold-storage-r2.md` documentando formato NDJSON, retenção, e acesso
