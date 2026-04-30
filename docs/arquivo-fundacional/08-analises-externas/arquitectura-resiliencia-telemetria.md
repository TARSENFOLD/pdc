# Análises Externas — Arquitectura, Resiliência e Telemetria

> **Origem:** `/Transferências/PDC/Analyses/` — 5 transcrições de análise técnica
> - `why-edge-telemetry-pipelines-fail-at-midnight.txt`
> - `redlock-e-dlqs-contra-notas-duplicadas.txt`
> - `eliminar-as-falhas-invisveis-do-pdc-v2.txt`
>
> **Status:** OURO — recomendações accionáveis de resiliência não formalizadas noutro spec
> **Última revisão:** Abril 2026

---

## 1. Midnight Rollover Bug — Idempotência Particionada por Data

### Problema

A chave de idempotência Redis usa `SADD ci:events:<YYYY-MM-DD>`, particionada por data do calendário. Um evento gerado às 23:59:59 que falha e é retentado às 00:00:01 cai numa key nova (dia seguinte) — o sistema trata como evento novo.

### Cenário

1. Estudante gera evento telemetria às 23:59:59
2. Edge processa, grava `SADD ci:events:2026-04-29`
3. Network drop → sem ACK ao cliente
4. Retry 2s depois → 00:00:01 → key `ci:events:2026-04-30` (vazia)
5. Sistema aceita como evento novo → **duplicação**

### Recomendação: SET NX EX por evento individual

```
SET event:<eventId> 1 NX EX 604800
```

- **NX** — só grava se a key não existir (atómico, mesmo com 2 workers simultâneos)
- **EX 604800** — expira em 7 dias (auto-limpeza, sem garbage collection)
- Independente do calendário — elimina a fronteira temporal

### Impacto
Elimina race conditions de meia-noite, boundary de timezone, e simplifica a lógica de idempotência.

---

## 2. Race Condition — Dual Ingress (Edge + BFF Fallback)

### Problema

Frontend tem timeout de 5s. Se Edge demora >5s, o cliente dispara o mesmo payload para o BFF fallback. Se o request original do Edge chega 1s depois, dois entry points processam o mesmo evento em paralelo.

### Cenário

1. Aluno em comboio com rede instável → POST para Edge
2. 5s timeout → POST idêntico para BFF fallback
3. Network limpa-se → Edge processa original com delay
4. Edge e BFF escrevem na mesma queue → **evento duplicado**

### Recomendação: BFF como Dumb Proxy

O BFF fallback **não deve** executar lógica de ingestão própria. Deve apenas:
1. Receber o payload
2. Fazer LPUSH para a mesma queue Upstash que o Edge usa
3. Sem validação separada, sem escrita separada

**Resultado:** Uma única linha de consumo serializada, independentemente da origem.

### Circuit Breaker no Frontend

- Reduzir timeout de 5s para **1.5s** (Edge responde em <50ms normalmente)
- Após 3 timeouts consecutivos → abrir circuito
- Circuito aberto: redirecionar para BFF por **5 minutos**
- Half-open: testar Edge com 1 request → se OK, fechar circuito

Elimina o thundering herd (1000 clientes a redireccionarem simultaneamente para o BFF).

---

## 3. RedLock para Exclusão Mútua em Acções Externas

### Problema

Dois workers podem puxar o mesmo evento da queue (clone de retry). O pattern check-then-act (`SADD` → processar → confirmar) não é atómico no ciclo completo. Resultado: notas duplicadas enviadas para LMS via LTI.

### Recomendação: RedLock antes de acções externas

```typescript
const lock = await redlock.acquire([`lock:event:${eventId}`], 30000);
try {
  // Processar: calcular score, enviar para LMS, gravar conquista
} finally {
  await lock.release();
}
```

- Worker 2 tenta adquirir lock → falha imediata → drop do clone
- Lock com TTL de 30s para evitar deadlocks em caso de crash
- **Apenas** para acções com side-effects externos (LTI, notificações)

---

## 4. Dead Letter Queue (DLQ) para Poison Pills

### Problema

Eventos malformados ou com referências inválidas (e.g., aluno eliminado do LMS) ficam em retry infinito, consumindo CPU e memória do Railway.

### Recomendação: Retry com escalation

1. **1º retry** — backoff 1s
2. **2º retry** — backoff 5s com jitter
3. **3º retry** — backoff 30s
4. **Falha no 3º** → mover para DLQ (`queue:dead-letter`)

A DLQ:
- **Não é cemitério** — é triagem assíncrona
- Liberta a queue principal para tráfego saudável
- Permite investigação manual sem pressão
- Classificar erros: retryable (network) vs terminal (LMS rejeitou aluno)

---

## 5. Cold Storage para Eventos Inválidos

### Problema

Eventos que falham na validação (bots, timestamps do futuro, batches de DDOS) são inseridos no Strapi com flag `invalidated: true`. Cada INSERT no Postgres custa CPU e disco — sob ataque, o DB colapsa.

### Recomendação: Desviar para Cloudflare R2

Em vez de `strapiService.create('domain-event', { ...event, invalidated: true })`:

1. Acumular eventos inválidos em buffer na memória (por pod)
2. A cada 60s, serializar como NDJSON
3. Upload para R2: `r2://telemetry-cold/invalid/2026-04-29/batch-{uuid}.ndjson`

**Benefícios:**
- Postgres recebe apenas dados limpos e valiosos
- Compliance mantida (dados não eliminados, auditáveis)
- Custo de armazenamento: cêntimos vs euros/GB em Postgres
- Se necessário, Tina pode analisar o cold storage com RAG

---

## 6. Edge: Tag, Don't Drop

### Problema

O Edge Worker descarta silenciosamente eventos inválidos (timestamps futuros, cliques impossíveis). O BFF mantém log dos que falham a auditoria profunda. Resultado: **dois cemitérios separados**, um invisível.

### Recomendação: Inspector, não executioner

O Edge **não descarta** eventos inválidos. Em vez disso:

1. Receber payload
2. Correr sanity check rápido
3. Se inválido: `event.invalidatedReason = 'edge_sanity'`
4. Push para a mesma queue (com a tag)

O consumer no BFF:
- Vê a tag → persiste directamente (sem recalcular)
- Sem tag → corre auditoria profunda
- Se falha → `invalidatedReason = 'bff_audit'`

**Resultado:** Base de dados com 100% do ledger. Administradores têm visão completa. Edge continua rápido (tagging custa milissegundos).

---

## 7. Schema Mismatches Documentados

| ID | Problema | Onde |
|----|----------|-----|
| **D20** | Edge envia `payload`, Strapi espera `data` | Edge Worker → BFF → Strapi |
| **D21** | `tentativa.metadata` omitido no CMS | BFF → Strapi content-type |
| **D22** | BFF envia `dateInicio`/`dateFim`, Strapi espera `startDate`/`endDate` | BFF → Strapi |

**Solução:** Package `@pdc/shared` com schemas Zod que forçam tipagem end-to-end. CI extrai content-types do Strapi e compara com schemas — build falha se houver divergência.

---

## 8. Worker Isolation — Event Loop do BFF

### Problema

O consumer de telemetria (BRPOP blocking) e o outbox replay (setInterval) correm no mesmo processo Node.js que serve HTTP. Após deploy com backlog de 50k eventos, o event loop satura → latência de 5s+ para utilizadores reais.

### Recomendação: Railway Worker Independente

- **Container 1 (BFF):** Hono routing, business logic, RBAC — rápido e responsivo
- **Container 2 (Worker):** BRPOP + setInterval + outbox replay — pode saturar sem afectar utilizadores

Se temporariamente impossível, chunking: processar 100 eventos → yield → próximos 100.

---

*Destilado de 3 transcrições de análise técnica · Análises independentes ao PDC v2 · Abril 2026*
