---
id: "28a5f150-0afa-4dda-abd9-99505e109e21"
title: "W3-T2: Design primitives — Glassmorphism + BentoGrid + Padrões africanos 3%"
assignee: ""
status: 0
createdAt: "2026-04-18T02:55:37.419Z"
updatedAt: "2026-04-18T02:55:50.676Z"
type: ticket
---

# W3-T2: Design primitives — Glassmorphism + BentoGrid + Padrões africanos 3%

## Scope & Objective

Criar primitives reutilizáveis no design system: `<GlassCard>` com backdrop-blur 20px, `<BentoGrid>` genérico (auto-rows + gap), padrões geométricos africanos a 3% opacidade como SVG/CSS pattern para skeletons + dividers + watermarks. Estes 3 são consumidos por todas as páginas redesigned em W4.

**In scope**: 3 componentes primitives + integração com tokens do `index.css` existentes.
**Out of scope**: aplicar em páginas concretas (W4); micro-interações (W5-T1); wireframes detalhados (W4 tickets têm wireframes próprios).

## References

- Atlas §6.6 hotspots adicionais, §7.3 KPIs (latency 12ms / glass effect) — atlas spec
- Approach §1.1 placement, §2.2 propriedades alvo "premium visual" — approach spec
- file:apps/web/src/index.css (já tem `.glass-surface` + `.bento-grid` baselines).

## Guardrails

- Componentes seguem Radix UI patterns (acessibilidade headless).
- `prefers-reduced-motion` respeitado (zero blur em modo reduzido).
- Performance: `backdrop-filter` é caro; usar `will-change` apenas em interaction.
- Padrões africanos 3% opacity são SUTIL — não pode afectar legibilidade de conteúdo.

## Acceptance Criteria

- `apps/web/src/components/ui/GlassCard.tsx`: prop `level` (1-3, controla blur intensity), respeita `prefers-reduced-motion`.
- `apps/web/src/components/ui/BentoGrid.tsx`: prop `cols` (responsive), `rowHeight`, slots para `<BentoCell size="2x1">`.
- `apps/web/src/components/ui/AfricanPattern.tsx`: SVG pattern reutilizável com props `opacity` (default 0.03) e `variant` (samakaka, kente-inspired, geometric).
- Storybook ou playground page `apps/web/src/pages/_design-system.tsx` com exemplos dos 3 primitives.
- ≥3 testes unit (renderização sem erros + props funcionam).

## Verification Steps

- Manual: visitar `/design-system` (dev only) → mostra exemplos dos 3 primitives.
- Lighthouse performance numa página mock com 5 GlassCards: ≥80 mobile.
- `npm test -w apps/web -- GlassCard|BentoGrid|AfricanPattern` verde.
