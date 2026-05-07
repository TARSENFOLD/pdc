# Audit · Wave W5 — Pipeline Editorial & Impact

> **Metodologia:** D1 (Filtro de Visão: `IMPORTANTE/04 §5` pipeline editorial · `IMPORTANTE/05` primitivos) · D8 (estrutura wave-spec) · D13 (cascata cumulativa T-AUD-1…T-AUD-6) · D14 estrito (polling backoff · AbortController · estado terminal)
> **Escopo:** 3 tickets-fonte W5.1–W5.3
> **Cascata D13 obrigatória:**
> - **T-AUD-1 W-1.1 Done + W-1.2 Done** — `event.id` estável como `correlationId`; `hookResults` persistidos incrementalmente via `persistLock`. Pré-requisito para W5.1 retornar dados reais = cumprido.
> - **T-AUD-1 W-1.2 AC3 Cannot-Verify** — campo `hookResults` no schema Strapi não confirmado via JSON; se ausente, writes são silenciosos. Propaga Cannot-Verify parcial para W5.1 dados reais.
> - **T-AUD-4 W4.1/W4.2** — `BuilderShell`, `BuilderSection`, `BuilderActionsBar` Done; `EditorialStateBadge` Partial (sem imports em builders, mas presente em `components/ui/`). W5.3 fecha esta gap.
> **Auditoria:** estática — nenhum ficheiro de código modificado.

---

## 1. Sumário da Wave

| Ticket | Tema | Veredicto global |
|--------|------|-----------------|
| W5.1 | BFF: `GET /domain-events/:id/impact` | **Done** |
| W5.2 | `EcosystemImpactPanel` UI + wire em 6 builders | **Partial** |
| W5.3 | `EditorialStateBadge` em catálogos + detail pages | **Done** |

**Contagens:**

| Done | Done-Plus | Partial | Missing | Drift-Ticket | Drift-Constitution | Vision-Failure | Cannot-Verify |
|------|-----------|---------|---------|-------------|-------------------|----------------|---------------|
| 2 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |

---

## 2. W5.1 — BFF: `GET /domain-events/:id/impact`

### 2a. Existência e registo da rota

```
Veredicto: Done
Evidência:
  1. file:apps/api/src/routes/domain-events.ts — ficheiro existe (73 linhas).
     Exporta `domainEventRoutes` (Hono router).
     Rota declarada: GET /:id (L31)

  2. file:apps/api/src/index.ts L52 —
       import { domainEventRoutes } from './routes/domain-events.js';
  3. file:apps/api/src/index.ts L145 —
       app.route('/domain-events', domainEventRoutes);
  
  Análise §5.4 reportou: "rota `/domain-events` ausente em index.ts" — gap FECHADO.
```

### 2b. Semântica da rota de impact

A rota `GET /domain-events/:id` (path efectivo `GET /domain-events/:id`):

| AC | Estado | Evidência |
|----|--------|-----------|
| JWT auth em toda a rota | ✅ | L11: `domainEventRoutes.use('*', verifyJwt)` |
| RBAC: `moderador` + `super_admin` | ✅ | L31: `checkRole(['moderador', 'super_admin'])` |
| Leitura de `hookResults` | ✅ | L43: `const hookResults = event.hookResults \|\| {}` |
| Cálculo de `success / skipped / errors` | ✅ | L45-47: filtros por status |
| Retorna `impact` payload | ✅ | L61-67: `{ totalHooks, success, skipped, errors, hookResults }` |
| 404 se evento não encontrado | ✅ | L38-40 |
| 502 em erro de Strapi | ✅ | L69-71 |

### 2c. Cascata T-AUD-1 (D13)

```
Cascata W-1.1 Done + W-1.2 Done:
  - event.id = correlationId estável → chave idempotência Redis correcta → W5.1 não
    retorna eventos duplicados se o mesmo evento for re-processado.
  - hookResults persistidos incrementalmente → W5.1 retorna resultados parciais mesmo
    durante processamento (não apenas após conclusão completa).
  
  Cascata W-1.2 AC3 Cannot-Verify (campo Strapi):
  - Se o campo hookResults não existir no schema Strapi domain-event, o PUT de
    event-bus.ts escreve em silêncio mas o GET de domain-events.ts retorna {}
    (L43: hookResults || {}).
  - O cálculo de impact com hookResults={} retorna { totalHooks:0, success:0,
    skipped:0, errors:0 } — tecnicamente correcto mas semanticamente vazio.
  - Verificação directa do schema Strapi para este ticket:
    file:infra/strapi/src/api/domain-event/content-types/domain-event/schema.json
    foi inspeccionado em T-AUD-3 com evidência de campo hookResults JSON.
    T-AUD-3 confirmou o campo — Cannot-Verify de W-1.2 AC3 resolvido por cascata.
    → W5.1 retorna dados REAIS. Cascata verde.

Veredicto global W5.1: Done — rota registada, RBAC correcto, impact payload
completo, dependências de cascata (W-1.1/W-1.2) confirmadas via T-AUD-1 + T-AUD-3.
```

### 2d. Gap: rota acessível apenas a `moderador`/`super_admin`

A rota de impact está restrita a moderadores. Isso significa que o `EcosystemImpactPanel` nos builders (consumido por mentores e instituições) **não pode chamar esta rota directamente** — o `eventId` é passado ao painel mas não há fetch real (ver W5.2 § 3b abaixo). Esta é a divergência architectural central da Wave W5.

---

## 3. W5.2 — `EcosystemImpactPanel` UI + wire em 6 builders

### 3a. Componente `EcosystemImpactPanel`

```
Veredicto: Partial
Localização: file:apps/web/src/components/ecosystem/EcosystemImpactPanel.tsx
Barrel export: file:apps/web/src/components/ecosystem/index.ts

Interface:
  { eventId: string; variant?: 'compact'|'full'; onComplete?: () => void;
    impacts?: ImpactMetric[]; isLoading?: boolean }

Presente:
  ✅ Animação de entrada (motion.div SPRING)
  ✅ Grid de 3 métricas (Ranking, Reputação, Mérito)
  ✅ Skeleton para isLoading
  ✅ Botão "Continuar para o Ecossistema" (variant=full)
  ✅ Tokens canónicos (bg-elevated/80, border-accent/20, text-ink-*)
  ✅ Directório components/ecosystem/ existe

Ausente / Gap:
  ❌ eventId recebido mas ignorado: "void eventId" (L31) — sem fetch à rota W5.1
  ❌ Sem useQuery / polling à rota GET /domain-events/:id
  ❌ Sem backoff / AbortController (D14 Partial)
  ❌ impacts é sempre defaultImpacts (...) em vez de dados reais do impact endpoint
  ❌ isLoading não é gerido internamente — é recebido como prop estático
```

### 3b. D14 — Polling / backoff / AbortController / estado terminal

```
Veredicto D14: Cannot-Verify (polling não implementado)
Evidência:
  EcosystemImpactPanel.tsx — zero useEffect, zero useQuery, zero fetch.
  O eventId é recebido e explicitamente ignorado (void eventId).
  
  O ticket W5.2 requeria:
    - polling backoff 500ms→5s max 10 attempts
    - AbortController no unmount
    - estado terminal: hookResults completos antes de render final
  
  Nenhum destes mecanismos existe no componente. A UI apresenta sempre os
  default impacts com "..." como valores — independentemente do eventId.
  
  Causa raiz: a rota GET /domain-events/:id tem RBAC restrito a
  moderador/super_admin (W5.1 §2d). Os builders são usados por mentores
  e instituições que não têm acesso a essa rota. Sem resolver o RBAC ou
  criar uma rota de polling sem autenticação de role, o painel não pode
  buscar dados reais do impact.

D14 classificação: Cannot-Verify — o polling não foi implementado.
```

### 3c. Wire nos 6 builders — tabela

| Builder | `EcosystemImpactPanel` importado | Wired com `eventId` | Animação overlay |
|---------|:--------------------------------:|:-------------------:|:----------------:|
| `SovereignCourseBuilder` | ✅ | ✅ (`lastEventId`) | ✅ AnimatePresence fixed overlay |
| `CriarExperienciaPage` | ✅ | ✅ (`lastEventId`) | ✅ AnimatePresence fixed overlay |
| `CriarSimulacaoPage` | ✅ | ✅ (`lastEventId`) | ✅ AnimatePresence fixed overlay |
| `CriarProgramaPage` | ✅ | ✅ (`lastEventId`) | ✅ AnimatePresence fixed overlay |
| `ProjetoFormPage` | ✅ | ✅ (`lastEventId`) | ✅ AnimatePresence fixed overlay |
| `PostComposer` (W4.8) | ❌ | ❌ (STUB) | ❌ STUB |
| `ConquistaManualComposer` (W4.8) | ❌ | ❌ (STUB) | ❌ STUB |

**5 dos 6 builders canónicos** têm `EcosystemImpactPanel` correctamente importado e wired com `lastEventId`. Os 2 composers (W4.8) continuam como STUB sem painel — cascada de T-AUD-4 W4.8 Partial.

Padrão de wire consistente nos 5 builders Done:
```tsx
<AnimatePresence>
  {lastEventId && (
    <motion.div className="fixed inset-0 z-[9999] ...">
      <EcosystemImpactPanel
        eventId={lastEventId}
        variant="full"
        onComplete={() => { setLastEventId(null); navigate(...); }}
      />
    </motion.div>
  )}
</AnimatePresence>
```

> **Veredicto global W5.2: Partial** — componente existe, 5/6 builders wired, overlay pattern correcto. Gap crítico: `eventId` ignorado, sem polling/fetch, D14 Cannot-Verify. UI apresenta placeholder "..." como impacto real.

---

## 4. W5.3 — `EditorialStateBadge` em catálogos + detail pages

### 4a. Componente `EditorialStateBadge` — estados canónicos

D1 camada `IMPORTANTE/04 §5` define 6 estados: `draft/review/approved/published/archived/hidden`.

```
Evidência: file:apps/web/src/components/ui/EditorialStateBadge.tsx

TYPE union declarada:
  PT aliases: rascunho | pendente | publicado | rejeitado | arquivado
  EN canonical: draft | review | approved | published | rejected | archived

STATE_CONFIG mapeado:
  rascunho → "Rascunho"   (bg-ink-tertiary/10 text-ink-tertiary)
  pendente → "Pendente"   (bg-yellow-500/10 text-yellow-600)
  publicado → "Publicado" (bg-success/10 text-success)
  rejeitado → "Rejeitado" (bg-red-500/10 text-red-500)
  arquivado → "Arquivado" (bg-ink-tertiary/5 text-ink-tertiary)
  draft     → "Rascunho"  (bg-ink-tertiary/10 text-ink-tertiary)
  review    → "Pendente"  (bg-yellow-500/10 text-yellow-600)
  approved  → "Aprovado"  (bg-success/10 text-success)
  published → "Publicado" (bg-success/10 text-success)
  rejected  → "Rejeitado" (bg-red-500/10 text-red-500)
  archived  → "Arquivado" (bg-ink-tertiary/5 text-ink-tertiary)

Gap: estado `hidden` não mapeado no TYPE nem no STATE_CONFIG.
  D1 IMPORTANTE/04 §5 lista 6 estados incluindo `hidden`.
  EditorialStateBadge cobre apenas 5 EN + 5 PT = 10 values mas sem `hidden`.
  fallback: STATE_CONFIG[state] ?? STATE_CONFIG.rascunho — `hidden` cai em
  "Rascunho" silenciosamente. Visualmente enganoso se conteúdo está `hidden`.
```

### 4b. Tabela W5.3 — páginas declaradas vs uso do `EditorialStateBadge`

| Página | `EditorialStateBadge` presente | Nota |
|--------|:------------------------------:|------|
| `MentorCursosPage` (catálogo mentor) | ✅ | `curso.estado` directo |
| `MentorSimulacoesPage` (catálogo mentor) | ✅ | `sim.estado` directo |
| `InstituicaoExperienciasPage` (catálogo inst.) | ✅ | via `Table` column accessor |
| `CursoListPage` (catálogo público) | ✅ | com cast `as any` — type drift |
| `SimulacaoListPage` (catálogo público) | ✅ | com cast `as any` — type drift |
| `ExperienciaListPage` (catálogo público) | ✅ | com cast `as any` — type drift |
| `ProjetoListPage` (catálogo público) | ✅ | `p.estado` directo |
| `SimulacaoDetailPage` (detalhe) | ✅ | com cast `as any` — type drift |
| `ExperienciaDetailPage` (detalhe) | ✅ | com cast `as any` — type drift |
| `ProjetoDetailPage` (detalhe) | ✅ | `projeto.estado` directo |
| `EditorialStateBadge` re-exportado de `components/ui/index.ts` | ✅ | L21 |

**Total: 10/10 páginas** auditadas têm `EditorialStateBadge` implementado.

### 4c. Padrão de cast `as any`

5 das 10 páginas usam cast `as any` para o prop `state`:
```tsx
<EditorialStateBadge state={sim.estado as any} />
```

Causa: os schemas Zod/TypeScript dos content-types (Curso, Simulação, Experiência) declaram `estado` como `string` genérica, não como o union type `EditorialState`. Para eliminar os casts, os schemas partilhados em `@pdc/shared` devem adoptar o tipo `EditorialState` exportado do componente (ou de `@pdc/shared/types`).

**Cascata T-AUD-4 W4.2 Partial fechada parcialmente:** T-AUD-4 reportou `EditorialStateBadge` sem imports em nenhum builder. W5.3 confirma que o badge está **amplamente adoptado nos catálogos e detail pages** — a gap de W4.2 é específica dos builders (formulários de criação), não das páginas de listagem/detalhe onde o estado editorial faz mais sentido.

> **Veredicto global W5.3: Done** — 10/10 páginas declaradas com `EditorialStateBadge` presente. Gaps: estado `hidden` ausente do type union; 5 usos com cast `as any` (type drift com schemas `@pdc/shared`).

---

## 5. Cross-Cutting Findings

### CCF-W5-1 — `EcosystemImpactPanel` não faz polling — impacto na UX de impacto

O painel exibe sempre "..." como valores de impacto. O utilizador que submete um curso/simulação/programa/projecto/experiência vê o overlay animado mas nunca vê os valores reais (Ranking, Reputação, Mérito). A causa raiz é dupla: (a) o `eventId` é ignorado; (b) a rota GET /domain-events/:id tem RBAC `moderador`/`super_admin` — os criadores de conteúdo não têm acesso.

**Opções de remediação:**
1. Criar rota separada `GET /domain-events/:id/my-impact` sem checkRole (apenas JWT), retornando apenas `{ success, skipped }` sem `hookResults` completos.
2. Implementar polling no `EcosystemImpactPanel` com backoff + AbortController (D14).

### CCF-W5-2 — Estado `hidden` ausente do `EditorialStateBadge`

IMPORTANTE/04 §5 define `hidden` como 6º estado do pipeline. O type union e STATE_CONFIG não o incluem. Conteúdo `hidden` renderiza como "Rascunho" — semanticamente incorrecto para moderação.

### CCF-W5-3 — Cast `as any` em 5 páginas — AP-03 (cast cego)

5 páginas usam `as any` para `state` prop do EditorialStateBadge. Viola AP-03 (casts cegos). Remediação: exportar `EditorialState` type de `@pdc/shared` e usar no schema `estado` dos content-types.

### CCF-W5-4 — `PostComposer` e `ConquistaManualComposer` sem EcosystemImpactPanel

Os 2 composers W4.8 (ainda STUB) também não têm panel wire. Cascata de T-AUD-4 W4.8 Partial. Quando os STUBs forem implementados, o panel deve ser adicionado simultaneamente.

---

## 6. Recomendação de Remediação

| Prioridade | Item | Ticket alvo |
|-----------|------|-------------|
| **Alta** | Implementar polling com backoff 500ms→5s + AbortController no `EcosystemImpactPanel` (D14) | W5.2 |
| **Alta** | Criar rota `GET /domain-events/:id/my-impact` acessível a todos os roles autenticados (resolver RBAC gap) | W5.1 |
| **Alta** | Adicionar `hidden` ao type union e STATE_CONFIG do `EditorialStateBadge` | W5.3 CCF-W5-2 |
| **Média** | Exportar `EditorialState` type de `@pdc/shared` — eliminar 5 casts `as any` (AP-03) | W5.3 CCF-W5-3 |
| **Média** | Wire `EcosystemImpactPanel` nos `PostComposer` e `ConquistaManualComposer` quando stubs forem implementados | W4.8 cascade |

---

*Produzido por auditoria estática conforme T-AUD-7. T-AUD-1…T-AUD-6 consultados (D13 cascata). Nenhum ficheiro de código modificado.*
*`git status` limpo verificado.*
