---
id: "49b3ef93-f03f-4178-8b65-1924bc09f49d"
title: "R0-1 — Baseline: lint/typecheck/test/e2e a11y + relatório"
assignee: ""
status: 1
createdAt: "2026-04-19T09:16:20.144Z"
updatedAt: "2026-04-19T18:30:00.000Z"
type: ticket
---

# R0-1 — Baseline: lint/typecheck/test/e2e a11y + relatório

### Scope & Objective

Capturar o estado de saúde actual do monorepo **antes de qualquer modificação**, registando todos os reds existentes num relatório versionado fora do git (`nao_versionar/`). Este ticket é puro read/observabilidade — zero alterações de código de produção.

**In scope:**

- Correr `npm run lint --workspaces`, `npm run typecheck --workspaces`, `npm test --workspaces -- --run`, `npm run test:e2e` e `npm run test:e2e:a11y` (este último referenciado em D4 da Approach §1.1)
- Capturar stdout/stderr e exit codes
- Produzir o ficheiro `nao_versionar/audit-reports/baseline-2026-04.md` com tabela `comando | duração | exit | reds`
- Categorizar cada red como `pre-existing-debt` ou `regressão deste ciclo` (todos serão `pre-existing-debt` neste primeiro run)

**Out of scope:**

- Corrigir qualquer red — fica registado como debt
- Alterar configuração de testes ou linters

### References

- Approach §5.1 Baseline (D4) — spec:866df58c-39bf-4ecf-a16c-a107085047dd/fcd9896a-c609-480a-8985-81ac4c4cf6fd
- Analysis §3.3 Run check (proposta) — spec:866df58c-39bf-4ecf-a16c-a107085047dd/9e1df3cf-7cd8-4bf5-80d1-86bc9b4d00aa
- file:.planning/CONSTITUTION.md — contexto dos checks que devem passar

### Guardrails

- **Não corrigir** nenhum red descoberto neste ticket — comparações futuras são contra este baseline (Approach §5.1)
- Ficheiro de relatório vai em `nao_versionar/` (já existe esta pasta no repo conforme file:.gitignore)
- Se algum comando demorar > 15 min ou pendurar, abortar e registar como `timeout` — não esperar indefinidamente

### Acceptance Criteria

- `nao_versionar/audit-reports/baseline-2026-04.md` existe com:
  - SHA do commit base (`1982ead`) + branch (`epic/w1-infrastructure`)
  - Resultado de cada um dos 5 comandos (lint, typecheck, vitest, e2e, e2e a11y)
  - Lista de reds com classificação `pre-existing-debt`
  - Cobertura agregada actual (% lines) por workspace, se a tooling produzir
- Relatório commitado em `nao_versionar/` (não vai para git remoto, mas fica no working tree)

### Verification Steps

- `cat nao_versionar/audit-reports/baseline-2026-04.md` mostra os 5 blocos preenchidos
- Re-correr 1 dos comandos manualmente reproduz o resultado registado (sanity check)
- Sem mudanças em `apps/`, `packages/`, `infra/` (apenas `nao_versionar/`)
