---
id: "c13f776f-b9dd-427f-82d2-a67baf6843ce"
title: "W5-T1: Micro-interações em ≥80% elementos clicáveis (hover, click feedback, loading, page transitions)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:58:31.610Z"
updatedAt: "2026-04-18T02:58:42.382Z"
type: ticket
---

# W5-T1: Micro-interações em ≥80% elementos clicáveis (hover, click feedback, loading, page transitions)

## Scope & Objective

Adicionar micro-interações premium em ≥80% dos elementos clicáveis: hover states com lift subtil, click feedback (ripple ou scale), loading states (skeleton + spinner contextual), page transitions com `motion/react`. Respeitar `prefers-reduced-motion`.

**In scope**: melhorias incrementais em todos os componentes UI + páginas; Motion lib já instalada.
**Out of scope**: novos componentes (W3 já criou primitives); animações complexas 3D (Three.js fora de scope decidido).

## References

- Atlas §2.10 (identidade visual hardcoded refutado mas micro-interações ausentes), conversa "design estático = morto" — atlas spec
- Approach §1.1 W5 — approach spec

## Guardrails

- Micro-interações são SUTIL — zero distrações; objectivo é "respira" não "atende".
- `prefers-reduced-motion` → desactivar todas as animations não-essenciais.
- Performance: animations CSS preferidas a JS; Motion lib só onde necessário.
- a11y: focus-visible mantém-se; animations não substituem feedback semântico.

## Acceptance Criteria

- Botões: hover lift `translateY(-1px)` + click scale `0.98` em ≥90% dos botões.
- Cards: hover border highlight + subtle shadow em ≥80% dos cards.
- Page transitions: Motion `<AnimatePresence>` em rotas dentro de `/app/*`.
- Loading states: cada `useQuery` com `isLoading` mostra skeleton (não spinner solo).
- Lighthouse animation performance score mantém-se ≥80.
- `prefers-reduced-motion: reduce` → animations desactivadas (verificar manual).

## Verification Steps

- Manual: navegar por dashboard, simulações, perfil → todos os interactions têm feedback visual.
- DevTools simular `prefers-reduced-motion: reduce` → animations cessam.
- Lighthouse: zero CLS warnings em rotas `/app/*`.
- E2E suite continua verde.
