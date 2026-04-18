---
id: "6c70a84b-e5c0-49e6-b9e5-84bac3cbbd35"
title: "W3-T4: a11y endurece (axe gate ERROR + contrast AA/AAA + touch targets ≥44px + focus visible)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:56:08.649Z"
updatedAt: "2026-04-18T02:56:23.312Z"
type: ticket
---

# W3-T4: a11y endurece (axe gate ERROR + contrast AA/AAA + touch targets ≥44px + focus visible)

## Scope & Objective

Subir axe-core de WARNING (W0-T9) para ERROR no CI gate. Corrigir violações encontradas: contrast pairs (Antracite+Terracota é fronteiriço AA/AAA), touch targets <44px, focus rings invisíveis ou ausentes. Promover ESLint custom rule de tokens hardcoded (W3-T1) de WARN para ERROR.

**In scope**: fixes a11y críticos descobertos pelo axe + endurecer CI gates.
**Out of scope**: full audit manual (W5-T4); EN translation (W5-T3); novos componentes (W4 tem os seus).

## References

- Atlas §2.13 (a11y prereq App Store + B2B), §6.6 hotspot, §3.5 (REQ-NF-005 estado [ ]) — atlas spec
- Approach §0 decisão A4 — approach spec

## Guardrails

- Não alterar layout/visual além do mínimo necessário para a11y (visual regression W3-T5 confirma).
- Componentes Radix UI já são acessíveis; foco está em wrappers custom + estilos.
- `focus-visible` (não `focus`) para evitar focus rings em mouse clicks.
- Testar em modo light E dark; ambos devem passar AA mínimo.

## Acceptance Criteria

- axe-core CI gate é ERROR para violações `serious` e `critical`; warning para `moderate` e `minor`.
- `REQ-NF-005` em `REQUIREMENTS.md` move de `[ ]` para `[~]` ou `[x]`.
- ≥95% touch targets ≥44px no mobile breakpoint (audit via axe + manual).
- Pares de contrast críticos passam WCAG AA (≥4.5:1 para text normal; ≥3:1 para large text); AAA onde possível.
- ESLint custom rule de tokens (W3-T1) move para ERROR; CI falha PRs com violations.
- E2E Playwright + `@axe-core/playwright`: zero erros críticos em ≥10 páginas chave.

## Verification Steps

- `npm run test:e2e:a11y` (script novo) executa axe em todas as páginas E2E → zero erros críticos.
- Manual: tab-navigation por todo o app sem mouse → focus sempre visível.
- Lighthouse a11y score ≥95 em landing + dashboard.
- `npm run lint` falha em PR com `text-slate-900` hardcoded.

</TRAYCER_TICKET>
