# ADR-033 — `pulseVariacao`: manter `null` até pipeline telemetria (PROD-E)

**Data:** 2026-05-09
**Estado:** Aceite
**Classificação:** Caixa D → retroactivamente documentada (AP-07 compliance)

## Contexto

O campo `pulseVariacao` no schema `DashboardEstudante` representa a variação percentual de actividade do estudante (semana actual vs. anterior). Foi inicialmente implementado com um valor hardcoded (`12`) e depois substituído por `Math.round(lastPattern.scoreGlobal * 10)` no commit `c706dfe` como cálculo provisório.

Auditoria FIX-003 (2026-05-09) identificou que o cálculo provisório foi silenciosamente removido (commit `2f5cbb2`/`47d05ec`) sem ADR, substituído por `null` explícito — violando AP-07. Este ADR reconstrói retroactivamente a rastreabilidade da decisão.

### Problema com o cálculo provisório

`lastPattern.scoreGlobal` é um agregado do perfil comportamental do utilizador (dimensões fluidez/resiliência/foco), **não** uma métrica de actividade temporal. Usar `scoreGlobal * 10` como proxy de "variação de actividade semana-a-semana" era metodologicamente incorrecto e constituía "mentira UI" (DT-03).

## Decisão

Manter `pulseVariacao: null` em ambas as rotas BFF:
- `apps/api/src/routes/estudante.ts`
- `apps/api/src/routes/dashboard/estudante.ts`

O campo permanece no schema `DashboardEstudante` (em `packages/shared/src/core.ts`) como `number | null` para preservar o contrato de API e facilitar a implementação futura sem breaking change.

A UI do dashboard do estudante não renderiza tile de variação quando `pulseVariacao` é `null` — comportamento correcto (vazio honesto > dado falso).

## Alternativas Consideradas

| Opção | Decisão | Razão |
|-------|---------|-------|
| Manter cálculo provisório com `scoreGlobal` | Rejeitada | Metodologia errada — `scoreGlobal` não mede actividade temporal |
| Implementar cálculo real (7d vs 14d telemetria) | Deferida para PROD-E | Exige pipeline de telemetria com query temporal sobre eventos de utilizador |
| Remover campo do schema | Rejeitada | Breaking change desnecessário; campo útil quando calculado corretamente |

## Consequências

- **Positivo:** Elimina dado falso da UI. Contrato de API mantido.
- **Negativo:** Tile de variação indisponível até PROD-E (aceite conscientemente — DT-03).
- **Compromisso PROD-E:** Implementar `SELECT COUNT(*) FROM telemetry_events WHERE perfilId = ? AND ts > now() - 7d` vs. `14d`, calcular delta percentual, substituir `null` pelo valor real.

## Referências

- DT-03: `.planning/DIVIDA_TECNICA_CONHECIDA.md`
- Commit que introduziu cálculo provisório: `c706dfe` (fix P8)
- Commit que silenciou o cálculo: `2f5cbb2` / `47d05ec`
- AP-07: `AGENTS.md §4` (proibição de remoções sem ADR)
- FIX-003: epic `a1cd5bd8` / ticket `1af015c7`
