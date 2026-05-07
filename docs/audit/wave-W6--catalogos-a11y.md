# Audit · Wave W6 — Catálogos & a11y

> **Metodologia:** D1 (Filtro de Visão: `IMPORTANTE/02 §F8` ⌘K · `IMPORTANTE/02 §NF7` Lighthouse ≥90 · `IMPORTANTE/05` Soul & Elite) · D8 (estrutura wave-spec) · D11 (Lighthouse config + fixture = Audit Infrastructure Gaps) · D13 (cascata cumulativa T-AUD-1…T-AUD-7) · D14 estrito (Lighthouse ≥90 + a11y final)
> **Escopo:** 5 tickets-fonte W6.1–W6.5
> **Cascata D13:**
> - **T-AUD-6 W1.2 Done-Plus** — CommandPalette skeleton existe, 7 rotas estáticas, listener ⌘K correcto. W6.4 constrói sobre skeleton existente; não herda Cannot-Verify.
> - **T-AUD-5 W2.2 Partial** — `ContentTypeCTAGrid` STUB; não afecta W6.1-W6.3 (componentes de catálogo são primitivos distintos).
> - **T-AUD-7 W5.3 Done** — `EditorialStateBadge` adoptado em 10 páginas; W6.2/W6.3 usam o badge nos catálogos in-app via overlay.
> **Auditoria:** estática — nenhum ficheiro de código modificado.

---

## 1. Sumário da Wave

| Ticket | Tema | Veredicto global |
|--------|------|-----------------|
| W6.1 | Primitivos `CatalogoGridShell` + `ContentCard` + `CatalogoFilterBar` | **Partial** |
| W6.2 | Migração catálogos Cursos + Simulações (público + in-app) | **Done** |
| W6.3 | Migração catálogos Mentores + Instituições + Programas | **Done** |
| W6.4 | `CommandPalette` ⌘K real — search dinâmico | **Missing** |
| W6.5 | a11y final pass + Lighthouse mobile ≥90 | **Partial / Cannot-Verify** |

**Contagens:**

| Done | Done-Plus | Partial | Missing | Drift-Ticket | Drift-Constitution | Vision-Failure | Cannot-Verify |
|------|-----------|---------|---------|-------------|-------------------|----------------|---------------|
| 2 | 0 | 2 | 1 | 0 | 0 | 0 | 1 |

---

## 2. W6.1 — Primitivos de Catálogo

### 2a. Directório `components/catalogo/` — existência

```
Veredicto: Partial (directório presente com 3 primitivos; todos STUB auto-declarados)
Evidência:
  apps/web/src/components/catalogo/
    CatalogoGridShell.tsx  (57 linhas)
    CatalogoFilterBar.tsx  (52 linhas)
    ContentCard.tsx        (54 linhas)

  Análise §5.3 declarou directório ausente — gap FECHADO.
  Todos os 3 ficheiros contêm:
    // FIXME: STUB AGENT-GENERATED — substituir por implementação real
    // epic:8dc1663f-4a62-407f-b07e-580ce406419d · Consumidores: 8 páginas catálogo.
```

### 2b. `CatalogoGridShell`

```
Interface: { isLoading, isEmpty, onClearFilters, filterBar, children, pageCount, onPageChange }

Presente:
  ✅ isLoading → spinner com data-testid="catalogo"
  ✅ isEmpty → estado vazio com "Limpar filtros" button
  ✅ filterBar → slot React.ReactNode
  ✅ children → grid 1/2/3/4 cols responsivo
  ✅ data-testid="catalogo"

Gap (STUB):
  ❌ pageCount/onPageChange aceites mas ignorados ("Props aceites mas ignoradas")
  ❌ Sem paginação real (prop silently dropped)
  ❌ Estado vazio sem icon/aspiral — apenas texto simples (não Soul & Elite)
  ❌ Sem AnimatePresence / skeleton grid cards para loading state
```

### 2c. `ContentCard`

```
Interface: { title, subtitle, image, href, badges, footerInfo }

Presente:
  ✅ aspect-video image com fallback "PDC" text
  ✅ Badge overlay top-left
  ✅ footerInfo com icon grid
  ✅ Card interactive com overflow-hidden
  ✅ Link to={href}

Gap (STUB):
  ❌ alt text do img = title (correcto) mas sem aria-label no Link
  ❌ Sem hover animation Soul & Elite (GlassCard não usado)
  ❌ Sem placeholder skeleton
  ❌ Não usa GlassCard/BentoTile — usa Card simples
```

### 2d. `CatalogoFilterBar`

```
Interface: { searchTerm, onSearchChange, areas, selectedArea, onAreaChange, totalResults }

Presente:
  ✅ Input para pesquisa
  ✅ Select para área
  ✅ totalResults display
  ✅ Layout flex responsivo md:flex-row

Gap (STUB):
  ❌ Input sem aria-label (só placeholder="Pesquisar...")
  ❌ Select sem aria-label
  ❌ Sem debounce no onSearchChange (onSearchChange chamado em cada keystroke)
  ❌ Sem lógica de URL sync (implementado nas páginas individualmente)
```

> **Veredicto global W6.1: Partial** — directório existe, 3 primitivos funcionais, correctamente consumidos por 8 páginas. Todos declarados STUB: sem paginação, sem Soul & Elite premium animations, gaps de acessibilidade (aria-labels ausentes em inputs/selects).

---

## 3. W6.2 — Migração catálogos Cursos + Simulações

### 3a. Tabela de migração W6.2

| Página | `CatalogoGridShell` | `CatalogoFilterBar` | `ContentCard` | Tipo |
|--------|:-------------------:|:-------------------:|:-------------:|------|
| `CursosCatalogoPage` (público `/cursos`) | ✅ | ✅ | ✅ | Catálogo público |
| `SimulacoesCatalogoPage` (público `/simulacoes`) | ✅ | ✅ | ✅ | Catálogo público |
| `CursoListPage` (in-app `/app/cursos`) | ✅ | ✅ | ✅ | Catálogo in-app |
| `SimulacaoListPage` (in-app `/app/simulacoes`) | ✅ | ✅ | ✅ | Catálogo in-app |

**4/4 páginas W6.2 migraram para os primitivos canónicos.**

Notas:
- `CursoListPage` usa `EditorialStateBadge` com overlay `absolute top-3 left-3 z-10` sobre `ContentCard` — correcto.
- `SimulacaoListPage` idem com cast `as any` (CCF-W5-3 cascade).
- `CursosCatalogoPage` e `SimulacoesCatalogoPage` (público) não mostram `EditorialStateBadge` (conteúdo público não expõe estado editorial).

> **Veredicto W6.2: Done** — 4/4 páginas migradas.

---

## 4. W6.3 — Migração catálogos Mentores + Instituições + Programas

### 4a. Tabela de migração W6.3

| Página | `CatalogoGridShell` | `CatalogoFilterBar` | `ContentCard` | Tipo |
|--------|:-------------------:|:-------------------:|:-------------:|------|
| `MentoresCatalogoPage` (público `/mentores`) | ✅ | ✅ | ✅ | Catálogo público |
| `InstituicoesCatalogoPage` (público `/instituicoes`) | ✅ | ✅ | ✅ | Catálogo público |
| `ProgramasCatalogoPage` (público `/programas`) | ✅ | ✅ | ✅ | Catálogo público |
| `InstituicaoProgramasPage` (in-app `/app/instituicao/programas`) | ✅ | ✅ | ✅ | Catálogo in-app |

**4/4 páginas W6.3 migraram para os primitivos canónicos.**

Notas:
- `InstituicaoProgramasPage` usa `prog: any` cast — AP-03 violation.
- `MentoresCatalogoPage` usa tipos correctos `MentorPublico` de `@pdc/shared`.
- `InstituicoesCatalogoPage` usa `InstituicaoPublica` de `@pdc/shared`.

> **Veredicto W6.3: Done** — 4/4 páginas migradas.

### 4b. Tabela completa W6.2 + W6.3 — 8 páginas

| # | Página | Primitivos W6.1 | Estado |
|---|--------|:---------------:|--------|
| 1 | `CursosCatalogoPage` | ✅ todos 3 | Migrada |
| 2 | `SimulacoesCatalogoPage` | ✅ todos 3 | Migrada |
| 3 | `MentoresCatalogoPage` | ✅ todos 3 | Migrada |
| 4 | `InstituicoesCatalogoPage` | ✅ todos 3 | Migrada |
| 5 | `ProgramasCatalogoPage` | ✅ todos 3 | Migrada |
| 6 | `CursoListPage` (in-app) | ✅ todos 3 | Migrada |
| 7 | `SimulacaoListPage` (in-app) | ✅ todos 3 | Migrada |
| 8 | `InstituicaoProgramasPage` (in-app) | ✅ todos 3 | Migrada |

**8/8 páginas declaradas migradas.** Nenhuma página ad-hoc detectada.

---

## 5. W6.4 — `CommandPalette` ⌘K real — search dinâmico

### 5a. Cascata T-AUD-6 W1.2

```
Cascata: T-AUD-6 W1.2 = Done-Plus (skeleton com 7 rotas estáticas, i18n, listener ⌘K).
O skeleton NÃO é Missing → W6.4 não herda Cannot-Verify por ausência de base.
W6.4 requeria EVOLUÇÃO do skeleton para search dinâmico.
```

### 5b. Veredicto W6.4

```
Veredicto: Missing — search dinâmico não implementado.
Evidência:
  file:apps/web/src/components/topbar/CommandPalette.tsx —
  
  COMMANDS = array estático de 7 rotas (definido inline, sem useQuery).
  Zero imports de: useQuery, http, catalogoApi, tanstack/react-query.
  
  A filtragem é apenas client-side:
    const filtered = query.length === 0
      ? COMMANDS
      : COMMANDS.filter(cmd => cmd.label.toLowerCase().includes(query.toLowerCase()));
  
  Não há fetch a APIs de catálogo, não há resultados dinâmicos de cursos,
  simulações, mentores ou projectos ao digitar na paleta.
  
  Referência W6.4 spec: "rotas estáticas role-aware + search dinâmico".
  T-AUD-6 já reportou que as rotas estáticas não são role-aware.
  W6.4 adicional: search dinâmico = ausente.

Cascata D13: a gap de focus trap (T-AUD-6 CCF-W1-3) e a ausência de role-aware
permanece e agrava-se — sem search dinâmico, o ⌘K é apenas um navegador estático
de 7 rotas universais. Funcionalidade core de W6 não implementada.
```

> **Veredicto global W6.4: Missing** — CommandPalette permanece skeleton estático. Search dinâmico (fetch a catálogos, resultados role-aware) ausente.

---

## 6. W6.5 — a11y final pass + Lighthouse mobile ≥90

### 6a. `tests/e2e/a11y.spec.ts` — existência e cobertura

```
Veredicto: Partial
Evidência:
  file:tests/e2e/a11y.spec.ts — EXISTE (67 linhas).
  
  Usa @axe-core/playwright + fixtures helpers.
  
  Cobertura de rotas:
    publicRoutes:    ['/', '/login']        → axe WCAG2A/2AA/21A/21AA
    protectedRoutes: ['/app/home']          → declarado mas NÃO iterado (apenas
                                             usado nos testes de interacção abaixo)
  
  Testes adicionais:
    1. Navegação por teclado no user-menu (aria-expanded, Tab, Esc) — T-AUD-6
       W1.1 RoleChipMenu testado.
    2. Axe com role="menu" aberto — WCAG2A/2AA.
    3. Touch targets ≥44px em header + nav buttons.

Lacunas de cobertura:
  ❌ Catálogos públicos (/cursos, /simulacoes, /mentores, /instituicoes) — não cobertos por axe
  ❌ Páginas in-app de catálogo (/app/cursos, /app/simulacoes) — não cobertas
  ❌ Builders (/app/mentor/cursos/criar, etc.) — não cobertos
  ❌ Dashboard pages (5 dashboards) — não cobertos
  ❌ CommandPalette aberta — não coberta (apenas menu aberto)
  ✅ Landing (/) + Login (/login) cobertos
  ✅ Home (/app/home) coberto via interacção
```

### 6b. Lighthouse — D14 estrito

```
Veredicto: Cannot-Verify — D14 FALHA (critério objectivo ausente de infra)
Evidência:
  find lighthouserc* → 0 resultados (nenhum ficheiro lighthouserc.json,
  lighthouserc.js, .lighthouserc.yaml em todo o repo até depth 3).
  
  Sem lighthouserc: o CI não pode executar Lighthouse automaticamente.
  Sem execução de Lighthouse: o AC "≥90 mobile" não pode ser verificado.
  
  D14 classificação: Cannot-Verify — nenhum mecanismo inequívoco no código
  demonstra que o score Lighthouse mobile ≥90 foi atingido.
  
  Análise §4.4 declarou "ausência de lighthouserc* no repo" — confirmado.
  Esta é a Audit Infrastructure Gap D11 para W6.5.

D11 Audit Infrastructure Gaps (cumulativo):
  - aluno.json fixture (W2.5, T-AUD-5)
  - tests/e2e/visual/ directório + dashboards.snapshot.spec.ts (W2.5)
  - lighthouserc config (W6.5, este ticket)
```

### 6c. a11y final pass — evidências positivas

Não obstante a ausência de Lighthouse CI, o código apresenta boas práticas de a11y:

| Critério a11y | Presente | Evidência |
|--------------|:--------:|----------|
| `aria-label` em botões icon-only (TopBar, Sidebar) | ✅ | T-AUD-6: `aria-label="Abrir menu"`, `aria-label="Notificações"` |
| `aria-haspopup` + `aria-expanded` em RoleChipMenu | ✅ | T-AUD-6 W1.1 Done |
| `role="dialog" aria-modal` em CommandPalette | ✅ | T-AUD-6 W1.2 Done |
| `min-h-[44px] min-w-[44px]` touch targets | ✅ | Presente em TopBar buttons |
| `data-testid` para testabilidade | ✅ | Múltiplos componentes |
| `alt` em `ContentCard` img | ✅ | `alt={title}` |
| `role="menu"` / `role="menuitem"` | ✅ | RoleChipMenu |
| Focus management em CommandPalette | ✅ (Partial) | Auto-focus; focus trap ausente (CCF-W1-3) |
| Axe test para rotas públicas | ✅ | a11y.spec.ts L8-17 |
| Axe test para rotas protegidas (5 dashboards) | ❌ | Não coberto |
| `aria-label` em `CatalogoFilterBar` Input/Select | ❌ | Ausente (STUB) |

> **Veredicto global W6.5: Partial** — a11y infra existe (`a11y.spec.ts` com axe) mas cobertura incompleta (apenas 2 rotas públicas + home). Lighthouse = Cannot-Verify (lighthouserc ausente = D11 Audit Infrastructure Gap).

---

## 7. Cross-Cutting Findings

### CCF-W6-1 — 3 primitivos de catálogo todos STUB — impacto em 8 páginas

Todos os 3 primitivos W6.1 são auto-declarados FIXME STUB. As 8 páginas consomem os mesmos stubs. Quando substituídos por implementação premium, 8 páginas recebem upgrade simultaneamente. A paginação (`pageCount`/`onPageChange`) é silenciosamente ignorada — sem paginação real em nenhum catálogo.

### CCF-W6-2 — W6.4 CommandPalette real = Missing — bloqueio funcional

O ⌘K no PDC é descrito como feature core em `IMPORTANTE/02 §F8`. Após W1.2 (skeleton) e W6.4 (real), a paleta ainda é um navegador estático de 7 rotas. Utilizadores não conseguem pesquisar cursos, mentores ou projectos via ⌘K. Este é o maior gap funcional da Wave W6.

### CCF-W6-3 — Lighthouse CI ausente — D11 Audit Infrastructure Gap #3

Terceiro gap de infra de auditoria identificado no projecto:
1. `aluno.json` fixture ausente (T-AUD-5)
2. `tests/e2e/visual/` + snapshots ausentes (T-AUD-5)
3. `lighthouserc*` ausente (este ticket)

Sem CI de Lighthouse, o AC de performance NF7 (≥90 mobile) não pode ser verificado nem monitorizado em PRs.

### CCF-W6-4 — `CatalogoFilterBar` sem aria-labels — AP-03 adjacente a a11y

Input `placeholder="Pesquisar..."` sem `aria-label` e Select sem `aria-label` em `CatalogoFilterBar` são gaps de a11y que serão detectados por axe se/quando os catálogos forem incluídos no `a11y.spec.ts`.

### CCF-W6-5 — `prog: any` em `InstituicaoProgramasPage` — AP-03

```tsx
{programas.map((prog: any) => (
  <ContentCard ... />
))}
```
Viola AP-03. Usar `Programa` de `@pdc/shared`.

---

## 8. Recomendação de Remediação

| Prioridade | Item | Ticket alvo |
|-----------|------|-------------|
| **Crítica** | Implementar search dinâmico no `CommandPalette` — fetch a catálogos + filtragem role-aware | W6.4 |
| **Alta** | Adicionar `lighthouserc.json` e integrar `@lhci/cli` em CI | W6.5 D11 |
| **Alta** | Adicionar `aria-label` a `CatalogoFilterBar` Input + Select | W6.5 CCF-W6-4 |
| **Alta** | Expandir `a11y.spec.ts` para cobrir 5 dashboards + 4 catálogos públicos | W6.5 |
| **Média** | Substituir stubs `CatalogoGridShell`/`ContentCard`/`CatalogoFilterBar` por implementação premium com paginação real e Soul & Elite | W6.1 |
| **Média** | Corrigir `prog: any` em `InstituicaoProgramasPage` (AP-03) | W6.3 |
| **Baixa** | Adicionar `AnimatePresence` + skeleton cards em `CatalogoGridShell` loading state | W6.1 |

---

*Produzido por auditoria estática conforme T-AUD-8. T-AUD-1…T-AUD-7 consultados (D13 cascata). Nenhum ficheiro de código modificado.*
*`git status` limpo verificado.*
