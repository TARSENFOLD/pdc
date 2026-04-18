# Research: MicroDesafio — Live Pulse e Carrossel com Dados Reais

**Date**: 2026-04-08  
**Branch**: `002-micro-desafio-live-data`

---

## Decision 1: Socket.IO auth — permitir conexões anónimas

**Decision**: Tornar o middleware de auth **soft** — conexões sem JWT são admitidas com `userId = null`.

**Rationale**: A landing page é pública. Visitantes anónimos precisam de receber eventos `landing:pulse` via Socket.IO. O `socket.client.ts` já conecta com `withCredentials: true` e o `useMicroDesafio.ts` já faz `on('landing:pulse', cb)`. Forçar auth bloquearia todas as conexões da landing. Conexões anónimas recebem apenas eventos broadcast; não podem aceder a rooms privadas (e.g., `user:${userId}`).

**Alternatives considered**:
- Namespace dedicado `/landing` sem auth — exigiria um segundo socket client na frontend; mais complexo sem ganho real
- Server-Sent Events (SSE) em vez de Socket.IO — funciona para broadcasting mas a infra Socket.IO já existe e o frontend já consome `landing:pulse`; evitar duplicar camada de realtime

**Impact on existing code**: Mudar `if (!token) { next(new Error('Unauthorized')); return; }` para `if (!token) { next(); return; }` — permite anónimos mas não define `socket.data.userId`. Clientes autenticados continuam a funcionar sem alteração.

---

## Decision 2: Redis vs contador in-process para o Live Pulse

**Decision**: Contador **in-process** com `Map<area, Set<sessionId>>` e `setTimeout` para TTL de 60s. Redis como fallback opcional.

**Rationale**: O spec aceita explicitamente "in-process" (FR-002: "Redis ou in-process"). O Redis upstash lança erro se as env vars não estiverem configuradas — tornando a landing inacessível sem Redis em dev local. Instâncias únicas (deploy single-node) em staging/prod não perdem consistência. Se escalar para multi-node, adicionar Redis mais tarde.

**Alternatives considered**:
- Redis sempre obrigatório — mas o client existente (`apps/api/src/lib/redis.js`) lança `throw new Error(...)` se `UPSTASH_REDIS_REST_URL` não existir, o que quebraria a landing em todos os ambientes sem Redis
- Redis com graceful fallback — possível, mas add complexidade sem necessidade imediata; YAGNI

**Implementation**: `pulseService` em `apps/api/src/modules/landing/pulse.service.ts` — `Map<string, Set<string>>` onde key é área e Set contém sessionIds; cada entrada tem um timer de 60s; quando o Set fica vazio, emite `{ count: 0, area }` opcionalmente

---

## Decision 3: Como o frontend notifica o BFF de actividade

**Decision**: HTTP `POST /landing/pulse` (endpoint público, sem auth) chamado pelo `useMicroDesafio.ts` após `submeterTexto()`.

**Rationale**: O `comecar()` não tem área ainda (o utilizador ainda não escreveu nada). O melhor momento para emitir com área relevante é após `submeterTexto()`, quando `detectarArea()` já correu. Um simples fire-and-forget `fetch` é suficiente — falha silenciosa, não impede o fluxo.

**Alternatives considered**:
- Frontend emite via socket (e.g., `socket.emit('landing:activity', { area })`) — requer que o socket esteja conectado *antes* de submeter o texto; race condition potencial; HTTP é mais fiável
- BFF detecta actividade a partir do `POST /tina/chat` — polui um endpoint genérico com lógica de landing; não funciona para perguntas individuais

**sessionId**: Gerado pelo frontend com `crypto.randomUUID()` e guardado em `sessionStorage`. Persiste durante a sessão do browser, expira ao fechar o tab. Enviado no body de `POST /landing/pulse`.

---

## Decision 4: Carrossel — regiao, tipo e link

**Decision**: Adicionar ao cartão existente: `regiao` como texto secundário, `tipo` como badge pequeno, e wrapping em `<Link to={slug}>` quando `inst.slug` existe.

**Rationale**: Os campos já estão em `InstituicaoPublica` e já vêm da API. Nenhuma alteração no BFF é necessária. O cartão é actualmente `<motion.div>` — substituir por `<motion.div` dentro de um `<Link>` do react-router.

**Alternatives considered**:
- Novo endpoint `/catalogo/instituicoes?fields=regiao,tipo` — desnecessário; a API já retorna todos os campos do schema
- Tooltip para regiao/tipo — desnecessária complexidade; campos curtos cabem directamente no cartão

---

## Decision 5: Debounce de emissões Socket.IO (FR-008)

**Decision**: Debounce de **1s** por área usando `setTimeout` no `pulseService`. Se chegar outra actividade da mesma área dentro de 1s, cancela o timer anterior e agenda novo broadcast.

**Rationale**: Evita flood quando vários utilizadores clicam "começar" ao mesmo tempo. 1s é o mínimo especificado no FR-008.

**Implementation**: `pendingEmit: Map<string, NodeJS.Timeout>` no pulseService — `clearTimeout` + `setTimeout` a cada `recordActivity()`.
