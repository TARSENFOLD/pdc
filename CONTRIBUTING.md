# Guia de Contribuição

Para garantir a integridade do **PDC v2**, seguimos padrões rigorosos de engenharia.

## Fluxo de Trabalho (GSD)

Operamos no modelo **Research -> Strategy -> Execution**.

## Pre-commit Checks

O projeto utiliza **Husky** para garantir que cada commit cumpre os requisitos mínimos de qualidade. Ao realizar um `git commit`, os seguintes comandos são executados:

1. `npm run lint` — Garante conformidade com o guia de estilo.
2. `npm run typecheck` — Valida a integridade dos contratos de tipos.
3. `npm test -- --changed` — Executa apenas os testes relacionados aos ficheiros alterados.

### Por que NÃO usar `--no-verify`?

O uso da flag `--no-verify` para saltar os checks de pre-commit é **fortemente desencorajado**. 
O PDC v2 depende de tipagem estrita e SSOT (Single Source of Truth) no monorepo. Ignorar os checks pode introduzir quebras de contrato silenciosas que só serão detectadas no CI, atrasando o pipeline de desenvolvimento e comprometendo a integridade do sistema.

Se os checks falharem, corrija os erros antes de commitar. A estabilidade da `develop` e `main` é sagrada.

## Acessibilidade (A11y)

Utilizamos `axe-core` para auditorias automatizadas. Erros de acessibilidade são reportados como avisos no CI (Wave 0) e serão endurecidos para erros fatais na Wave 3.

## Padrões Visuais & Design

Antes de tocar qualquer componente visual, ler:
- `apps/web/DESIGN.md` — fonte canónica de design (tokens, primitivos, padrões)
- `apps/web/DESIGN.md § 10` — padrões estabelecidos em 2026-05-03 (NeuralConstellation dual, glow policy, `--card-border`, `neuralState` auth pattern, copy sem jargão)
- ADR-025 e ADR-026 em `docs/decisoes/`

**Regras rápidas:**
- ❌ `ctx.shadowBlur = currentSize * N` — multiplicador de tamanho é banido
- ❌ `borderColor: '#000000'` hardcoded — usar `var(--card-border)`
- ❌ Jargão técnico em copy visível ("Oráculo", "heurísticas")
- ❌ Emojis em badges/pills de produto

## Protecção de Ramos

Consulte [.github/branch-protection.md](.github/branch-protection.md) para detalhes sobre as regras de merge e aprovação.
