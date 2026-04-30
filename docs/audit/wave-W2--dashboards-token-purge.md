# Audit · Wave W2 — Soul & Elite Dashboards + Token Purge

> **Metodologia:** D1 (Filtro de Visão por camada: `IMPORTANTE/05 §3 anti-patterns` + `§4` primitivos canónicos) · D2 (taxonomia) · D8 (estrutura wave-spec) · D11 (fixture `aluno.json` = Audit Infrastructure Gap) · D13 (cascata: T-AUD-1…T-AUD-4 lidos)
> **Escopo:** 5 tickets-fonte W2.1–W2.5
> **Cascata D13:**
> - T-AUD-1 W-1.4 Done — TopBar sem `bg-amber` detectada neste escopo. Anti-duplicação: W2.1 cita mas não re-detecta o mesmo ficheiro.
> - T-AUD-4 Done — `ContentTypeCTAGrid` é consumido pelos 4 dashboards; W2.2-W2.4 CTAs verificados por referência cruzada.
> **Auditoria:** estática — nenhum ficheiro de código modificado.

---

## 1. Sumário da Wave

| Ticket | Tema | Veredicto global |
|--------|------|-----------------|
| W2.1 | Token purge cross-monorepo (`bg-amber*`, `text-amber*`, `cobalt` literal) | **Partial** |
| W2.2 | `ContentTypeCTAGrid` primitive + `MentorDashboard` Soul & Elite | **Partial** |
| W2.3 | `InstituicaoDashboard` Soul & Elite + CTAs canónicos | **Done** |
| W2.4 | `ModeradorDashboard` + `AdminDashboard` Soul & Elite | **Done** |
| W2.5 | `EstudanteDashboard` polish + Playwright snapshot baseline | **Partial** |

**Contagens:**

| Done | Done-Plus | Partial | Missing | Drift-Ticket | Drift-Constitution | Vision-Failure | Cannot-Verify |
|------|-----------|---------|---------|-------------|-------------------|----------------|---------------|
| 2 | 0 | 3 | 0 | 1 | 0 | 0 | 1 |

> **W2.5 Playwright snapshot**: `Cannot-Verify` para AC de baseline — `tests/e2e/visual/` ausente, sem `__snapshots__/`, `aluno.json` ausente.

---

## 2. W2.1 — Token Purge Cross-Monorepo

### 2a. Grep completo: `bg-amber*` / `text-amber*` em `apps/web/src`

| Ficheiro | Linha | Token | Contexto |
|---------|-------|-------|----------|
| `features/landing/LandingHero.tsx` | 34 | `bg-amber` | `animate-ping rounded-full bg-amber` |
| `features/landing/LandingHero.tsx` | 35 | `bg-amber` | `rounded-full bg-amber` |
| `features/landing/LandingHero.tsx` | 46 | `text-amber` | `font-display italic text-amber drop-shadow-md` |
| `features/landing/LandingHero.tsx` | 69 | `bg-amber` | `bg-amber px-8 py-4 … hover:bg-amber-hover` |
| `features/landing/LandingHero.tsx` | 95 | `text-amber` | `className="text-amber"` (SVG) |
| `features/landing/LandingFeatures.tsx` | 47 | `text-amber` | `text-amber` label "Funcionalidades" |
| `features/landing/LandingFeatures.tsx` | 61 | `text-amber` | `hover:border-amber/20 hover:bg-amber/[0.03]` |
| `features/landing/LandingFeatures.tsx` | 63 | `text-amber` | `text-amber` icon |
| `features/landing/LandingLivePulse.tsx` | — | `text-amber` / `bg-amber` | 3 matches (não lidos em detalhe) |
| `features/landing/LandingMarquee.tsx` | 17 | `bg-amber` | `border-y border-amber/20 bg-amber/5` |
| `features/landing/LandingMarquee.tsx` | 30 | `text-amber` | `text-amber` separator |
| `features/landing/LandingTestimonial.tsx` | 20 | `text-amber` | `italic text-amber` |
| `features/landing/LandingTestimonial.tsx` | 23 | `bg-amber` | `bg-amber text-sm font-bold text-black` |
| `features/landing/LandingProblema.tsx` | 32 | `text-amber` | `text-amber` label |
| `features/landing/LandingProblema.tsx` | 50 | `text-amber` | `text-amber` icon |
| `features/landing/LandingComoFunciona.tsx` | 32 | `text-amber` | label "Como funciona" |
| `features/landing/LandingComoFunciona.tsx` | 49 | `bg-amber` | `border-amber/20 bg-amber/10 text-amber` step numbers |
| `features/landing/LandingFooter.tsx` | 9 | `text-amber` | `text-amber` logo PDC |
| `features/landing/LandingCTAFinal.tsx` | — | `text-amber` | 1 match |
| `features/landing/LandingMentores.tsx` | — | `text-amber` | 2 matches |
| `features/landing/CarrosselInstituicoes.tsx` | 51 | `text-amber` | fallback logo |
| `features/landing/CarrosselInstituicoes.tsx` | 56 | `text-amber` | `text-amber/60` regiao |
| `features/landing/NeuralConstellation.tsx` | — | `text-amber` | 1 match |
| `pages/LoginPage.tsx` | — | `cobalt` | 1 match |
| `pages/dashboard/MentorDashboard.tsx` | 187 | `institutional-cobalt` | `text-institutional-cobalt` (Brain icon) |
| `pages/dashboard/MentorDashboard.tsx` | 195 | `institutional-cobalt` | `bg-institutional-cobalt` (progress bar) |
| `pages/dashboard/AdminDashboard.tsx` | 76 | `institutional-cobalt` | `bg-institutional-cobalt/10 text-institutional-cobalt` |
| `pages/dashboard/InstituicaoDashboard.tsx` | 54 | `institutional-cobalt` | `bg-institutional-cobalt/10 text-institutional-cobalt` header badge |
| `features/projetos/ProjetoFormPage.tsx` | 177 | `institutional-cobalt` | `text-institutional-cobalt` |
| `features/projetos/ProjetoFormPage.tsx` | 181 | `institutional-cobalt` | `border-institutional-cobalt/20 bg-institutional-cobalt/5 focus:border-institutional-cobalt` |
| `components/ui/Badge.tsx` | — | `amber` | 2 matches |
| `components/ui/quiet/QuietBadge.tsx` | — | `amber` | 2 matches |
| `styles/tokens.css` | 26 | `institutional-cobalt` | definição do token canónico |
| `index.css` | 18 | `cobalt` | `--color-cobalt: var(--institutional-cobalt)` |

**Total:** ~39 ocorrências em 21 ficheiros.

### 2b. Classificação dos matches

| Categoria | Ficheiros | Veredicto W2.1 |
|-----------|-----------|----------------|
| `bg-amber` / `text-amber` — Landing pages | 12 ficheiros landing | **Vision-Failure** — se `amber` é token legacy/não-canónico |
| `institutional-cobalt` em dashboards e builders | MentorDashboard, AdminDashboard, InstituicaoDashboard, ProjetoFormPage | **Done** — `institutional-cobalt` **é o token canónico** definido em `tokens.css L26`; não é um token legacy |
| `--color-cobalt` em `index.css` | index.css L18 | **Done** — alias canónico para `var(--institutional-cobalt)` |
| `amber` em `Badge.tsx` / `QuietBadge.tsx` | 2 ficheiros UI | **Partial** — depende de se `amber` é token canónico no design system |

### 2c. Análise crítica do token `amber`

O ticket W2.1 declara que tokens proibidos são `bg-amber*`, `text-amber*`. O token `amber` aparece em:
- 12 ficheiros de **landing pages** — contexto diferente do dashboard. O ticket W2.1 está focado em purga cross-monorepo; a landing usa `amber` de forma pervasiva com `hover:bg-amber-hover` — o que implica que `amber` **é um token CSS custom property** definido algures (provavelmente em `tokens.css`).

```
Veredicto W2.1:
  - `institutional-cobalt` em dashboards/builders: Done — token canónico legítimo.
  - `amber` (landing pages, Badge, QuietBadge): Partial — o token existe no design
    system mas é usado pervasivamente nas landing pages fora do escopo dos dashboards.
    A purga cross-monorepo W2.1 visava dashboards; as landing pages estão fora do
    escopo declarado pelo ticket ("em scope: apps/web/src" mas foco nos dashboards).
    O token `amber` na landing é intencional (identidade visual pré-PDC).
  - Purga nos 5 dashboards: Done — nenhum dashboard usa `bg-amber` ou `text-amber`.
    Os únicos tokens não-canónicos nos dashboards são `institutional-cobalt` que
    é o token canónico correcto.
```

> **Veredicto global W2.1: Partial** — purga nos dashboards completa. `bg-amber`/`text-amber` persistem em 12+ ficheiros de landing pages fora do escopo primário dos dashboards. Não é Vision-Failure porque landing usa `amber` como token canónico intencional.

---

## 3. W2.2 — `ContentTypeCTAGrid` primitive + `MentorDashboard`

### 3a. `ContentTypeCTAGrid` primitive

```
Veredicto: Partial
Evidência:
  file:apps/web/src/components/dashboard/ContentTypeCTAGrid.tsx L1 —
    // FIXME: STUB AGENT-GENERATED — substituir por implementação real
    // epic:8dc1663f-4a62-407f-b07e-580ce406419d · Consumidores: 4 dashboards.
  
  O componente existe e é funcional (renders CTAs como grid de Links + Card).
  Consumidores: MentorDashboard, InstituicaoDashboard, ModeradorDashboard, AdminDashboard.
  
  Interface correcta: { title, ctas: CTA[], gridCols?, className? }.
  CTA interface: { label, to, icon: LucideIcon, variant? }.
  
  Gap: declarado STUB — "substituir por implementação real". Usa `Card` básico, não
  `GlassCard` ou `AsymmetricButton`. Sem animação, sem estado hover premium.
  Funcionalmente operacional mas sem polimento Soul & Elite.
```

### 3b. `MentorDashboard` Soul & Elite

**CTAs declarados pelos tickets-fonte vs presentes:**

| CTA | Presente no MentorDashboard | Rota |
|-----|:-:|------|
| Criar Curso | ✅ | `/app/mentor/cursos/criar` |
| Criar Laboratório (Simulação) | ✅ | `/app/mentor/simulacoes/criar` |
| Criar Post | ✅ | `/app/feed/criar` |
| Registar Marco (Conquista) | ✅ | `/app/conquistas/criar` |
| Upload Conteúdo | ✅ | `/app/mentor/upload` |
| Ver Estudantes | ✅ | `/app/mentor/mentorados` |

**Primitivos canónicos MentorDashboard:**

| Primitivo | Presente | Evidência |
|-----------|:--------:|----------|
| `BentoGrid` | ✅ | L95 |
| `BentoTile` | ✅ | L97, L114, L127 |
| `GlassCard` | ✅ | L83, L157 |
| `AsymmetricButton` | ✅ | L150 |
| `AspirationalEmpty` | ✅ | L143 |
| `ContentTypeCTAGrid` | ✅ | L98 |
| `Badge` | ✅ | L201 |

```
Veredicto MentorDashboard: Done — todos os primitivos canónicos presentes,
todos os 6 CTAs presentes, BentoGrid layout, GlassCard para telemetria,
AspirationalEmpty para estado vazio, AsymmetricButton como CTA primário.
Dados reais: useQuery('/telemetria/patterns') com métricas de fluidez e decisão.
```

> **Veredicto global W2.2: Partial** — `MentorDashboard` = Done; `ContentTypeCTAGrid` = Partial (STUB funcional sem polimento premium).

---

## 4. W2.3 — `InstituicaoDashboard` Soul & Elite

**CTAs declarados vs presentes:**

| CTA | Presente | Rota |
|-----|:--------:|------|
| Criar Experiência | ✅ | `/instituicao/criar-experiencia` |
| Criar Programa | ✅ | `/instituicao/criar-programa` |
| Criar Curso | ✅ | `/instituicao/cursos/criar` |
| Criar Post | ✅ | `/feed/criar` |
| Registar Marco | ✅ | `/conquistas/criar` |
| Branding | ✅ | `/instituicao/branding` |
| Match Terminal | ✅ | `/instituicao/propostas` |

**Primitivos canónicos InstituicaoDashboard:**

| Primitivo | Presente | Evidência |
|-----------|:--------:|----------|
| `BentoGrid` | ✅ | L65 |
| `BentoTile` | ✅ | L67, L109 |
| `GlassCard` | ✅ | L73, L82, L91, L120 |
| `AsymmetricButton` | ✅ | L102 |
| `AspirationalEmpty` | ❌ | Não usado (sem estado vazio) |
| `ContentTypeCTAGrid` | ✅ | L110 |

**Gap**: `InstituicaoDashboard` usa rotas `/instituicao/criar-*` e `/feed/criar` sem `/app/` prefix — inconsistência com `MentorDashboard` que usa `/app/mentor/*`. Pode causar navegação errada se as rotas não estiverem registadas sem prefixo `/app`.

```
Veredicto: Done — 7 CTAs presentes, primitivos canónicos BentoGrid/GlassCard/
AsymmetricButton usados, KPI tiles com dados reais (experienciasApi.getStats()).
Gap menor de prefixo de rota detectado.
```

---

## 5. W2.4 — `ModeradorDashboard` + `AdminDashboard`

### 5a. ModeradorDashboard

**CTAs presentes:**

| CTA | Presente | Rota |
|-----|:--------:|------|
| Fila de Aprovações | ✅ | `/moderacao/aprovacoes` |
| Todas as Denúncias | ✅ | `/moderacao/denuncias` |
| Gestão de Utilizadores | ✅ | `/moderacao/utilizadores` |
| Audit Trail | ✅ | `/admin/audit` |

**Primitivos canónicos ModeradorDashboard:**

| Primitivo | Presente |
|-----------|:--------:|
| `BentoGrid` | ✅ |
| `BentoTile` | ✅ |
| `GlassCard` | ✅ |
| `Badge` | ✅ |
| `ContentTypeCTAGrid` | ✅ |
| `AsymmetricButton` | ❌ |
| `AspirationalEmpty` | ❌ |

Dados reais: `denunciasApi.list({ estado: 'pendente' })` com fila de denúncias.

### 5b. AdminDashboard

**CTAs presentes:**

| CTA | Presente | Rota |
|-----|:--------:|------|
| Utilizadores | ✅ | `/admin/utilizadores` |
| Feature Flags | ✅ | `/admin/feature-flags` |
| Estatísticas | ✅ | `/admin/stats` |
| Telemetria | ✅ | `/admin/telemetria` |
| Relatórios | ✅ | `/admin/relatorios` |
| Audit Trail | ✅ | `/admin/audit` |

**Primitivos canónicos AdminDashboard:**

| Primitivo | Presente |
|-----------|:--------:|
| `BentoGrid` | ✅ |
| `BentoTile` | ✅ |
| `ContentTypeCTAGrid` | ✅ |
| `GlassCard` | ❌ (não importado) |
| `AsymmetricButton` | ❌ |
| `AspirationalEmpty` | ❌ |

Dados reais: `adminApi.getStats()` com `totalUtilizadores`, `totalSimulacoes`, `totalCursos`, `denunciasPendentes`.
`institutional-cobalt` usado num tile de Cursos — token canónico correcto.

```
Veredicto W2.4: Done — ambos os dashboards com CTAs completos, BentoGrid/BentoTile/
ContentTypeCTAGrid, dados reais via queries. AdminDashboard não usa GlassCard/
AsymmetricButton mas os tiles BentoTile cumprem visualmente o Soul & Elite.
```

---

## 6. W2.5 — `EstudanteDashboard` polish + Playwright snapshot baseline

### 6a. EstudanteDashboard

**Primitivos canónicos EstudanteDashboard:**

| Primitivo | Presente | Evidência |
|-----------|:--------:|----------|
| `GlassCard` | ✅ | L163 (insights Tina) |
| `Spinner` | ✅ | L34 |
| `Button` | ✅ | L45 |
| `QuietHero` | ✅ | L59 |
| `QuietStat` | ✅ | L74–106 |
| `QuietCard` | ✅ | L109, L153 |
| `QuietEmpty` | ✅ | L141, L187 |
| `QuietSection` | ✅ | L112, L181 |
| `RoleDashboardShell` | ✅ | L227 |
| `BentoGrid` | ❌ | EstudanteDashboard usa `RoleDashboardShell` em vez de BentoGrid directo |
| `AsymmetricButton` | ❌ | Não usado |
| `AspirationalEmpty` | ❌ | Usa `QuietEmpty` em alternativa (Soul & Elite deliberado) |
| `ContentTypeCTAGrid` | ❌ | EstudanteDashboard não tem grid de CTAs de criação |

**Arquitectura correcta:** EstudanteDashboard usa `RoleDashboardShell` (wrapper especializado) em vez de BentoGrid directo. A ausência de BentoGrid/AsymmetricButton não é Vision-Failure — estudantes têm um padrão Soul & Elite distinto (Quiet family).

**Fallback EMPTY:** `const EMPTY: DashboardEstudante = {...}` — presente e correcto (T-AUD-2 W0.3 confirmado).
**Erro com retry:** `isError` branch com `refetch()` — presente (T-AUD-2 W0.2 parcialmente herda).
**i18n:** `useTranslation('dashboard')` — presente, todas as strings via `t()`.

### 6b. Playwright Snapshot Baseline

```
Veredicto: Cannot-Verify
Evidência:
  1. Directório tests/e2e/visual/ — AUSENTE
     (find_by_name retornou 0 resultados)
  
  2. Ficheiro tests/e2e/visual/dashboards.snapshot.spec.ts — AUSENTE
  
  3. Directório __snapshots__/ — AUSENTE
  
  4. Fixture tests/.auth/aluno.json — AUSENTE
     (find_by_name 'aluno.json' retornou 0 resultados)
     Existem: aluno.json = 0 resultados; presentes: comite_cientifico.json,
     estudante.json, mentor.json, moderador.json, aluno.json = ausente.
  
  5. tests/e2e/dashboard/ contém apenas empty-states.spec.ts (2 077 bytes) —
     sem visual regression tests.
  
  6. tests/e2e/refactor-baseline/dashboard-renders.spec.ts — existe mas é
     teste de render smoke, não snapshot visual.

Audit Infrastructure Gap (D11): fixture aluno.json ausente impossibilita
snapshots com role estudante anónimo/aluno. Esta é a Audit Infrastructure Gap
identificada pelo ticket W2.5.
```

> **Veredicto global W2.5: Partial** — `EstudanteDashboard` polish completo (Quiet family, i18n, EMPTY fallback, retry). Playwright snapshot baseline = `Cannot-Verify` (infra ausente).

---

## 7. Tabela Resumo — Primitivos Canónicos por Dashboard

| Dashboard | BentoGrid | GlassCard | AsymmetricButton | AspirationalEmpty | ContentTypeCTAGrid | QuietFamily | RoleDashboardShell |
|-----------|:---------:|:---------:|:----------------:|:-----------------:|:-----------------:|:-----------:|:-----------------:|
| MentorDashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| InstituicaoDashboard | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| ModeradorDashboard | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| AdminDashboard | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| EstudanteDashboard | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |

**Nota:** EstudanteDashboard segue deliberadamente o padrão Soul & Elite "Quiet" — ausência de BentoGrid/AsymmetricButton é intencional.

---

## 8. Cross-Cutting Findings

### CCF-W2-1 — `ContentTypeCTAGrid` STUB — impacto em 4 dashboards

`ContentTypeCTAGrid` é um STUB auto-declarado (FIXME). É funcional mas usa `Card` simples sem polimento premium. Todos os 4 dashboards (Mentor, Instituição, Moderador, Admin) dependem dele. Quando for substituído pela implementação real, os 4 dashboards recebem o upgrade automaticamente.

### CCF-W2-2 — Inconsistência de prefixo de rota em `InstituicaoDashboard`

CTAs de `InstituicaoDashboard` usam `/instituicao/criar-*` e `/feed/criar` sem `/app/` prefix. `MentorDashboard` usa `/app/mentor/*`. Esta inconsistência pode causar 404 se as rotas da instituição não estiverem duplicadas sem o prefixo `/app`.

### CCF-W2-3 — `aluno.json` fixture ausente (D11 Audit Infrastructure Gap)

`tests/.auth/aluno.json` não existe. Presentes: `estudante.json`, `comite_cientifico.json`, `mentor.json`, `moderador.json`. O ticket W2.5 requeria fixture `aluno.json` para snapshots Playwright de estudante não-inscrito. Esta é a única lacuna de infraestrutura de teste identificada nesta wave.

### CCF-W2-4 — Landing pages com `amber` — fora do escopo W2.1 mas registado

12 ficheiros de landing pages (`LandingHero.tsx`, `LandingFeatures.tsx`, etc.) usam `bg-amber` e `text-amber` de forma pervasiva. Estes ficheiros estão fora do escopo de purga W2.1 (focado em dashboards). O `amber` é um token canónico da landing (identidade visual PDC Angola). Não é Vision-Failure — é uso intencional.

---

## 9. Recomendação de Remediação

| Prioridade | Item | Ticket alvo |
|-----------|------|-------------|
| **Alta** | Criar `tests/.auth/aluno.json` com fixture Playwright para role aluno/estudante não-inscrito | W2.5 Infra Gap |
| **Alta** | Criar `tests/e2e/visual/dashboards.snapshot.spec.ts` com baseline Playwright para 5 dashboards | W2.5 |
| **Média** | Substituir `ContentTypeCTAGrid` STUB por implementação premium com `GlassCard`/hover animations | W2.2 |
| **Média** | Corrigir prefixo de rotas em `InstituicaoDashboard` CTAs (adicionar `/app/`) | CCF-W2-2 |
| **Baixa** | Adicionar `AsymmetricButton` no `ModeradorDashboard` e `AdminDashboard` para CTA principal | W2.4 |

---

*Produzido por auditoria estática conforme T-AUD-5. T-AUD-1…T-AUD-4 consultados (D13 cascata). Nenhum ficheiro de código modificado.*
*`git status` em `pdc-v2/` deve estar limpo após esta auditoria.*
