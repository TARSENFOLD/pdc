# Feature Specification: Refactoring — Consolidação Técnica PDC v2

**Feature Branch**: `001-refactoring-spec-consolidation`  
**Created**: 8 de Abril de 2026  
**Status**: Active  
**Scope**: Consolidação dos requisitos pendentes e refactoring wave (T1–T12)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Developer/Agent inicia trabalho num ticket (Priority: P1)

Um developer ou agente de IA começa a implementar um ticket do epic de refactoring. Necessita de saber exactamente o estado actual do sistema, o que está pendente, e as regras que não pode violar.

**Why this priority**: É o ponto de entrada de todo o trabalho. Sem uma fonte de verdade consolidada, tickets são implementados com context errado, gerando regressões.

**Independent Test**: Um agente com acesso apenas a este spec + .planning/ consegue implementar qualquer ticket sem perguntas adicionais.

**Acceptance Scenarios**:

1. **Given** um agente lê este spec, **When** começa a implementar T1–T12, **Then** não viola nenhum constraint da constitution (sem `any`, sem mocks, ficheiros ≤200L, sem `localStorage` para tokens)
2. **Given** um requisito está marcado `[x]` no REQUIREMENTS.md, **When** um agente revê o ticket, **Then** não re-implementa trabalho já feito
3. **Given** um requisito está marcado `[ ]` ou `[~]`, **When** um agente inicia o ticket, **Then** implementa com base nos critérios de verificação do REQUIREMENTS.md

---

### User Story 2 — Estudante completa o fluxo sagrado end-to-end (Priority: P1)

Um estudante angolano acede ao PDC, faz simulação, vê o score, consulta o perfil vocacional e recebe recomendações de cursos/carreiras.

**Why this priority**: É a razão de existir do produto. Se este fluxo falhar, o produto não tem valor.

**Independent Test**: `Simulação → Score → Perfil Vocacional → Recomendação` funciona com dados 100% reais, desde o registro até ao relatório.

**Acceptance Scenarios**:

1. **Given** um estudante registado, **When** completa uma Simulação Tipo 1 ou 2, **Then** o score é persistido com `eventId` UUID único e o perfil vocacional é actualizado
2. **Given** um perfil vocacional calculado, **When** o estudante acede ao relatório, **Then** vê recomendações baseadas no seu comportamento real (não texto genérico)
3. **Given** dois envios com o mesmo `eventId`, **When** o BFF processa o segundo, **Then** ignora silenciosamente (idempotência)

---

### User Story 3 — Admin/DevOps faz deploy para staging e produção (Priority: P2)

O responsável técnico configura variáveis de ambiente no Railway e Vercel, valida que o sistema corre correctamente em staging antes de promover para produção.

**Why this priority**: O código está pronto; o blocker actual é o deploy de infraestrutura.

**Independent Test**: `docker compose up` local funciona; staging (`staging.usepdc.com`) acessível após configuração de env vars.

**Acceptance Scenarios**:

1. **Given** env vars configuradas no Railway, **When** o BFF inicia, **Then** conecta a PostgreSQL, Redis e Strapi sem erros
2. **Given** código em `main`, **When** CI passa, **Then** deploy automático para Vercel (frontend) e Railway (BFF) sem intervenção manual
3. **Given** `DEV_SKIP_OTP=true` em staging, **When** tests E2E correm, **Then** login funciona sem envio de email/SMS real

---

### User Story 4 — QA/Agente valida qualidade com testes automatizados (Priority: P2)

A suite de testes Playwright (T11) e k6 (T12) corre em CI e confirma que o sistema suporta carga e que os fluxos críticos funcionam.

**Why this priority**: A cobertura de testes é a rede de segurança para o trabalho de refactoring.

**Independent Test**: `npx playwright test --project=smoke` passa sem servidor de produção; `k6 run tests/k6/auth-flow.js` contra staging passa thresholds.

**Acceptance Scenarios**:

1. **Given** suite Playwright configurada, **When** corre em CI, **Then** smoke tests passam em cada PR; full suite passa em merge para main
2. **Given** staging com dados de teste, **When** k6 `auth-flow.js` corre com 200 VUs, **Then** p95 < 500ms e error rate < 1%
3. **Given** `stress-test.js` com ramp até 500 VUs, **When** completa, **Then** identifica o breaking point documentado como baseline

---

### Edge Cases

- Um ticket é implementado parcialmente — o `[~]` em REQUIREMENTS.md indica trabalho incompleto que não deve ser considerado completo
- Um agente adiciona uma dependência nova sem ADR — deve ser revertida; stack é bloqueada
- Um ficheiro atinge 200 linhas durante a implementação — deve ser dividido antes de commit
- `DEV_SKIP_OTP` está `true` em produção — bloquear deploy; variável só permitida em dev/test
- Dois agentes a trabalhar em paralelo no mesmo módulo — commits devem ser atómicos por ticket com prefixo `T##:`

---

## Requirements *(mandatory)*

### Estado Actual do Sistema (Abril 2026)

| Fase | Estado | Requisitos Pendentes |
|------|--------|----------------------|
| Fase 0 — Fundação | ✅ Parcial | Config SSL Railway para prod |
| Fase 1 — Auth Segura | ✅ Completa | M3-T7: fluxo 2FA frontend |
| Fase 2 — Design System | ✅ Completa | REQ-2-001: hex hardcoded em 4 ficheiros |
| Fase 3 — API Layer | ✅ Completa | — |
| Fase 4 — Core Produto | ✅ Parcial | Sim Tipo 3, Programas Strapi, Conquistas auto-trigger |
| Fase 5 — LTI 1.3 | ✅ Completa | — |
| Fase 6 — Moderação/Admin | ✅ Completa | — |
| Fase 7 — IA e Realtime | ✅ Completa | — |
| Refactoring Wave T1–T12 | ✅ Completa | — |

### Functional Requirements

**Segurança e Hardening (T1)**
- **FR-001**: O sistema DEVE usar JWT em httpOnly cookies — nunca `localStorage`/`sessionStorage` para tokens
- **FR-002**: Rate limiting DEVE correr em Upstash Redis — nunca em `Map` em memória
- **FR-003**: RBAC DEVE ser verificado no servidor em cada rota protegida via `checkRole()`
- **FR-004**: Input em todas as rotas BFF DEVE ser validado com Zod antes de processar
- **FR-005**: CSP, CORS e secure-headers DEVEM estar activos em produção

**Infraestrutura de Testes (T2, T11, T12)**
- **FR-006**: Suite Playwright DEVE ter ≥35 specs cobrindo ≥13 domínios funcionais
- **FR-007**: Projecto `smoke` DEVE correr apenas `critical-path.spec.ts` em cada PR
- **FR-008**: Projectos `chromium` e `firefox` DEVEM correr a suite completa apenas em merge para `main`
- **FR-009**: Scripts k6 DEVEM usar contas de teste (`{role}@traycer.test`) — nunca contas reais
- **FR-010**: k6 `auth-flow.js` DEVE sustentar 200 VUs com p95 < 500ms
- **FR-011**: k6 `stress-test.js` DEVE identificar o breaking point (VU count onde p95 > 1s ou errors > 5%)

**Feature Flags (T3)**
- **FR-012**: O sistema DEVE suportar feature flags por `instituicaoId` com override por role
- **FR-013**: Flags DEVEM ser lidas via `featureFlagService.getEffectiveFlags(instituicaoId?)` com cache Redis 60s
- **FR-014**: Admin DEVE poder activar/desactivar flags sem deploy

**Perfil e Privacidade (T4, T5)**
- **FR-015**: O BFF DEVE expor um contrato canónico de perfil (`GET /perfis/:id`) com campos de privacidade
- **FR-016**: Campos marcados como privados NÃO DEVEM ser retornados a terceiros
- **FR-017**: O estudante DEVE poder configurar visibilidade de cada campo do perfil

**Reputation Service (T6)**
- **FR-018**: O score de reputação DEVE ser calculado a partir de múltiplos sinais: likes, ratings, completion rate, vínculos
- **FR-019**: `actorId` DEVE ser derivado do JWT — nunca de headers manipuláveis pelo cliente

**Motor de Conquistas (T7)**
- **FR-020**: Conquistas DEVEM ser desbloqueadas automaticamente por eventos de telemetria (ex: completar 3 simulações)
- **FR-021**: O BFF DEVE expor `POST /conquistas/verificar` chamado após cada evento relevante
- **FR-022**: Conquistas já desbloqueadas NÃO DEVEM ser desbloqueadas novamente

**Discussions e Fóruns (T8)**
- **FR-023**: Cada curso DEVE ter uma secção de discussões com threads e replies
- **FR-024**: Threads DEVEM suportar pin (moderador/instrutor) e resolve/close
- **FR-025**: Moderadores DEVEM poder remover/ocultar threads sem apagar permanentemente

**Telemetria (T9)**
- **FR-026**: Eventos de telemetria DEVEM ser processados em batch paralelo para evitar bloqueio do event loop
- **FR-027**: Cada evento DEVE ter `eventId` UUID para garantir idempotência
- **FR-028**: Telemetria DEVE alimentar o cálculo do Perfil Vocacional automaticamente

**CDN, Cache e Deploy (T10)**
- **FR-029**: Assets estáticos (JS, CSS, fontes) DEVEM ter cache `immutable` de 1 ano via Vercel
- **FR-030**: Endpoints públicos do catálogo DEVEM ter `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- **FR-031**: O sistema DEVE ter ambientes de staging (`staging.usepdc.com`) e produção (`usepdc.com`) separados

### Requisitos Pendentes Críticos (não cobertos pelos tickets T1–T12)

- **FR-032**: `og-default.png` (1200×630px) DEVE existir em `apps/web/public/` para SEO
- **FR-033**: Variáveis de ambiente DEVEM ser configuradas no Railway (BFF + Strapi) e Vercel antes do primeiro deploy
- **FR-034**: Simulação Tipo 3 DEVE ter ambiente interactivo com feedback AI inline (REQ-4-003 — pendente)
- **FR-035**: Conquistas automáticas DEVEM ter regras de trigger implementadas no BFF (REQ-4-013 — parcial)

### Key Entities

- **Perfil**: Entidade central — estudante/mentor/instituição. Contém campos de privacidade, score de reputação, conquistas desbloqueadas, perfil vocacional calculado
- **Simulação**: Tipo 1 (vídeo+checklist), Tipo 2 (iframe+tracking), Tipo 3 (interactivo+AI). Cada tentativa gera evento de telemetria com `eventId` UUID
- **Perfil Vocacional**: Agregado calculado a partir da telemetria de simulações. Alimenta recomendações de cursos e carreiras
- **Feature Flag**: Par `{key, value}` com scope global ou por `instituicaoId`. Gerida via Redis com TTL 60s
- **Conquista**: Desbloqueável por trigger automático (telemetria), manual (admin) ou institucional. Idempotente
- **Vínculo**: Relação bilateral entre perfis (pedido → aprovação). Índice único — sem duplicados
- **Discussion Thread**: Associada a um curso. Tem threads pai + replies. Suporta pin, resolve, moderação

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O fluxo `Simulação → Score → Perfil Vocacional → Recomendação` completa end-to-end em menos de 3 segundos em conectividade 3G
- **SC-002**: A suite Playwright (≥84 testes) passa com taxa de sucesso ≥ 95% em Chromium e Firefox no CI
- **SC-003**: k6 `auth-flow.js` sustenta 200 VUs com p95 < 500ms e error rate < 1%
- **SC-004**: k6 `catalogo-browse.js` sustenta 200 VUs com p95 < 500ms (endpoints públicos com cache)
- **SC-005**: Bundle inicial da web app < 100KB; Lighthouse Performance ≥ 90 em mobile na landing page
- **SC-006**: `tsc --noEmit` passa sem erros em `apps/web` e `apps/api` — zero `any`, zero `z.any()`
- **SC-007**: Todos os ficheiros de API e serviços têm ≤ 200 linhas
- **SC-008**: Deploy para staging é possível via Railway + Vercel com configuração de env vars documentada
- **SC-009**: Eventos de telemetria duplicados (mesmo `eventId`) são ignorados sem erro — idempotência verificável
- **SC-010**: Feature flags podem ser modificadas por admin sem deploy e propagam em ≤ 60 segundos

---

## Assumptions

- **Stack bloqueada**: Hono, React 18, Tailwind v4, React Query v5, Strapi v5, PostgreSQL 16+, Upstash Redis. Substituição requer ADR em `docs/decisoes/`
- **DEV_SKIP_OTP**: Activo em dev e test (inclui CI/Playwright); desactivado obrigatoriamente em staging e produção
- **Contas de teste**: `{role}@traycer.test` / `password123` — existem em staging via `tests/helpers/seed.ts`
- **Staging domain**: `staging.usepdc.com` (frontend) e `api-staging.usepdc.com` (BFF) — não partilham dados com produção
- **Vídeos**: Sempre via YouTube/Vimeo embed — sem upload directo de vídeo para R2
- **entity_score**: Calculado on-the-fly em `feed.helpers.ts` via `getItemStats()` + Redis cache 300s — sem job dedicado (decisão documentada em STATE.md)
- **Tickets T1–T12**: Todos implementados e commitados. Estado final: T1–T8 (`5fb763e`), T9 (`eef0c6d`), T10 (`3abfc67`), T11 (`b7e7717`), T12 (`ed0ea52`)
- **Requisitos abertos**: REQ-4-003 (Sim Tipo 3), REQ-4-009 (Programas Strapi), REQ-4-013 (Conquistas auto-trigger), REQ-NF-001 (Lighthouse), REQ-NF-005 (a11y), REQ-NF-006 (Slow 3G) — fora do escopo dos tickets T1–T12; candidatos a wave seguinte

