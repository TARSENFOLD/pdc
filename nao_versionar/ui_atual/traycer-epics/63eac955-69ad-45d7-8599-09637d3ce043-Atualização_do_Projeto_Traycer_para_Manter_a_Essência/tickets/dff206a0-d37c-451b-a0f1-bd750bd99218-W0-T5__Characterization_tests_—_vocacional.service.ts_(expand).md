---
id: "dff206a0-d37c-451b-a0f1-bd750bd99218"
title: "W0-T5: Characterization tests — vocacional.service.ts (expand)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:51:27.453Z"
updatedAt: "2026-04-18T02:51:36.074Z"
type: ticket
---

# W0-T5: Characterization tests — vocacional.service.ts (expand)

## Scope & Objective

Expandir `apps/api/src/modules/vocacional/vocacional.service.spec.ts` (que já existe com 1 teste) para cobrir as 100 personas que serão criadas no Seed Narrativo (W1-T5). Snapshot do algoritmo actual antes de o Relatório Premium (W2-T6) consumi-lo.

**In scope**: ≥10 personas representativas (3 perfis-arquétipo: O Cirurgião, O Hacker Hesitante, O Gestor Impulsivo + variações por área).
**Out of scope**: criar as 100 personas (W1-T5); alterar algoritmo (W2).

## References

- Atlas §6.4 (vocacional.service estado: 1 spec), §6.5 (Q2 item 3) — atlas spec
- Approach §5.2 W0-T3 — approach spec
- Ficheiros: file:apps/api/src/modules/vocacional/vocacional.service.ts, file:apps/api/src/modules/vocacional/vocacional.service.spec.ts

## Guardrails

- Personas usadas nos testes devem ser fixtures reutilizáveis (também consumidas por W1-T5 seed).
- Output esperado para cada persona é capturado snapshot (`expect(result).toMatchSnapshot()` ou explícito).

## Acceptance Criteria

- ≥10 fixtures de persona (Cirurgião, Hacker Hesitante, Gestor Impulsivo + 7 mais cobrindo 4 áreas).
- ≥1 teste por persona-arquétipo gerando perfil completo.
- Fixtures exportadas em `apps/api/src/modules/vocacional/__fixtures__/personas.ts` para reuso.
- `npm test -w apps/api -- vocacional` verde.

## Verification Steps

- `npm test -w apps/api -- --run vocacional` → verde.
- Coverage: `vocacional.service.ts` ≥85% lines.
- Manual: humano lê 3 snapshots e confirma que os perfis "fazem sentido" para o arquétipo.
