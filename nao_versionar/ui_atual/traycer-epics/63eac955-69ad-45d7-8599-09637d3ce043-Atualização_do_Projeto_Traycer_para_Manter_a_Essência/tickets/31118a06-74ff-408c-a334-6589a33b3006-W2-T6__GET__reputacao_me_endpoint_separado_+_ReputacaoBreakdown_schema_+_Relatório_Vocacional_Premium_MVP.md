---
id: "31118a06-74ff-408c-a334-6589a33b3006"
title: "W2-T6: GET /reputacao/me endpoint separado + ReputacaoBreakdown schema + Relatório Vocacional Premium MVP"
assignee: ""
status: 0
createdAt: "2026-04-18T02:55:07.127Z"
updatedAt: "2026-04-18T02:55:23.657Z"
type: ticket
---

# W2-T6: GET /reputacao/me endpoint separado + ReputacaoBreakdown schema + Relatório Vocacional Premium MVP

## Scope & Objective

Criar endpoint dedicado `/reputacao/me` (404 quando flag off, 200 com breakdown completo das 6 dimensões quando on) + `ReputacaoBreakdown` schema no `@pdc/shared` + reescrever `RelatorioVocacional.tsx` consumindo este endpoint + heuristics do shared, com Bento Grid básico (premium polish vem em W4-T4).

**In scope**: novo route handler, schema, integração com `reputation.service`, refactor do componente RelatorioVocacional com dados reais.
**Out of scope**: design premium completo da página (W4-T4 vai polir Bento + glassmorphism); UI Reputação separada (W4-T4); migração de chamadas antigas a `getReputacao()` em outros sítios (manter ambas APIs até W5 cleanup).

## References

- Atlas §2.3 (reputação como pilar transversal), §6.4 (reputation.service estado), §7.1 (heuristics nomeados) — atlas spec
- Approach §1.3 Mapping "getReputacao retornar 0", §3.4 schema, decisão C5 — approach spec
- Ficheiros: file:apps/api/src/modules/reputation/reputation.service.ts, file:apps/api/src/routes/reputation.ts, file:apps/web/src/features/simulacoes/RelatorioVocacional.tsx

## Guardrails

- W0-T6 (reputation tests) deve manter-se verde para `getReputacao()` antigo (não deprecate ainda — coexiste).
- W2-T1 (heuristics shared) é dependência blocker.
- `getReputacao()` antigo permanece disponível para outros consumidores; só `RelatorioVocacional` é migrado nesta wave.
- Endpoint novo `/reputacao/me` aplica RBAC (auth obrigatório) + retorna 404 (não 403) quando flag off para não revelar existência da feature.
- `RelatorioVocacional.tsx` consome dados reais; zero strings hardcoded de "análise".

## Acceptance Criteria

- `packages/shared/src/reputation.ts`: `ReputacaoBreakdownSchema` (Zod) com 6 dimensões + score total + tier.
- `apps/api/src/routes/reputation.ts`: GET `/me` autenticado, 404 se flag off, 200 com breakdown.
- `apps/api/src/modules/reputation/reputation.service.ts`: novo método `getBreakdown(perfilId)` que retorna struct completo (não apenas score).
- `RelatorioVocacional.tsx` refactorizado: consome `useQuery` para `/reputacao/me` + heuristics insights; zero strings template estáticas.
- Testes: contract test schema + ≥3 unit tests handler (404 flag off, 200 flag on, breakdown completo).
- W0-T6 tests continuam verdes.

## Verification Steps

- `curl <bff>/reputacao/me -H "Cookie: ..."` com flag off → 404.
- `curl <bff>/reputacao/me -H "Cookie: ..."` com flag on → 200 + JSON 6 dimensões.
- Manual: navegar para Relatório Vocacional → mostra dados reais (variação entre personas).
- `npm test -w apps/api -- reputation` verde (todos antigos + novos).
- `npm test -w apps/web -- RelatorioVocacional` verde.
