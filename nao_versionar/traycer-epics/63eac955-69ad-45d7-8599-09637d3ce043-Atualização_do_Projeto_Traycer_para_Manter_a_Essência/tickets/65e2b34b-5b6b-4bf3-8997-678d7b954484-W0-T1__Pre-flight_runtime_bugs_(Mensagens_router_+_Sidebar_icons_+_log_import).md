---
id: "65e2b34b-5b6b-4bf3-8997-678d7b954484"
title: "W0-T1: Pre-flight runtime bugs (Mensagens router + Sidebar icons + log import)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:50:19.085Z"
updatedAt: "2026-04-18T02:50:35.321Z"
type: ticket
---

# W0-T1: Pre-flight runtime bugs (Mensagens router + Sidebar icons + log import)

## Scope & Objective

Corrigir 3 bugs de runtime que estão a corromper o estado actual do código antes de qualquer refactor substantivo: `MensagensPage` comentada no router, ícones `Brain`+`Zap` em falta no `Sidebar.tsx`, `log` sem import em `routes/simulacoes.ts`.

**In scope**: 3 fixes mecânicos (uncomment + 2 imports + 1 import).
**Out of scope**: build da nova `MensagensPage` (W4-T1), refactor da Sidebar (W4-T3), event-driven LTI (W2-T3).

## References

- Atlas spec §6.2 F1 (Mensagens fachada), §6.2 F2 (Sidebar ReferenceError), §6.2 F3 (LTI runtime crash) — spec:63eac955-69ad-45d7-8599-09637d3ce043/3e8a4789-7b06-404b-93c7-fc9e91c37167
- Approach spec §1.2 Order — spec:63eac955-69ad-45d7-8599-09637d3ce043/2856bafe-6fa6-4f8f-9d1a-80c50a1c739c
- Ficheiros: file:apps/web/src/router.tsx (L59), file:apps/web/src/components/layout/Sidebar.tsx (L74, L84, imports L7-13), file:apps/api/src/routes/simulacoes.ts (L135)

## Guardrails

- Auth flow intacto (Approach §4.1 invariant).
- `MensagensPage` apenas descomentar; comportamento da rota `/app/mensagens` passa de catch-all 404 a página real (mesmo que mínima por agora).
- Nenhuma alteração comportamental ao `routes/simulacoes.ts` além do import.

## Acceptance Criteria

- `npm run typecheck` verde sem novos erros.
- Rota `/app/mensagens` deixa de cair em `NotFoundPage` no smoke test.
- `Sidebar` renderiza hubs `Meu Futuro` e `Comunidade` sem `ReferenceError` no DevTools console.
- Branch `metadata.ltiContext` em `routes/simulacoes.ts` PUT `/tentativas/:id` não crasha em runtime (mesmo que fluxo end-to-end LTI ainda falhe — handler propriamente dito é W2-T3).

## Verification Steps

- Local dev: `npm run dev -w apps/web` + abrir `/app/mensagens` (logged in) → renderiza algo (mesmo que `MensagensPage` seja uma stub temporária).
- Local dev: expandir hub `Meu Futuro` na Sidebar → ícone `Brain` aparece sem erro de console.
- Manual: criar tentativa simulação com `metadata.ltiContext` mock → BFF retorna 200 (mesmo sem score real ser enviado para LMS).
- `npm run lint` verde nos 3 ficheiros tocados.
