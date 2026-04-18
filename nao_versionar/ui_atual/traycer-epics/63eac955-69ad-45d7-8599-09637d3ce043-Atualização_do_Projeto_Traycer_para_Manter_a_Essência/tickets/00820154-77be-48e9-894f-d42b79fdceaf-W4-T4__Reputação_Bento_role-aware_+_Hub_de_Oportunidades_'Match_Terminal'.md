---
id: "00820154-77be-48e9-894f-d42b79fdceaf"
title: "W4-T4: Reputação Bento role-aware + Hub de Oportunidades 'Match Terminal'"
assignee: ""
status: 0
createdAt: "2026-04-18T02:58:03.623Z"
updatedAt: "2026-04-18T02:58:16.762Z"
type: ticket
---

# W4-T4: Reputação Bento role-aware + Hub de Oportunidades 'Match Terminal'

## Scope & Objective

Página Reputação premium: Bento Grid com 6 dimensões + role-aware (Mentor vê "Índice de Sucesso de Alunos"; Aluno vê "Resiliência Comprovada"; Escola vê "Vitalidade Académica"). Hub de Oportunidades novo "Match Terminal": cards de proposta com % match + funnel pipeline (Sugestões IA → Recebidas → Em Análise → Firmados) + "Why Match?" explicável.

**In scope**: 2 páginas premium novas/refeitas consumindo APIs existentes + W2-T6 endpoint.
**Out of scope**: criar novos endpoints BFF (Reputação `/reputacao/me` já em W2-T6; Vínculos/Propostas BFF existem); Talent Bounties (W5-T2).

## References

- Atlas §2.3 (reputação pilar), §6.6 hotspots — atlas spec
- Approach §1.1 W4, decisão (Reputação Bento role-aware) — approach spec

## Guardrails

- W2-T6 endpoint `/reputacao/me` é dependência blocker.
- W3-T2 BentoGrid + GlassCard são dependências.
- W3-T3 i18n + W3-T4 a11y são dependências.
- Reputação para outras roles consume endpoint similar (`/reputacao/:perfilId`) com RBAC apropriado (mentor pode ver alunos vinculados etc.).
- "Why Match?" usa heuristics insights (W2-T1) para explicar percentagem.

## Acceptance Criteria

- `apps/web/src/features/reputacao/ReputacaoBentoPage.tsx` (substitui `ReputacaoPage` actual): Bento com 6 dimensões + role-aware variant.
- `apps/web/src/features/oportunidades/HubMatchTerminal.tsx` (NOVO): cards proposta + pipeline 4 colunas + modal "Why Match?".
- Rota `/app/oportunidades` adicionada; Sidebar Hub Comunidade ganha link (ou novo hub).
- E2E `tests/e2e/reputacao/bento.spec.ts` + `oportunidades/match-terminal.spec.ts`.
- Wireframe documentado.

## Verification Steps

- Login como aluno → reputação Bento mostra "Resiliência Comprovada" como hero.
- Login como mentor → reputação Bento mostra "Índice de Sucesso de Alunos".
- Hub Oportunidades: ≥3 cards proposta (do seed); clicar "Why Match?" abre modal com breakdown.
- E2E suite verde.
