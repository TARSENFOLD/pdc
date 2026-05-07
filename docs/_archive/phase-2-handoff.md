# Phase 2 Handoff — Reversão Cirúrgica Pós-Agente

> **Epic:** `8dc1663f-4a62-407f-b07e-580ce406419d` — CI Pipeline Fix: Resolving Typecheck Failures in PDC Monorepo
> **Data:** 2026-04-27
> **Fase 1:** Concluída (T1–T7)

> [!CAUTION]
> Este branch está em estado **local / não-mergeável** enquanto os 3 routers em falta não forem implementados na Fase 2. O `apps/api` typecheck está deliberadamente vermelho.

---

## 1. Estado Final dos 3 Workspaces

### `packages/shared` — ✅ VERDE

```
npm run typecheck -w packages/shared → 0 erros
```

Nenhuma regressão. Comentário FIXME adicionado em `index.ts` documentando a ausência deliberada de `export * from './infra.js'`.

### `apps/web` — 🟡 29 erros (baseline preservado)

```
npm run typecheck -w apps/web → 29 erros
```

| Ficheiro | Erros | Natureza |
|----------|-------|----------|
| `PerfilShowcase.tsx` | 23 | JSX duplicado / malformado (pré-existente) |
| `InstallPrompt.tsx` | 6 | JSX malformado (pré-existente) |

Todos os erros são **pré-existentes** — nenhum foi introduzido ou removido pela Fase 1.

### `apps/api` — 🔴 57 erros (3 intencionais + 54 pré-existentes)

```
npm run typecheck -w apps/api → 57 erros
```

**3 erros intencionais** (routers em falta, documentados com FIXME no `index.ts`):
- `Cannot find module './routes/feed-posts.js'`
- `Cannot find module './routes/home.js'`
- `Cannot find module './routes/domain-events.js'`

**54 erros pré-existentes** distribuídos por 26 ficheiros (maioria `TS7006: Parameter implicitly has 'any' type`).

---

## 2. Disposição dos 9 Stubs

| # | Ficheiro | Categoria | Consumidores | Estado Final |
|---|----------|-----------|-------------|--------------|
| 1 | `components/catalogo/CatalogoGridShell.tsx` | mark-only (T5) | 8 páginas catálogo | FIXME adicionado. Props `pageCount`/`onPageChange` aceites mas ignoradas. |
| 2 | `components/catalogo/CatalogoFilterBar.tsx` | mark-only (T5) | 8 páginas catálogo | FIXME adicionado. |
| 3 | `components/catalogo/ContentCard.tsx` | mark-only (T5) | 8 páginas catálogo | FIXME adicionado. Mínimo viável. |
| 4 | `components/dashboard/ContentTypeCTAGrid.tsx` | mark-only (T5) | 4 dashboards | FIXME adicionado. |
| 5 | `components/layout/BootstrapErrorScreen.tsx` | mark-only (T5) | BootstrapContext | FIXME adicionado. |
| 6 | `features/home/HomePage.tsx` | mark-only (T5) | router `/app/home` | FIXME adicionado. Placeholder trivial. |
| 7 | `components/builders/index.tsx` | bugfix + mark (T6) | 5 builders | Bug `default→named` já corrigido em commit anterior. FIXME adicionado. `BuilderSection.value` ignorado. |
| 8 | `features/feed/PostComposer.tsx` | shell mínima (T7) | router `/app/feed/criar` | Shell com título, descrição, empty state, backlink para `/app/feed`. |
| 9 | `features/conquistas/ConquistaManualComposer.tsx` | shell mínima (T7) | router `/app/conquistas/criar` | Shell com título, descrição, empty state, backlink para `/app/conquistas`. |

---

## 3. Dívidas Explícitas (abertas para Fase 2)

### 3.1 Stubs com lacunas conhecidas

- **`BuilderSection.value`** — prop aceite na interface mas não usada no render. Os 5 consumers passam `value` para discriminar secções, mas o stub ignora-o. Impacto: visual (não runtime).
- **Tipos `any`** nos builders stubs — `BuilderActionsBar` aceita `any` como props; `BuilderShellProps.form: any`. Viola Constituição §2 (Zero Any).
- **`CatalogoGridShell.pageCount`/`onPageChange`** — desestruturados mas não implementados. 8 páginas passam estas props sem efeito.

### 3.2 Drift docs ↔ runtime

- **Exports `AppLayout`/`TopBar`** — documentação (`.coderabbit.instructions`) prescreve `export function ComponentName()`, mas o par está como named export + named import (runtime consistente). Divergência documentada como FIXME no `AppLayout.tsx`.
- **Rotas canónicas** — docs favorecem `/estudante/*`, código usa `/app/dashboard/estudante`. Separação `/app/home` vs dashboards é intencional.

### 3.3 Divergência Zod ↔ Strapi em `proposta`

| Camada | Campo | Valores |
|--------|-------|---------|
| Zod (`schemas/propostas.ts`) | `estado` | `['pendente', 'aceita', 'recusada', 'rejeitada']` |
| Strapi (`api/proposta/.../schema.json`) | `status` | `['pendente', 'aceita', 'recusada', 'expirada']` |

- Nome do campo divergente (`estado` vs `status`)
- Valor `'rejeitada'` (Zod) ≠ `'expirada'` (Strapi)
- Risco: validação Zod rejeita payloads com valores Strapi legítimos

### 3.4 `CriarExperienciaPage` — inconsistência schema

A página usa shape `{ autor, cargo, depoimento }` nos defaults/append/register, mas o `MuralVozesItemSchema` canónico em `@pdc/shared` define `{ tipo, nome, videoUrl, citacao }`. Internamente consistente (T4 confirmado), mas desalinhada com o contrato partilhado. Migração deferida.

### 3.5 Ficheiros JSX malformados (pré-existentes)

- `PerfilShowcase.tsx` — 23 erros de JSX duplicado/malformado
- `InstallPrompt.tsx` — 6 erros de JSX malformado

Estes erros são **anteriores** à intervenção do agente e à Fase 1. Resolver requer limpeza cirúrgica dos ficheiros.

---

## 4. Mapa da Fase 2

### 4.1 Três routers em falta (bloqueiam merge)

| Router | Contrato em `@pdc/shared` | Dependências internas |
|--------|---------------------------|----------------------|
| `routes/home.ts` | `HomeSummarySchema` (`packages/shared/src/home.ts`) — pronto | Strapi queries para dashboard home |
| `routes/domain-events.ts` | 49 `DomainEventName` + Zod (`packages/shared/src/domain-events.ts`) — pronto | `eventBus` (`modules/events/event-bus.ts`) — instanciado |
| `routes/feed-posts.ts` | Sem schema correspondente identificado | Clarificar se é router de criação separado de `feed.ts` ou vestigial |

### 4.2 Auditoria de schemas migrados (6 alvos)

| Schema | Risco | Acção necessária |
|--------|-------|------------------|
| `experiencias.ts` | **Real** — shape `MuralVozes` divergente | Migrar `CriarExperienciaPage` ao shape canónico |
| `propostas.ts` | **Latente** — enum `estado` vs Strapi `status` | Reconciliar nomes e valores |
| `programas.ts` | Baixo — aditivo | Validar consumidores dos novos campos |
| `projetos.ts` | Baixo — aditivo + 5º modo | Validar `ProjetoFormPage` |
| `vinculos.ts` | Não auditado | Auditoria pendente |
| `mentorias.ts` | Não auditado | Auditoria pendente |

### 4.3 Evolução dos 3 stubs placeholder

| Stub | Decisão pendente |
|------|-----------------|
| `PostComposer.tsx` | Formulário real com `react-hook-form`, validação Zod, mutação API, hooks G15 |
| `ConquistaManualComposer.tsx` | Formulário real com upload de evidência, validação, mutação API |
| `features/home/HomePage.tsx` | Dashboard home real consumindo `HomeSummarySchema` via router `/app/home` |

### 4.4 Erros pré-existentes a resolver

- **`apps/web`**: `PerfilShowcase.tsx` (23 erros JSX), `InstallPrompt.tsx` (6 erros JSX)
- **`apps/api`**: 54 erros `TS7006` (implicit `any`) + 1 `TS2305` (`StrapiListResponse` inexistente) — distribuídos por 26 ficheiros

---

## 5. Resumo Executivo

A Fase 1 atingiu o seu objectivo: **o working tree reflecte realidade arquitectural, não dano colateral**. A CI está vermelha por razões documentadas e compreendidas:

- `packages/shared` → verde ✅
- `apps/web` → 29 erros pré-existentes (nenhum novo) 🟡
- `apps/api` → 3 erros intencionais (routers em falta) + 54 pré-existentes 🔴

Os 9 stubs estão todos marcados com FIXME, categorizados, e com consumidores documentados. O branch não é mergeável até que os 3 routers sejam implementados na Fase 2.
