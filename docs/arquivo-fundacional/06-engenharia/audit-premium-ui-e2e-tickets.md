# Audit & Premium UI End-to-End — 30 Tickets (W-1 a W5)

> **Origem:** `/Transferências/PDC/Audit & Premium UI End To End/` (30 ficheiros .md)
> **Status:** OURO — backlog operacional E2E com scope, guardrails, acceptance criteria e verification steps por ticket
> **Contexto:** Wave de auditoria e redesign Premium UI que complementa os 34 tickets W0-W5 do traycer-epics. Foco em event bus idempotency, Bootstrap hardening, Soul & Elite dashboards, Full-Spec schemas para 6 content-types, builder primitives, e pipeline editorial unificado.
> **Última revisão:** Abril 2026

---

## Índice por Wave

| Wave | Tickets | Tema |
|------|---------|------|
| **W-1** | 5 | Infra: outbox idempotency, hookResults, notifyHook contract, feature flags SSOT, characterization tests |
| **W0** | 3 | Bootstrap: HUB registry + seed, retry hardening, empty states premium |
| **W1** | 2 | TopBar: RoleChipMenu + notifications, CommandPalette ⌘K |
| **W2** | 5 | Design: token purge amber→Soul&Elite, ContentTypeCTAGrid, 4 dashboards Soul&Elite, Playwright snapshots |
| **W3** | 7 | Full-Spec schemas: Programa, Projeto, Simulação, Experiência, Post, Conquista, schema-drift health |
| **W4** | 8 | Builders: primitives (Shell, Section, ActionsBar, UploadZone), 6 builders Full-Spec por tipo |
| **W5** | 3 | Impact: event impact route, EcosystemImpactPanel, pipeline editorial unificado |

---

## W-1 — Infra e Event Bus

### W-1.1 — Outbox Replay: correlationId como event.id
- **Problema:** Replay gera `event.id` novo (`randomUUID`) → contorna anti-duplicação dos hooks
- **Fix:** `correlationId` reutilizado como `event.id` em replay
- **Scope:** `outbox-replay.ts`, `event-bus.ts`
- **Teste:** `outbox-replay.idempotency.spec.ts` — reprocessar 2× não cria duplicados em feed/match/notificações

### W-1.2 — hookResults persistidos no domain-event
- **Objectivo:** `hookResults` em Strapi como JSON incrementalmente alimentado por cada hook
- **Campo aditivo:** `domain-event.hookResults: json` (default `{}`)
- **5 chaves:** ranking, feed, match, achievement, notify → cada com `{status, data?, reason?}`
- **Guardrail:** Falha a persistir hookResult → log + continuar (best-effort)

### W-1.3 — notifyHook contract alignment
- **Drift:** Hook envia `tipo: 'sistema'`, testes esperam `tipo: 'conquista'`. Schema requer `mensagem` (required), hook envia `corpo`
- **Fix:** Alinhar `mensagem` (obrigatório) + `corpo` (retrocompat) + `tipo` semântico
- **Teste:** `notify.contract.spec.ts` valida payload contra schema Strapi

### W-1.4 — useFeatureFlags via BootstrapContext
- **Problema:** `useFeatureFlags()` chama `/feature-flags/effective` (endpoint inexistente)
- **Fix:** Ler de `useBootstrap().data?.capabilities.features`
- **Guardrail:** Fail-safe `default false` preservado; `staleTime` 15min mantido

### W-1.5 — Characterization Tests: Sidebar + Redirect
- **Testes permanentes:** Sidebar renderiza hubs correctos por role (5 tests); redirect pós-login por role
- **Fix colateral:** `instituicao-dashboard.spec.ts` aponta para rotas reais

---

## W0 — Bootstrap e Foundation

### W0.1 — HUB_* no Features Registry + Strapi Seed
- Registar 6 HUBs (`HUB_LEARN`, `HUB_EXPLORE`, `HUB_FUTURE`, `HUB_COMMUNITY`, `HUB_MENTOR`, `HUB_INSTITUTION`) com status `STABLE`
- Script seed idempotente `seed-hubs.ts`
- Health-check `GET /health/feature-registry` → 503 se deriva detectada

### W0.2 — BootstrapContext Retry Hardening
- Retry 1→3 com exponential backoff (1s, 2s, 4s)
- `BootstrapErrorScreen` premium (terracota, Instrument Serif, AsymmetricButton "Tentar novamente")

### W0.3 — Dashboard Estudante: Empty States Premium
- Eliminar "Erro ao sincronizar o teu Oráculo" → retornar 200 com dados parciais
- `AspirationalEmpty` em todos os tiles vazios (Match, Behavior, Cursos)
- E2E `empty-states.spec.ts`

---

## W1 — TopBar Premium

### W1.1 — RoleChipMenu + NotificationsDropdown
- Dropdown: "Painel de Decisão" (1ª opção), "O meu Perfil", "Configurações", "Sair"
- Bell dropdown com `useNotificacoes()` + "Marcar todas como lidas"
- Purga tokens legacy `bg-amber*`

### W1.2 — CommandPalette ⌘K (rotas estáticas)
- Modal com filtro fuzzy sobre rotas role-aware
- Acessível: `role="dialog"`, focus trap, Esc para fechar
- Out of scope: busca dinâmica de entidades (W6.4)

---

## W2 — Soul & Elite Dashboards

### W2.1 — Token Purge Cross-Monorepo
- Auditoria + substituição: `bg-amber*` / `text-amber*` / `cobalt` → `bg-accent` / `text-accent` / `text-institutional-cobalt`
- Não tocar em `tokens.css` (canónico)

### W2.2 — ContentTypeCTAGrid + MentorDashboard
- Primitivo `ContentTypeCTAGrid` reutilizável
- MentorDashboard: BentoGrid + GlassCard + 4 CTAs (Criar Curso, Lab, Upload, Estudantes)
- AspirationalEmpty para empty states

### W2.3 — InstituicaoDashboard Soul & Elite
- CTAs canónicos para instituição

### W2.4 — ModeradorDashboard + AdminDashboard
- Ambos convertidos para Soul & Elite

### W2.5 — EstudanteDashboard Polish + Playwright Baseline
- Snapshots Playwright para os 5 dashboards (baseline visual regression)

---

## W3 — Full-Spec Schemas (6 Content-Types)

### W3.1 — Programa Full-Spec
- **13 campos aditivos:** proposito, metodologia, recursos, responsavel, cursos (m-to-m), experiencias, simulacoes, projetos, regrasMatricula, precoPolicy, criadorTipo, historicoEstados, motivoRejeicao
- **Estado workflow:** draft → review → approved → published → archived
- **BFF:** POST, PUT, PATCH estado com RBAC (mentor, instituicao, super_admin)
- **Eventos:** PROGRAMA_CRIADO, PROGRAMA_PUBLICADO

### W3.2 — Projeto Full-Spec
- **Camadas:** `abstract` (público) vs `core` (privado com ACL)
- **4 modos:** Exposição, Colaboração, Mentoria, Financiamento
- **ACL server-side:** GET filtra `core` por viewer em `acessoCoreACL`
- **Votos:** campo json para sistema de votos

### W3.3 — Simulação Full-Spec
- Schema aditivo + Zod + RBAC (adiciona `instituicao` como criador)

### W3.4 — Experiência Full-Spec
- Workflow Comité Científico + RBAC (adiciona `mentor`) + Zod expansion

### W3.5 — Post Composer
- **Novo content-type** `feed-post` + Zod + BFF route + moderation queue

### W3.6 — Conquista Manual
- Flag `origem` (automática vs manual) + Zod + BFF route

### W3.7 — Schema Drift Health
- Labels `DEPRECATED` em campos legacy Strapi
- Health-check `/health/schema-drift`

---

## W4 — Builder Primitives + 6 Builders

### W4.1 — BuilderShell + BuilderSection
- **Shell:** 3 colunas desktop, drawer mobile, breadcrumb, header com EditorialStateBadge
- **Section:** Accordion controlado, indicador completude verde/cinza, integra `react-hook-form`
- Generic `<T extends FieldValues>` para tipagem

### W4.2 — BuilderActionsBar + EditorialStateBadge + BuilderUploadZone
- ActionsBar: Guardar Rascunho, Pré-visualizar, Submeter para Revisão
- EditorialStateBadge: draft/review/approved/published/archived com cores Soul & Elite
- UploadZone: drag-and-drop para R2 com progresso

### W4.3 — Curso: migrar SovereignCourseBuilder para BuilderShell
### W4.4 — Experiência: builder com 3 painéis (Realidade · Vozes · Guia Institucional)
- Upload R2 (vídeos depoimentos, fotos campus)
- Regra: SEMPRE gratuita (sem campo preço)

### W4.5 — Simulação: builder com critérios + materiais + tipo lab
### W4.6 — Programa: builder com 5 elementos canónicos + agrupamentos
### W4.7 — Projeto: builder com camadas Pública/Core + 4 modos + ACL
### W4.8 — Post composer + Conquista manual composer

---

## W5 — Impact e Pipeline Editorial

### W5.1 — GET /domain-events/:id/impact
- Endpoint leitor que devolve hookResults persistidos
- Shape: `{eventId, correlationId, eventName, processedAt, hooks: {ranking, feed, match, achievement, notify}}`
- Auth required, 403 se não autor/admin

### W5.2 — EcosystemImpactPanel UI
- Wire nos 6 builders — após publicar, mostra impacto nos 5 hooks do ecossistema

### W5.3 — Pipeline Editorial Unificado
- `EditorialStateBadge` em 9+ páginas (catálogos + detail pages)
- Workflow `draft→review→approved→published→archived` visível e consistente
- Substituir todos os badges ad-hoc

---

## Resumo de Dependências

```
W-1.1 (outbox id) ──→ W-1.2 (hookResults) ──→ W5.1 (impact route) ──→ W5.2 (impact UI)
W-1.4 (flags SSOT) ──→ W0.1 (HUB registry)
W-1.5 (tests) ──→ W0.2 (retry) ──→ W0.3 (empty states)
W2.1 (token purge) ──→ W2.2-2.5 (dashboards)
W3.1-3.7 (schemas) ──→ W4.1-4.2 (primitives) ──→ W4.3-4.8 (builders)
W4.2 (EditorialStateBadge) ──→ W5.3 (pipeline unificado)
```

---

*Destilado de 30 tickets de `/Transferências/PDC/Audit & Premium UI End To End/` · Abril 2026*
*Cada ticket original contém scope, guardrails, acceptance criteria e verification steps detalhados.*
