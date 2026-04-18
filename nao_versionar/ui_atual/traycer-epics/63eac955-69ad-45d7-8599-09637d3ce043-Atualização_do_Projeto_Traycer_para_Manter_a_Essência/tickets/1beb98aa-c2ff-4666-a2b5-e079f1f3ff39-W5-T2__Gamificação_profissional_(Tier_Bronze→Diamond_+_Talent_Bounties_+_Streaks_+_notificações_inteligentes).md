---
id: "1beb98aa-c2ff-4666-a2b5-e079f1f3ff39"
title: "W5-T2: Gamificação profissional (Tier Bronze→Diamond + Talent Bounties + Streaks + notificações inteligentes)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:58:43.092Z"
updatedAt: "2026-04-18T02:58:58.893Z"
type: ticket
---

# W5-T2: Gamificação profissional (Tier Bronze→Diamond + Talent Bounties + Streaks + notificações inteligentes)

## Scope & Objective

Implementar Tier de Validação (Bronze→Prata→Ouro→Platina→Diamante) baseado em horas de telemetria validada + qualidade dos scores. Talent Bounties (patrocinadores oferecem objetivos específicos com recompensas). Streaks de uso (dias consecutivos com atividade). Notificações inteligentes (não spam: só insight relevante).

**In scope**: schema do Tier no `@pdc/shared`, cálculo no BFF, UI badges, novo content-type Strapi `talent-bounty`, schema notificação inteligente.
**Out of scope**: gateway de pagamento para Bounties (decisão fechada — fora MVP); UI complexa de gestão de Bounties para patrocinadores (polish W6+).

## References

- Atlas §6.2 B1 mudanças produto (Tier, Bounties), §7.3 KPIs gamificação — atlas spec
- Approach §1.1 W5, conversa "gamificação = desbloqueio de oportunidades, não medalhas infantis" — approach spec

## Guardrails

- Tier baseado em métricas matemáticas (não auto-declaração); calculado pelo BFF.
- Talent Bounties: patrocinador define objectivo (ex: "90% Sim Eng Civil"); aluno desbloqueia → recompensa registada (sem fluxo financeiro real).
- Notificações inteligentes: opt-in obrigatório por categoria; default OFF (utilizador escolhe).
- Streaks: respeitar fusos horários (mercado angolano = WAT UTC+1).

## Acceptance Criteria

- `packages/shared/src/tier.ts`: `TierSchema` enum Bronze/Prata/Ouro/Platina/Diamante + `calculateTier(metrics)` puro.
- BFF `routes/reputacao.ts` retorna `tier` no breakdown.
- Strapi content-type `talent-bounty` (sponsor + objectivo + recompensa).
- `apps/api/src/routes/bounties.ts`: list public, claim quando objectivo atingido (event-driven via W2-T2).
- UI: badge tier no perfil + reputação Bento + topbar (subtil); secção Bounties no Hub Oportunidades.
- Notificações UI: configurações por categoria (achievement, bounty, vinculo, mensagem, etc.).
- Streak indicator no Dashboard (subtil).

## Verification Steps

- Persona Cirurgião (W0-T5 fixture) com 50h telemetria → Tier "Diamante".
- Persona Hesitante com 5h → Tier "Bronze".
- Criar bounty seed; aluno completa simulação atingindo objectivo → bounty aparece como "claimable" no Hub.
- Notificações: alterar settings; receber apenas categorias activas.
