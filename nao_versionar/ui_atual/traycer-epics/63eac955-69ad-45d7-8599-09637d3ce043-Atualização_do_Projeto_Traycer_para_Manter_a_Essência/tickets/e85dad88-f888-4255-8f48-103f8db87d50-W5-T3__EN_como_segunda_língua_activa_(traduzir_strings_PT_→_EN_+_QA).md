---
id: "e85dad88-f888-4255-8f48-103f8db87d50"
title: "W5-T3: EN como segunda língua activa (traduzir strings PT → EN + QA)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:58:59.297Z"
updatedAt: "2026-04-18T02:59:09.659Z"
type: ticket
---

# W5-T3: EN como segunda língua activa (traduzir strings PT → EN + QA)

## Scope & Objective

Activar EN como segunda língua: traduzir `apps/web/src/i18n/locales/pt.json` para `en.json` (via tradução AI/humana híbrida com QA), criar versão EN do conteúdo Strapi essencial (≥10 cursos/experiências/programas chave), validar `?locale=en` end-to-end.

**In scope**: tradução strings UI + 10 entries Strapi crítico + seletor de idioma UI + persistência preference por utilizador.
**Out of scope**: tradução completa do Strapi (incremental pós-W5); outras línguas além de EN (W6+).

## References

- Atlas §2.12 (EN secundário) — atlas spec
- Approach §0 decisão A4 — approach spec

## Guardrails

- W3-T3 (i18n setup) é dependência blocker.
- QA cultural: revisão por nativo EN para evitar traduções literais embaraçosas.
- Strapi entries traduzidos preservam relação com original PT (i18n nativo Strapi).
- Selector de idioma persiste em cookie + Strapi `perfil.preferred_locale`.

## Acceptance Criteria

- `en.json` com ≥95% das chaves de `pt.json` traduzidas.
- ≥10 entries Strapi (curso/experiencia/programa) com versão EN.
- UI: selector de idioma no avatar dropdown ou Settings.
- Cookie + Strapi persistem preferência.
- Smoke: navegar todo o app em EN → zero strings em PT visíveis.
- E2E `tests/e2e/i18n/en-locale.spec.ts` (NOVO).

## Verification Steps

- Trocar idioma → toda a UI muda imediatamente.
- Refresh → preferência mantém-se.
- Strapi admin: criar versão EN de um curso → frontend EN mostra título EN.
- E2E `en-locale.spec.ts` verde.
