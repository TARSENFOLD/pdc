---
id: "ec656e85-b861-4894-90eb-c1fd93978fea"
title: "W3-T1: Token audit + purga hardcoded colors (27 ui components + outros)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:55:24.418Z"
updatedAt: "2026-04-18T02:55:36.653Z"
type: ticket
---

# W3-T1: Token audit + purga hardcoded colors (27 ui components + outros)

## Scope & Objective

Auditoria sistemática de cores hardcoded (`text-slate-*`, `bg-blue-*`, `bg-emerald-*`, `text-orange-500`, etc.) em `apps/web/src/` e substituição por tokens semânticos do `index.css`. Foco crítico: `RelatorioVocacional.tsx` + 27 componentes em `components/ui/` + features.

**In scope**: substituição mecânica + criação de regra ESLint custom para bloquear hardcoded colors em PRs futuros.
**Out of scope**: novo design system primitives (W3-T2); wireframes (W4); visual regression baseline (W3-T5).

## References

- Atlas §2.10 (identidade visual hardcoded), §6.4 (componentes UI auditar) — atlas spec
- Approach §1.6 hotspot mitigation, §2.2 propriedades alvo — approach spec

## Guardrails

- Tokens já existem em `apps/web/src/index.css` (`--accent`, `--text-primary`, etc.); reutilizar, não criar novos.
- Tema CLARO permanece BASE (decisão fechada); dark mode acessível via `.dark` class.
- ESLint rule é WARNING level inicialmente; vira ERROR em W3-T4.
- Substituições preservam cor visual (Tailwind `text-slate-900` ≈ `text-text-primary` no tema claro).

## Acceptance Criteria

- Grep `text-slate-|bg-blue-|bg-emerald-|text-orange-` em `apps/web/src/` retorna ≤5 ocorrências (com `eslint-disable` justificada para casos legítimos como visualização técnica).
- `RelatorioVocacional.tsx` usa apenas tokens semânticos.
- Os 27 ficheiros em `apps/web/src/components/ui/` usam apenas tokens.
- ESLint rule custom (`apps/web/.eslintrc-tokens.cjs` ou plugin) detecta `text-slate-*` etc. como WARN.
- `npm run lint -w apps/web` verde (warnings aceitos para esta wave; viram errors em W3-T4).

## Verification Steps

- `git grep -E "text-(slate|blue|emerald)-[0-9]" apps/web/src/` ≤ 5 ocorrências.
- Manual: tema claro → todos os componentes mantêm visual coerente; tema escuro → idem.
- `npm run lint -w apps/web` mostra warnings nos casos restantes (não erros ainda).
