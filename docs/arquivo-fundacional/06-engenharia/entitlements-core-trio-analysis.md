# Análise — Onda Entitlements + Core Trio

> **Origem:** `Recente/Refactoring_Analysis_—_Onda_Entitlements_+_Core_Trio.md` (231 linhas, Abril 2026)
>
> **Propósito:** Estado actual do código nas 4 zonas tocadas pela onda de Entitlements. Documento puramente descritivo: dependências, hotspots de risco, cobertura de testes e área de impacto.

---

## 1. As 4 Zonas

### Zona A — Feature-Flags (substrato dos Entitlements)

**Ficheiros nucleares:**
- `apps/api/src/modules/feature-flags/feature-flags.service.ts`
- `apps/api/src/routes/feature-flags.ts` — rotas admin (`PUT /defaults/:domain`, `PUT/DELETE /institutions/:id/:domain`, `GET /`)
- `infra/strapi/src/api/feature-flag/content-types/feature-flag/schema.json`
- `packages/shared/src/registry/features.ts` — 7 flags estáticas

**🔴 Contrato quebrado:** A rota `GET /feature-flags/effective` **não existe no BFF**. Os hooks frontend (`useFeatureFlags`, `useFeatureFlag`) caem em `catch` e retornam `{}` (fail-open). Toda a UI gated está na prática "tudo desligado". O caminho correcto seria consumir `/bootstrap`.

**Consumidores de `getEffectiveFlags()`:** bootstrap.ts (único limpo), reputation.service, conquistas.engine, discussions.ts, perfis.ts, catalogo-pessoas.ts — **5 dos 6 ignoram `instituicaoId`**.

### Zona B — Dead Code Comercial (Subscrição/Plano)

**Descoberta crítica:** Strapi tem 2 content-types comerciais **nunca lidos pelo BFF:**
- `subscricao` — `perfil` rel, `instituicao` rel, `tipo` enum (`individual`/`institucional`), `plano` (4 valores: `gratuito`/`premium`/`institucional_basico`/`institucional_premium`), `limiteAlunos`, `ativa`, `valorPago`, `moeda`
- `instituicao.planoAtivo` — enum (`gratuito`/`basico`/`premium`) + `limiteAlunos`

**"Lying infrastructure"** — foundation comercial existe mas é dead code. Refactor pode aproveitar OU deprecar.

### Zona C — Auth & Identidade (contexto de entitlements)

- `auth.middleware.ts` extrai `{ id, role, instituicaoId? }` do JWT — **`instituicaoId` já está no token**
- `RoleSchema` em shared: 6 roles
- `perfil` Strapi: `instituicao` (relation) + `modoAcesso` (`individual`/`institucional`) + `codigoInstitucional`
- **Apenas `bootstrap.ts`** passa `instituicaoId` para `getEffectiveFlags()` — os restantes 5 consumidores ignoram contexto institucional

### Zona D — Core Trio (alvos a fechar)

#### D1 — Tipo3Player
- `SimulacaoPlayerPage.tsx` mostra placeholder "em desenvolvimento" para tipo ≠ 1 e ≠ 2
- **`Tipo3Player.tsx` não existe**
- `Tipo1Player` usa `telemetriaService.registarEvento` (legacy); `Tipo2Player` usa `useTelemetry` (moderno) mas submete **score 8.5 hardcoded**
- `SIM_TIPO_3: 'ALPHA'` já reservado no registry

#### D2 — Perfil Vocacional Auto
- `vocacional.service.ts` calcula on-demand (aptidão, consistência, dedicação, diversidade) — **não persiste**
- `RelatorioVocacional.tsx` chama `GET /vocacional/perfil-premium` — **endpoint inexistente**, fallback para **mock hardcoded**
- Strapi `perfil-vocacional` schema é rico (8 campos) — **nunca escrito pelo BFF**
- `packages/shared/src/heuristics.ts` (alma matemática) — **não consumida em lado nenhum**

**🔴 Triplo desync:** Frontend, BFF e Strapi têm 3 schemas diferentes para "perfil vocacional", nenhum se fala.

#### D3 — Reputação E2E
- `routes/reputation.ts` montado em `/reputation` (EN) — todo o resto do sistema é PT
- `getReputacao()` gated por `REPUTATION_VISIBLE`; `getReputacaoBreakdown()` **NÃO é gated** (inconsistência)
- **Zero consumidores** de `/reputation` ou `/reputacao` em `apps/web/`
- Sem schema `ReputacaoBreakdown` no Shared — tipo livre no service

#### D4 — Bus de Eventos (peça partilhada)
- 3 eventos definidos: `TENTATIVA_CONCLUIDA`, `CONQUISTA_DESBLOQUEADA`, `COMENTARIO_CRIADO`
- `publishWithOutbox()` marca `processed=true` antes dos handlers terminarem

---

## 2. Hotspots de Risco (12 identificados)

| # | Hotspot | Severidade |
|---|---------|-----------|
| H1 | **Triplo desync vocacional** (FE/BFF/Strapi) — 3 schemas, nenhum alinhado | 🔴 |
| H2 | **`tentativa.alunoId` vs `perfil` relation** — filtros podem falhar silenciosamente | 🔴 |
| H3 | **Score 8.5 hardcoded no Tipo2Player** — score fictício persiste em produção | 🔴 |
| H4 | **`/feature-flags/effective` inexistente** — frontend fail-open silencioso | 🔴 |
| H5 | **`/vocacional/perfil-premium` inexistente** — mock parece real | 🔴 |
| H6 | **Outbox EventEmitter síncrono** — `processed=true` antes de handlers terminarem | 🟠 |
| H7 | **`subscricao` + `planoAtivo` dead code** — lying infrastructure | 🟠 |
| H8 | **6 chamadas `getEffectiveFlags()` sem contexto** — ignoram `instituicaoId` | 🟠 |
| H9 | **Rule of 300 vs Players** — adicionar telemetria + scoring estouraria limite | 🟠 |
| H10 | **`feature-flags` ↔ `entitlements` coexistência** — kill-switches vs comerciais misturados | 🟠 |
| H11 | **Fail-safe inversão FE** — `fail-safe=false` vs `catch → return {}` (fail-open) | 🟠 |
| H12 | **`heuristics.ts` orphan** — alma matemática escrita mas não consumida | 🟠 |

---

## 3. Lacunas de Testes Específicas

| Lacuna | Impacto |
|--------|---------|
| Sem characterization test do `RelatorioVocacional` actual | Refactor pode mudar UX silenciosamente |
| Sem characterization test do score=8.5 do Tipo2 | E2E precisa re-baseline |
| Sem testes de contrato `/vocacional/perfil-premium` | Endpoint a criar — tests-first |
| Sem testes para resolver de entitlements | Caminho crítico de quase tudo |
| Sem testes E2E para Tipo3Player | Nasce do zero |
| Sem teste de `/feature-flags/effective` | Decidir: criar, deprecar a favor de `/bootstrap`, ou ambos |
| Sem teste do `tentativa.alunoId` vs `perfil` (H2) | Bug latente potencial |

---

## 4. Change Surface Area (estimativa)

| Workspace | Ficheiros | Tipo |
|-----------|-----------|------|
| `packages/shared` | +5 a +8 (`entitlements.ts`, `plan.ts`, `quota.ts`, `vocacional.ts` canónico, `reputacao.ts` canónico) | Adições SSOT |
| `apps/api/src/modules/entitlements` | +3 a +5 (novo módulo) | Criação |
| `apps/api/src/modules/feature-flags` | 1 (refactor assinatura) | Modificação |
| `apps/api/src/modules/vocacional` | 1-2 (refactor + handler) | Modificação substancial |
| `apps/api/src/modules/reputation` | 1-2 (extrair shared + handler) | Modificação |
| `apps/api/src/routes` | 6-8 (bootstrap, feature-flags, vocacional, reputation, simulacoes, perfis, catalogo-pessoas, discussions) | Modificações pontuais |
| `apps/api/src/modules/events` | +2 (vocacional.handler, reputation.handler) + types | Adições |
| `apps/web/src/features/simulacoes` | +1 (Tipo3Player) + 2 mods (Tipo2 score real, RelatorioVocacional real) | Criação + mods |
| `infra/strapi` | Decisão pendente: estender `subscricao` ou criar `plan` | Schema migration |

---

## 5. Resumo

O maior risco **não é o entitlements** — é o **triplo desync vocacional** e o **bug `alunoId` vs `perfil`**. Se não forem resolvidos como pré-requisito, o resolver será construído sobre dados quebrados.

**Onde tocar é seguro:** event-bus, heuristics shared, conquistas engine, bootstrap.
**Onde tocar é arriscado:** vocacional service, reputation service, simulacoes routes, Tipo2Player.

---

*Destilado de `Recente/Refactoring_Analysis_—_Onda_Entitlements_+_Core_Trio.md` (231 linhas) · Abril 2026*
