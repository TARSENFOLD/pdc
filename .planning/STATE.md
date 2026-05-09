# PDC v2 — Project State

> Memória persistente do projecto entre sessões. Lê este ficheiro PRIMEIRO.

## Current Status

Estamos na **Fase F — Pre-Production Hardening** (PROD-A/B/C/D/E concluído). **PROD-E concluído** (PE-T01..T04 done — DLQ telemetria, scoring Tipo 2/3 STABLE, moderação unificada, doc sync); próxima fase: **pós-launch**.

**Saúde global pós-auditoria Phase G (2026-05-09): ~55% Done · ~30% Partial/Pendente · ~15% Não Iniciado — 6 lacunas detectadas nas waves PROD-A/B/C/D; Wave A (Compliance Pass) em curso para fechar os gaps. A auto-declaração anterior de "72% Done" era falsa (ver AP-08 + Phase G).**

**⚠️ Saúde real (REQUIREMENTS.md, re-auditado 30 Abril 2026):**
- **`[x]` verdadeiros (E2E 5 camadas):** ~55% dos requisitos
- **`[~]` / `[P]` honestos:** ~30% (schemas/BFF existem, mas sem UI ou sem E2E completo)
- **`[ ]` não iniciados:** ~15%
- **🔴 Corrigidos de falso `[x]` para `[~]`/`[P]`:** N6 (Vocacional desync), T9 (Notificações parciais), T10/F7 (Endorsements schema-only), T11 (Votes schema-only), P7 (LTI sem LMS real), F6 (FOMO triggers inexistentes)
- **✅ Re-confirmados como `[x]` após auditoria de código:** N7 (Reputação — BFF+Frontend+Schema completos), A1 elevado para `[~]` (pipeline 4 passos real, faltam 4 feeds separados)
- **⚠️ T-REM-1 (PostComposer):** **NÃO é STUB** — PostComposer funcional com Zod validation + mutation + moderação. Apenas **ConquistaManualComposer** é STUB real.
- **⚠️ T-REM-2 (EcosystemImpactPanel):** **NÃO é STUB** — polling real com `refetchInterval: 1000`, endpoint `/domain-events/:id/my-impact` funcional. Painel mostra success/skipped/total hooks.

### Wave Table (alinhada com auditoria 2026-04-29 + PROD waves 2026-05-09)

| Wave | Nome | Tickets | Done/Done+ | Partial | Missing | Foco |
|------|------|---------|------------|---------|---------|------|
| W-1 | Stabilization Invariants | 5 | 4 | 1 | 0 | Outbox idempotência, hookResults, notifyHook, BootstrapContext |
| W0 | Bootstrap & Foundation | 3 | 1 | 2 | 0 | Features SSOT, BootstrapContext retry, EstudanteDashboard fallback |
| W1 | TopBar + ⌘K skeleton | 2 | 2 | 0 | 0 | RoleChipMenu, NotificationsDropdown, CommandPalette skeleton |
| W2 | Dashboards + token purge | 5 | 2 | 3 | 0 | Soul & Elite dashboards 5 roles, token purge, ContentTypeCTAGrid STUB |
| W3 | Strapi + BFF Full-Spec | 7 | 6 | 1 | 0 | 7 Zod schemas, BFF RBAC, field-level filtering |
| W4 | Builder Primitives | 8 | 6 | 2 | 0 | BuilderShell, 5 builders, PostComposer STUB, ConquistaComposer STUB |
| W5 | Pipeline Editorial + Impact | 3 | 2 | 1 | 0 | EcosystemImpactPanel (void eventId), domain-events RBAC, EditorialStateBadge |
| W6 | Catálogos + a11y | 5 | 2 | 2 | 1 | 8 catálogos migrados, ⌘K Missing, primitivos STUB, lighthouserc ausente |
| **PROD-A** | Auth Hardening | 6 | 5 | 1 | 0 | requireApproved, OAuth onboarding, perfil V2 cutover, testes baseline (T04 specs em falta → Wave A WA-T03) |
| **PROD-B** | Upload Hardening | 3 | 3 | 0 | 0 | Magic-byte guard, BuilderUploadZone v2, 5 migrações consumer |
| **PROD-C** | Security Hardening | 2 | 2 | 0 | 0 | Boot env validation, rate limit factory per-endpoint, telemetria per-user |
| **PROD-D** | Data Hygiene | 3 | 2 | 1 | 0 | Sim Tipo 2/3 ALPHA flags, páginas legais, doc sync (T03 gaps → Wave A WA-T06) |
| **PROD-E** | Moderação + Scoring Pipeline | 4 | 4 | 0 | 0 | DLQ telemetria (PE-T04), scoring sim-2-3 STABLE (PE-T03), moderação unificada (PE-T02), doc sync (FIX-002) |
| **Total** | | **56** | **41** | **15** | **1** | |

### Métricas do Codebase

- **57 route files** no BFF (`apps/api/src/routes/`) — +3 (aprovacoes, finalizar, perfil V2 cutover); +1 previsto Wave B (`home.ts` montado)
- **25 módulos** no BFF (`apps/api/src/modules/`) — +1 (`requireApproved` middleware); +1 `moderacao.service.ts` (PROD-E PE-T02); +1 `dlq.ts` telemetria (PROD-E PE-T04)
- **25 feature modules** no web (`apps/web/src/features/`) — +1 (`AdminAprovacoesPage`); expansão prevista Wave B (home sections)
- **7 dashboards** funcionais (Estudante, Mentor, Instituição, Moderador, Admin, Patrocinador, Comité)
- **8 catálogos** migrados com paginação real
- **3 background workers** (Outbox daemon `outbox-worker.ts`, Telemetry consumer `consumer.ts`, Telemetry worker `telemetry-worker.ts`)
- **1 middleware novo** (`requireApproved`) aplicado a 6 rotas de criação de conteúdo
- **0 content-types Strapi novos** pós-PROD-D; +1 previsto Wave B (`OnboardingVideo`)
- Zero `as any` / `: any` em todo o monorepo (confirmado 2026-04-29, mantido em PROD-A/B/C/D/E)

## Phase F — Pre-Production Hardening (concluído 2026-05-09)

Quatro waves PROD-A/B/C/D entregues sequencialmente. Objetivo: desbloquear deploy em produção com segurança, sem comprometer credibilidade da plataforma.

| Wave | Foco | Estado |
|------|------|--------|
| PROD-A | Auth: `requireApproved`, OAuth onboarding, perfil V2 cutover, testes baseline | [~] 5/6 · 1 partial (T04 specs → WA-T03) |
| PROD-B | Upload: magic-byte validation, `BuilderUploadZone` v2, 5 consumers migrados | ✅ Done |
| PROD-C | Security: boot env validation, rate limit factory, telemetria per-user durable retry | ✅ Done |
| PROD-D | Data hygiene: Sim Tipo 2/3 ALPHA flags, páginas legais (Termos + Privacidade), doc sync | [~] 2/3 · 1 partial (T03 doc gaps → WA-T06) |
| PROD-E | Moderação + Pipeline Scoring: `moderacao.service.ts`, `sim-2-3.engine.ts`, DLQ, doc sync | ✅ Done (PE-T01..T04) |

### PROD-E: Concluído

**Objectivo cumprido:** Fila de moderação unificada (DT-13 ✅) + scoring telemetry-driven Sim Tipo 2/3 (DT-15 ✅) + Edge DLQ (DT-16 ✅) + doc sync drift corrigido.

`SIM_TIPO_2/3_PUBLISH_ENABLED` promovido para `STABLE` em `packages/shared/src/registry/features.ts` (PE-T03). Publicação de Simulações Tipo 2/3 desbloqueada.

---

## Phase G — Compliance Pass (Wave A, 2026-05-09)

**Objetivo:** Auditoria de conformidade pós-PROD-A/B/C/D. As 4 waves declaravam "14/14 done · 0 partial · 0 missing" mas tinham **6 lacunas reais** + drift documental.

### 6 Lacunas + Gaps Documentais Detectados

| ID | Lacuna | Caixa | Remediação Wave A |
|----|--------|-------|-------------------|
| L1 | `AdminAprovacoesPage.spec.tsx` ausente — viola PROD-A-T04 acceptance criteria #2 | A | WA-T03 |
| L2 | `useApprovalEnforcement.spec.ts` ausente — idem | A | WA-T03 |
| L3 | `OnboardingFinalizarPage` UI ↔ teste mismatch duplo (CI blocker): `aria-label` divergente + `documentoTipo` hardcoded vs auto-derivado | A | WA-T01 |
| L4 | Contract change `/perfis/:id` → `{ data: ... }` sem caracterização nem ADR — viola Doc-is-Law | C | WA-T04 + ADR-029 |
| L5 | `STATE.md` auto-declara "14/14 done · 0 partial · 0 missing" — **falso** (ver AP-08) | B | WA-T06 (este ticket) |
| L6 | `adr-028-rate-limit-tiers.md` sem cross-link para nome nominal "adr-012" usado no PROD-D-T03 | B | WA-T06 (este ticket) |
| H1 | `sentry.ts` 19 linhas sem `onError` hook, `setUser({id})`, `setTag` — sem PII leak | A | WA-T02 |
| S1 | `.env.example` sem 5 secrets reais (Upstash TCP/REST, R2 account, Sentry DSN, Resend, Deepseek) | B | WA-T05 |
| D1 | Drift histórico: PROD-D-T01 referenciava C2/C3 quando IDs reais são C2=Tipo1/C3=Tipo2/C4=Tipo3 | B | WA-T06 (confirmado correcto) |
| D2 | `DIVIDA_TECNICA_CONHECIDA.md` sem entradas DT-17+ para Wave B/PROD-E pending | B | WA-T06 (DT-17 a DT-22 adicionados) |

### Plano Wave A (sequência fixa per D-T2 do Approach Spec)

1. **WA-T01** → L3 (OnboardingFinalizarPage CI blocker — primeiro porque bloqueia CI)
2. **WA-T02** → H1 (Sentry hardening — desbloqueia observabilidade para o resto)
3. **WA-T03** → L1 + L2 (specs FE em falta — rede de segurança)
4. **WA-T04** → L4 + ADR-029 (characterization `/perfis/:id` + ADR retroativo)
5. **WA-T05** → S1 (.env.example cleanup + Railway secrets mapping)
6. **WA-T06** → L5 + L6 + D1 + D2 (doc sync pass — **este ticket** — último, vê efeitos de todos os anteriores)

---

## Realizações Recentes (Auditadas 2026-04-29 + Sessão 2026-04-30)

- **Auditoria completa:** 8 wave-specs + MASTER report em `docs/audit/`
- **Constituição actualizada:** IMPORTANTE/01-05 com DC-01..DC-03 documentados
- **Constitution v2.3:** `.specify/memory/constitution.md` com stack real + 22 módulos + 3 workers
- **Ecosystem Hooks (G15):** 6 hooks com idempotência Redis + outbox daemon automático
- **Design System:** `tokens.css` + 5 primitivos canónicos ratificados, 8 STUBs identificados
- **Zero Any:** confirmado por grep em todo o monorepo

### Sessão 2026-04-30 (2) — Auditoria E2E de Ciclos Quebrados + Correção

**8 rotas BFF críticas corrigidas (404 → funcional):**
- C1: `/reputacao` montada no `index.ts` (existia mas nunca foi registada)
- C2: `GET /estudante/certificados` — rota nova
- C3: `GET /estudante/ranking` — rota nova (top 50 por reputação)
- C4: `GET /feed/geral` — pipeline partilhado com weights geral
- C5: `GET /feed/trending` — pipeline partilhado com weights trending
- C6: `GET /feed/weights/:tipo` — admin reads weights
- C7: `PUT /feed/weights/:tipo` — admin tunes weights
- C8: `POST /media/upload` — multipart FormData → R2 directo (fix desync FE/BFF)

**2 STUBs substituídos por implementação real:**
- S1: `HomePage` — dashboard adaptativo por role (7 roles × CTAs + greeting)
- S2: `ConquistaManualComposer` — formulário real com Zod + mutation + tags + toast

**5 FIXME tags falsas removidas** (componentes que eram funcionais mas marcados como STUB):
- ContentTypeCTAGrid, CatalogoFilterBar, CatalogoGridShell, ContentCard, BootstrapErrorScreen

**Typecheck verde** em `apps/api` e `apps/web` após todas as alterações.

### Sessão 2026-04-30 (4) — Workflows de Infraestrutura + i18n Final

**6 workflows executados:**

- **i18n completo:** `pt-BR/dashboard.json` + `en/dashboard.json` com secção `home` (7 roles × ações). `EscolhaTipoContaPage` totalmente migrado (features[] via `returnObjects: true`). 3 locales × `auth.roles/onboarding/common` criados. Zero strings hardcoded em 10 componentes migrados.
- **ci-doc-validator:** `scripts/validate-docs.ts` (links internos + referências doc→code). `.markdownlint.json` + `.markdown-link-check.json`. Job `docs` no CI. Scripts `validate:docs` + `lint:docs`.
- **cold-storage-architect:** `moveToColdStorage` deixou de ser stub — buffer 100 eventos + flush para Cloudflare R2 via `@aws-sdk/client-s3`. `ColdStorageEventSchema` em `@pdc/shared`. Fallback local `/tmp/pdc-cold-storage/` se R2 indisponível.
- **telemetry-worker-isolator:** `apps/api/src/workers/telemetry-worker.ts` com graceful shutdown (SIGTERM/SIGINT) + heartbeat Redis (`telemetry:worker:heartbeat EX 120`). Consumer com chunked processing (100 eventos + `setImmediate` yield) + backpressure warning >10k. Script `worker:telemetry` + `Procfile` Railway.
- **redlock-hardener:** `apps/api/src/lib/distributed-lock.ts` com SET NX EX + fencing token (INCR counter). Release atómico: DEL só se value === nosso token (previne stale lock write). ADR pendente. `outbox-worker.ts` usa `acquireLock` em vez de SET NX EX raw.
- **doc-mass-editor Fase 0:** Triagem de 40 tickets. A1/B1/C1 já executados. C2/B4/CONSTITUTION actualizados nesta sessão.

**Métricas actualizadas:**
- `4 background workers` (Outbox daemon, Telemetry consumer isolado, Edge ingestor, Telemetry worker dedicado)
- `moveToColdStorage` real (R2 NDJSON) — zero data loss em eventos inválidos
- Distributed lock com fencing token em todo o outbox

### Sessão 2026-04-30 (3) — Feed Social: Moderação por Exceção sem IA

**Decisão de produto implementada:**
- Posts sociais normais de contas estabelecidas são auto-aprovados e emitem `post.publicado`.
- Moderação fica reservada para exceções determinísticas: conta com menos de 7 dias, link suspeito, linguagem abusiva, repetição excessiva, duplicado recente ou reputação negativa.
- Risco médio entra como `pendente_moderacao`; risco alto combinado entra como `hidden`.
- A lógica é independente de IA e vive em `apps/api/src/modules/moderation/moderation-risk.engine.ts`.

**Alinhamento com specs fundacionais:**
- G6 exige auto-moderação por idade do autor `<7 dias`; a engine agora usa janela de 7 dias, não 24h.
- O contrato de post foi alinhado ao limite G6 de 2000 caracteres em `@pdc/shared` e na UI.
- `PostComposer` deixou de prometer fila de moderação universal; a cópia agora comunica publicação imediata quando o conteúdo estiver conforme.

**Validação:**
- `npm run test -w apps/api -- moderation-risk.engine.spec.ts feed-posts.spec.ts --run` — verde, 8 testes.
- `npm run typecheck --workspaces` — verde.
- `npm run lint --workspaces` — verde com avisos conhecidos: 7 Fast Refresh no web e 2 `no-unsafe-*` em `infra/strapi/scripts/seed-copy.ts`.

### Sessão 2026-04-30 (1) — Doc Consolidation + Traycer Absorption + Falso-Done Purge

- **ADR-005 Unificado:** Dois ficheiros duplicados fundidos em `adr-005-edge-telemetry.md` (JWS RS256 canónico)
- **NF1 Corrigido:** `REQUIREMENTS.md` actualizado de `[~]` para `[x]` — zero `any` confirmado
- **PROJECT.md Enriquecido:** Adicionado Contexto de Mercado Angola, 3 Efeitos de Rede (flywheel), Repos de Referência, Out of Scope expandido
- **H1 Spec Criada:** `docs/a_implementar/H1_—_Privacy_Field_Visibility_Perfil_Dashboard_Separation.md` — 12 steps, matriz de campos por role
- **Roadmap documental criado:** `docs/ROADMAP_PRODUTO_DISRUPTIVO.md` — 6 Tiers + métricas
- **Arquivo Fundacional expandido:** Secção 09 (4 ficheiros destilados de 13 specs Traycer, ~266KB) — tokens, rotas, features transversais, algoritmos, segurança, modelo dados
- **🔴 Purga de falso Done:** 9 requisitos rebaixados de `[x]` para `[~]`/`[P]` no `REQUIREMENTS.md` após cruzamento com código real e `entitlements-core-trio-analysis.md`
- **REQUIREMENTS.md enriquecido:** Secção 12 com referências cruzadas ao arquivo-fundacional
- **CONSOLIDATED_KNOWLEDGE.md actualizado:** §5 drifts + §6 waves alinhados com realidade
- **docs/README.md actualizado:** Referências ao arquivo-fundacional e ROADMAP_PRODUTO_DISRUPTIVO

## Dívida Técnica (Audit D8–D12 + históricos)

| ID | Descrição | Origem | Remediação |
|----|-----------|--------|------------|
| D8 | ~~`ContentTypeCTAGrid` STUB~~ **Resolvido** — componente funcional, FIXME tag removida | Audit W2.2 | ✅ |
| D9 | `ConquistaManualComposer` **implementado** (formulário real). `PostComposer` já era funcional. | Audit W4.8 | ✅ |
| D10 | ~~`EcosystemImpactPanel`~~ **Já funcional** — polling real 1s, endpoint `/my-impact` activo | Audit W5.2 | ✅ |
| D11 | ~~`CommandPalette` ⌘K sem search dinâmico~~ **Resolvido** — search real + role-awareness + keyboard nav | Audit W6.4 | ✅ |
| D12 | ~~`lighthouserc*` ausente~~ **Resolvido** — `lighthouserc.json` + job CI com thresholds (perf≥75, a11y≥85) | Audit W6.5 | ✅ |

**Dívida histórica (epics anteriores):**

| ID | Descrição | Status |
|----|-----------|--------|
| D1 | Heurísticas paralelas (duplicação shared vs engine) | ⏳ |
| D5 | Outbox Co-location (Performance bottleneck) | ✅ (outbox-worker daemon) — sync com REQUIREMENTS D5 |
| D6 | Midnight Rollover (Race Condition na Telemetria) | ✅ (SET NX EX 7d) — sync com REQUIREMENTS D6 |

## Epic de Remediação (Fase D — POR EXECUTAR)

| Ticket | Descrição | Tier | Estado |
|--------|-----------|------|--------|
| T-REM-1 | PostComposer + ConquistaManualComposer reais | 🔴 Crítico | ✅ Done |
| T-REM-2 | EcosystemImpactPanel polling + BFF `/my-impact` | 🔴 Crítico | ✅ Já funcional |
| T-REM-3 | CommandPalette ⌘K search dinâmico + role-awareness | 🟠 Alto | ✅ Done (2026-04-30 sessão 6) |
| T-REM-4 | ContentTypeCTAGrid GlassCard + primitivos catálogo | 🟠 Alto | ✅ FIXME removida |
| T-REM-5 | Audit Infrastructure (lighthouserc.json + CI job) | 🟠 Alto | ✅ Done (2026-04-30 sessão 6) |
| T-REM-6 | EditorialStateBadge tokens + BUG-04 manifest | 🟡 Médio | ✅ Done (2026-04-30 sessão 6) |

**Relatório completo:** `docs/audit/MASTER--audit-report.md`

## Lições Aprendidas

### AP-06 — Scripts ad-hoc na raiz são proibidos (2026-04-26)

Durante o Wave 0 de Integrity Hardening foram encontrados 13 ficheiros de lixo de processo na raiz do repositório:
`fix_command_palette.js`, `fix_palette_motion.js`, `fix_final_v2.js`, `fix_final_types.js`, `fix_lint.js`, `purge_and_fix.js`, `integrate_command_palette.js`, `cookies.txt`, `debug_api.ts`, `test_direct_bff.ts`, `test_heartbeat.ts`, `test_post_api.ts`, `.continue-here.md`.

**Regra:** Nunca criar `fix_*.js`, ficheiros de debug, ou scripts ad-hoc na raiz. Scripts de suporte vão em `scripts/` com nome descritivo e propósito documentado; ficheiros de debug são eliminados imediatamente após uso.

### AP-09 — Declarar pending o que está done é a outra metade do AP-08 (2026-05-09)

DT-15 estava completamente implementado em `sim-2-3.engine.ts` (212 linhas, flags STABLE em `features.ts`, integrado no consumer) mas continuava listado como "pendente" em `DIVIDA_TECNICA_CONHECIDA.md` com remediação atribuída a PROD-E. REQUIREMENTS.md marcou C3/C4 `[x]` e anotou "DT-15 fechado", mas o DIVIDA não foi actualizado.

**Regra:** A documentação falsa-pendente é tão prejudicial quanto a falsa-done. Quando um ticket fecha (PE-T01..T04 done), o agente deve imediatamente: (1) mover entradas DT correspondentes de "pending" para "Resolvidos", (2) actualizar STATE.md Wave Table, (3) reconciliar todas as notas de "Remediação: PROD-X" que ficaram sem actualizar. Doc-is-Law implica actualizações bidirecionais.

### AP-08 — Auto-declarar Done sem characterization é mentira UI (2026-05-09)

As waves PROD-A/B/C/D foram marcadas "14/14 done · 0 partial · 0 missing" no STATE.md sem verificação por caracterização. A auditoria Phase G descobriu 6 lacunas reais: teste partido CI blocker, specs FE em falta, contract change sem ADR, secrets não documentados no `.env.example`, STATE.md com métricas falsas.

**Regra:** Nunca marcar uma wave como "Done" sem: (1) confirmar CI verde em todos os workspaces (`npm run typecheck --workspaces && npm test --workspaces`), (2) verificar que specs/testes cobrem todos os acceptance criteria do ticket, (3) confirmar que REQUIREMENTS.md, DIVIDA e ADRs refletem a implementação real. "Done" sem characterization é auto-engano e viola Doc-is-Law.

**Paralelo a AP-06** (scripts ad-hoc na raiz) — ambos são atalhos de processo que acumulam dívida documental.

### E-1..E-3 — Erros de auditoria auto-corrigidos (2026-04-29)

Claim falsa de "5× `as any`" no MASTER report e IMPORTANTE/02 NF1 — zero `any` confirmado por grep. Contagem MASTER corrigida de Done=18→21, Missing=2→1.

## Environment
- **OS:** Linux (Fedora 43 / Debian agnostic)
- **Node:** 24.13.0 LTS
- **Docker:** Nativo (Strapi + Postgres + Redis)
- **Editor:** Cursor / VS Code / Windsurf

## Referências

- **Specs detalhadas (tokens, rotas, modelos):** `docs/arquivo-fundacional/09-traycer-specs/`
- **Diagnóstico de hotspots:** `docs/arquivo-fundacional/06-engenharia/entitlements-core-trio-analysis.md`
- **Roadmap produto disruptivo:** `docs/ROADMAP_PRODUTO_DISRUPTIVO.md`
- **Auditoria completa:** `docs/audit/MASTER--audit-report.md`

---
*Última actualização: 9 de Maio de 2026 · FIX-002: PROD-E marcado concluído (PE-T01..T04 done); DT-13/DT-15 movidos para "Resolvidos" em DIVIDA; AP-09 adicionado; métricas codebase actualizadas. Total ADRs: 32.*
*Regra de Ouro: Se não está documentado aqui, não aconteceu.*
