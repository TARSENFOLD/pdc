---
id: "dd0beb22-576d-4b87-8b45-ffd56bb1176c"
title: "W2-T5: Sim Tipo 3 player (criar Tipo3Player.tsx + telemetria nativa + scoring)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:54:52.418Z"
updatedAt: "2026-04-18T02:55:06.362Z"
type: ticket
---

# W2-T5: Sim Tipo 3 player (criar Tipo3Player.tsx + telemetria nativa + scoring)

## Scope & Objective

Implementar `Tipo3Player.tsx` substituindo o placeholder `<Wrench>` em `SimulacaoPlayerPage.tsx`. Player real para "ambiente interativo com feedback em tempo real" (REQ-4-003 prioridade Alta). Telemetria nativa (não delegada a iframe externo) + scoring via heuristics shared.

**In scope**: novo componente, telemetria, scoring via `analyzeFluidity` + `analyzeResilience`, integração com `simulacao.controller`.
**Out of scope**: design premium "Cockpit de Telemetria" cinematográfico (refinamento W4 ou W5); conteúdo concreto das simulações Tipo 3 (decidido por produto/Comité Científico, não engenharia).

## References

- Atlas §2.6 (Tipo 3 placeholder), §6.1 correção placeholder confirmado — atlas spec
- Approach §1.3 Mapping & Gaps "Tipo 3 placeholder" — approach spec
- Ficheiro: file:apps/web/src/features/simulacoes/SimulacaoPlayerPage.tsx, file:apps/web/src/features/simulacoes/

## Guardrails

- W2-T1 (heuristics shared) é dependência.
- Tipo 3 deve ter pelo menos 1 simulação fixture criada no seed (W1-T5) para destravar testes E2E.
- Score range 0-10 (consistente com Tipos 1 e 2).
- `SimulacaoPlayerPage.tsx` L45-54 (fallback `<Wrench>`) removido completamente.

## Acceptance Criteria

- `apps/web/src/features/simulacoes/Tipo3Player.tsx` criado.
- `SimulacaoPlayerPage.tsx`: `simulacao.tipo === 3` → renderiza `<Tipo3Player>`; remover fallback Wrench.
- Telemetria: ≥3 eventos canónicos novos no `TelemetryEventNameSchema` (`simulacao.tipo3.iniciada`, `simulacao.tipo3.acao`, `simulacao.tipo3.concluida`).
- Scoring: `routes/simulacoes.ts` calcula via heuristics shared (mesma pipeline Tipo 2).
- Seed: ≥1 simulação fixture Tipo 3 em W1-T5 (coordenar update se necessário).
- E2E Playwright `tests/e2e/simulacoes/tipo3.spec.ts` (NOVO): smoke completar simulação Tipo 3.

## Verification Steps

- E2E `tipo3.spec.ts` verde.
- Manual: navegar para simulação Tipo 3 → player real renderiza (não Wrench).
- SQL: `SELECT COUNT(*) FROM tentativa WHERE simulacao.tipo = 3` ≥ 1 após seed.
- `npm test -w apps/api -- simulacoes` verde.
