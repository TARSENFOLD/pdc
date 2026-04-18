---
id: "58dfdf83-63d3-45c2-a51c-b9965e236ebe"
title: "W2-T3: LTI Grade Passback + Conquistas como event subscribers"
assignee: ""
status: 0
createdAt: "2026-04-18T02:54:18.607Z"
updatedAt: "2026-04-18T02:54:35.886Z"
type: ticket
---

# W2-T3: LTI Grade Passback + Conquistas como event subscribers

## Scope & Objective

Refactor de duas integrações inline para subscribers do event bus W2-T2: LTI handler subscreve `tentativa.concluida` e dispara `ltiAgs.sendScore()` se contexto LTI presente; Conquistas engine subscreve eventos relevantes e dispara auto-trigger. Remover gate inline em `routes/simulacoes.ts` L125-137.

**In scope**: criar `lti.handler.ts` + adaptar `conquistas.engine.ts` para subscriber + adicionar campo `lti_context` JSONB ao Strapi `perfil` + remover gate inline.
**Out of scope**: refactor de outras integrações (notificações etc. — futuro); Anti-cheat sanity dentro de eventos (W2-T1 já fez no consumer).

## References

- Atlas §6.2 F3 (bug LTI runtime), §6.4 (lti.ags + conquistas.engine) — atlas spec
- Approach §1.4 DomainEvent, §3.3 telemetria flow event-driven, decisão C3 — approach spec

## Guardrails

- W0-T8 (lti.ags) e W0-T7 (conquistas.engine) characterization tests CONTINUAM VERDES.
- Idempotência: cada handler verifica em Redis (`SADD lti_score_sent:<tentativaId>`) antes de chamar API externa; mesmo evento processado 2x não envia score 2x.
- `routes/simulacoes.ts` PUT `/tentativas/:id` apenas publica evento; zero lógica LTI inline.
- Falha do handler LTI (LMS down) NÃO bloqueia tentativa de conclusão; outbox replay encarrega-se.

## Acceptance Criteria

- `apps/api/src/modules/lti/lti.handler.ts`: `subscribe('tentativa.concluida', ltiHandler)`; verifica `perfil.lti_context`; chama `ltiAgs.sendScore` com idempotência.
- `apps/api/src/modules/conquistas/conquistas.handler.ts`: `subscribe('tentativa.concluida', conquistasHandler)` (e outros eventos); chama `conquistas.engine` com flag check + idempotência.
- Strapi `perfil` content-type ganha campo `lti_context` JSONB opcional.
- `apps/api/src/index.ts` regista handlers no boot (após init do event bus).
- `routes/simulacoes.ts` PUT `/tentativas/:id` simplificado: persiste tentativa + publica `tentativa.concluida` event; zero código LTI/conquistas inline.
- W0-T7 e W0-T8 characterization tests continuam verdes.
- Novo teste integração: publish `tentativa.concluida` → ambos handlers disparam (verificar via spy).

## Verification Steps

- `npm test -w apps/api -- lti.handler` verde.
- `npm test -w apps/api -- conquistas.handler` verde.
- E2E: completar simulação Tipo 2 com `lti_context` no perfil → curl LMS endpoint mostra score recebido.
- E2E: completar simulação que desbloqueia conquista → `/conquistas/me` mostra nova conquista.
- Stress: completar mesma tentativa 5x → score LMS enviado 1x; conquista desbloqueada 1x.
