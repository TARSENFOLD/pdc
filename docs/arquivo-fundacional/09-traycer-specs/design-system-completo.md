# Specs Traycer — Design System e Linguagem Visual (Completo)

> **Origem:** `/Documentos/Traycer/dc2a19a2-...-PDC_—_Design_System_e_Linguagem_Visual.md` (43KB)
> **ID Traycer:** `dc2a19a2`
> **Data original:** 3 Abril 2026 · **Status:** OURO — tokens, wireframes e anti-padrões mais detalhados que spec IMPORTANTE/05

---

## 1. Stack Frontend — Decisão

| Camada | Antigo | Novo | Razão |
|--------|--------|------|-------|
| Framework | React 18 + Vite | React 19 + Vite 6 | Server Components, performance |
| Styling | Tailwind v3 | Tailwind v4 | CSS-first, sem tailwind.config.js |
| Animações | Framer Motion v12 | Motion (motion.dev) + GSAP | Motion para UI; GSAP para hero/scroll |
| Estado servidor | React Query v5 + SWR | TanStack Query v5 apenas | Eliminar duplicação |
| Estado cliente | Redux + Context | Zustand + Context | 1KB, sem boilerplate |
| Routing | React Router v6 | React Router v7 | File-based, loaders nativos |
| Componentes | Custom + duplicados | Radix UI Primitives | Acessibilidade nativa |
| Ícones | Mistura | Lucide React | Consistente, tree-shakeable |
| Fontes | Inter | Inter + Instrument Serif | UI + headings de impacto |

---

## 2. Os 5 Princípios de Design

1. **Espaço como elemento** — Respiração intencional. Margens generosas. O utilizador nunca se sente sufocado.
2. **Tipografia como hierarquia** — Tamanhos extremos (80px vs 12px), pesos contrastantes (900 vs 300). Sem ícones decorativos onde texto basta.
3. **Movimento com propósito** — Cada animação tem razão: revelar, confirmar, guiar. Max 400ms interações, 800ms transições página.
4. **Cor como sinal** — Primária (#004AAD) só para ação/destaque. Amarelo (#FFB800) reservado para conquistas. Resto neutro.
5. **Conteúdo primeiro** — Sem cards com bordas em tudo. Flui como revista. Separadores são espaço, não linhas.

### Anti-Padrões Proibidos

| ❌ Proibido | ✅ Alternativa |
|------------|---------------|
| Cards com border + shadow em tudo | Espaço e tipografia |
| Botões ícone + texto em todos CTAs | CTAs texto puro com underline animado |
| Sidebar sempre visível mobile | Bottom navigation ou drawer |
| Loading spinners genéricos | Skeleton + shimmer |
| Modais para tudo | Drawers laterais ou inline expansion |
| Gradientes em todos backgrounds | Apenas momentos hero |
| Tabelas para listas simples | Listas tipografia rica |
| Tooltips hover para info crítica | Texto inline visível |

---

## 3. Tokens de Design

### 3.1 Paleta de Cores

```
PRIMÁRIA (Azul Institucional)
  --pdc-blue-50:  #EEF4FF
  --pdc-blue-100: #D9E8FF
  --pdc-blue-500: #004AAD  ← cor de ação principal
  --pdc-blue-600: #003E93
  --pdc-blue-900: #001545

CELEBRAÇÃO (Amarelo Conquista)
  --pdc-gold-400: #FFD000
  --pdc-gold-500: #FFB800  ← conquistas, badges, destaques
  --pdc-gold-600: #E0A200

NEUTROS (Base da UI)
  --pdc-ink-950:  #0A0A0F  ← texto principal (quase preto, não puro)
  --pdc-ink-700:  #2D2D3A  ← texto secundário
  --pdc-ink-400:  #8B8B9E  ← texto terciário, placeholders
  --pdc-ink-100:  #F0F0F5  ← backgrounds suaves
  --pdc-ink-50:   #F8F8FC  ← fundo da página

SUPERFÍCIE
  --pdc-surface:  #FFFFFF  ← superfícies elevadas
  --pdc-border:   #E8E8F0  ← bordas subtis

SEMÂNTICAS
  --pdc-success:  #0D9E6E
  --pdc-error:    #DC2626
  --pdc-warning:  #D97706
```

### 3.2 Tipografia

```
FAMÍLIA
  Display / Headings: Instrument Serif (Google Fonts)
  UI / Body: Inter (Google Fonts)
  Mono / Código: JetBrains Mono

ESCALA (Mobile → Desktop)
  --text-display:  clamp(48px, 8vw, 96px)  — hero headlines
  --text-h1:       clamp(32px, 5vw, 56px)  — títulos de página
  --text-h2:       clamp(24px, 3.5vw, 40px)
  --text-h3:       clamp(20px, 2.5vw, 28px)
  --text-body-lg:  18px / line-height 1.7
  --text-body:     16px / line-height 1.6
  --text-sm:       14px / line-height 1.5
  --text-xs:       12px / line-height 1.4

PESOS
  Display: 700 (Instrument Serif)
  H1-H3: 600-700 (Inter)
  Body: 400 (Inter)
  Labels/Caps: 500 (Inter, letter-spacing 0.08em)
```

### 3.3 Espaçamento (Múltiplos de 4px)

```
--space-1: 4px    --space-6: 24px    --space-16: 64px    --space-48: 192px
--space-2: 8px    --space-8: 32px    --space-24: 96px
--space-3: 12px   --space-12: 48px   --space-32: 128px
--space-4: 16px
```

### 3.4 Animações

```
DURAÇÕES
  --duration-instant:  100ms  — hover
  --duration-fast:     200ms  — toggle, check
  --duration-normal:   350ms  — transições de estado
  --duration-slow:     500ms  — entrada de elementos
  --duration-page:     700ms  — transições de página

EASING
  --ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1)  — spring natural
  --ease-out:      cubic-bezier(0.16, 1, 0.3, 1)       — saída suave
  --ease-in-out:   cubic-bezier(0.65, 0, 0.35, 1)      — transições

MOTION TOKENS (Motion.dev)
  entrada: { opacity: 0→1, y: 16→0, duration: 0.35, ease: "easeOut" }
  saída:   { opacity: 1→0, y: 0→-8, duration: 0.2 }
  hover:   { scale: 1→1.02, duration: 0.15 }
  tap:     { scale: 1→0.97, duration: 0.1 }
```

---

## 4. Componentes Base

### 4.1 Botões (3 variantes + Gold)

| Variante | Uso | Estilo |
|----------|-----|--------|
| **Primary** | Ação principal | `bg: #004AAD`, branco, hover `#003E93` + shadow |
| **Secondary** | Ação alternativa | Transparente, border `#004AAD`, hover `#EEF4FF` |
| **Ghost** | Ação terciária | Sem border, underline animado no hover |
| **Gold** | Conquistas/celebração | `bg: #FFB800`, preto, hover `#FFD000` |

Sizes: `sm` (8px 16px, 13px), `md` (12px 24px, 15px), `lg` (16px 32px, 17px)

### 4.2 Inputs

- Border: `1.5px solid #E8E8F0`, radius `8px`
- Focus: border `#004AAD` + shadow `rgba(0,74,173,0.1)`
- Error: border `#DC2626`
- Hint text: 12px `#8B8B9E`
- Ícone à esquerda (padding-left 44px)

### 4.3 Cards

- **Flat Card:** Sem border, fundo `#F8F8FC`, hover com `translateY(-2px)` + shadow sutil
- **Elevated Card:** Background `white`, border `#E8E8F0`, radius `12px`, shadow suave
- **Glass Card:** `backdrop-filter: blur(16px)`, background semi-transparente

### 4.4 Tags e Badges

- Tags: `12px`, `padding 4px 10px`, radius `20px`, fundo pastel por tipo
- Status badges: `draft` (cinza), `review` (amarelo), `approved` (verde), `published` (azul)

### 4.5 Layout Primitives

- **BentoGrid:** Grid assimétrico para dashboards
- **AsymmetricButton:** Botão com cantos assimétricos (Soul & Elite signature)
- **AspirationalEmpty:** Estado vazio premium com CTA

---

## 5. Padrões de Página

### Landing Page
- Hero: headline grande (Instrument Serif), desafio vocacional IA interactivo
- Blocos de impacto: 3 cards com experiência/simulação/curso
- CTA final: "Pronto para tomar a decisão certa?"

### Dashboard (por role)
- TopBar: saudação + notificações + avatar
- AI Card: insight personalizado com CTA
- Stats grid: 3 colunas com métricas chave
- Lista "Continuar a aprender" com progress bars

### Catálogos
- Filtros laterais (desktop) ou drawer (mobile)
- Cards de conteúdo com score, área, CTA
- Lazy loading com skeleton shimmer

### Detail Pages
- Hero com imagem/vídeo
- Dados + CTA primário
- Tabs: Sobre, Módulos, Avaliações, Comunidade
- Sidebar: mentor/instituição + CTAs secundários

---

*Destilado de spec Traycer dc2a19a2 (43KB, 867 linhas) · Wireframes HTML omitidos — consultar original se necessário.*
