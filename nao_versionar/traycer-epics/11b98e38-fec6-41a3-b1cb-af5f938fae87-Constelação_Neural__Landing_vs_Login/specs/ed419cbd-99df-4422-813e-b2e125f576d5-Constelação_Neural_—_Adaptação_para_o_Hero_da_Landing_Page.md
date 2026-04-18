---
id: "ed419cbd-99df-4422-813e-b2e125f576d5"
title: "Constelação Neural — Adaptação para o Hero da Landing Page"
createdAt: "2026-04-18T00:53:52.429Z"
updatedAt: "2026-04-18T00:55:04.395Z"
type: spec
---

# Constelação Neural — Adaptação para o Hero da Landing Page

## Visão Geral

Adaptar a animação **Constelação Neural** (originalmente concebida para o login) para o fundo do hero da landing page. A justificação estratégica: a teia de partículas conectadas comunica visualmente a "Big Picture" do PDC — o ecossistema vasto de cursos, mentores, instituições e estudantes interligados.

### Escopo

| O que ESTÁ no escopo | O que NÃO está no escopo |
| --- | --- |
| Substituir o fundo `hero-students.jpg` no `LandingHero` por um canvas de partículas | Modificar `LoginPage` |
| Estado Ocioso (partículas flutuantes + sinapses) | Split 50/50 em qualquer página |
| Interação com cursor (repulsão magnética) | Estados reactivos a formulário (email/password/warp) |
| Adaptar cor `teal-400` → `--color-accent` (`#FF5C00` Terracota) | Substituir GSAP por outra biblioteca pesada |

### Adaptações Críticas ao Código Original

| Original (teu código) | Adaptado (regras do projeto) |
| --- | --- |
| `import gsap from 'gsap'` + `useGSAP` | **GSAP não está instalado** — usar `useEffect` + `requestAnimationFrame` puro |
| `bg-neutral-950` | `bg-background` (token do design system) |
| `rgba(45, 212, 191, ...)` (teal-400) | `rgba(255, 92, 0, ...)` (`--color-accent` Terracota) |
| `<h1>Por Dentro Do Curso.</h1>` (conteúdo próprio) | Manter o conteúdo actual do `LandingHero` (headline, CTAs, stats, micro-desafio) |
| `w-full h-screen` como container | Canvas em camada absoluta `inset-0 z-0` dentro do `<section>` existente |
| Sem suporte a `prefers-reduced-motion` | **Obrigatório** — canvas substituído por gradiente estático |
| Sem cleanup de `requestAnimationFrame` | **Obrigatório** — guardar `frameId` e cancelar no unmount |

## Componente: `NeuralConstellation`

**Localização:** `apps/web/src/features/landing/NeuralConstellation.tsx`

<user_quoted_section>Vive em features/landing/ porque é específico da landing. Se no futuro for reutilizado noutras páginas (ex: dashboard hero), promove-se para components/ui/.</user_quoted_section>

### Props

| Prop | Tipo | Default | Descrição |
| --- | --- | --- | --- |
| `particleCount` | `number` | `120` | Densidade da rede |
| `connectionDistance` | `number` | `150` | Distância máxima (px) para desenhar sinapse entre 2 partículas |
| `mouseRadius` | `number` | `200` | Raio (px) de influência do cursor |
| `className` | `string` | `''` | Classes adicionais |

### Estrutura Interna

```graph TD
  A[NeuralConstellation] --> B[useRef canvas]
  A --> C[useEffect setup]
  C --> D[Particle class]
  C --> E[animate loop via rAF]
  C --> F[mousemove listener]
  C --> G[resize listener]
  C --> H[cleanup: cancelAnimationFrame + removeEventListener]
  A --> I[useReducedMotion check]
  I --> J{reducedMotion?}
  J -->|true| K[Render gradient estático]
  J -->|false| L[Render canvas animado]
```

### Lógica de Renderização (Pseudocódigo)

```
loop animate():
  ctx.clearRect(0, 0, width, height)
  para cada partícula p:
    p.update(mouse)        # movimento + bounce + repulsão do cursor
    p.draw(ctx)             # arc preenchido com cor accent
  para cada par (p_i, p_j):
    se dist(p_i, p_j) < connectionDistance:
      desenhar linha com opacity = 1 - dist/connectionDistance
  frameId = requestAnimationFrame(animate)
```

### Cleanup Obrigatório

O `useEffect` deve devolver uma função que:

1. `cancelAnimationFrame(frameId)`
2. `window.removeEventListener('resize', resize)`
3. `window.removeEventListener('mousemove', handleMouseMove)`

<user_quoted_section>Nota crítica: O teu código original usa useGSAP({ scope: containerRef }) que faria o cleanup automático. Como vamos usar useEffect puro, o cleanup é manual e obrigatório.</user_quoted_section>

### Acessibilidade

- `<canvas aria-hidden="true">` — não é conteúdo semântico
- Quando `useReducedMotion()` retorna `true` → render alternativo: `<div>` com gradiente radial estático em `var(--color-accent)`
- Sem `tabIndex`, sem eventos de teclado

### Performance

| Optimização | Detalhe |
| --- | --- |
| Devicepixelratio | `canvas.width = innerWidth * dpr` para nitidez em retina, escalar `ctx` |
| Throttle do mousemove | Não necessário (o loop `rAF` já consome o último valor de mouse) |
| Densidade adaptativa | `particleCount = window.innerWidth < 768 ? 60 : 120` (mobile com metade das partículas) |
| Pausar quando não visível | Usar `IntersectionObserver` — pausar `rAF` quando hero sai do viewport (scroll para baixo) |

## Modificação: `LandingHero.tsx`

**Ficheiro:** file:apps/web/src/features/landing/LandingHero.tsx

### Mudanças Pontuais

1. **Remover** o bloco da imagem de fundo (`<img src="/images/hero/hero-students.jpg" ...>`) e o overlay `mix-blend-luminosity`
2. **Adicionar** `<NeuralConstellation />` no mesmo lugar (camada absoluta `inset-0 z-0`)
3. **Manter** os gradientes existentes (`bg-radial-...` e `bg-gradient-to-b`) por cima do canvas para garantir legibilidade do texto
4. **Manter** todo o conteúdo textual (`badge`, `h1`, `subtitle`, CTAs, `MicroDesafio`, stats, indicador de scroll) — zero alterações
5. **Manter** `bg-[#050505]` no `<section>` como fallback antes do canvas pintar

### Estrutura Final de Camadas

```
<section bg-[#050505]>
  └── div absolute inset-0 z-0 overflow-hidden
       ├── <NeuralConstellation />              ← NOVO (substitui <img>)
       ├── div bg-radial overlay (opacity 80%)  ← mantido
       └── div bg-gradient-to-b                 ← mantido
  └── motion.div z-10 (badge)                   ← mantido
  └── motion.h1  z-10 (headline)                ← mantido
  └── motion.p   z-10 (subtitle)                ← mantido
  └── motion.div z-10 (CTAs)                    ← mantido
  └── motion.div z-10 (MicroDesafio)            ← mantido
  └── motion.div z-10 (stats)                   ← mantido
  └── motion.div z-10 (scroll indicator)        ← mantido
</section>
```

### Wireframe — Hero da Landing com Constelação Neural

```wireframe

<html>
<head>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; }
  body { background: #050505; color: #f5f5f5; }
  .hero { position: relative; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 96px 16px 64px; overflow: hidden; }
  .canvas-layer { position: absolute; inset: 0; z-index: 0; }
  .canvas-bg { position: absolute; inset: 0; background: #0a0a0a; }
  .particles { position: absolute; inset: 0; background-image: radial-gradient(circle, rgba(255,92,0,0.7) 1.2px, transparent 1.2px), radial-gradient(circle, rgba(255,92,0,0.4) 1px, transparent 1px), radial-gradient(circle, rgba(255,92,0,0.5) 1.5px, transparent 1.5px); background-size: 90px 90px, 50px 50px, 130px 130px; background-position: 0 0, 25px 25px, 60px 40px; animation: drift 12s ease-in-out infinite alternate; }
  @keyframes drift { from { transform: translate(0,0); } to { transform: translate(15px, -8px); } }
  .lines { position: absolute; inset: 0; opacity: 0.35; background: linear-gradient(45deg, transparent 49%, rgba(255,92,0,0.15) 50%, transparent 51%), linear-gradient(135deg, transparent 49%, rgba(255,92,0,0.1) 50%, transparent 51%), linear-gradient(90deg, transparent 49%, rgba(255,92,0,0.08) 50%, transparent 51%); background-size: 180px 180px, 220px 220px, 140px 140px; }
  .gradient-radial { position: absolute; inset: 0; z-index: 1; background: radial-gradient(circle at center, transparent 0%, #050505 85%); opacity: 0.85; }
  .gradient-bottom { position: absolute; inset: 0; z-index: 1; background: linear-gradient(to bottom, rgba(5,5,5,0.6) 0%, transparent 25%, transparent 75%, #050505 100%); }
  .content { position: relative; z-index: 10; max-width: 900px; }
  .badge { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.04); backdrop-filter: blur(20px); border-radius: 100px; padding: 6px 16px; font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,92,0,0.85); margin-bottom: 24px; }
  h1 { font-size: 64px; font-weight: 700; line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 32px; }
  h1 span { background: linear-gradient(90deg, #FF5C00, #FF8A00); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .subtitle { font-size: 18px; color: #a1a1aa; max-width: 600px; margin: 0 auto 48px; line-height: 1.6; }
  .subtitle strong { color: #f5f5f5; font-weight: 500; }
  .cta-group { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-bottom: 64px; }
  .btn-primary { background: #FF5C00; color: white; border: none; border-radius: 12px; padding: 16px 40px; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 20px 40px -12px rgba(255,92,0,0.3); }
  .btn-secondary { background: rgba(255,255,255,0.05); color: #f5f5f5; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 12px; padding: 16px 40px; font-size: 15px; font-weight: 700; cursor: pointer; }
  .micro-desafio { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); backdrop-filter: blur(10px); border-radius: 14px; padding: 24px; max-width: 500px; margin: 0 auto 80px; }
  .micro-desafio-label { font-size: 10px; color: rgba(255,92,0,0.7); letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; }
  .micro-desafio-text { font-size: 14px; color: #a1a1aa; }
  .stats { display: flex; gap: 80px; justify-content: center; padding-top: 48px; border-top: 1px solid rgba(255,255,255,0.06); }
  .stat-value { font-size: 36px; font-weight: 700; color: #FF5C00; font-family: monospace; letter-spacing: -0.04em; }
  .stat-label { font-size: 11px; color: #52525b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700; }
  .scroll-indicator { position: relative; z-index: 10; margin-top: 64px; opacity: 0.2; }
  .scroll-indicator svg { width: 24px; height: 24px; }
</style>
</head>
<body>
  <section class="hero">
    <div class="canvas-layer">
      <div class="canvas-bg"></div>
      <div class="particles"></div>
      <div class="lines"></div>
    </div>
    <div class="gradient-radial"></div>
    <div class="gradient-bottom"></div>
    <div class="content">
      <div class="badge">A Infraestrutura de Decisão Educacional</div>
      <h1>O teu futuro não é um palpite.<br><span>É uma evidência.</span></h1>
      <p class="subtitle">Simula profissões reais, descobre onde te encaixas e escolhe o teu curso com base em dados comportamentais. <strong>Lidera a tua trajetória.</strong></p>
      <div class="cta-group">
        <button class="btn-primary" data-element-id="cta-primary">Iniciar Simulação — Grátis</button>
        <button class="btn-secondary" data-element-id="cta-secondary">Conhecer a Metodologia</button>
      </div>
      <div class="micro-desafio">
        <div class="micro-desafio-label">Micro-Desafio Vocacional</div>
        <div class="micro-desafio-text">Descobre em 60 segundos qual é a tua área natural →</div>
      </div>
      <div class="stats">
        <div><div class="stat-value">7</div><div class="stat-label">áreas vocacionais</div></div>
        <div><div class="stat-value">3 tipos</div><div class="stat-label">de simulação prática</div></div>
        <div><div class="stat-value">6 roles</div><div class="stat-label">estudante a instituição</div></div>
      </div>
    </div>
    <div class="scroll-indicator">
      <svg fill="none" viewBox="0 0 24 24" stroke="white"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7"/></svg>
    </div>
  </section>
</body>
</html>
```

## Estrutura de Ficheiros

```
apps/web/src/features/landing/
├── LandingHero.tsx               ← MODIFICAR: trocar <img> por <NeuralConstellation />
└── NeuralConstellation.tsx       ← NOVO: canvas de partículas
```

**Zero ficheiros tocados fora de ****`features/landing/`****.** O `LoginPage` e o `AuthSplitLayout` ficam exactamente como estão hoje.

## Fluxo de Implementação

```sequenceDiagram
  participant Dev as Implementação
  participant NC as NeuralConstellation
  participant LH as LandingHero
  participant User as Utilizador

  Dev->>NC: Criar componente com canvas + rAF
  Dev->>NC: Adicionar useReducedMotion guard
  Dev->>NC: Adicionar IntersectionObserver para pausar fora do viewport
  Dev->>LH: Importar NeuralConstellation
  Dev->>LH: Remover <img hero-students.jpg> + overlay grayscale
  Dev->>LH: Inserir <NeuralConstellation /> em z-0
  User->>LH: Abre /
  LH->>NC: Monta canvas
  NC->>User: Estado ocioso (partículas flutuam + sinapses)
  User->>NC: Move o cursor
  NC->>User: Repulsão magnética suave
  User->>LH: Faz scroll para fora do hero
  NC->>NC: IntersectionObserver pausa rAF
```

## Critérios de Verificação

| Critério | Como verificar |
| --- | --- |
| Zero novas dependências | `apps/web/package.json` não contém `gsap` nem `@gsap/react` |
| Cor do sistema | `grep -n "45, 212, 191" apps/web/src/features/landing/NeuralConstellation.tsx` → zero (deve ser `255, 92, 0`) |
| `prefers-reduced-motion` | DevTools → Rendering → Emulate → canvas substituído por gradiente |
| Cleanup de listeners | Inspeccionar com React DevTools → desmontar componente → sem listeners pendentes em `window` |
| Login intocado | `git diff apps/web/src/pages/LoginPage.tsx` → vazio |
| `AuthSplitLayout` intocado | `git diff apps/web/src/features/auth/AuthSplitLayout.tsx` → vazio |
| Performance | Lighthouse na landing → Performance ≥ 90 mantido |
| Mobile | DevTools → 375px → `particleCount` reduzido para 60, sem janks |
| Pausa fora do viewport | DevTools → Performance tab → scroll para baixo → CPU drop visível |
