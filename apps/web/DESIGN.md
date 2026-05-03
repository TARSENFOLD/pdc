# PDC v2 — Design System (DESIGN.md)

> Fonte canónica de design para AI agents (Cursor, Claude, Copilot) e contribuidores humanos.
> Filosofia: **Calm Authority** — informação com quietude, ação com clareza.

---

## 1. Visual Theme

PDC v2 adopts a **dark-first, calm authority** aesthetic. The interface conveys expertise and trust through restraint: generous white space, muted backgrounds, and controlled use of color. Vibrancy is reserved for moments that demand attention — not scattered across every element.

**Core principles:**
- Dark canvas (`bg-canvas`) as default. Light mode is an inversion, not an afterthought.
- Hierarchy through spacing and size — not through decoration.
- Animation only when it communicates state change (fade-in, slide-in). No decorative motion.
- Maximum one "hero moment" (accent color, glow, bold typography) per viewport.

---

## 2. Color Palette & Roles

All colors are consumed via CSS custom properties. Never hardcode hex values in `.tsx` files — use Tailwind utilities backed by tokens.

| Token | Tailwind utility | Purpose |
|---|---|---|
| `--color-canvas` | `bg-canvas` | Page/section background |
| `--color-elevated` | `bg-elevated` | Card / modal surface (1 level up) |
| `--color-surface` | `bg-surface` | Input / overlay surface (2 levels up) |
| `--color-accent` | `bg-accent`, `text-accent` | Trust action accent (teal) for app UI |
| `--color-ink-primary` | `text-ink-primary` | Headings, primary text |
| `--color-ink-secondary` | `text-ink-secondary` | Body text, labels |
| `--color-ink-tertiary` | `text-ink-tertiary` | Hints, meta, disabled |
| `--color-border` | `border-border` | Default border |
| `--color-success` | `text-success`, `bg-success/10` | Positive states |
| `--color-warning` | `text-warning`, `bg-warning/10` | Caution states |
| `--color-danger` | `text-danger`, `bg-danger/10` | Destructive / error states |
| `--brand-authority` | `text-brand-authority` | Terracotta authority signature (landing, Tina only) |
| `--chrome-surface` | `bg-chrome-surface` | Nav/sidebar chrome background |
| `--chrome-surface-strong` | `bg-chrome-surface-strong` | Nav chrome emphasis / hover |
| `--chrome-active` | `bg-chrome-active`, `text-chrome-active` | Active nav item; same token as `--accent-trust` / `bg-accent` for app CTAs |
| `--chrome-active-soft` | `bg-chrome-active-soft` | Soft active background |
| `--chrome-border` | `border-chrome-border` | Nav chrome borders |
| `--ink-on-accent` | `text-ink-on-accent` | Text on accent/active backgrounds |

**Role-color mapping** (chips, badges, avatars):

| Role | Accent utility |
|---|---|
| `estudante` | `accent-estudante` |
| `mentor` | `accent-mentor` |
| `instituicao` | `accent-instituicao` |
| `moderador` | `accent-moderador` |
| `comite_cientifico` | `accent-comite` |
| `super_admin` | `accent-admin` |

### Navy/Teal Internal Chrome

Inside the authenticated app (`/app/*`), navigation chrome is navy and operational actions are teal, not terracotta. Use `--chrome-surface`, `--chrome-surface-strong`, `--chrome-active`, `--chrome-active-soft`, and `--chrome-border` for sidebar, topbar, catalogue filters, active navigation and global-command focus. Use `--accent-trust` / `bg-accent` for recurring app CTAs.

Terracotta remains a rare authority signature through `--brand-authority`: landing pages, Tina, and explicit interpretive/authority moments only. Do not use terracotta as the dominant active color in dashboards or catalogue surfaces.

---

## 3. Typography Rules

**Font stack:** `--font-display` (Inter / system-ui) for headings, `--font-sans` (Inter) for body.

| Role | Class | Use case |
|---|---|---|
| Page title | `text-2xl font-bold text-ink-primary` | `<h1>` on dashboard / page header |
| Section heading | `text-base font-semibold text-ink-primary` | Card header, section label |
| Body | `text-sm text-ink-secondary` | General prose, descriptions |
| Caption / meta | `text-xs text-ink-tertiary` | Timestamps, secondary labels |
| Brand badge | `text-[7px] font-black uppercase tracking-[0.3em] text-brand-authority` | PDC logotype chip only |

**Forbidden outside of explicit allowlist:**
- `font-black` — reserved for brand moments (logotype, 1 usage per page max).
- `tracking-[>0.15em]` — reserved for brand chip; use `tracking-wide` or less elsewhere.
- Raw hex colors — use token utilities.
- `style={{ var(--…) }}` — use Tailwind utility or `className`.

---

## 4. Component Stylings

### Quiet Primitives (default for all content pages)
Located in `src/components/ui/quiet/`. Use these for dashboards, catalogues, forms.

```tsx
// ✅ Correct — uses QuietCard from the quiet library
import { QuietCard } from '@/components/ui/quiet/QuietCard';

// ❌ Wrong — GlassCard is reserved for Tina/HUD panels
import { GlassCard } from '@/components/ui/GlassCard';
```

### Authority Primitives (restricted)
`GlassCard` — only inside TinaChat, Ecosystem Hub, HUDPanel.
`HUDPanel` — only inside simulation players (Tipo1/2/3).
`AsymmetricButton` — deleted in T19; use `QuietButton variant="hero"`.

### Button hierarchy
1. Primary action: `<Button variant="default">` — `bg-accent text-white` (teal trust, not terracotta)
2. Secondary: `<Button variant="outline">` — `border-border text-ink-primary`
3. Ghost: `<Button variant="ghost">` — no border, `text-ink-secondary`
4. Destructive: `<Button variant="destructive">` — `bg-danger/10 text-danger`

### Form inputs
Always pair `<Label>` with `<Input>`. Validation errors use `text-danger text-xs`.

---

## 5. Layout Principles

- **Shell pattern:** `RoleHomeShell` (home) and `RoleDashboardShell` (dashboard) are the only layout roots. All role-specific content is injected via slots.
- **Grid:** 12-column CSS grid for desktop; single column for mobile. Never Bootstrap or manual float.
- **Spacing scale:** use Tailwind spacing tokens only (`p-4`, `gap-6`, `mt-8`). Do not use arbitrary `p-[13px]`.
- **Max-width containers:** `max-w-7xl mx-auto px-6` for page content.
- **Cards:** `rounded-2xl` (16px) for cards, `rounded-xl` (12px) for inputs and badges.

### Sidebar
- Width: `w-64` (256px) fixed on desktop, drawer on mobile.
- Nav groups: collapsible, state persisted in `localStorage` per role.
- Active item: `--chrome-active` with `--ink-on-accent`; do not use terracotta for active app navigation.

---

## 6. Depth & Elevation

Elevation is expressed through background layering — not drop shadows.

| Level | Surface | Use |
|---|---|---|
| 0 | `bg-canvas` | Page background |
| 1 | `bg-elevated` | Cards, sidebars |
| 2 | `bg-surface` | Modals, dropdowns, popovers |
| 3 | `bg-surface` + `border border-white/10` | Nested menus, tooltips |

**Shadows:** Only accent-colored box-shadow for active/focus states (trust-colored, via `shadow-accent/20`). No grey box-shadows.
**Borders:** `border-white/5` for structural separators; `border-border` for interactive elements.

---

## 7. Do's & Don'ts

| ✅ Do | ❌ Don't |
|---|---|
| Use `text-ink-primary/secondary/tertiary` for all text | Hardcode `text-gray-500` or hex values |
| Use `bg-accent` for the single primary CTA per view (teal) | Use terracotta for routine app CTAs |
| Use `rounded-2xl` for cards | Mix `rounded-lg` and `rounded-2xl` inconsistently |
| Use `font-bold` or `font-semibold` for emphasis | Use `font-black` outside brand moments |
| Use `QuietCard` for dashboard content | Import `GlassCard` in non-HUD pages |
| Keep animations to `duration-300` max | Add `duration-700+` for content transitions |
| Use token classes for all colors | Inline `style={{ color: '#6366f1' }}` |
| Use `tracking-wide` max for body emphasis | Use `tracking-[0.3em]` outside brand chip |
| Use `<Button>` with defined variants | Create ad-hoc styled `<button>` elements |
| Lazy-load heavy components | Import everything at the page level |

---

## 8. Responsive Behavior

**Breakpoints** (Tailwind defaults apply):

| Prefix | Min-width | Context |
|---|---|---|
| (none) | 0px | Mobile — single column, bottom nav |
| `sm:` | 640px | Large phone — still single column |
| `md:` | 768px | Tablet — 2-column grids ok |
| `lg:` | 1024px | Desktop — sidebar visible, 3-column grids |
| `xl:` | 1280px | Wide desktop — max-content width active |

**Pattern:** design mobile-first. Add `lg:` overrides for sidebar layout, not the reverse.

**Sidebar:** hidden on mobile (drawer via `AppLayout` component), fixed on `lg:` and above.
**TopBar:** always visible. On mobile shows hamburger + logo. On desktop shows breadcrumb + user menu.
**Cards:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` for catalogue grids.

---

## 9. Agent Prompt Guide

Use these prompts when asking AI assistants (Claude, Cursor, Copilot) to generate or refactor UI.

### Prompt template — new page component

```
Create a [PageName] page for the [role] role using PDC v2 design system.

Requirements:
- Use QuietCard (from @/components/ui/quiet/QuietCard) for all cards
- Background: bg-canvas, text: text-ink-primary/secondary
- Heading: text-2xl font-bold, section labels: text-base font-semibold
- No GlassCard, no font-black, no hardcoded hex colors
- No inline style={{ var(--…) }} — use Tailwind utilities
- Spacing: p-6 for cards, gap-6 for grids
- Rounded: rounded-2xl for cards, rounded-xl for inputs
- One primary CTA maximum per viewport using <Button variant="default">
- Fetch data via @tanstack/react-query with useQuery
- Handle loading state with <Spinner /> and error state with <ErrorBoundary>
```

### Prompt template — refactor existing page

```
Refactor [ComponentName].tsx to comply with PDC v2 Calm Authority design.

Changes needed:
1. Replace any GlassCard with QuietCard
2. Replace font-black with font-bold or font-semibold (except logotype chip)
3. Replace tracking-[>0.15em] with tracking-wide or less
4. Replace hardcoded hex colors with token utilities
5. Replace style={{ var(--…) }} with equivalent Tailwind class
6. Keep all existing functionality and data-testid attributes unchanged
```

### Prompt template — new navigation item

```
Add a new nav item to Sidebar.tsx using SSOT from @pdc/shared/glossary.
- Import the label from NavItems['<slug>'] in packages/shared/src/glossary.ts
- Add the route to SIDEBAR_CONFIG with correct roles array
- Do not hardcode Portuguese strings — use the glossary key
```

### Key import paths

```ts
import { QuietCard } from '@/components/ui/quiet/QuietCard';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { Roles, ContentTypes, NavItems } from '@pdc/shared';
import type { Role } from '@pdc/shared';
```

---

## 10. Padrões Estabelecidos (2026-05-03)

### 10.1 — NeuralConstellation Dual (ADR-024)

Existem **dois componentes distintos** com o mesmo nome visual mas propósito diferente:

| Ficheiro | Contexto | Características |
|---|---|---|
| `src/features/landing/NeuralConstellation.tsx` | Landing page pública | 300 partículas, DPR scaling via GSAP, twinkle, `ChoreographyState` (`idle`/`align`/`swarm`/`warp`), cores CSS vars do tema |
| `src/components/auth/NeuralConstellation.tsx` | Páginas de autenticação | 110 partículas, Canvas2D puro, `NeuralState` (`idle`/`align`/`encrypt`/`warp`/`scatter`/`pulse`/`flow`/`focus`), fundo preto fixo |

**Regras:**
- ❌ Nunca fundir os dois num único componente — propósitos e contextos são distintos.
- ❌ Nunca importar o da landing nas páginas de auth, ou vice-versa.
- O da landing usa `getComputedStyle` para ler CSS vars e adapta-se ao tema claro/escuro.
- O de auth tem fundo preto fixo e reage ao `state` prop via `onFocus`/`onBlur` dos campos.

### 10.2 — Glow Policy (ADR-025)

**Regra: Zero shadowBlur em contexto profissional.**

```ts
// ❌ BANIDO — glow excessivo em canvas
ctx.shadowBlur = currentSize * 8;
ctx.shadowColor = rgba(accentRgb, 0.6);

// ✅ PERMITIDO — toque mínimo apenas em accent stars da landing
ctx.shadowBlur = 2;  // fixo, nunca multiplicador de tamanho
ctx.shadowColor = rgba(accentRgb, 0.12 * starOpacity);

// ✅ CORRETO — cool stars e componentes app: sem glow
ctx.shadowBlur = 0;
ctx.shadowColor = 'transparent';
```

Cross flares (`p.baseSize > 2.0`) e bright cores (segundo pass de arc) foram eliminados — criavam halos brancos visualmente perturbadores.

### 10.3 — `--card-border` Token

Definido em `apps/web/src/styles/tokens.css`:

```css
/* Light mode */
--card-border: #000000;

/* Dark mode (.dark) */
--card-border: rgba(236, 231, 221, 0.7);
```

Todos os cards da landing usam `style={{ borderColor: 'var(--card-border)' }}`.
❌ Nunca hardcodar `borderColor: '#000000'` em componentes — usar sempre `var(--card-border)` (invisível em dark mode se hardcoded).

### 10.4 — Auth `neuralState` Pattern

Cada campo de formulário nas páginas de registo dispara um `NeuralState` específico via `onFocus`/`onBlur`:

| Campo | Estado |
|---|---|
| Nome / título | `pulse` |
| Email / NIF | `align` |
| Password | `encrypt` |
| Confirmar password | `focus` |
| Select (área, região, tipo) | `flow` |
| Erro de validação | `scatter` |

O estado é gerido localmente com `useState<NeuralState>('idle')` e passado ao `AuthSplitLayout` via prop `neuralState`. O `AuthSplitLayout` distribui-o ao painel desktop (`AuthLeftPanel`) e ao banner mobile.

### 10.5 — Layout Auth Mobile/Desktop

```
Desktop (lg:): painel neural fixo à esquerda (AuthLeftPanel) + formulário à direita
Mobile (<lg:): banner neural sticky h-48 no topo + formulário a rolar abaixo
```

O banner mobile usa `className="sticky top-0 z-20 lg:hidden h-48 bg-black overflow-hidden"` — preso no topo durante o scroll.

### 10.6 — `PasswordInput` Component

Componente reutilizável em `src/components/ui/PasswordInput.tsx` com toggle show/hide via ícone Eye.
Exportado via `src/components/ui/index.ts`. Usar sempre em vez de `<input type="password">` raw.

### 10.7 — Copy sem Jargão

Termos proibidos em copy de produto visível ao utilizador:
- ❌ "Oráculo" — substituir por "PDC" ou "sistema"
- ❌ "Heurísticas" — substituir por "análise" ou "perfil"
- Emojis em badges/pills de produto: ❌ proibidos — usar apenas texto uppercase tracking-wider
