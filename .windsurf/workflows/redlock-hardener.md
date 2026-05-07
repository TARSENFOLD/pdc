---
description: Avaliar e implementar RedLock formal para operações críticas de exclusão mútua distribuída
---

# RedLock Hardener

## Contexto
O sistema usa `SET NX EX` simples para locks distribuídos (outbox-worker, idempotência).
Isto funciona com uma única instância Redis, mas é vulnerável a:
- Split-brain em failover Redis
- Clock drift entre instâncias
- False lock release por TTL expirado durante processamento lento

As análises externas sugerem RedLock formal. Este workflow avalia se é necessário
e implementa se justificado pelo scale actual.

## Sealed Envelope

```
[SEALED ENVELOPE — PDC v2 INTEGRITY]

Spec Soberana: ADR 005 (Outbox + Resiliência), CONSTITUTION.md (Zero data loss)
ADR a criar: ADR-XXX-distributed-locking.md (complementa ADR 005 — foca na estratégia de lock distribuído)
Wave/Contexto: Wave 3 (Resiliência)
Caixa Autorizada: C (Divergência — lock actual funcional mas não resiliente a falha Redis)

Scope IN (Ficheiros permitidos):
- apps/api/src/lib/distributed-lock.ts (NOVO ou refactor)
- apps/api/src/lib/distributed-lock.spec.ts (NOVO)
- apps/api/src/modules/outbox/outbox-worker.ts (usar novo lock)
- apps/api/src/modules/telemetria/consumer.ts (usar novo lock se aplicável)
- packages/shared/src/lock-config.ts (NOVO — configuração de TTL/retry)
- docs/adr/ADR-XXX-distributed-locking.md (NOVO)

Scope OUT (PROIBIDO TOCAR):
- apps/edge/* (Edge não usa locks)
- apps/web/* (Frontend não muda)
- apps/api/src/modules/events/event-bus.ts (hooks usam idempotência, não locks)

Blacklist Nominal (AP-01 a AP-07): Aplicável na totalidade.

Critério Done:
[ ] ADR com decisão fundamentada (RedLock vs SET NX EX vs alternativa)
[ ] Se RedLock (N/A para Upstash single-node — limitação documentada no ADR): documentar no ADR
[ ] Se SET NX EX: documentar limitações aceites e monitoring
[ ] Lock wrapper abstracto com interface `acquireLock(key, ttl) → { release() }`
[ ] Fencing token para prevenir stale lock writes
[ ] Testes com cenários de timeout e concorrência (incluindo failure modes — ver §7)
[ ] Integração no outbox-worker (com tratamento de LockUnavailableError)
[ ] Typecheck verde
[ ] Documentação da API do lock wrapper (acquireLock, LockHandle, erros, exemplos)
[ ] Monitoring e alertas validados em staging (lock acquisition time, contention rate)
[ ] Runbook operacional: deadlocks, Redis indisponível, recovery
[ ] STATE.md atualizado com resumo da mudança e referência ao ADR-XXX-distributed-locking.md
```

## Passos

### Fase 1: Avaliação (ADR)

1. **Avaliar infraestrutura Redis actual**
   - Upstash Redis: single-node managed → RedLock com quórum NÃO é possível (precisa 3+ nós)
   - Documentar esta limitação no ADR
   - **Referência obrigatória**: Martin Kleppmann's RedLock analysis —
     http://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html
     RedLock tem vulnerabilidades teóricas em process pause + clock drift mesmo com quórum.
     Esta análise reforça a escolha do caminho pragmático (SET NX EX + fencing tokens).

2. **Decisão**
   - Se Upstash single-node: manter SET NX EX mas adicionar **fencing tokens** e **monitoring**
   - Se migrar para Redis Cluster: implementar RedLock formal (mas ver ponto 1 acima)
   - Decisão provável: **SET NX EX + fencing + alertas** (pragmático para scale actual)
   - Documentar que fencing tokens são essenciais independentemente do algoritmo de lock escolhido

3. **Criar ADR** em `docs/adr/ADR-XXX-distributed-locking.md`

### Fase 2: Implementação

4. **Criar `apps/api/src/lib/distributed-lock.ts`**
   ```typescript
   export class LockUnavailableError extends Error {}

   interface LockHandle {
     key: string;
     fencingToken: number;
     release: () => Promise<void>;
   }

   // ttlMs: usar 2-3x a duração esperada da operação (ex: outbox poll ~5s → ttlMs=15_000)
   // maxWaitMs: tempo máximo a aguardar se lock já detido (0 = fail fast)
   async function acquireLock(
     key: string,
     ttlMs: number,
     maxWaitMs = 0
   ): Promise<LockHandle>
   // Lança LockUnavailableError se Redis indisponível ou lock não obtido dentro de maxWaitMs
   ```

   **Geração do fencing token e atomicidade:**
   - `INCR lock:fence:${key}` → obtém token N
   - `SET key N NX PX ${ttlMs}` → tenta adquirir lock
   - Se SET falhar, o token N fica gasto (gap na sequência) — **isto é correcto e inofensivo**.
     Tokens com gaps ainda garantem **monotonicity** (ordem estritamente crescente); o receptor
     apenas rejeita tokens ≤ ao último visto, prevenindo stale writes mesmo com gaps na sequência.
     A propriedade chave é a monotonicidade, não a contiguidade.
     Não é necessário DECR compensatório (adiciona complexidade sem benefício de correcção).
   - Release atómico via Lua script (ver abaixo)

   **Lua script de release atómico:**
   ```lua
   -- release-lock.lua
   -- Apaga o lock APENAS se o valor corresponde ao nosso fencing token
   if redis.call("get", KEYS[1]) == ARGV[1] then
     return redis.call("del", KEYS[1])
   else
     return 0
   end
   ```
   Uso: `await redis.eval(releaseLockScript, 1, lockKey, fencingToken.toString())`

   **Error handling:**
   - Redis indisponível → capturar excepção e lançar `LockUnavailableError`
   - TTL expirado durante operação → write rejeitado pelo receptor via fencing token (stale write prevention)
   - Log structured (pino) em todas as aquisições, releases e expirações, com `correlationId`

5. **Adicionar monitoring**
   - **Plataforma:** Prometheus + Grafana (via pino-prometheus sink ou OpenTelemetry SDK)
   - **Métricas a recolher:**
     - `lock_acquisition_duration_ms` — histograma do tempo de aquisição
     - `lock_contention_total` — contador de tentativas falhadas (lock já detido)
     - `lock_ttl_expired_total` — contador de expiração de TTL antes do release
   - **Recolha:** instrumentar `acquireLock` e `release` com OpenTelemetry spans; emitir métricas via pino structured log para Grafana Loki
   - **Destinos de alerta:**
     - Slack `#oncall-alertas` para acquisition failures > 5% em janela de 5 min
     - PagerDuty para Redis unavailable > 30s
   - Log structured com pino quando lock expira antes do release (incluir `correlationId` e `fencingToken`)

6. **Integrar no outbox-worker.ts**
   - Substituir `redis.set(LOCK_KEY, 'locked', { ex, nx })` pelo novo `acquireLock`
   - Passar o `fencingToken` em cada write ao Strapi via header HTTP `X-Fencing-Token: <token>`
   - Tratar `LockUnavailableError`: log warn + skip iteration (não crash o worker)

   **Validação do fencing token no Strapi:**
   - Implementar middleware Strapi que extrai `X-Fencing-Token` do request
   - Comparar com `lastSeenFencingToken` armazenado no modelo/recurso (campo dedicado ou tabela auxiliar)
   - Se token recebido ≤ `lastSeenFencingToken`: rejeitar com `409 Conflict` e body `{ error: "stale_fencing_token" }`
   - Se token válido: actualizar `lastSeenFencingToken` e prosseguir o write
   - Este mecanismo é o ponto de aplicação do fencing — sem ele, stale writes de locks expirados não são bloqueados

7. **Testes** (incluindo failure modes)
   - Lock acquisition/release (happy path)
   - Concurrent acquisition: segundo caller recebe `LockUnavailableError`
   - TTL expiration: lock auto-releases; write com token stale é rejeitado
   - Fencing token prevents stale writes: simular operação lenta que ultrapassa TTL
   - Redis failure: forçar cliente Redis a lançar erro → `acquireLock` deve lançar `LockUnavailableError` (não crash)
   - Concurrent release: apenas o owner (validado pelo Lua script) consegue release; segundo caller recebe 0
   - Token monotonicity: múltiplas aquisições sequenciais → tokens estritamente crescentes (gaps permitidos)
   - Clock skew: mock `Date.now` com salto durante lock hold → fencing token continua a proteger writes

### Fase 3: Runbook Operacional

**Deadlock / lock não-released:**
- Sintoma: worker parado, lock key com TTL elevado no Redis
- Recovery: o TTL auto-expira (por design); se TTL for muito alto, `DEL lock:key` manualmente via Redis CLI
- Prevenção: usar TTL = 2-3x duração esperada, nunca TTL infinito

**Redis indisponível:**
- Sintoma: `LockUnavailableError` em loop nos logs do outbox-worker
- Recovery: outbox-worker faz skip e retenta na próxima iteração; sem perda de mensagens (outbox é persistente)
- Alerta: configurar alerta se Redis unavailable > 30s

**NTP / clock sync:**
- Assumir NTP sync < 500ms entre instâncias (standard em cloud providers)
- Documentar este assumption no ADR

**Identificar o titular do lock:**
- `GET lock:<key>` no Redis CLI devolve o fencing token actual (e.g., `42`)
- Correlacionar o token com o processo via logs pino: cada `acquireLock` deve emitir `{ lockKey, fencingToken, correlationId, workerId }` a nível `debug`
- Pesquisar `correlationId` nos logs para identificar a instância que detém (ou detinha) o lock
- Exemplo de query Grafana Loki: `{app="outbox-worker"} |= "fencingToken=42"`
