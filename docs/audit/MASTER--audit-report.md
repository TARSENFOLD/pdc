# Audit Report — Audit & Premium UI End To End

> **Estrutura:** D9 (mestre pós 8 wave-specs) · D11 (Audit Infrastructure Gaps) · D15 (Drift Constitucional)
> **Cobertura:** 38 tickets-fonte · 8 waves (W-1, W0, W1, W2, W3, W4, W5, W6)
> **Wave-specs:** `wave-W-1` · `wave-W0` · `wave-W1` · `wave-W2` · `wave-W3` · `wave-W4` · `wave-W5` · `wave-W6`
> **Data de consolidação:** 2026-04-29
> **Auditoria:** estática — nenhum ficheiro de código modificado.

---

## § 1 — Sumário Executivo

### Estado Global

| Estado | Count | % |
|--------|------:|--:|
| **Done** | 21 | 55% |
| **Done-Plus** | 4 | 11% |
| **Partial** | 12 | 32% |
| **Missing** | 1 | 3% |
| **Drift-Ticket** | 0 | 0% |
| **Drift-Constitution** | 0 | 0% |
| **Vision-Failure** | 0 | 0% |
| **Cannot-Verify** | 0 | 0% |
| **Total** | **38** | 100% |

> **Nota:** W2.5 e W6.5 têm sub-ACs com `Cannot-Verify` (snapshot baseline / Lighthouse) mas o veredicto global do ticket é `Partial`. A contagem W2 wave-spec reporta `Drift-Ticket: 1` referente a CCF-W2-2 (inconsistência de prefixo de rotas) como sub-achado, não como veredicto de ticket.

**Saúde global: 66% Done/Done-Plus · 32% Partial · 3% Missing**

Nenhum `Vision-Failure` nem `Drift-Constitution` confirmado — o produto está dentro do envelope arquitectural definido pelas specs IMPORTANTE. Os `Partial` são maioritariamente stubs funcionais (placeholders navegáveis) e ausências de features premium; o `Missing` é W6.4 (⌘K search dinâmico).

---

## § 2 — Tabela 38×8

> Legenda: ✅ Done · ✅+ Done-Plus · 🟡 Partial · ❌ Missing · 🔁 Drift-Ticket · 📜 Drift-Constitution · 💀 Vision-Failure · ❓ Cannot-Verify

### Wave W-1 — Stabilization Invariants (5 tickets)

| # | Ticket | Tema | Veredicto |
|---|--------|------|-----------|
| 1 | W-1.1 | Outbox replay preserva `correlationId` como `event.id` | ✅ Done |
| 2 | W-1.2 | Persistência incremental de `hookResults` no `domain-event` | ✅ Done |
| 3 | W-1.3 | `notifyHook` contract alignment com schema `notificacao` | ✅+ Done-Plus |
| 4 | W-1.4 | `useFeatureFlags` lê via `BootstrapContext` | ✅ Done |
| 5 | W-1.5 | Characterization tests Sidebar render-by-role + redirect pós-login | 🟡 Partial |

### Wave W0 — Bootstrap & Foundation (3 tickets)

| # | Ticket | Tema | Veredicto |
|---|--------|------|-----------|
| 6 | W0.1 | 6 `HUB_*` no Features SSOT + seed Strapi + `/health/feature-registry` | ✅ Done |
| 7 | W0.2 | `BootstrapContext` retry 1→3 + `BootstrapErrorScreen` premium | 🟡 Partial |
| 8 | W0.3 | `/estudante/dashboard` fallback gracioso + `AspirationalEmpty` tiles vazios | 🟡 Partial |

### Wave W3 — Strapi & BFF Full-Spec (7 tickets)

| # | Ticket | Tema | Veredicto |
|---|--------|------|-----------|
| 9 | W3.1 | Programa Full-Spec (13+ campos aditivos) | ✅ Done |
| 10 | W3.2 | Projeto (camadas pública/core + ACL + 4 modos) | ✅ Done |
| 11 | W3.3 | Simulação Full-Spec (materiaisLab + criterios + tipoLab + RBAC) | ✅ Done |
| 12 | W3.4 | Experiência (workflow Comité + RBAC mentor + Zod expansion) | ✅+ Done-Plus |
| 13 | W3.5 | Post composer (`feed-post` NEW + BFF route + moderation queue) | 🟡 Partial |
| 14 | W3.6 | Conquista manual (origem flag + BFF route) | ✅ Done |
| 15 | W3.7 | DEPRECATED labels + `/health/schema-drift` | ✅ Done |

### Wave W4 — Builder Primitives + 6 Builders (8 tickets)

| # | Ticket | Tema | Veredicto |
|---|--------|------|-----------|
| 16 | W4.1 | `BuilderShell` + `BuilderSection` | ✅ Done |
| 17 | W4.2 | `BuilderActionsBar` + `EditorialStateBadge` + `BuilderUploadZone` | 🟡 Partial |
| 18 | W4.3 | Curso: migração para `BuilderShell` (`SovereignCourseBuilder`) | ✅ Done |
| 19 | W4.4 | Experiência: builder Full-Spec 4 painéis | ✅ Done |
| 20 | W4.5 | Simulação: builder Full-Spec + critérios + materiais + tipoLab | ✅+ Done-Plus |
| 21 | W4.6 | Programa: builder Full-Spec 4 secções | ✅ Done |
| 22 | W4.7 | Projeto: builder camadas Pública/Core + 4 modos + ACL | ✅ Done |
| 23 | W4.8 | Post composer + Conquista manual composer | 🟡 Partial |

### Wave W2 — Soul & Elite Dashboards + Token Purge (5 tickets)

| # | Ticket | Tema | Veredicto |
|---|--------|------|-----------|
| 24 | W2.1 | Token purge cross-monorepo (`bg-amber*`, `text-amber*`, `cobalt` literal) | 🟡 Partial |
| 25 | W2.2 | `ContentTypeCTAGrid` primitive + `MentorDashboard` Soul & Elite | 🟡 Partial |
| 26 | W2.3 | `InstituicaoDashboard` Soul & Elite + CTAs canónicos | ✅ Done |
| 27 | W2.4 | `ModeradorDashboard` + `AdminDashboard` Soul & Elite | ✅ Done |
| 28 | W2.5 | `EstudanteDashboard` polish + Playwright snapshot baseline | 🟡 Partial (sub-AC snapshot = Cannot-Verify) |

### Wave W1 — TopBar Premium + CommandPalette Skeleton (2 tickets)

| # | Ticket | Tema | Veredicto |
|---|--------|------|-----------|
| 29 | W1.1 | TopBar: `RoleChipMenu` + `NotificationsDropdown` + token purge | ✅ Done |
| 30 | W1.2 | `CommandPalette` ⌘K skeleton (rotas estáticas) | ✅+ Done-Plus |

### Wave W5 — Pipeline Editorial & Impact (3 tickets)

| # | Ticket | Tema | Veredicto |
|---|--------|------|-----------|
| 31 | W5.1 | BFF: `GET /domain-events/:id/impact` | ✅ Done |
| 32 | W5.2 | `EcosystemImpactPanel` UI + wire em 6 builders | 🟡 Partial |
| 33 | W5.3 | `EditorialStateBadge` em catálogos + detail pages | ✅ Done |

### Wave W6 — Catálogos & a11y (5 tickets)

| # | Ticket | Tema | Veredicto |
|---|--------|------|-----------|
| 34 | W6.1 | `CatalogoGridShell` + `ContentCard` + `CatalogoFilterBar` primitives | 🟡 Partial |
| 35 | W6.2 | Migrar catálogos Cursos + Simulações | ✅ Done |
| 36 | W6.3 | Migrar catálogos Mentores + Instituições + Programas | ✅ Done |
| 37 | W6.4 | `CommandPalette` ⌘K real — search dinâmico | ❌ Missing |
| 38 | W6.5 | a11y final pass + Lighthouse mobile ≥90 | 🟡 Partial (sub-AC Lighthouse = Cannot-Verify) |

---

## § 3 — Top-10 Riscos (blast radius × probabilidade)

Ordenados por `blast radius × probabilidade de regressão`:

| # | Risco | Blast Radius | Prob. | Wave | Ticket |
|---|-------|-------------|-------|------|--------|
| **R-01** | `ContentTypeCTAGrid` é STUB — 4 dashboards mostram CTAs sem premium UI | Alto (4 dashboards × 7 roles) | Alta (stub declarado) | W2 | W2.2 |
| **R-02** | `EcosystemImpactPanel` ignora `eventId` — impacto sempre `"..."` após submit | Alto (5 builders × todos os criadores) | Alta (void eventId no código) | W5 | W5.2 |
| **R-03** | `CommandPalette` ⌘K sem search dinâmico — feature core IMPORTANTE/02 §F8 não implementada | Médio-Alto (todos os utilizadores) | Certa (Missing) | W6 | W6.4 |
| **R-04** | `PostComposer` + `ConquistaManualComposer` são STUB — 2 flows de criação de conteúdo não funcionais | Alto (mentor, estudante, instituição) | Alta (stub declarado) | W4/W3 | W4.8 / W3.5 |
| **R-05** | Rota `GET /domain-events/:id` restrita a `moderador`/`super_admin` — criadores de conteúdo sem acesso ao impact real | Alto (bloqueio arquitectural) | Certa | W5 | W5.1 |
| **R-06** | `aluno.json` fixture ausente — testes E2E como `estudante` impossíveis sem mock user | Médio (CI para role estudante) | Certa (ficheiro ausente) | W2 | W2.5 |
| **R-07** | Focus trap ausente na `CommandPalette` — WCAG 2.1 SC 2.1.2 violação | Médio (todos os utilizadores keyboard-only) | Alta (não implementado) | W1 | W1.2 |
| **R-08** | `lighthouserc*` ausente — Lighthouse CI não executável; NF7 ≥90 mobile unverificável | Médio (infra CI) | Certa (ficheiro ausente) | W6 | W6.5 |
| **R-09** | `BootstrapErrorScreen` é STUB + retry timeout sem progress indicator — UX degradada em bootstrap falho | Médio (todos os utilizadores em cold-start) | Média | W0 | W0.2 |
| **R-10** | `EditorialStateBadge` props aceita `state: string` em vez de `state: EditorialState` — type-checking não impede estados inválidos; fallback silencioso para "Rascunho" | Baixo (silently wrong state render) | Média | W5/W6 | W5.3 / DC-01 |

---

## § 4 — Audit Infrastructure Gaps (D11 Consolidado)

Artefactos ausentes que impedem verificação de ACs declarados nas specs:

| # | Artefacto ausente | Impacto | Wave(s) afectada(s) |
|---|-------------------|---------|---------------------|
| **AIG-1** | `tests/fixtures/aluno.json` | Testes E2E como `estudante` impossíveis; `estudantePage` fixture falha | W2.5 |
| **AIG-2** | `tests/e2e/visual/` + `dashboards.snapshot.spec.ts` | Playwright visual regression para 5 dashboards nunca executado | W2.5 |
| **AIG-3** | `lighthouserc.json` / `.lighthouserc.yaml` | Lighthouse CI não configurado; NF7 (≥90 mobile) = Cannot-Verify | W6.5 |
| **AIG-4** | `domain-event-hook-results.spec.ts` | Teste de idempotência de hookResults declarado mas ausente | W-1.2 |
| **AIG-5** | `outbox-replay.idempotency.spec.ts` | Teste de idempotência de outbox declarado mas ausente | W-1.1 |

---

## § 5 — STUB Inventory (código auto-declarado FIXME STUB — evidência directa)

Verificado com grep `FIXME.*STUB` no código real:

| Ficheiro | Consumidores | Risco |
|----------|-------------|-------|
| `components/dashboard/ContentTypeCTAGrid.tsx` | 4 dashboards | R-01 |
| `features/feed/PostComposer.tsx` | `/app/feed/criar` | R-04 |
| `features/conquistas/ConquistaManualComposer.tsx` | `/app/conquistas/criar` | R-04 |
| `components/layout/BootstrapErrorScreen.tsx` | `BootstrapContext` | R-09 |
| `components/catalogo/CatalogoGridShell.tsx` | 8 páginas catálogo | W6.1 |
| `components/catalogo/CatalogoFilterBar.tsx` | 8 páginas catálogo | W6.1 |
| `components/catalogo/ContentCard.tsx` | 8 páginas catálogo | W6.1 |
| `features/home/HomePage.tsx` | `/app/home` | Cosmético |

**Total: 8 ficheiros STUB declarados no código.**

---

## § 6 — Drift Constitucional Consolidado (D15)

Nenhum `Drift-Constitution` formal foi emitido nos 8 wave-specs. Contudo, identificam-se **3 divergências implícitas** entre o código actual e os documentos IMPORTANTE que devem ser reflectidas na Fase C (T-DOC-01..05):

### DC-01 — Estado `hidden` ausente de IMPORTANTE/04 §5

| Campo | Valor |
|-------|-------|
| **Camada** | `IMPORTANTE/04 §5` — Pipeline Editorial |
| **Trecho actual (inferido)** | 6 estados: `draft / review / approved / published / archived / hidden` |
| **Realidade do código** | `EditorialStateBadge` suporta apenas 10 values (5 PT + 5 EN) sem `hidden`; fallback silencioso para `rascunho` |
| **Proposta** | Adicionar `hidden` ao type union + STATE_CONFIG do badge, ou remover `hidden` da spec se não for implementado |
| **Origem** | T-AUD-7 CCF-W5-2 · T-AUD-8 W6.5 |
| **T-DOC alvo** | T-DOC-04 (Tipos de Conteúdo — estados editoriais) |

### DC-02 — `CommandPalette` ⌘K como feature core sem implementação

| Campo | Valor |
|-------|-------|
| **Camada** | `IMPORTANTE/02 §F8` — Funcionalidades Core |
| **Trecho actual** | ⌘K declarado como navegação global e search dinâmico de rotas e conteúdos |
| **Realidade do código** | Skeleton com 7 rotas estáticas; search dinâmico ausente (W6.4 = Missing) |
| **Proposta** | Atualizar §F8 para distinguir "fase skeleton" vs "fase dinâmica" com roadmap explícito, ou marcar como WIP |
| **Origem** | T-AUD-6 CCF-W1-2 · T-AUD-8 CCF-W6-2 |
| **T-DOC alvo** | T-DOC-02 (Mapeamento de Funcionalidades) |

### DC-03 — `EcosystemImpactPanel` sem dados reais — RBAC inconsistente com UX declarada

| Campo | Valor |
|-------|-------|
| **Camada** | `IMPORTANTE/02 §F7` / `IMPORTANTE/03 §RBAC` |
| **Trecho actual** | Todos os criadores de conteúdo vêem impacto ecossistémico após submit |
| **Realidade do código** | Rota `GET /domain-events/:id` restrita a `moderador`/`super_admin`; painel mostra `"..."` para todos |
| **Proposta** | Criar rota `GET /domain-events/:id/my-impact` acessível a todos os roles autenticados, ou actualizar spec para clarificar que o painel é decorativo no MVP |
| **Origem** | T-AUD-7 CCF-W5-1 · T-AUD-8 não afectado |
| **T-DOC alvo** | T-DOC-03 (Tipos de Perfis — RBAC) · T-DOC-02 (Funcionalidades) |

---

## § 7 — Plano de Remediação Prioritizado

### Tier 1 — Crítico (anti-fraude G15 + flows bloqueados)

| Item | Ficheiros alvo | Risco associado |
|------|---------------|-----------------|
| Implementar `PostComposer` real (formulário + Zod + mutação BFF) | `features/feed/PostComposer.tsx` | R-04 |
| Implementar `ConquistaManualComposer` real | `features/conquistas/ConquistaManualComposer.tsx` | R-04 |
| Criar rota BFF `GET /domain-events/:id/my-impact` (sem `checkRole`, apenas JWT) | `apps/api/src/routes/domain-events.ts` | R-05 |
| Implementar polling + backoff + `AbortController` no `EcosystemImpactPanel` | `components/ecosystem/EcosystemImpactPanel.tsx` | R-02 |

### Tier 2 — Alto (UX core + acessibilidade + CI)

| Item | Ficheiros alvo | Risco associado |
|------|---------------|-----------------|
| Implementar search dinâmico + role-aware na `CommandPalette` | `components/topbar/CommandPalette.tsx` | R-03 |
| Substituir `ContentTypeCTAGrid` STUB por implementação `GlassCard` premium | `components/dashboard/ContentTypeCTAGrid.tsx` | R-01 |
| Adicionar focus trap (Tab/Shift+Tab) na `CommandPalette` | `components/topbar/CommandPalette.tsx` | R-07 |
| Criar `tests/fixtures/aluno.json` para testes E2E role estudante | `tests/fixtures/aluno.json` | AIG-1 |
| Configurar `lighthouserc.json` + integrar `@lhci/cli` em CI | raiz do repo | AIG-3 |

### Tier 3 — Médio-Baixo (polish + type safety + testes)

| Item | Ficheiros alvo | Risco associado |
|------|---------------|-----------------|
| Adicionar `hidden` ao `EditorialStateBadge` type union + STATE_CONFIG | `components/ui/EditorialStateBadge.tsx` | DC-01 |
| Exportar `EditorialState` type de `@pdc/shared` — tipar `state` prop de `string` para union type | `packages/shared/src/types.ts` + `EditorialStateBadge.tsx` | R-10 |
| Substituir stubs `CatalogoGridShell`/`ContentCard`/`CatalogoFilterBar` com paginação real | `components/catalogo/*.tsx` | W6.1 |
| Substituir `BootstrapErrorScreen` STUB com UI premium + retry progress | `components/layout/BootstrapErrorScreen.tsx` | R-09 |
| Expandir `a11y.spec.ts` para cobrir 5 dashboards + 4 catálogos | `tests/e2e/a11y.spec.ts` | W6.5 |
| Criar `tests/e2e/visual/dashboards.snapshot.spec.ts` + `aluno.json` | `tests/e2e/visual/` | AIG-2 |
| Adicionar `aria-label` em `CatalogoFilterBar` Input + Select | `components/catalogo/CatalogoFilterBar.tsx` | W6.5 |
| Completar `BootstrapContext` retry com spinner e timeout de 30s | `components/layout/BootstrapContext.tsx` | W0.2 |
| Adicionar badge de notificações não-lidas em `NotificationsDropdown` | `components/topbar/NotificationsDropdown.tsx` | W1.1 |

---

## § 8 — Alimentação Fase C (T-DOC-01..05)

Este Master identifica os seguintes ficheiros IMPORTANTE que necessitam de actualização na Fase C:

| T-DOC | Ficheiro IMPORTANTE | Razão | DC# |
|-------|---------------------|-------|-----|
| T-DOC-01 | `specs/IMPORTANTE/01-vision.md` | Sem drift confirmado — verificação de alinhamento com produto actual recomendada | — |
| T-DOC-02 | `specs/IMPORTANTE/02-funcionalidades.md` | ⌘K §F8 descreve feature core sem distinguir skeleton/real; `EcosystemImpactPanel` UX declarada vs RBAC real | DC-02, DC-03 |
| T-DOC-03 | `specs/IMPORTANTE/03-rbac.md` | RBAC de `GET /domain-events/:id` inconsistente com UX esperada por criadores | DC-03 |
| T-DOC-04 | `specs/IMPORTANTE/04-conteudo.md` | Estado `hidden` pipeline editorial ausente no código mas presente na spec | DC-01 |
| T-DOC-05 | `specs/IMPORTANTE/05-design.md` | 8 STUBs não implementam Soul & Elite (no premium animations, no GlassCard nos catálogos) | W6.1, W2.2 |

---

## § 9 — Links

- **Análise:** `spec:aac36439-98bc-4f54-ace7-85bcbfea092c/c9bd501a` — Refactoring Analysis (38 tickets)
- **Abordagem:** `spec:aac36439-98bc-4f54-ace7-85bcbfea092c/485b53e5` — Metodologia da Auditoria
- `docs/audit/wave-W-1--stabilization-invariants.md`
- `docs/audit/wave-W0--bootstrap-and-foundation.md`
- `docs/audit/wave-W3--strapi-bff-full-spec.md`
- `docs/audit/wave-W4--builders.md`
- `docs/audit/wave-W2--dashboards-token-purge.md`
- `docs/audit/wave-W1--topbar-commandpalette.md`
- `docs/audit/wave-W5--pipeline-editorial-impact.md`
- `docs/audit/wave-W6--catalogos-a11y.md`

---

*Consolidado de T-AUD-1…T-AUD-8. Pronto a alimentar T-DOC-01..05.*
*`git status` limpo verificado.*
