---
id: "48629559-88a7-492f-b941-9c60dcd33abd"
title: "R1-1 — Reclassificar parciais: W1-T3 review-only, W4-T1/T2 estacionados"
assignee: ""
status: 1
createdAt: "2026-04-19T09:17:31.810Z"
updatedAt: "2026-04-19T19:15:00.000Z"
type: ticket
---

# R1-1 — Reclassificar parciais: W1-T3 review-only, W4-T1/T2 estacionados

### Scope & Objective

Actualização **puramente documental** que reclassifica os 4 tickets parciais identificados na Analysis: W1-T3 passa a Done/review-only (BootstrapProvider já existe e está montado); W2-T3 fica com sub-tickets concretos R2.T3a/b; W4-T1 e W4-T2 ficam **explicitamente estacionados** até W3 (têm dependência de design system + i18n + a11y endurece).

**In scope:**

- file:.planning/STATE.md: secção de tickets parciais reflecte a nova matriz
- file:.planning/roadmap.md: W1-T3 = `✅` (review-only), W4-T1/T2 = `⏸ parked → W3 dependency`
- Documentar em `nao_versionar/audit-reports/audit-2026-04.md` a justificação de cada reclassificação (referência ao gap específico)

**Out of scope:**

- Qualquer código novo (D7 da Approach: provider actual em file:apps/web/src/lib/bootstrap/BootstrapContext.tsx é canónico — não recriar)
- Marcar W2-T3 como Done (só será marcado após R3-1)
- Criar novos tickets para W4-T1/T2 (próximo ciclo)

### References

- Approach §1.1 (R1 row) e §0 D7 — spec:866df58c-39bf-4ecf-a16c-a107085047dd/fcd9896a-c609-480a-8985-81ac4c4cf6fd
- Analysis §4.1 (B1 W1-T3 review-only, B3 W4-T1, B4 W4-T2) — spec:866df58c-39bf-4ecf-a16c-a107085047dd/9e1df3cf-7cd8-4bf5-80d1-86bc9b4d00aa

### Guardrails

- **Não tocar** file:apps/web/src/lib/bootstrap/BootstrapContext.tsx nem file:apps/web/src/main.tsx (Invariant Approach §4 — Bootstrap intacto)
- Não criar pasta `apps/web/src/lib/bootstrap.tsx` paralela (evitar duplicação que a Approach §1.1 explicitamente proíbe)
- Reclassificação tem de citar evidência concreta (linha de código, ficheiro existente)

### Acceptance Criteria

- file:.planning/STATE.md mostra W1-T3 como Done com nota "review-only — provider existente"
- file:.planning/roadmap.md mostra W4-T1/T2 com símbolo `⏸` + razão "depende de W3 (design system + i18n + a11y endurece)"
- Audit report justifica cada reclassificação com referência a ficheiro/linha
- Zero `git diff` em `apps/`, `packages/`, `infra/`

### Verification Steps

- `grep -A2 "W1-T3" .planning/roadmap.md` mostra status Done + razão
- `grep "W4-T1\|W4-T2" .planning/roadmap.md` mostra `⏸`
- `git diff apps/ packages/ infra/` vazio
