# PDC v2 — Mapa de Pontos Críticos e Complexos

> **Propósito:** Mapa honesto dos 10 problemas mais críticos e difíceis do projecto.
> Classificação por impacto de produto × dificuldade de execução.
> **Não são bugs de código** — são lacunas arquitecturais, dívida de produto e desync estruturais.
>
> **Fontes:** `REQUIREMENTS.md` · `DIVIDA_TECNICA_CONHECIDA.md` · `MASTER--audit-report.md` · `entitlements-core-trio-analysis.md`
> **Auditoria de código:** 30 de Abril de 2026 — cada ponto confirmado contra ficheiros reais.
> **Última revisão:** 30 de Abril de 2026

---

## Legenda de Severidade

| Símbolo | Significado |
|---------|-------------|
| 🔴 | **Crítico** — o produto mente ao utilizador ou tem risco de perda de dados |
| 🟠 | **Alto** — feature core incompleta que bloqueia o valor real do produto |
| 🟡 | **Médio** — drift ou dívida que degrada qualidade mas não bloqueia |
| 🔵 | **Complexidade** — correcto para executar, mas requer cuidado de sequência |

---

## P1 🔴 — Perfil Vocacional: Desync Parcial (BFF existe, FE não consome, não persiste)

**O Oráculo existe mas o loop está aberto.**

| Camada | Estado Confirmado (Auditoria) |
|--------|-------------------------------|
| **Frontend** `RelatorioVocacional.tsx:112` | **NÃO** chama `perfil-premium` — usa `setData({ patterns: [], recomendacoes: [] })` literal. Chama apenas `GET /reputacao/me`. |
| **BFF** `apps/api/src/routes/vocacional.ts:16` | `GET /vocacional/perfil-premium` **EXISTE** — chama `vocacionalService.calcularPerfil()` e `gerarRecomendacoes()`. |
| **BFF** `vocacional.service.ts` | Calcula φ/R on-demand mas **não persiste** no Strapi (`perfil-vocacionals`). |
| **Strapi** `perfil-vocacional` | Schema rico com 8 campos — **nunca escrito** pelo BFF. |
| **`heuristics.engine.ts`** | É apenas um **wrapper fino** sobre `@pdc/shared/heuristics-calculator.ts` — correcto. |
| **`@pdc/shared/heuristics.ts`** | `analyzeFluidity/Resilience/Focus` **SÃO consumidos** em `telemetria.processor.ts:107`. |

**Revisão do diagnóstico:** O problema original estava parcialmente errado.
- ✅ `heuristics.ts` shared **tem** consumidores (processor + engine)
- ✅ `GET /vocacional/perfil-premium` **existe** no BFF
- ❌ O **Frontend** simplesmente não chama este endpoint — usa `patterns: []` hardcoded
- ❌ O BFF **não persiste** o resultado no Strapi após calcular

**Impacto real:** O estudante vê `RelatorioVocacional` com patterns e recomendações sempre vazios. O endpoint está lá, o frontend apenas ignora-o.

**Fix mínimo:** 2 alterações cirúrgicas:
1. `RelatorioVocacional.tsx` — substituir `setData({ patterns: [], recomendacoes: [] })` por `await http.get('/vocacional/perfil-premium')`
2. `vocacionalService` — adicionar `strapiPost('/perfil-vocacionals', resultado)` após calcular

**Ref:** `apps/web/src/features/simulacoes/RelatorioVocacional.tsx:112` · `apps/api/src/routes/vocacional.ts:16`

---

## P2 � — Feature Flags: `useFeatureFlags` lê do `/bootstrap`, mas `getEffectiveFlags` ignora `instituicaoId` em 5 de 6 consumidores

**Diagnóstico corrigido pela auditoria.**

- `apps/web/src/hooks/useFeatureFlags.ts:5` — lê `data?.capabilities.features` do `BootstrapContext`. **NÃO** chama `GET /feature-flags/effective` directamente. **Não há fail-open no FE.**
- `apps/api/src/modules/feature-flags/feature-flags.service.ts:55` — `getEffectiveFlags(instituicaoId?)` **existe e funciona** com override por instituição.
- `apps/api/src/routes/bootstrap.ts` — único consumidor que passa `instituicaoId` correctamente.
- **5 outros consumidores** (`reputation.service`, `conquistas.engine`, `discussions.ts`, `perfis.ts`, `catalogo-pessoas.ts`) chamam `getEffectiveFlags()` **sem `instituicaoId`** → recebem flags globais, não overrides institucionais.
- `subscricao` Strapi ainda é **dead code comercial** — o novo `entitlements.service.ts` resolve este ponto.

**Revisão:** O problema não é "fail-open silencioso" — é **perda de contexto institucional** em 5 rotas. Instituição com override `simulacoes=true` mas o BFF serve `simulacoes=false` (global) por não passar `instituicaoId`.

**Fix mínimo:** Nas 5 rotas, extrair `instituicaoId` do JWT e passar para `getEffectiveFlags(instituicaoId)`.

**Ref:** `apps/web/src/hooks/useFeatureFlags.ts:5` · `apps/api/src/modules/feature-flags/feature-flags.service.ts:55`

---

## P3 🟠 — OTP Twilio: Implementação real existe, mas bypass dev pode vazar para produção

**Diagnóstico corrigido pela auditoria.**

- `apps/api/src/modules/auth/otp.service.ts:126` — `sendOtpSms()` chama a API Twilio **real** (`https://api.twilio.com/...`). Não é sandbox.
- `auth.otp.ts:36-39` — Bypass `DEV_SKIP_OTP=true` tem **Guard Duplo + hardening env**: `NODE_ENV === 'development'/'test'` AND `DEV_SKIP_OTP === 'true'` (runtime) + `env.ts` recusa boot se `DEV_SKIP_OTP=true` em produção (boot-time). Não existe codigo mestre 000000 nem verificação de dominio Railway (obsoleto após migração Hetzner ADR-046). Robusto. Ver `docs/guia-tecnico/dev-skip-otp.md` (revisto 2026-07-10).
- **Risco real identificado:** As variáveis `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` são **opcionais** no `env.ts` — se não configuradas em produção, `sendOtpSms` lança `Error('Variáveis Twilio não configuradas')` silenciosamente no fluxo de registo.
- `TWILIO_FROM` no `.env.example` aponta para `+15005550006` (número de teste Twilio) — se copiado para produção, SMS nunca chega.

**Impacto real:** Não é mock — é **configuração incompleta**. Funciona se as credenciais Twilio de produção estiverem no VPS Hetzner.

**Fix mínimo:** 1. Confirmar que o VPS Hetzner tem `TWILIO_PHONE_NUMBER` com número real angolano/internacional. 2. Tornar as vars obrigatórias no `env.ts` para `NODE_ENV=production`.

**Ref:** `apps/api/src/modules/auth/otp.service.ts:126` · `apps/api/.env.example:23`

---

## P4 � — Simulação Tipo 3: Player existe. Score BFF é real. ~~Hardcoded~~

**Diagnóstico original estava ERRADO. Confirmado por auditoria.**

- `apps/web/src/features/simulacoes/Tipo3Player.tsx` **EXISTE** — shell funcional com telemetria canónica (3 eventos: `iniciada`, `acao`, `concluida`) e testes em `Tipo3Player.spec.tsx`.
- `SimulacaoPlayerPage.tsx:45` — `{simulacao.tipo === 3 && <Tipo3Player />}` está montado correctamente.
- `apps/api/src/routes/simulacoes.ts:301` — `finalScore = (resFluidity.score + resFocus.score) / 2` — **score calculado no BFF** a partir de `analyzeFluidity` + `analyzeFocus`. Não há `8.5` hardcoded.
- `Tipo2Player.tsx` — submete `focusStability` real (calculado via `visibilitychange` events), não score hardcoded.

**Ressalva real:** `Tipo3Player` é um **shell funcional** — captura telemetria e conclui a tentativa, mas o conteúdo interactivo (o laboratório/iframe em si) é um placeholder de UI. O ciclo de dados está correcto; o conteúdo pedagógico está vazio.

**Impacto:** Baixo para integridade de dados. Médio para experiência do utilizador (Tipo 3 não tem conteúdo real).

**Ref:** `apps/web/src/features/simulacoes/Tipo3Player.tsx` · `apps/api/src/routes/simulacoes.ts:301`

---

## P5 🟠 — Feed: Apenas 2 das 4 Fontes Implementadas ✅ CONFIRMADO

**Confirmado por auditoria. `apps/api/src/routes/feed.ts` tem:**

```
GET /feed/        → buildFeed(geral weights)  ✅
GET /feed/geral   → buildFeed(geral weights)  ✅ (duplicata intencional)
GET /feed/trending → buildFeed(trending weights) ✅
GET /feed/vocacional  → ❌ NÃO EXISTE
GET /feed/institucional → ❌ NÃO EXISTE
```

- `feed.ts:76` — validação de tipo explicitamente só aceita `'geral'` ou `'trending'` — Vocacional e Institucional **bloqueiam com 400**.
- O `buildFeed()` em `feed.helpers.ts` não recebe `areaVocacional` como parâmetro — sem capacidade de filtrar por área do estudante.

**Impacto:** Confirmado. Sem feed vocacional = sem personalização = produto genérico. Sem feed institucional = sem canal B2B.

**Pré-requisito:** Feed Vocacional depende de P1 (perfil vocacional persistido com `areaPrincipal`).

**Ref:** `apps/api/src/routes/feed.ts:76`

---

## P6 🟠 — Mensagens & Realtime: UI Pendente + Agrupamento Ausente

**Uma rede social sem mensagens não é uma rede social.**

- `P8`: Socket.IO funcional para notificações básicas — **mensagens UI pendente**.
- Agrupamento de notificações não implementado (ex: "3 pessoas curtiram o teu post" em vez de 3 notificações separadas).
- `GET /dashboard/mentor` dedicado não existe — mentor vê padrões genéricos, não dados dos seus mentorados.

**Impacto:** Sem mensagens, o vínculo bilateral entre mentor↔estudante não tem canal de comunicação real. Toda a funcionalidade de mentoria fica prejudicada.

**Dificuldade:** Alta para UI (design + realtime state management + push notifications). Média para o agrupamento (lógica BFF).

**Ref:** `REQUIREMENTS.md P8, T9` · `divida-tecnica-dashboards-home.md DT-06`

---

## P7 � — Heurísticas Paralelas: ~~Problema resolvido~~ — engine é wrapper fino sobre shared

**Diagnóstico original estava ERRADO. Confirmado por auditoria.**

- `apps/api/src/modules/analysis/heuristics.engine.ts` (25 linhas) é um **wrapper fino** que delega 100% para `@pdc/shared`:
  ```ts
  import { computeFluidity, computeResilience, computeFocus, computeHesitation } from '@pdc/shared';
  // Cada método faz apenas: return computeX(...);
  ```
- Toda a matemática vive em `packages/shared/src/heuristics-calculator.ts` — **único source of truth**.
- `telemetria.processor.ts:95` usa o engine; `simulacoes.ts:298` usa directamente `analyzeFluidity`/`analyzeFocus` do shared.
- **Zero duplicação de lógica.**

**Este ponto (P7 / D1) está RESOLVIDO** e pode ser removido da lista de dívida técnica activa.

**Ref:** `apps/api/src/modules/analysis/heuristics.engine.ts`

---

## P8 🟡 — `pulseVariacao: 12` Hardcoded em `estudante.ts` (rota legada)

**Parcialmente confirmado. Há duas rotas de dashboard do estudante.**

- `apps/api/src/routes/estudante.ts:131` — **rota legada** tem `pulseVariacao: 12` literal. ✅ CONFIRMADO.
- `apps/api/src/routes/dashboard/estudante.ts:100` — **rota nova** calcula: `const pulseVariacao = lastPattern ? (lastPattern.scoreGlobal * 10) : 0`. Incluso comentário `G15: pulseVariacao deve ser derivado de telemetria histórica`. Mais correcto mas ainda aproximado.
- **Ambas as rotas estão montadas.** O FE pode estar a consumir a legada.

**Impacto:** Dependendo de qual rota o FE consome, o estudante vê `12` fixo ou um proxy do `scoreGlobal`. Nenhuma é a variação temporal real (semana actual vs anterior).

**Fix real:** Query Redis/Strapi — contar eventos por utilizador nos últimos 7d vs 7d anteriores. Eliminar rota legada `estudante.ts` ou redireccionar para `dashboard/estudante.ts`.

**Ref:** `apps/api/src/routes/estudante.ts:131` · `apps/api/src/routes/dashboard/estudante.ts:100`

---

## P9 🟡 — CommandPalette ⌘K: Search Dinâmico Ausente

**A feature de descoberta rápida é um stub.**

- `⌘K` abre um modal — mas o search é **estático** (lista fixa de rotas, sem busca real).
- Sem integração com `/catalogo`, `/perfis`, `/cursos` em tempo real.
- Sem role-awareness (estudante não devia ver rotas de admin).
- `T-REM-3` classificado como "Alto" no Epic de Remediação.

**Impacto:** Power users (mentores, admins, comité) ficam sem o atalho de navegação que define a experiência premium.

**Dificuldade:** Média-Alta. Requer debounce + múltiplos endpoints + focus trap + animações correctas.

**Ref:** `STATE.md T-REM-3` · `REQUIREMENTS.md F8`

---

## P10 🔵 — LTI 1.3: Grade Passback sem LMS Real para Validar

**A integração institucional premium não foi testada E2E.**

- Outbox pattern implementado, OIDC launch flow parcial.
- Grade passback real **requer LMS de teste** (Moodle/Canvas em sandbox) para validação.
- `P7` marcado como `[P]` (Parcial) — funciona em teoria, não em prática.
- Angola tem Canvas LMS em 2 universidades públicas — integração real tem valor imediato.

**Impacto:** Instituições com LMS não conseguem conectar o PDC ao seu sistema de notas.

**Dificuldade:** Alta (dependência externa: precisa de instância Moodle/Canvas de teste). A implementação já está ~80% feita.

**Ref:** `REQUIREMENTS.md P7` · `09-traycer-specs/algoritmos-dados-seguranca.md §6`

---

## Tabela Resumo Pós-Auditoria

| # | Severidade | Confirmado? | Resumo |
|---|---|---|---|
| P1 | 🟠 Alto | ✅ Corrigido | FE não chama o endpoint que existe. BFF não persiste. Fix = 2 linhas. |
| P2 | 🟠 Alto | ✅ Corrigido | Não é fail-open. É perda de `instituicaoId` em 5 rotas. |
| P3 | 🟠 Alto | ⚠️ Parcial | Twilio real existe. Risco é credenciais de prod não configuradas em Railway. |
| P4 | 🟢 Fechado | ❌ Errado | Tipo3Player existe. Score BFF é real. Shell funcional sem conteúdo pedagógico. |
| P5 | 🟠 Alto | ✅ Confirmado | Feeds vocacional + institucional não existem. Confirmado por grep. |
| P6 | 🟠 Alto | ✅ Confirmado | Mensagens UI pendente. Socket.IO existe mas sem UI de chat. |
| P7 | 🟢 Fechado | ❌ Errado | Engine é wrapper fino sobre shared. Zero duplicação. |
| P8 | 🟡 Médio | ✅ Corrigido | `12` hardcoded na rota legada. Rota nova usa proxy de `scoreGlobal`. |
| P9 | 🟡 Médio | ✅ Confirmado | ⌘K sem search dinâmico. Confirmado por inspeção anterior. |
| P10 | 🔵 Complexo | ✅ Confirmado | LTI 80% feito. Requer LMS externo para validar. |

## Sequência de Execução Recomendada (Pós-Auditoria)

```
P1-fix  → RelatorioVocacional.tsx chama /vocacional/perfil-premium  (30min)
P1-fix  → vocacionalService persiste no Strapi após calcular         (1h)
P8-fix  → eliminar rota legada /estudante ou corrigir pulseVariacao  (30min)
P2-fix  → passar instituicaoId nas 5 rotas de feature-flags          (1h)
P3-fix  → confirmar credenciais Twilio no Railway; tornar obrigatórias em prod (30min)
P5      → GET /feed/vocacional + GET /feed/institucional              (1 dia)
P6      → Mensagens UI + agrupamento de notificações                 (2-3 dias)
P9      → ⌘K search dinâmico + role-awareness                       (1 dia)
P10     → LTI E2E com Moodle sandbox                                (depende infra)
```

---

*Regra de Ouro: Nenhum PR que toque P1/P2/P5 é aceite sem passar pelas 5 camadas (UI → Shared → BFF → Strapi → Ecossistema).*
*Auditada contra código real: 30 de Abril de 2026*
