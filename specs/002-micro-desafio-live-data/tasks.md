# Tasks: MicroDesafio — Live Pulse e Carrossel com Dados Reais

**Input**: Design documents from `specs/002-micro-desafio-live-data/`  
**Branch**: `002-micro-desafio-live-data`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data model**: [data-model.md](./data-model.md) | **Contract**: [contracts/landing-pulse.md](./contracts/landing-pulse.md)

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[US1]**: User Story 1 — Live Pulse em tempo real
- **[US2]**: User Story 2 — Carrossel enriquecido

---

## Phase 1: Setup

**Purpose**: Não há repositório nem dependências novas a instalar — o monorepo, Socket.IO, Hono e react-router-dom já estão configurados. Única acção de setup é desbloquear as conexões anónimas ao Socket.IO, pré-requisito para que visitantes da landing recebam eventos.

- [X] T001 Tornar o middleware de auth do Socket.IO soft (permitir conexões sem JWT) e adicionar `emitirLandingPulse()` em `apps/api/src/modules/realtime/socket.service.ts`

  **Detalhe**:  
  - No bloco `if (!token)`: substituir `next(new Error('Unauthorized'))` por `next()` (sem definir `userId`)  
  - Adicionar método `emitirLandingPulse(area: string | undefined, count: number): void` que faz `io.emit('landing:pulse', { count, ...(area ? { area } : {}) })`  
  - Manter todo o comportamento existente: conexões autenticadas continuam a funcionar; rooms `user:${userId}` só se criam quando `userId` existe

**Checkpoint**: Socket aceita conexões anónimas; método `emitirLandingPulse` disponível para o serviço de pulse

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Criar a infra de contagem in-process e o endpoint HTTP que a alimenta. Deve estar completo antes de qualquer validação end-to-end do US1.

**⚠️ CRÍTICO**: US1 não pode ser verificado end-to-end sem esta fase completa

- [X] T002 [US1] Criar `apps/api/src/modules/landing/pulse.service.ts` com contador in-process, TTL 60s e debounce 1s

  **Detalhe**:  
  - `active: Map<string, Set<string>>` — área → Set de sessionIds  
  - `timers: Map<string, NodeJS.Timeout>` — chave `${area}:${sessionId}` → timer de TTL  
  - `pendingEmit: Map<string, NodeJS.Timeout>` — área → timer de debounce  
  - `recordActivity(sessionId: string, area?: string): void`:  
    1. Normalizar área: `area?.trim().toUpperCase() || 'GERAL'`  
    2. Cancelar timer TTL anterior; adicionar sessionId ao Set; agendar timer 60s que remove o sessionId e, se o Set ficar vazio, remove a entrada do Map  
    3. Cancelar debounce pendente; agendar debounce 1s que chama `socketService.emitirLandingPulse(area, count)` onde `count = active.get(area)?.size ?? 0`  
  - Importar `socketService` de `../../modules/realtime/socket.service.js`

- [X] T003 [US1] Criar `apps/api/src/routes/landing.ts` — `POST /landing/pulse` público

  **Detalhe**:  
  - Usar `zValidator` do Hono para validar body: `{ sessionId: z.string().min(1).max(64), area: z.string().optional() }`  
  - Chamar `pulseService.recordActivity(sessionId, area)`  
  - Responder `200 { ok: true }` sempre; `400 { error: '...' }` se validação falhar  
  - Sem auth middleware nesta rota (pública)  
  - Exportar `landingRoutes` como `Hono`

- [X] T004 [US1] Registar a rota `/landing` em `apps/api/src/index.ts`

  **Detalhe**:  
  - Adicionar `import { landingRoutes } from './routes/landing.js';`  
  - Adicionar `app.route('/landing', landingRoutes);` junto das outras rotas

**Checkpoint**: `POST /landing/pulse` retorna `{ ok: true }` e o BFF emite `landing:pulse` via Socket.IO após 1s

---

## Phase 3: User Story 1 — Live Pulse em tempo real (P1) 🎯 MVP

**Goal**: Visitantes anónimos vêem o contador ao vivo de outros utilizadores a fazer o desafio na mesma área

**Independent Test**: Abrir 2 abas em `localhost:5173`; na aba 1 submeter texto do desafio; verificar que na aba 2 o indicador `⚡ X pessoas em [área] agora` aparece em menos de 2 segundos

- [X] T005 [P] [US1] Actualizar `apps/web/src/features/landing/useMicroDesafio.ts` — notificar BFF quando o utilizador submete o texto

  **Detalhe**:  
  - Antes do `useState`, obter ou criar `sessionId` com:  
    ```ts
    const sessionId = useMemo(() => {
      const stored = sessionStorage.getItem('pdc_session_id');
      if (stored) return stored;
      const id = crypto.randomUUID();
      sessionStorage.setItem('pdc_session_id', id);
      return id;
    }, []);
    ```  
  - No callback `submeterTexto`, após `setState(...)`, adicionar fire-and-forget:  
    ```ts
    const area = detectarArea(s.textoLivre);
    void fetch(`${API_URL}/landing/pulse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, area: area !== 'GERAL' ? area : undefined }),
    }).catch(() => undefined);
    ```  
  - Não alterar nenhum outro comportamento do hook (o `on('landing:pulse', cb)` já existe e funciona)

**Checkpoint**: Ao submeter texto numa aba, o socket emite `landing:pulse` e o indicador aparece em todas as abas abertas

---

## Phase 4: User Story 2 — Carrossel Enriquecido (P2)

**Goal**: Os cartões do carrossel de instituições mostram `regiao`, `tipo` e são clicáveis quando `slug` existe

**Independent Test**: Aceder à landing com dados reais no catálogo; verificar que cartões com `regiao`/`tipo` preenchidos mostram esses campos; cartões com `slug` são clicáveis

- [X] T006 [P] [US2] Actualizar `apps/web/src/features/landing/CarrosselInstituicoes.tsx` — adicionar `regiao`, `tipo` e link para `/instituicoes/:slug`

  **Detalhe**:  
  - Adicionar import: `import { Link } from 'react-router-dom';`  
  - Envolver o conteúdo actual de cada `<motion.div key={inst.id}>` num `<Link>`:  
    - Se `inst.slug` existe: `<Link to={'/instituicoes/' + inst.slug}>...</Link>`  
    - Se não tem slug: manter como `<div>` não clicável  
  - Dentro do cartão, após `<span className="...line-clamp-2">{inst.nome}</span>`, adicionar:  
    ```tsx
    {inst.tipo && (
      <span className="rounded-full bg-amber/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber">
        {inst.tipo}
      </span>
    )}
    {inst.regiao && (
      <span className="text-[10px] text-text-muted">{inst.regiao}</span>
    )}
    ```  
  - Zero-mock: sem fallback, sem placeholder — só renderiza quando os campos existem e são truthy  
  - A `motion.div` existente com `animate opacity/scale` deve permanecer como wrapper

**Checkpoint**: Carrossel mostra região e tipo quando disponíveis; clique em cartão com slug navega correctamente

---

## Phase 5: Polish & Validação

**Purpose**: Verificar que nenhuma das alterações introduziu erros de compilação

- [X] T007 Validar TypeScript sem erros em ambos os apps

  **Detalhe**:  
  ```bash
  npx tsc --noEmit -p apps/api/tsconfig.json && npx tsc --noEmit -p apps/web/tsconfig.json
  ```  
  Resolver quaisquer erros resultantes das alterações a `socket.service.ts`, `pulse.service.ts`, `landing.ts`, `index.ts`, `useMicroDesafio.ts` e `CarrosselInstituicoes.tsx`

---

## Dependencies

```
T001 (foundational)
  └─► T002 (pulse.service precisa de emitirLandingPulse)
        └─► T003 (landing route precisa de pulseService)
              └─► T004 (index precisa de landingRoutes)

T001 (paralelo com T002+)
  └─► T005 [P] (frontend — independente do BFF, pode começar após T001 estar feito)

T006 [P] — completamente independente, pode começar a qualquer momento

T007 — depois de T001–T006 todos completos
```

## Parallel Execution

**Sprint único** — todas as tarefas são rápidas (ficheiros pequenos):

| Sequência | Tarefas |
|-----------|---------|
| 1 | T001 |
| 2 | T002 + T005 + T006 (em paralelo) |
| 3 | T003 |
| 4 | T004 |
| 5 | T007 |

## Implementation Strategy

**MVP**: T001 → T002 → T003 → T004 → T005 — entrega US1 (live pulse end-to-end)  
**Incremento 2**: T006 — entrega US2 (carrossel enriquecido), completamente independente

Ambas as histórias são rápidas (3–5h estimadas no total).
