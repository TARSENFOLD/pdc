---
id: "4daffe84-4e34-4c56-bda6-383467fd9062"
title: "W3-T5: Visual regression baseline + lint rules de design system"
assignee: ""
status: 0
createdAt: "2026-04-18T02:56:23.316Z"
updatedAt: "2026-04-18T02:56:35.329Z"
type: ticket
---

# W3-T5: Visual regression baseline + lint rules de design system

## Scope & Objective

Estabelecer baseline visual regression (Percy ou Chromatic — decisão técnica nesta ticket) com snapshots das ~10 páginas chave em modo light + dark + mobile + desktop. Criar lint rules adicionais (no undefined JSX components, no inline-style if not data-viz, etc.) para evitar regressões no design system.

**In scope**: tool selection + setup + baseline snapshots + lint rules custom.
**Out of scope**: redesign de páginas (W4); micro-interações (W5).

## References

- Atlas §3 test coverage (lacuna visual regression), §6.6 — atlas spec
- Approach §5.2 W3 visual regression baseline — approach spec

## Guardrails

- Tool selection: Percy é hosted (custo); Chromatic é Storybook-friendly mas menos flexível para Vite. Decisão técnica documentada em ADR-006 (NOVO neste ticket).
- Baseline tirada APÓS W3-T1+T2+T4 (estado limpo); zero hardcoded; tokens consistentes; a11y verde.
- Lint custom rules NÃO bloqueiam hot-fixes; warning level inicial; promovem para error em revisão.

## Acceptance Criteria

- ADR-006 criado em `docs/decisoes/adr-006-visual-regression.md` documentando tool escolhido + razão.
- Tool integrado em `.github/workflows/ci.yml` (corre em PR).
- Snapshots baseline para ≥10 páginas chave: landing, login, dashboard (aluno), simulações lista, simulação player Tipo 1+2+3, relatório vocacional, perfil, configurações, feed, mensagens — em light + dark + mobile + desktop.
- Lint rule "no undefined JSX components" activa (previne futuros bugs como Sidebar Brain/Zap).
- README.md actualizado com como rodar visual regression localmente.

## Verification Steps

- PR com mudança visual deliberada → CI flagsa diff visual.
- PR com mudança não-visual → CI passa sem flag.
- `npm run lint` com componente JSX inexistente → erro lint.
