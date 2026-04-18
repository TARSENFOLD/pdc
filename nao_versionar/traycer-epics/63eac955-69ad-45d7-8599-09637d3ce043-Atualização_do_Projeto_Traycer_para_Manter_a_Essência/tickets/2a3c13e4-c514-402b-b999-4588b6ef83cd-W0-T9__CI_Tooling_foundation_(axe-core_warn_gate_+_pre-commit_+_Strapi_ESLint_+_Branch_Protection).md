---
id: "2a3c13e4-c514-402b-b999-4588b6ef83cd"
title: "W0-T9: CI/Tooling foundation (axe-core warn gate + pre-commit + Strapi ESLint + Branch Protection)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:52:01.031Z"
updatedAt: "2026-04-18T02:52:17.509Z"
type: ticket
---

# W0-T9: CI/Tooling foundation (axe-core warn gate + pre-commit + Strapi ESLint + Branch Protection)

## Scope & Objective

Restaurar disciplina de CI/CD: instalar `axe-core` como warning level CI gate (vira erro em W3-T4), restaurar pre-commit hook Husky (lint + typecheck + test bail/changed), configurar ESLint para `infra/strapi/scripts/`, preparar GitHub Branch Protection bloqueando `--no-verify`.

**In scope**: configurações + npm scripts + GitHub Action workflow update.
**Out of scope**: corrigir violações axe encontradas (W3-T4); auditoria visual completa (W3-T5).

## References

- Atlas §3.5 (Constitution compliance), §6.2 (pre-commit bypassed), §6.6 (a11y §2.13) — atlas spec
- Approach §0 decisões A4 (a11y CI gate W0 warning) e E1 (pre-commit checks) — approach spec

## Guardrails

- axe-core como **warning** em W0; vira **erro** em W3-T4 (não quebrar todos os PRs agora).
- Pre-commit hook deve ser rápido (<30s wall-clock); usar `--changed` para vitest.
- Strapi ESLint config aplica-se SÓ a `scripts/**/*.ts`; auto-generated `src/` permanece sem lint (decisão atlas).
- GitHub Branch Protection ativo apenas após equipa receber comunicação (não bloquear hot-fixes em curso).

## Acceptance Criteria

- `axe-core` + `@axe-core/playwright` instalados em `apps/web/package.json`.
- `.github/workflows/ci.yml` corre axe em E2E Playwright como step opcional (warning).
- `.husky/pre-commit` reactivado: `npm run lint && npm run typecheck && npm test -- --run --bail --changed`.
- `infra/strapi/eslint.config.mjs` criado (extends raiz; aplica `strictTypeChecked` a `scripts/`).
- `infra/strapi/package.json` ganha script `"lint": "eslint scripts/"`.
- README.md ou CONTRIBUTING.md actualizado com instruções "porquê não usar `--no-verify`".
- GitHub Branch Protection rule preparada (commitar config; activar após coordenação humana — não automático).

## Verification Steps

- `npm run lint` na raiz → executa em todos os 4 workspaces (web, api, shared, strapi).
- `git commit` com `console.log` em ficheiro novo → bloqueado pelo pre-commit.
- `npm test -w apps/api -- --run --bail` → verde em <30s.
- CI no PR de teste: axe-core step existe e passa (warning level).

</TRAYCER_TICKET>
