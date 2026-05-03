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

Spec Soberana: ADR 005 (Resiliência), CONSTITUTION.md (Zero data loss)
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
[ ] Se RedLock: implementação com ioredis + redlock package
[ ] Se SET NX EX: documentar limitações aceites e monitoring
[ ] Lock wrapper abstracto com interface `acquireLock(key, ttl) → { release() }`
[ ] Fencing token para prevenir stale lock writes
[ ] Testes com cenários de timeout e concorrência (incluindo failure modes — ver §7)
[ ] Integração no outbox-worker (com tratamento de LockUnavailableError)
[ ] Typecheck verde
[ ] Documentação da API do lock wrapper (acquireLock, LockHandle, erros, exemplos)
[ ] Monitoring e alertas validados em staging (lock acquisition time, contention rate)
[ ] Runbook operacional: deadlocks, Redis indisponível, recovery
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
     Tokens com gaps ainda garantem ordenação; o receptor apenas rejeita tokens ≤ ao último visto.
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
   - Métricas: lock acquisition time, lock contention rate, TTL expirations
   - Log structured com pino quando lock expira antes do release
   - Alertas em staging: acquisition failures > threshold → alerta oncall

6. **Integrar no outbox-worker.ts**
   - Substituir `redis.set(LOCK_KEY, 'locked', { ex, nx })` pelo novo `acquireLock`
   - Usar fencing token para validar writes no Strapi
   - Tratar `LockUnavailableError`: log warn + skip iteration (não crash o worker)

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
