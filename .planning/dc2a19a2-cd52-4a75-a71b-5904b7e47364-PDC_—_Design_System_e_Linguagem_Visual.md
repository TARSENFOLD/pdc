---
id: "dc2a19a2-cd52-4a75-a71b-5904b7e47364"
title: "PDC — Design System e Linguagem Visual"
createdAt: "2026-04-03T15:54:36.231Z"
updatedAt: "2026-04-03T15:57:43.462Z"
type: spec
---

# PDC — Design System e Linguagem Visual

# PDC — Design System e Linguagem Visual

<user_quoted_section>Filosofia: Menos é mais. Cada pixel tem propósito. O espaço vazio não é ausência — é respiração. O PDC compete com Linear, Vercel e Notion em qualidade de experiência, mas fala angolano: quente, humano, ambicioso.</user_quoted_section>

## 1. Stack Frontend — Decisão

O stack atual (React 18 + Vite + Tailwind v3 + Redux + SWR + React Query) tem demasiadas camadas. Para o PDC v2:

| Camada | Stack Atual | Stack Novo | Porquê |
| --- | --- | --- | --- |
| **Framework** | React 18 + Vite | **React 19 + Vite 6** | Server Components opcionais, melhor performance |
| **Styling** | Tailwind v3 | **Tailwind v4** | CSS-first config, melhor performance, sem `tailwind.config.js` |
| **Animações** | Framer Motion v12 (já existe) | **Motion (motion.dev) + GSAP** | Motion para UI/microinterações; GSAP para hero/scroll storytelling |
| **Estado servidor** | React Query v5 + SWR (duplicado) | **TanStack Query v5 apenas** | Eliminar SWR — uma única fonte de verdade |
| **Estado cliente** | Redux + Context (duplicado) | **Zustand + Context** | Zustand é 1KB, sem boilerplate, sem Redux |
| **Routing** | React Router v6 | **React Router v7** | File-based routing, loaders nativos |
| **Tipagem** | JS + TS parcial | **TypeScript 100%** | Segurança de tipos em toda a app |
| **Componentes base** | Custom + duplicados | **Radix UI Primitives** | Acessibilidade nativa, sem estilo imposto |
| **Ícones** | Mistura de libs | **Lucide React** | Consistente, leve, tree-shakeable |
| **Fontes** | Inter | **Inter + Instrument Serif** | Inter para UI; Instrument Serif para headings de impacto |
| **Charts** | Recharts | **Recharts** (manter) | Já existe, funciona bem |

## 2. Filosofia de Design

### 2.1 Os 5 Princípios

**1. Espaço como elemento de design**
Não há "espaço vazio" — há respiração intencional. Margens generosas, padding abundante, elementos que respiram. O utilizador nunca se sente sufocado.

**2. Tipografia como hierarquia**
O texto faz o trabalho pesado. Tamanhos extremos (headline 80px vs. caption 12px), pesos contrastantes (900 vs. 300), espaçamento de letras preciso. Sem ícones decorativos onde o texto basta.

**3. Movimento com propósito**
Cada animação tem uma razão: revelar, confirmar, guiar. Nunca animar por animar. Duração máxima de 400ms para interações; 800ms para transições de página. Spring physics em vez de easing linear.

**4. Cor como sinal**
A cor primária (#004AAD) aparece apenas onde há ação ou destaque crítico. O resto é neutro. O amarelo (#FFB800) é reservado para conquistas e momentos de celebração — nunca para UI genérica.

**5. Conteúdo primeiro**
Sem cards com bordas em tudo. O conteúdo flui na página como texto numa revista premium. Separadores são espaço, não linhas. Agrupamentos são proximidade, não containers.

### 2.2 Anti-padrões proibidos

| ❌ Proibido | ✅ Alternativa |
| --- | --- |
| Cards com border + shadow em tudo | Espaço e tipografia para agrupar |
| Botões com ícone + texto em todos os CTAs | CTAs de texto puro com underline animado |
| Sidebar sempre visível em mobile | Bottom navigation ou drawer |
| Loading spinners genéricos | Skeleton screens com shimmer |
| Modais para tudo | Drawers laterais ou inline expansion |
| Gradientes em todos os backgrounds | Gradientes apenas em momentos hero |
| Tabelas para listas simples | Listas com tipografia rica |
| Tooltips em hover para informação crítica | Texto inline sempre visível |

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

### 3.3 Espaçamento

Sistema baseado em múltiplos de 4px, com saltos generosos:

```
--space-1:   4px
--space-2:   8px
--space-3:   12px
--space-4:   16px
--space-6:   24px
--space-8:   32px
--space-12:  48px
--space-16:  64px
--space-24:  96px
--space-32:  128px
--space-48:  192px
```

### 3.4 Animações

```
DURAÇÕES
  --duration-instant:  100ms  — feedback imediato (hover)
  --duration-fast:     200ms  — microinterações (toggle, check)
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

## 4. Componentes Base

### 4.1 Botões

Três variantes apenas. Sem variantes intermédias.

```wireframe

<html>
<head>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
  body { font-family: 'Inter', sans-serif; background: #F8F8FC; padding: 48px; display: flex; flex-direction: column; gap: 48px; }
  .section-label { font-size: 11px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: #8B8B9E; margin-bottom: 20px; }
  .row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }

  /* PRIMARY */
  .btn-primary { background: #004AAD; color: white; border: none; border-radius: 8px; padding: 12px 24px; font-size: 15px; font-weight: 600; cursor: pointer; letter-spacing: -0.01em; transition: all 0.15s; }
  .btn-primary:hover { background: #003E93; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,74,173,0.25); }

  /* SECONDARY */
  .btn-secondary { background: transparent; color: #004AAD; border: 1.5px solid #004AAD; border-radius: 8px; padding: 11px 24px; font-size: 15px; font-weight: 600; cursor: pointer; letter-spacing: -0.01em; transition: all 0.15s; }
  .btn-secondary:hover { background: #EEF4FF; }

  /* GHOST / TEXT */
  .btn-ghost { background: transparent; color: #2D2D3A; border: none; padding: 12px 16px; font-size: 15px; font-weight: 500; cursor: pointer; letter-spacing: -0.01em; position: relative; transition: color 0.15s; }
  .btn-ghost::after { content: ''; position: absolute; bottom: 8px; left: 16px; right: 16px; height: 1px; background: #2D2D3A; transform: scaleX(0); transition: transform 0.2s cubic-bezier(0.16,1,0.3,1); transform-origin: left; }
  .btn-ghost:hover::after { transform: scaleX(1); }

  /* SIZES */
  .btn-sm { padding: 8px 16px; font-size: 13px; border-radius: 6px; }
  .btn-lg { padding: 16px 32px; font-size: 17px; border-radius: 10px; }

  /* GOLD */
  .btn-gold { background: #FFB800; color: #0A0A0F; border: none; border-radius: 8px; padding: 12px 24px; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
  .btn-gold:hover { background: #FFD000; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(255,184,0,0.3); }

  .divider { height: 1px; background: #E8E8F0; }
</style>
</head>
<body>
  <div>
    <div class="section-label">Primário — Ação principal</div>
    <div class="row">
      <button class="btn-primary btn-sm" data-element-id="btn-primary-sm">Explorar cursos</button>
      <button class="btn-primary" data-element-id="btn-primary-md">Começar agora</button>
      <button class="btn-primary btn-lg" data-element-id="btn-primary-lg">Iniciar simulação</button>
    </div>
  </div>
  <div class="divider"></div>
  <div>
    <div class="section-label">Secundário — Ação alternativa</div>
    <div class="row">
      <button class="btn-secondary btn-sm" data-element-id="btn-sec-sm">Ver detalhes</button>
      <button class="btn-secondary" data-element-id="btn-sec-md">Saber mais</button>
      <button class="btn-secondary btn-lg" data-element-id="btn-sec-lg">Conectar</button>
    </div>
  </div>
  <div class="divider"></div>
  <div>
    <div class="section-label">Ghost — Ação terciária</div>
    <div class="row">
      <button class="btn-ghost" data-element-id="btn-ghost-1">Cancelar</button>
      <button class="btn-ghost" data-element-id="btn-ghost-2">Ver todos →</button>
      <button class="btn-ghost" data-element-id="btn-ghost-3">Ignorar</button>
    </div>
  </div>
  <div class="divider"></div>
  <div>
    <div class="section-label">Gold — Conquistas e momentos especiais</div>
    <div class="row">
      <button class="btn-gold" data-element-id="btn-gold">🏆 Partilhar conquista</button>
    </div>
  </div>
</body>
</html>
```

### 4.2 Inputs

```wireframe

<html>
<head>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
  body { font-family: 'Inter', sans-serif; background: #F8F8FC; padding: 48px; max-width: 480px; display: flex; flex-direction: column; gap: 32px; }
  .field { display: flex; flex-direction: column; gap: 8px; }
  .label { font-size: 13px; font-weight: 500; color: #2D2D3A; letter-spacing: -0.01em; }
  .input { border: 1.5px solid #E8E8F0; border-radius: 8px; padding: 12px 16px; font-size: 15px; font-family: 'Inter', sans-serif; color: #0A0A0F; background: white; outline: none; transition: border-color 0.15s, box-shadow 0.15s; width: 100%; box-sizing: border-box; }
  .input:focus { border-color: #004AAD; box-shadow: 0 0 0 3px rgba(0,74,173,0.1); }
  .input::placeholder { color: #8B8B9E; }
  .input.error { border-color: #DC2626; }
  .input.error:focus { box-shadow: 0 0 0 3px rgba(220,38,38,0.1); }
  .hint { font-size: 12px; color: #8B8B9E; }
  .hint.error { color: #DC2626; }
  .input-icon-wrap { position: relative; }
  .input-icon-wrap .input { padding-left: 44px; }
  .input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #8B8B9E; font-size: 16px; }
  textarea.input { resize: none; min-height: 100px; line-height: 1.6; }
</style>
</head>
<body>
  <div class="field">
    <label class="label">Email institucional</label>
    <div class="input-icon-wrap">
      <span class="input-icon">✉</span>
      <input class="input" type="email" placeholder="nome@universidade.ao" data-element-id="input-email" />
    </div>
    <span class="hint">Usa o email da tua instituição para acesso completo</span>
  </div>

  <div class="field">
    <label class="label">Área de interesse</label>
    <input class="input" type="text" placeholder="Ex: Medicina, Engenharia..." data-element-id="input-area" />
  </div>

  <div class="field">
    <label class="label">Palavra-passe</label>
    <input class="input error" type="password" value="123" data-element-id="input-password" />
    <span class="hint error">Mínimo 8 caracteres com letras e números</span>
  </div>

  <div class="field">
    <label class="label">Sobre ti</label>
    <textarea class="input" placeholder="Conta-nos um pouco sobre os teus objetivos..." data-element-id="input-bio"></textarea>
    <span class="hint">0 / 1000 caracteres</span>
  </div>
</body>
</html>
```

## 5. Páginas Chave — Wireframes

### 5.1 Landing Page (Visitante)

```wireframe

<html>
<head>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #F8F8FC; color: #0A0A0F; }

  /* NAV */
  nav { display: flex; align-items: center; justify-content: space-between; padding: 20px 64px; background: rgba(248,248,252,0.8); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 100; border-bottom: 1px solid #E8E8F0; }
  .nav-logo { font-size: 18px; font-weight: 700; letter-spacing: -0.03em; color: #004AAD; }
  .nav-links { display: flex; gap: 32px; }
  .nav-link { font-size: 14px; color: #2D2D3A; text-decoration: none; font-weight: 500; }
  .nav-cta { background: #004AAD; color: white; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }

  /* HERO */
  .hero { padding: 120px 64px 96px; max-width: 1200px; margin: 0 auto; }
  .hero-eyebrow { font-size: 12px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: #004AAD; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }
  .hero-eyebrow::before { content: ''; width: 24px; height: 1px; background: #004AAD; }
  .hero-headline { font-family: 'Instrument Serif', serif; font-size: clamp(48px, 6vw, 80px); line-height: 1.05; letter-spacing: -0.02em; color: #0A0A0F; margin-bottom: 32px; max-width: 800px; }
  .hero-headline em { font-style: italic; color: #004AAD; }
  .hero-sub { font-size: 18px; color: #8B8B9E; line-height: 1.7; max-width: 520px; margin-bottom: 48px; font-weight: 400; }
  .hero-actions { display: flex; align-items: center; gap: 16px; }
  .btn-hero-primary { background: #004AAD; color: white; border: none; border-radius: 10px; padding: 16px 32px; font-size: 16px; font-weight: 600; cursor: pointer; letter-spacing: -0.01em; }
  .btn-hero-ghost { background: transparent; color: #2D2D3A; border: none; padding: 16px; font-size: 15px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px; }
  .hero-stat-row { display: flex; gap: 64px; margin-top: 80px; padding-top: 48px; border-top: 1px solid #E8E8F0; }
  .hero-stat { }
  .hero-stat-num { font-family: 'Instrument Serif', serif; font-size: 40px; color: #0A0A0F; letter-spacing: -0.02em; }
  .hero-stat-label { font-size: 13px; color: #8B8B9E; margin-top: 4px; }

  /* MARQUEE STRIP */
  .marquee-strip { background: #004AAD; padding: 14px 0; overflow: hidden; }
  .marquee-content { display: flex; gap: 48px; white-space: nowrap; }
  .marquee-item { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.7); letter-spacing: 0.05em; text-transform: uppercase; }
  .marquee-dot { color: #FFB800; }

  /* SECTION */
  .section { padding: 96px 64px; max-width: 1200px; margin: 0 auto; }
  .section-label { font-size: 11px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: #8B8B9E; margin-bottom: 16px; }
  .section-title { font-family: 'Instrument Serif', serif; font-size: clamp(32px, 4vw, 52px); line-height: 1.1; letter-spacing: -0.02em; margin-bottom: 64px; max-width: 600px; }

  /* FEATURE GRID — sem cards */
  .feature-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; }
  .feature-item { padding: 40px; border-right: 1px solid #E8E8F0; }
  .feature-item:last-child { border-right: none; }
  .feature-num { font-family: 'Instrument Serif', serif; font-size: 48px; color: #E8E8F0; line-height: 1; margin-bottom: 24px; }
  .feature-title { font-size: 18px; font-weight: 600; color: #0A0A0F; margin-bottom: 12px; letter-spacing: -0.02em; }
  .feature-desc { font-size: 14px; color: #8B8B9E; line-height: 1.7; }

  /* TESTIMONIAL */
  .testimonial-section { background: #0A0A0F; padding: 96px 64px; }
  .testimonial-inner { max-width: 1200px; margin: 0 auto; }
  .testimonial-quote { font-family: 'Instrument Serif', serif; font-size: clamp(28px, 4vw, 48px); color: white; line-height: 1.2; letter-spacing: -0.02em; max-width: 800px; margin-bottom: 32px; }
  .testimonial-quote em { color: #FFB800; font-style: italic; }
  .testimonial-author { display: flex; align-items: center; gap: 16px; }
  .testimonial-avatar { width: 44px; height: 44px; border-radius: 50%; background: #004AAD; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 16px; }
  .testimonial-name { font-size: 14px; font-weight: 600; color: white; }
  .testimonial-role { font-size: 13px; color: rgba(255,255,255,0.4); }

  /* CTA FINAL */
  .cta-section { padding: 120px 64px; text-align: center; max-width: 1200px; margin: 0 auto; }
  .cta-title { font-family: 'Instrument Serif', serif; font-size: clamp(40px, 5vw, 72px); line-height: 1.05; letter-spacing: -0.02em; margin-bottom: 24px; }
  .cta-sub { font-size: 18px; color: #8B8B9E; margin-bottom: 48px; }
  .cta-actions { display: flex; justify-content: center; gap: 16px; }
  .btn-cta { background: #004AAD; color: white; border: none; border-radius: 10px; padding: 18px 40px; font-size: 17px; font-weight: 600; cursor: pointer; }
  .btn-cta-outline { background: transparent; color: #0A0A0F; border: 1.5px solid #E8E8F0; border-radius: 10px; padding: 17px 40px; font-size: 17px; font-weight: 600; cursor: pointer; }
</style>
</head>
<body>

<nav>
  <div class="nav-logo">PDC</div>
  <div class="nav-links">
    <a class="nav-link" href="#" data-element-id="nav-explorar">Explorar</a>
    <a class="nav-link" href="#" data-element-id="nav-instituicoes">Instituições</a>
    <a class="nav-link" href="#" data-element-id="nav-mentores">Mentores</a>
    <a class="nav-link" href="#" data-element-id="nav-precos">Preços</a>
  </div>
  <button class="nav-cta" data-element-id="nav-entrar">Entrar →</button>
</nav>

<div class="hero">
  <div class="hero-eyebrow">Infraestrutura de Decisão Educacional</div>
  <h1 class="hero-headline">
    Escolher um curso<br>
    não devia ser uma <em>aposta.</em>
  </h1>
  <p class="hero-sub">
    O PDC transforma a incerteza vocacional em decisões precisas. Experimenta antes de te comprometeres.
  </p>
  <div class="hero-actions">
    <button class="btn-hero-primary" data-element-id="hero-cta-primary">Explorar simulações</button>
    <button class="btn-hero-ghost" data-element-id="hero-cta-ghost">Ver como funciona →</button>
  </div>
  <div class="hero-stat-row">
    <div class="hero-stat">
      <div class="hero-stat-num">60%</div>
      <div class="hero-stat-label">taxa de evasão no 1.º ano em Angola</div>
    </div>
    <div class="hero-stat">
      <div class="hero-stat-num">3×</div>
      <div class="hero-stat-label">mais provável de completar com orientação</div>
    </div>
    <div class="hero-stat">
      <div class="hero-stat-num">0 kz</div>
      <div class="hero-stat-label">para explorar experiências institucionais</div>
    </div>
  </div>
</div>

<div class="marquee-strip">
  <div class="marquee-content">
    <span class="marquee-item">Simulações Práticas</span>
    <span class="marquee-dot">·</span>
    <span class="marquee-item">Experiências Institucionais</span>
    <span class="marquee-dot">·</span>
    <span class="marquee-item">Mentoria Real</span>
    <span class="marquee-dot">·</span>
    <span class="marquee-item">Perfil Vocacional</span>
    <span class="marquee-dot">·</span>
    <span class="marquee-item">Decisões Informadas</span>
    <span class="marquee-dot">·</span>
    <span class="marquee-item">Simulações Práticas</span>
    <span class="marquee-dot">·</span>
    <span class="marquee-item">Experiências Institucionais</span>
  </div>
</div>

<div class="section">
  <div class="section-label">Como funciona</div>
  <div class="section-title">Três passos para uma decisão que não vais arrepender-te.</div>
  <div class="feature-grid">
    <div class="feature-item">
      <div class="feature-num">01</div>
      <div class="feature-title">Explora sem compromisso</div>
      <div class="feature-desc">Visita experiências reais de instituições. Vê depoimentos, currículos e o dia a dia de quem já lá está. Tudo gratuito.</div>
    </div>
    <div class="feature-item">
      <div class="feature-num">02</div>
      <div class="feature-title">Testa as tuas aptidões</div>
      <div class="feature-desc">Faz simulações práticas que replicam tarefas reais da profissão. O sistema mede o teu desempenho e constrói o teu perfil vocacional.</div>
    </div>
    <div class="feature-item">
      <div class="feature-num">03</div>
      <div class="feature-title">Decide com evidência</div>
      <div class="feature-desc">Recebe recomendações baseadas no teu comportamento real — não num questionário de 5 minutos. Conecta-te com mentores e instituições.</div>
    </div>
  </div>
</div>

<div class="testimonial-section">
  <div class="testimonial-inner">
    <div class="testimonial-quote">
      "Passei dois anos num curso que não era para mim. Com o PDC, teria sabido <em>antes de entrar.</em>"
    </div>
    <div class="testimonial-author">
      <div class="testimonial-avatar">A</div>
      <div>
        <div class="testimonial-name">Ana Luísa M.</div>
        <div class="testimonial-role">Estudante de Medicina, Luanda</div>
      </div>
    </div>
  </div>
</div>

<div class="cta-section">
  <div class="cta-title">Começa hoje.<br>É gratuito.</div>
  <div class="cta-sub">Sem cartão de crédito. Sem compromisso. Só clareza.</div>
  <div class="cta-actions">
    <button class="btn-cta" data-element-id="cta-register">Criar conta gratuita</button>
    <button class="btn-cta-outline" data-element-id="cta-institution">Sou uma instituição →</button>
  </div>
</div>

</body>
</html>
```

### 5.2 Dashboard do Estudante

```wireframe

<html>
<head>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #F8F8FC; color: #0A0A0F; display: flex; min-height: 100vh; }

  /* SIDEBAR */
  .sidebar { width: 240px; background: white; border-right: 1px solid #E8E8F0; padding: 24px 0; display: flex; flex-direction: column; flex-shrink: 0; }
  .sidebar-logo { padding: 0 24px 32px; font-size: 18px; font-weight: 700; letter-spacing: -0.03em; color: #004AAD; }
  .sidebar-section { padding: 0 12px; margin-bottom: 8px; }
  .sidebar-label { font-size: 10px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: #8B8B9E; padding: 0 12px; margin-bottom: 4px; }
  .sidebar-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: #2D2D3A; cursor: pointer; transition: background 0.1s; }
  .sidebar-item:hover { background: #F0F0F5; }
  .sidebar-item.active { background: #EEF4FF; color: #004AAD; }
  .sidebar-item-icon { width: 18px; text-align: center; font-size: 15px; }
  .sidebar-bottom { margin-top: auto; padding: 16px 12px; border-top: 1px solid #E8E8F0; }
  .sidebar-user { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; cursor: pointer; }
  .sidebar-avatar { width: 32px; height: 32px; border-radius: 50%; background: #004AAD; display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; font-weight: 700; flex-shrink: 0; }
  .sidebar-user-name { font-size: 13px; font-weight: 600; color: #0A0A0F; }
  .sidebar-user-role { font-size: 11px; color: #8B8B9E; }

  /* MAIN */
  .main { flex: 1; overflow-y: auto; }
  .main-header { padding: 32px 48px 0; display: flex; align-items: flex-start; justify-content: space-between; }
  .greeting { font-family: 'Instrument Serif', serif; font-size: 32px; letter-spacing: -0.02em; line-height: 1.2; }
  .greeting span { color: #004AAD; font-style: italic; }
  .header-actions { display: flex; gap: 8px; align-items: center; }
  .notif-btn { width: 36px; height: 36px; border-radius: 8px; border: 1.5px solid #E8E8F0; background: white; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; position: relative; }
  .notif-dot { position: absolute; top: 6px; right: 6px; width: 7px; height: 7px; background: #DC2626; border-radius: 50%; border: 1.5px solid white; }

  /* CONTENT */
  .content { padding: 32px 48px 64px; }

  /* VOCATIONAL PROGRESS — sem card, inline */
  .voc-section { margin-bottom: 48px; }
  .voc-label { font-size: 11px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: #8B8B9E; margin-bottom: 16px; }
  .voc-areas { display: flex; gap: 0; border: 1px solid #E8E8F0; border-radius: 12px; overflow: hidden; background: white; }
  .voc-area { flex: 1; padding: 20px 24px; border-right: 1px solid #E8E8F0; }
  .voc-area:last-child { border-right: none; }
  .voc-area-name { font-size: 13px; font-weight: 600; color: #0A0A0F; margin-bottom: 8px; }
  .voc-bar-bg { height: 4px; background: #F0F0F5; border-radius: 2px; margin-bottom: 6px; }
  .voc-bar-fill { height: 4px; background: #004AAD; border-radius: 2px; }
  .voc-area-pct { font-size: 12px; color: #8B8B9E; }

  /* CONTINUE SECTION */
  .continue-section { margin-bottom: 48px; }
  .section-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 24px; }
  .section-title { font-size: 18px; font-weight: 600; letter-spacing: -0.02em; }
  .section-link { font-size: 13px; color: #004AAD; font-weight: 500; cursor: pointer; }

  /* CONTINUE ITEM — sem card, linha horizontal */
  .continue-item { display: flex; align-items: center; gap: 20px; padding: 20px 0; border-bottom: 1px solid #E8E8F0; }
  .continue-item:last-child { border-bottom: none; }
  .continue-thumb { width: 56px; height: 56px; border-radius: 10px; background: #EEF4FF; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }
  .continue-info { flex: 1; }
  .continue-type { font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #8B8B9E; margin-bottom: 4px; }
  .continue-title { font-size: 15px; font-weight: 600; color: #0A0A0F; margin-bottom: 6px; letter-spacing: -0.01em; }
  .continue-progress-bg { height: 3px; background: #F0F0F5; border-radius: 2px; max-width: 200px; }
  .continue-progress-fill { height: 3px; background: #004AAD; border-radius: 2px; }
  .continue-pct { font-size: 12px; color: #8B8B9E; margin-top: 4px; }
  .continue-btn { background: #EEF4FF; color: #004AAD; border: none; border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; flex-shrink: 0; }

  /* FEED SECTION */
  .feed-section { }
  .feed-item { padding: 28px 0; border-bottom: 1px solid #E8E8F0; }
  .feed-item:last-child { border-bottom: none; }
  .feed-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .feed-avatar { width: 28px; height: 28px; border-radius: 50%; background: #004AAD; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 700; }
  .feed-author { font-size: 13px; font-weight: 600; color: #0A0A0F; }
  .feed-time { font-size: 12px; color: #8B8B9E; }
  .feed-type-badge { font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; background: #EEF4FF; color: #004AAD; border-radius: 4px; padding: 2px 8px; }
  .feed-title { font-size: 17px; font-weight: 600; color: #0A0A0F; letter-spacing: -0.02em; margin-bottom: 8px; line-height: 1.3; }
  .feed-desc { font-size: 14px; color: #8B8B9E; line-height: 1.6; margin-bottom: 16px; }
  .feed-actions { display: flex; gap: 4px; }
  .feed-action { background: transparent; border: none; padding: 6px 12px; border-radius: 6px; font-size: 13px; color: #8B8B9E; cursor: pointer; display: flex; align-items: center; gap: 5px; }
  .feed-action:hover { background: #F0F0F5; color: #0A0A0F; }
  .feed-action.liked { color: #DC2626; }
</style>
</head>
<body>

<div class="sidebar">
  <div class="sidebar-logo">PDC</div>
  <div class="sidebar-section">
    <div class="sidebar-item active" data-element-id="nav-inicio">
      <span class="sidebar-item-icon">⌂</span> Início
    </div>
    <div class="sidebar-item" data-element-id="nav-explorar">
      <span class="sidebar-item-icon">◎</span> Explorar
    </div>
    <div class="sidebar-item" data-element-id="nav-simulacoes">
      <span class="sidebar-item-icon">▷</span> Simulações
    </div>
    <div class="sidebar-item" data-element-id="nav-cursos">
      <span class="sidebar-item-icon">□</span> Cursos
    </div>
    <div class="sidebar-item" data-element-id="nav-projetos">
      <span class="sidebar-item-icon">◈</span> Projetos
    </div>
  </div>
  <div class="sidebar-section" style="margin-top: 16px;">
    <div class="sidebar-label">Pessoal</div>
    <div class="sidebar-item" data-element-id="nav-perfil">
      <span class="sidebar-item-icon">◯</span> Perfil Vocacional
    </div>
    <div class="sidebar-item" data-element-id="nav-mentores">
      <span class="sidebar-item-icon">⟡</span> Mentores
    </div>
    <div class="sidebar-item" data-element-id="nav-guardados">
      <span class="sidebar-item-icon">◇</span> Guardados
    </div>
  </div>
  <div class="sidebar-bottom">
    <div class="sidebar-user" data-element-id="sidebar-user">
      <div class="sidebar-avatar">JM</div>
      <div>
        <div class="sidebar-user-name">João Manuel</div>
        <div class="sidebar-user-role">Estudante</div>
      </div>
    </div>
  </div>
</div>

<div class="main">
  <div class="main-header">
    <div class="greeting">Bom dia, <span>João.</span><br>O que vais descobrir hoje?</div>
    <div class="header-actions">
      <div class="notif-btn" data-element-id="notif-btn">
        🔔
        <div class="notif-dot"></div>
      </div>
    </div>
  </div>

  <div class="content">

    <div class="voc-section">
      <div class="voc-label">Perfil Vocacional — baseado no teu comportamento</div>
      <div class="voc-areas">
        <div class="voc-area">
          <div class="voc-area-name">Medicina</div>
          <div class="voc-bar-bg"><div class="voc-bar-fill" style="width:72%"></div></div>
          <div class="voc-area-pct">72% afinidade</div>
        </div>
        <div class="voc-area">
          <div class="voc-area-name">Engenharia</div>
          <div class="voc-bar-bg"><div class="voc-bar-fill" style="width:45%"></div></div>
          <div class="voc-area-pct">45% afinidade</div>
        </div>
        <div class="voc-area">
          <div class="voc-area-name">Direito</div>
          <div class="voc-bar-bg"><div class="voc-bar-fill" style="width:28%"></div></div>
          <div class="voc-area-pct">28% afinidade</div>
        </div>
        <div class="voc-area" style="background: #EEF4FF;">
          <div class="voc-area-name" style="color: #004AAD;">+ Explorar áreas</div>
          <div style="font-size: 12px; color: #8B8B9E; margin-top: 8px;">Faz mais simulações para refinar</div>
        </div>
      </div>
    </div>

    <div class="continue-section">
      <div class="section-header">
        <div class="section-title">Continuar</div>
        <div class="section-link" data-element-id="ver-todos-continuar">Ver todos →</div>
      </div>
      <div class="continue-item">
        <div class="continue-thumb">🔬</div>
        <div class="continue-info">
          <div class="continue-type">Simulação</div>
          <div class="continue-title">Diagnóstico Clínico — Medicina Interna</div>
          <div class="continue-progress-bg"><div class="continue-progress-fill" style="width: 65%"></div></div>
          <div class="continue-pct">65% concluído · 12 min restantes</div>
        </div>
        <button class="continue-btn" data-element-id="continuar-sim">Continuar</button>
      </div>
      <div class="continue-item">
        <div class="continue-thumb">🏛</div>
        <div class="continue-info">
          <div class="continue-type">Experiência</div>
          <div class="continue-title">Por Dentro da Medicina — UAN 2025</div>
          <div class="continue-progress-bg"><div class="continue-progress-fill" style="width: 30%"></div></div>
          <div class="continue-pct">30% concluído · 3 blocos restantes</div>
        </div>
        <button class="continue-btn" data-element-id="continuar-exp">Continuar</button>
      </div>
    </div>

    <div class="feed-section">
      <div class="section-header">
        <div class="section-title">Para ti</div>
        <div class="section-link" data-element-id="ver-feed-completo">Feed completo →</div>
      </div>

      <div class="feed-item">
        <div class="feed-meta">
          <div class="feed-avatar">MF</div>
          <span class="feed-author">Dr. Manuel Ferreira</span>
          <span class="feed-time">· 2h</span>
          <span class="feed-type-badge">Simulação</span>
        </div>
        <div class="feed-title">Nova simulação: O que faz um Cirurgião no bloco operatório</div>
        <div class="feed-desc">25 minutos · 87% taxa de conclusão · 4.9 ⭐ em 124 avaliações</div>
        <div class="feed-actions">
          <button class="feed-action liked" data-element-id="like-1">❤ 342</button>
          <button class="feed-action" data-element-id="bookmark-1">🔖 Guardar</button>
          <button class="feed-action" data-element-id="share-1">↗ Partilhar</button>
          <button class="feed-action" data-element-id="start-sim" style="margin-left: auto; color: #004AAD; font-weight: 600;">▷ Iniciar</button>
        </div>
      </div>

      <div class="feed-item">
        <div class="feed-meta">
          <div class="feed-avatar" style="background: #059669;">U</div>
          <span class="feed-author">Universidade Agostinho Neto</span>
          <span class="feed-time">· 5h</span>
          <span class="feed-type-badge" style="background: #F0FDF4; color: #059669;">Experiência</span>
        </div>
        <div class="feed-title">Por Dentro do Curso de Medicina — Turma 2025</div>
        <div class="feed-desc">Depoimentos de alunos do 3.º ano, visita ao laboratório e currículo completo. Gratuito.</div>
        <div class="feed-actions">
          <button class="feed-action" data-element-id="like-2">❤ 198</button>
          <button class="feed-action" data-element-id="bookmark-2">🔖 Guardar</button>
          <button class="feed-action" data-element-id="share-2">↗ Partilhar</button>
          <button class="feed-action" data-element-id="ver-exp" style="margin-left: auto; color: #059669; font-weight: 600;">👁 Ver</button>
        </div>
      </div>

    </div>
  </div>
</div>

</body>
</html>
```

### 5.3 Página de Simulação (em execução)

```wireframe

<html>
<head>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #0A0A0F; color: white; min-height: 100vh; display: flex; flex-direction: column; }

  /* TOP BAR */
  .sim-topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 48px; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .sim-back { font-size: 13px; color: rgba(255,255,255,0.4); cursor: pointer; display: flex; align-items: center; gap: 6px; }
  .sim-title { font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.7); }
  .sim-progress-wrap { display: flex; align-items: center; gap: 12px; }
  .sim-progress-label { font-size: 12px; color: rgba(255,255,255,0.4); }
  .sim-progress-bar { width: 120px; height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; }
  .sim-progress-fill { height: 3px; background: #004AAD; border-radius: 2px; width: 40%; }
  .sim-timer { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.5); font-variant-numeric: tabular-nums; }

  /* MAIN */
  .sim-main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 64px 48px; }
  .sim-content { max-width: 680px; width: 100%; }
  .sim-step { font-size: 11px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 16px; }
  .sim-question { font-family: 'Instrument Serif', serif; font-size: clamp(24px, 3vw, 36px); line-height: 1.25; letter-spacing: -0.01em; color: white; margin-bottom: 48px; }
  .sim-context { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px 24px; margin-bottom: 40px; font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.7; }
  .sim-context-label { font-size: 10px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 8px; }

  /* OPTIONS */
  .sim-options { display: flex; flex-direction: column; gap: 12px; }
  .sim-option { border: 1.5px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 18px 24px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 16px; }
  .sim-option:hover { border-color: rgba(0,74,173,0.6); background: rgba(0,74,173,0.08); }
  .sim-option.selected { border-color: #004AAD; background: rgba(0,74,173,0.15); }
  .sim-option-key { width: 28px; height: 28px; border-radius: 6px; border: 1.5px solid rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.4); flex-shrink: 0; }
  .sim-option.selected .sim-option-key { border-color: #004AAD; color: #004AAD; background: rgba(0,74,173,0.2); }
  .sim-option-text { font-size: 15px; color: rgba(255,255,255,0.8); line-height: 1.5; }
  .sim-option.selected .sim-option-text { color: white; }

  /* BOTTOM */
  .sim-bottom { padding: 24px 48px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; }
  .sim-hint { font-size: 12px; color: rgba(255,255,255,0.25); }
  .sim-actions { display: flex; gap: 12px; }
  .sim-btn-skip { background: transparent; border: 1.5px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.4); border-radius: 8px; padding: 10px 20px; font-size: 14px; cursor: pointer; }
  .sim-btn-next { background: #004AAD; color: white; border: none; border-radius: 8px; padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; }
</style>
</head>
<body>

<div class="sim-topbar">
  <div class="sim-back" data-element-id="sim-back">← Sair</div>
  <div class="sim-title">Diagnóstico Clínico — Medicina Interna</div>
  <div class="sim-progress-wrap">
    <span class="sim-progress-label">Questão 4 de 10</span>
    <div class="sim-progress-bar"><div class="sim-progress-fill"></div></div>
    <span class="sim-timer">18:42</span>
  </div>
</div>

<div class="sim-main">
  <div class="sim-content">
    <div class="sim-step">Questão 4 · Diagnóstico Diferencial</div>
    <div class="sim-question">
      Um paciente de 45 anos chega à urgência com dor torácica intensa há 2 horas, irradiando para o braço esquerdo. Qual é a tua primeira ação?
    </div>
    <div class="sim-context">
      <div class="sim-context-label">Contexto clínico</div>
      PA: 150/95 mmHg · FC: 98 bpm · SpO₂: 96% · ECG: alterações no segmento ST em V1-V4
    </div>
    <div class="sim-options">
      <div class="sim-option" data-element-id="opt-a">
        <div class="sim-option-key">A</div>
        <div class="sim-option-text">Administrar analgésico e aguardar resultado de análises</div>
      </div>
      <div class="sim-option selected" data-element-id="opt-b">
        <div class="sim-option-key">B</div>
        <div class="sim-option-text">Ativar protocolo de STEMI, ECG de 12 derivações e acesso venoso imediato</div>
      </div>
      <div class="sim-option" data-element-id="opt-c">
        <div class="sim-option-key">C</div>
        <div class="sim-option-text">Solicitar radiografia torácica e aguardar cardiologista</div>
      </div>
      <div class="sim-option" data-element-id="opt-d">
        <div class="sim-option-key">D</div>
        <div class="sim-option-text">Administrar aspirina e nitroglicerina sublingual</div>
      </div>
    </div>
  </div>
</div>

<div class="sim-bottom">
  <div class="sim-hint">Pressiona A, B, C ou D para selecionar</div>
  <div class="sim-actions">
    <button class="sim-btn-skip" data-element-id="sim-skip">Saltar</button>
    <button class="sim-btn-next" data-element-id="sim-next">Próxima →</button>
  </div>
</div>

</body>
</html>
```

## 6. Princípios de Animação

### 6.1 Hierarquia de movimento

| Nível | Quando | Biblioteca | Exemplo |
| --- | --- | --- | --- |
| **Micro** | Hover, focus, toggle | Motion (CSS) | Botão escala 1.02 no hover |
| **Componente** | Entrada/saída de elementos | Motion.dev | Modal desliza de baixo |
| **Página** | Transição entre rotas | Motion.dev | Fade + slide suave |
| **Hero** | Scroll storytelling, landing | GSAP | Texto revela letra a letra |
| **Dados** | Gráficos e números | Recharts + Motion | Barras crescem ao entrar |

### 6.2 Regras de ouro

1. **Nunca animar mais de 3 elementos em simultâneo** — cria caos visual
2. **Stagger de 50-80ms** entre elementos de uma lista — parece natural
3. **Sempre respeitar ****`prefers-reduced-motion`** — acessibilidade não é opcional
4. **Spring physics para elementos físicos** (drawers, modais, cards) — `stiffness: 300, damping: 30`
5. **Easing linear apenas para loops** (spinners, marquees) — nunca para transições de UI

## 7. Responsividade

### 7.1 Breakpoints

```
mobile:  < 640px   — bottom nav, stack vertical, texto menor
tablet:  640-1024px — sidebar colapsada, grid 2 colunas
desktop: > 1024px  — sidebar expandida, grid 3 colunas, espaçamentos máximos
wide:    > 1440px  — max-width 1200px centrado, espaços ainda maiores
```

### 7.2 Mobile-first obrigatório

O PDC é principalmente mobile em Angola. Cada componente é desenhado primeiro para 375px e depois expandido. A sidebar em mobile é substituída por bottom navigation com 5 itens máximo.

## 8. Acessibilidade

| Requisito | Implementação |
| --- | --- |
| Contraste mínimo AA | Todas as combinações de cor verificadas (WCAG 2.1) |
| Focus visible | Ring de foco azul (#004AAD) em todos os elementos interativos |
| Screen readers | Radix UI Primitives com ARIA nativo |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` desativa todas as animações |
| Tamanho mínimo de toque | 44×44px em todos os elementos clicáveis em mobile |
| Sem informação só por cor | Ícones + texto sempre acompanham indicadores de cor |
