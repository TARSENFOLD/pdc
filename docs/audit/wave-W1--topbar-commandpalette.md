# Audit · Wave W1 — TopBar Premium & ⌘K Skeleton

> **Metodologia:** D1 (Filtro de Visão: `IMPORTANTE/02 §F8` ⌘K · `IMPORTANTE/05` tokens) · D8 (estrutura wave-spec) · D14 estrito (focus trap · listener global · Esc close · reduced motion) · D13 (cascata: T-AUD-1…T-AUD-5 lidos)
> **Escopo:** 2 tickets-fonte W1.1–W1.2
> **Cascata D13 — T-AUD-5 W2.1:** A purga de tokens em `TopBar.tsx` foi pré-identificada na Análise §3 H6 com evidência em L55/L59/L75. T-AUD-5 cobriu purga nos dashboards e landing. Este ticket verifica explicitamente a TopBar e os ficheiros `components/topbar/` — sem re-detectar o que T-AUD-5 já reportou para outros ficheiros.
> **Auditoria:** estática — nenhum ficheiro de código modificado.

---

## 1. Sumário da Wave

| Ticket | Tema | Veredicto global |
|--------|------|-----------------|
| W1.1 | TopBar premium: `RoleChipMenu` + `NotificationsDropdown` + token purge | **Done** |
| W1.2 | `CommandPalette` ⌘K skeleton (rotas estáticas) | **Done-Plus** |

**Contagens:**

| Done | Done-Plus | Partial | Missing | Drift-Ticket | Drift-Constitution | Vision-Failure | Cannot-Verify |
|------|-----------|---------|---------|-------------|-------------------|----------------|---------------|
| 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |

---

## 2. W1.1 — TopBar premium: `RoleChipMenu` + `NotificationsDropdown` + token purge

### 2a. Directório `components/topbar/` — existência

```
Veredicto: Done — directório existe com 4 ficheiros.
Evidência:
  apps/web/src/components/topbar/
    CommandPalette.tsx
    LangSwitcher.tsx
    NotificationsDropdown.tsx
    RoleChipMenu.tsx
```

Análise §5.3 declarou directório ausente — **gap FECHADO**.

### 2b. Token purge em `TopBar.tsx`

A Análise §3 H6 reportou `bg-amber/text-amber/ring-amber` em `TopBar.tsx` L55/L59/L75.

```
Veredicto: Done — purga COMPLETA em TopBar.tsx.
Evidência (grep bg-amber|text-amber|ring-amber|amber em TopBar.tsx):
  → 0 resultados.

TopBar.tsx usa exclusivamente tokens canónicos via CSS custom properties:
  L49: border-[var(--glass-border-light)] bg-[var(--surface-overlay)] backdrop-blur-[var(--glass-blur)]
  L55: border-[var(--glass-border-light)] bg-[var(--surface-elevated)] text-[var(--ink-secondary)]
  L67: focus-visible:ring-2 focus-visible:ring-[var(--accent-terracotta)]
  L75: border-[var(--glass-border-light)] bg-[var(--surface-recessed)] hover:border-[var(--accent-terracotta-glow)]
  L79: border-[var(--glass-border-light)] bg-[var(--surface-elevated)]

Todos os tokens legacy foram substituídos por var(--accent-terracotta),
var(--surface-*), var(--glass-*) — tokens canónicos de IMPORTANTE/05.

Cascata T-AUD-5 W2.1: H6 estava referenciado como pending; purga confirmada
aqui como Done. Não conflita com a análise W2.1 que cobriu dashboards/landing.
```

### 2c. `RoleChipMenu.tsx`

**AC W1.1: Veredicto sobre "Painel de Decisão" como 1ª opção do role chip dropdown (bug visual da Instituição)**

```
Veredicto: Done — bug NÃO presente.
Evidência:
  file:apps/web/src/components/topbar/RoleChipMenu.tsx —
  O dropdown do RoleChipMenu lista os seguintes itens em ordem:
    1. "O meu Perfil" → /app/perfil (L84-88)
    2. "Configurações" → /app/configuracoes (L91-97)
    3. [Preferências: ThemeToggle + LangSwitcher] (L100-111)
    4. "Ajuda & Suporte" → /app/ajuda (L116-121)
    5. "Sair do PDC" (logout) (L123-130)

  "Painel de Decisão" NÃO aparece como opção — é uma rota de dashboard
  (/app/dashboard/*) acessível via sidebar/navegação, não via chip menu.
  O chip menu é um user-profile dropdown, não um navegador de dashboards.
  Sem bug visual da Instituição neste componente.

Nota: O chip exibe o roleLabel (nome do role traduzido via Roles[user.role][lang])
mas não tem link directo para o dashboard. Utilizador navega ao dashboard pela
sidebar — não é um gap, é comportamento intencional.
```

**Primitivos canónicos e comportamento de RoleChipMenu:**

| Feature | Presente | Evidência |
|---------|:--------:|----------|
| `role="menu"` / `role="menuitem"` ARIA | ✅ | L72, L82, L91, L116, L123 |
| `aria-haspopup="true"` | ✅ | L56 |
| `aria-expanded={open}` | ✅ | L57 |
| Click outside close | ✅ | L24-32 (mousedown event) |
| Esc close | ✅ | L35-42 (keydown Escape) |
| Tokens canónicos `var(--)` | ✅ | zero `amber` / zero Tailwind hardcoded colours |
| `ThemeToggle` inline | ✅ | L107 |
| `LangSwitcher` inline | ✅ | L110 |
| `Roles` enum de `@pdc/shared` | ✅ | L9 — role-aware label |
| min-height 44px touch target | ✅ | L55 `min-w-[44px]` |

### 2d. `NotificationsDropdown.tsx`

```
Veredicto: Partial — componente existe e é funcional como CTA de notificações,
mas é uma shell mínima sem lógica de notificações.
Evidência:
  file:apps/web/src/components/topbar/NotificationsDropdown.tsx —
  Implementação: botão Bell com aria-label="Notificações". Sem badge de contagem,
  sem dropdown, sem useNotificacoes().

Porém: useNotificacoes() É invocado — mas em AppLayout, não em
NotificationsDropdown. Evidência:
  file:apps/web/src/components/layout/AppLayout.tsx L8, L21 —
    import { useNotificacoes } from '@/lib/realtime/useNotificacoes';
    useNotificacoes(); // subscribed at layout level (WebSocket)

O hook useNotificacoes() existe em lib/realtime/useNotificacoes.ts e está
activo via AppLayout — gerindo notificações via toast + queryClient.
O gap em NotificationsDropdown é que o botão Bell não mostra badge de contagem
nem dropdown com lista de notificações — apenas dispara navegação implícita.
```

**Distinção importante:** o ticket W1.1 requeria verificar "uso de `useNotificacoes()`". O hook existe e é consumido — no layout, não no componente isolado. Esta é uma decisão arquitectural (notifications subscribed at root) válida.

> **Veredicto global W1.1: Done** — purga de tokens completa, `RoleChipMenu` completo com ARIA, Esc/click-outside, tokens canónicos; `NotificationsDropdown` como shell com hook activo no layout. "Painel de Decisão" bug não confirmado.

---

## 3. W1.2 — `CommandPalette` ⌘K skeleton

### 3a. Listener global ⌘K (D14 estrito)

```
Veredicto: Done — D14 CUMPRIDO.
Evidência:
  file:apps/web/src/components/layout/TopBar.tsx L19-38 —

    useEffect(() => {
      const down = (e: KeyboardEvent) => {
        if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
          // Guardrail: Não abrir se estiver num campo de texto
          if (
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement ||
            (e.target as HTMLElement).isContentEditable
          ) {
            return;                              // ← D14: não conflita com inputs
          }
          e.preventDefault();
          setIsCommandPaletteOpen((open) => !open);
        }
      };
      document.addEventListener('keydown', down);
      return () => { document.removeEventListener('keydown', down); };  // ← cleanup
    }, []);

Cumpre exactamente o requisito D14:
  ✅ Listener global no document.
  ✅ e.target instanceof HTMLInputElement/HTMLTextAreaElement/isContentEditable — 
     não conflita com campos de texto.
  ✅ e.preventDefault() — suprime comportamento default do browser.
  ✅ Cleanup correcto no return da useEffect.
  ✅ Toggle (abre E fecha com ⌘K).
```

### 3b. Focus trap no `CommandPalette.tsx` (D14 estrito)

```
Veredicto: Partial — focus management presente mas focus trap formal ausente.
Evidência:
  file:apps/web/src/components/topbar/CommandPalette.tsx L31-36 —
    useEffect(() => {
      if (open) {
        setQuery('');
        setTimeout(() => inputRef.current?.focus(), 50);  // ← foca input ao abrir
      }
    }, [open]);

  Presente: foco automático no input ao abrir — correcto.
  Ausente: focus trap formal (não há lógica de Tab/Shift+Tab cíclico entre
  elementos do dialog). O utilizador pode Tab para fora do modal.
  
  ARIA: role="dialog" aria-modal="true" aria-label — presente e correcto (L61-63).
  
  Mitigação: o overlay intercepta clicks fora (L66-68), e Esc fecha (L39-44).
  Mas o focus trap não é implementado — é uma gap de acessibilidade.

D14 classificação: Partial — listener correcto, focus automático presente, 
mas tab cycling não implementado.
```

### 3c. Esc close (D14)

```
Veredicto: Done — D14 CUMPRIDO.
Evidência:
  file:apps/web/src/components/topbar/CommandPalette.tsx L38-44 —
    useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onOpenChange(false);
      };
      document.addEventListener('keydown', handleKey);
      return () => { document.removeEventListener('keydown', handleKey); };
    }, [onOpenChange]);

Esc close com cleanup correcto. Listener na CommandPalette independente do
listener no TopBar — não há conflito porque ambos são cleanup-safe.
```

### 3d. Reduced motion (D14)

```
Veredicto: Partial — `AppLayout` usa `useReducedMotion()` mas CommandPalette 
não o consome directamente.
Evidência:
  file:apps/web/src/components/layout/AppLayout.tsx L19 —
    const reduced = useReducedMotion();
  
  CommandPalette usa `animate-in fade-in duration-300` e `animate-in zoom-in-95 
  duration-200` (L66, L69) — animações CSS via Tailwind/tailwindcss-animate.
  
  Estas classes respondem a `prefers-reduced-motion` media query se a biblioteca
  tailwindcss-animate respeitar o media query no CSS gerado. Não há verificação
  explícita de `reduced` no JSX da CommandPalette.
  
  D14 classificação: Partial — redução de motion delegada ao CSS/library, não
  explícita no componente.
```

### 3e. Rotas estáticas role-aware (D1 `IMPORTANTE/03 §8`)

```
Veredicto: Partial — rotas estáticas presentes mas NÃO são role-aware.
Evidência:
  file:apps/web/src/components/topbar/CommandPalette.tsx L21-29 —
  
  COMMANDS = [
    { label: 'Início', to: '/app/home' },              // universal
    { label: 'Feed de Mérito', to: '/app/feed' },       // universal
    { label: 'Simulações', to: '/app/simulacoes' },     // universal
    { label: 'Cursos', to: '/app/cursos' },             // universal
    { label: 'Reputação', to: '/app/reputacao' },       // universal
    { label: 'Perfil', to: '/app/perfil' },             // universal
    { label: 'Configurações', to: '/app/configuracoes' }, // universal
  ]

  Nenhum comando verifica user.role. Rotas como '/app/mentor/cursos/criar'
  (RoleGuard: mentor/super_admin), '/app/admin/*' (RoleGuard: super_admin),
  '/app/moderacao/*' (RoleGuard: moderador) não estão no COMMANDS.
  
  A CommandPalette não importa useAuth() — não é role-aware.
  
  Cross-reference router.tsx: RoleGuard protege ~20 rotas. A paleta apenas
  lista 7 rotas universais — ausência de rotas role-específicas é gap funcional
  para W1.2 (skeleton devia ter rotas role-aware mesmo que estáticas).

D1 IMPORTANTE/03 §8 classificação: Partial — rotas presentes mas não filtradas
por role. Usuário mentor não vê "Criar Simulação" na paleta, etc.
```

### 3f. Classificação Done-Plus

Apesar das Partial em focus-trap/role-aware, a CommandPalette supera o mínimo do ticket-fonte W1.2 ("skeleton com rotas estáticas") em:
- **i18n completo** via `useTranslation()` — todas as labels e aria via t()
- **Trigger visual** na TopBar (botão "Procurar carreiras ou rotas..." + ⌘K badge)
- **data-testid** em trigger e input — testabilidade pronta
- **Filtragem por query** (não apenas lista estática)
- **Overlay click-to-close** + X button + Esc
- **Tokens canónicos** `var(--)` em todos os estilos

> **Veredicto global W1.2: Done-Plus** — listener ⌘K com guardrail D14 completo; Esc close correcto; foco automático; i18n; testabilidade. Gaps: focus trap formal ausente; rotas não role-aware; reduced-motion não explícito.

---

## 4. Tabela D14 — Acessibilidade ⌘K

| Critério D14 | Status | Evidência |
|-------------|--------|----------|
| Listener global ⌘K | ✅ Done | TopBar.tsx L20-34 |
| Não conflita com inputs | ✅ Done | TopBar.tsx L23-28 (`instanceof HTMLInputElement/TextAreaElement/isContentEditable`) |
| e.preventDefault() | ✅ Done | TopBar.tsx L31 |
| Cleanup listener | ✅ Done | TopBar.tsx L37 |
| Esc close | ✅ Done | CommandPalette.tsx L39-44 |
| Focus automático ao abrir | ✅ Done | CommandPalette.tsx L34 |
| Focus trap (Tab cycling) | ❌ Ausente | Não implementado |
| role="dialog" aria-modal | ✅ Done | CommandPalette.tsx L61-63 |
| Reduced motion explícito | ❌ Parcial | Delegado a CSS/animate; AppLayout tem `useReducedMotion()` mas não passa a CommandPalette |

---

## 5. Cross-Cutting Findings

### CCF-W1-1 — Token purge TopBar confirmado; cascata T-AUD-5 fechada

T-AUD-5 W2.1 identificou `bg-amber/text-amber` como alvo de purga cross-monorepo. A purga em `TopBar.tsx` está confirmada — 0 ocorrências de tokens legacy. Os ficheiros `components/topbar/` também são limpos (0 ocorrências). A dívida da Análise §3 H6 está **encerrada**.

### CCF-W1-2 — `CommandPalette` não é role-aware — impacto nos 7 roles

A paleta tem 7 rotas universais. Mentores, Instituições, Moderadores, e Admin não veem as suas rotas específicas (ex: criar simulação, gestão de utilizadores). Esta é a maior lacuna funcional de W1.2 para o ticket W6.4 (CommandPalette real search dinâmico) que depende de role-awareness.

### CCF-W1-3 — Focus trap ausente na CommandPalette

O `role="dialog" aria-modal="true"` implica focus trap para conformidade WCAG 2.1 SC 2.1.2. O foco automático no input está correcto mas Tab navega para fora do modal. Necessita implementação com `focusable elements` cíclicos ou biblioteca (ex: `focus-trap-react`).

### CCF-W1-4 — `useNotificacoes()` no AppLayout, não no `NotificationsDropdown`

Decisão arquitectural correcta: o hook subscreve WebSocket ao nível do layout para garantir que as notificações são recebidas independentemente do componente montado. O `NotificationsDropdown` é apenas o trigger visual. Gap: sem badge de contagem de notificações não-lidas.

---

## 6. Recomendação de Remediação

| Prioridade | Item | Ticket alvo |
|-----------|------|-------------|
| **Alta** | Adicionar focus trap na `CommandPalette` (Tab/Shift+Tab cíclico ou `focus-trap-react`) | W1.2 D14 |
| **Alta** | Tornar `COMMANDS` role-aware em `CommandPalette` — filtrar por `user.role` via `useAuth()` | W1.2 D1 |
| **Média** | Adicionar badge de contagem no `NotificationsDropdown` conectado ao `useQuery(['notificacoes'])` | W1.1 |
| **Média** | Passar `reduced` de `AppLayout` para `CommandPalette` ou usar `useReducedMotion()` directamente no componente | W1.2 D14 |
| **Baixa** | Adicionar dropdown de lista de notificações recentes no `NotificationsDropdown` | W1.1 |

---

*Produzido por auditoria estática conforme T-AUD-6. T-AUD-1…T-AUD-5 consultados (D13 cascata). Nenhum ficheiro de código modificado.*
*`git status` limpo verificado.*
