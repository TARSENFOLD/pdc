# B8 — docs/seed/README.md (15 áreas + canónicos atualizados)

## Status

Draft · Depende de E1.

## Estado actual

file:docs/seed/README.md linha 38 declara **"4 Áreas Base"** (Engenharia, Saúde, Gestão, Artes/Tecnologia). Drift duplo:

- 4 áreas vs 15 canónicas (spec:IMPORTANTE/02 F10 / file:packages/shared/src/schemas/enums.ts).
- Strapi tem 10 áreas (drift triple).

Senha de teste em texto puro (linha 27): `PdcSeed2026!` — aceitável para ambiente seed-only.

## Estado canónico

- 15 áreas canónicas listadas em file:packages/shared/src/schemas/enums.ts.
- Seed gera ≥10 instituições + 30 mentores + 100 alunos + 100 behavior-patterns (mantém).
- `aluno` → `estudante` (após `spec:E1`).

## Tickets

### B8-T1 — Atualizar para 15 áreas vocacionais + Strapi sincronizado

Listar as 15 áreas, mencionar que o seed popula em todas (não só 4).

- **DoD E2E**: novo dev que corre o seed obtém dados em todas as 15 áreas.

### B8-T2 — Renomear "Alunos" → "Estudantes" e emails `estudanteN@pdc.ao`

Coordenar com E1. Manter `aluno1@pdc.ao` como alias para retro-compatibilidade dos testes existentes (1 release de transição).

- **DoD E2E**: testes Playwright continuam a passar; novos contas usam `estudante`.

### B8-T3 — Documentar arquétipos de personas

Os 4 arquétipos (`O Cirurgião`, `O Hacker Hesitante`, `O Gestor Impulsivo`, etc.) — origem em file:apps/api/src/modules/vocacional/__fixtures__/personas.ts. Como cada um afecta o cálculo φ/R esperado.

- **DoD E2E**: QA pode validar deterministicamente que o motor produz o φ esperado para `aluno1`.

### B8-T4 — Adicionar guard explícito sobre produção

Banner topo: "**SEED É BLOQUEADO EM PRODUÇÃO**. NODE_ENV=production faz fail. Apenas dev/test/staging."

- **DoD E2E**: tentar correr seed com NODE_ENV=production termina com erro claro.

## Dependências

- Depende de E1.