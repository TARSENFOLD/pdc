# B7 — docs/vocacional/modelo.md (fix link partido + canonical sources)

## Status

Draft · Coordena com B8.

## Estado actual

file:docs/vocacional/modelo.md linha 5 aponta para `../../.planning/1a81656f-712a-4767-9de9-b0b34113f791-PDC_—_Modelo_de_Telemetria_e_Perfil_Vocacional.md` que **não existe** (link partido).

Conteúdo descreve:

- 4 dimensões W1 (Aptidão Técnica 40%, Compat Psico 20%, Motivação 20%, Potencial 20%) — bate com file:infra/strapi/src/api/perfil-vocacional/content-types/perfil-vocacional/schema.json.
- 4 áreas vocacionais — drift com 15 áreas canónicas (`spec:E1`).
- Heurísticas W2 (φ, R, Foco, Decision Speed) — bate com file:packages/shared/src/heuristics.ts parcialmente (Decision Speed não existe; Hesitação sim).

## Estado canónico

Fontes vivas:

- file:packages/shared/src/heuristics.ts (interpretação)
- file:packages/shared/src/heuristics-calculator.ts (cálculo)
- file:apps/api/src/modules/vocacional/vocacional.service.ts (orquestração)
- spec:IMPORTANTE/01 §3 (4 dimensões φ, R, Foco, Hesitação)
- spec:IMPORTANTE/02 N1, N5, N6, N7

## Tickets

### B7-T1 — Remover link partido + apontar para fontes vivas

Substituir referência ao GUID por links para file:packages/shared/src/heuristics.ts + spec:IMPORTANTE/01 §3.

- **DoD E2E**: zero links 404 no doc.

### B7-T2 — Sincronizar lista de heurísticas com código

Trocar "Decision Speed" por "Hesitação" (nome canónico). Acrescentar parâmetros usados (intervalos, baselines).

- **DoD E2E**: nomes no doc batem 1:1 com símbolos exportados em `heuristics.ts`.

### B7-T3 — Atualizar 4 áreas para 15 áreas

Coordenar com `spec:E1`. Mostrar a lista canónica com motivação semântica.

- **DoD E2E**: doc reflete 15 áreas após E1 aceite.

### B7-T4 — Documentar 4 tiers do Perfil Vocacional + serialização privada

Tiers (Bronze/Prata/Ouro/Diamante), regras, RBAC para visibilidade (spec:IMPORTANTE/03 §6).

- **DoD E2E**: dev percebe que perfil vocacional NUNCA aparece em endpoints públicos.

## Dependências

- Depende de E1.