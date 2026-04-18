---
id: "79cac116-6793-4180-9fe1-debfc27b5514"
title: "Implementar Constelação Neural"
createdAt: "1776473798043"
updatedAt: "1776476386088"
type: execution
---

### User Query (Status: Completed)

Implementar a spec `spec:Constelação Neural — Adaptação para o Hero da Landing Page` (Constelação Neural — Adaptação para o Hero da Landing Page).

## Contexto do projeto

- Workspace: `/home/cj/pdc-v2/` (monorepo com `apps/web` em React 18 + Vite + Tailwind v4 + TypeScript)
- A animação foi originalmente concebida pelo utilizador para a tela de login com GSAP, mas agora será adaptada APENAS para a landing page como fundo do hero
- **Login fica completamente intocado** — não modificar `apps/web/src/pages/LoginPage.tsx` nem `apps/web/src/features/auth/AuthSplitLayout.tsx`
- **GSAP NÃO está instalado** — proibido adicionar. Usar `useEffect` + `requestAnimationFrame` puro
- Cor accent do design system: `var(--color-accent)` = `#FF5C00` (Terracota), NÃO usar teal-400

## Ficheiros a criar/modificar

### 1. CRIAR: `apps/web/src/features/landing/NeuralConstellation.tsx`

Componente que renderiza um `<canvas>` com partículas conectadas (constelação neural).

**Props (todas opcionais com defaults):**

- `particleCount?: number` (default: 120, mas reduzir para 60 quando `window.innerWidth < 768`)
- `connectionDistance?: number` (default: 150)
- `mouseRadius?: number` (default: 200)
- `className?: string`

**Comportamento:**

- Estado ocioso: partículas flutuam em movimento browniano lento (`vx, vy ∈ [-0.25, 0.25]`), com bounce nas bordas
- Sinapses: linhas entre pares de partículas com `dist < connectionDistance`, opacity = `1 - dist/connectionDistance`
- Repulsão do cursor: quando `dist(particle, mouse) < mouseRadius`, partícula afasta-se com `force = (radius - dist) / radius`
- Cor das partículas e linhas: `rgba(255, 92, 0, alpha)` (NÃO teal — adaptar do código original)
- Tamanho: `Math.random() * 2 + 1` px

**Requisitos técnicos obrigatórios:**

1. Usar `useEffect` (não há `useGSAP`/GSAP no projeto)
2. Cleanup completo no return do useEffect: `cancelAnimationFrame(frameId)`, `removeEventListener('resize', ...)`, `removeEventListener('mousemove', ...)`
3. Suporte a device pixel ratio: `canvas.width = innerWidth * dpr`, `canvas.height = innerHeight * dpr`, `ctx.scale(dpr, dpr)` — para nitidez em retina
4. Usar `useReducedMotion()` de `motion/react` (já importado no projeto). Quando `true`, não renderizar canvas — em vez disso, renderizar um `<div>` com gradiente radial estático em `var(--color-accent)` para fallback visual
5. Usar `IntersectionObserver` para pausar `requestAnimationFrame` quando o canvas sai do viewport (poupa CPU em scroll)
6. Resize handler: re-aplicar dimensões no resize de window
7. `<canvas aria-hidden="true">` — não é conteúdo semântico
8. TypeScript estrito: tipar a classe `Particle` com propriedades explícitas, sem `any`
9. Usar Tailwind para classes (não inline styles): canvas com `absolute inset-0 w-full h-full`

**Estrutura sugerida:**

```typescript
import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

interface NeuralConstellationProps { ... }

class Particle {
  x: number; y: number; vx: number; vy: number; size: number;
  constructor(width: number, height: number) { ... }
  update(width: number, height: number, mouse: { x: number; y: number; radius: number }) { ... }
  draw(ctx: CanvasRenderingContext2D) { ... }
}

export function NeuralConstellation({ particleCount, ... }: NeuralConstellationProps) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reduced) return;
    // ... setup canvas, particles, animate, listeners
    return () => { /* cleanup */ };
  }, [reduced, particleCount, connectionDistance, mouseRadius]);

  if (reduced) {
    return <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,92,0,0.08),transparent_70%)]" aria-hidden />;
  }

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full" />;
}
```

### 2. MODIFICAR: `apps/web/src/features/landing/LandingHero.tsx`

**Mudanças cirúrgicas:**

1. Adicionar import: `import { NeuralConstellation } from './NeuralConstellation';`
2. REMOVER o bloco da `<img src="/images/hero/hero-students.jpg" ...>` (linhas ~28-33 do código actual) incluindo as classes `mix-blend-luminosity grayscale opacity-40`
3. INSERIR `<NeuralConstellation />` no mesmo lugar onde estava a `<img>`, dentro do `<div className="absolute inset-0 z-0 overflow-hidden">`
4. MANTER os 2 gradient overlays existentes (`bg-radial-[circle_at_center,...]` e `bg-gradient-to-b from-background...`) — eles continuam por cima do canvas para garantir legibilidade do texto
5. MANTER absolutamente tudo o resto: badge, h1, subtitle, CTAs, MicroDesafio, stats, scroll indicator, animações `motion.div`

**NÃO mexer em mais nada do ficheiro.**

## Verificação obrigatória pós-implementação

Executar e confirmar:

1. `cd /home/cj/pdc-v2 && npx tsc --noEmit -p apps/web` → sem erros
2. `cd /home/cj/pdc-v2 && npx eslint apps/web/src/features/landing/NeuralConstellation.tsx apps/web/src/features/landing/LandingHero.tsx` → sem warnings/errors
3. `grep -n "gsap" apps/web/package.json` → zero resultados
4. `grep -rn "45, 212, 191\|teal-400" apps/web/src/features/landing/NeuralConstellation.tsx` → zero resultados
5. `git diff apps/web/src/pages/LoginPage.tsx` → vazio (não modificado)
6. `git diff apps/web/src/features/auth/AuthSplitLayout.tsx` → vazio (não modificado)

## Restrições inegociáveis

- NÃO instalar GSAP nem qualquer dependência nova
- NÃO modificar `LoginPage.tsx`, `AuthSplitLayout.tsx`, `index.css`, `package.json`
- NÃO usar cor teal — usar `rgba(255, 92, 0, ...)` (Terracota)
- NÃO esquecer cleanup do `requestAnimationFrame` e listeners (memory leak)
- NÃO usar `any` em TypeScript

### Execution Plan (Status: Not Started)

[object Promise]

### Verification (Status: Not Started)