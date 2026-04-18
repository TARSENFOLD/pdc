---
id: "ed80bd1c-152e-445f-a84a-e7cdcf8df65b"
title: "W3-T3: i18n setup + extracção PT mecânica + Strapi i18n.localized opt-in"
assignee: ""
status: 0
createdAt: "2026-04-18T02:55:51.919Z"
updatedAt: "2026-04-18T02:56:07.515Z"
type: ticket
---

# W3-T3: i18n setup + extracção PT mecânica + Strapi i18n.localized opt-in

## Scope & Objective

Instalar `react-i18next` + estrutura de locales (`pt.json` + `en.json` vazio para W5) + extrair strings hardcoded de PT em ~70+ ficheiros React via codemod ou manual. Activar `pluginOptions.i18n.localized: true` em content-types Strapi críticos (`curso`, `experiencia`, `programa`, `simulacao`) sem migração destrutiva.

**In scope**: setup, extracção PT mecânica, opt-in Strapi (campos texto principais), namespace organization.
**Out of scope**: tradução EN real (W5-T3); refactor de todas as features (algumas podem ficar para W4 ou W5); UI completa de seletor de idioma (W4 ou W5).

## References

- Atlas §2.12 (i18n PT-AO base), §6.6 hotspot — atlas spec
- Approach §0 decisão A4 (i18n estrutura+Strapi W3 + EN W5+) — approach spec

## Guardrails

- Strapi i18n opt-in é FIELD-BY-FIELD; campos não-localizados continuam single-locale; zero migração de dados destrutiva.
- Strings extraídas para `pt.json` mantêm semântica idêntica (zero refactor de copy nesta wave).
- Namespace organization: `common.*`, `auth.*`, `simulacoes.*`, `feed.*`, etc.
- `i18n.locale` default = `pt-AO`; fallback = `pt`.
- BFF (`strapi.client.ts`) passa `?locale=` em queries; default `pt-AO`.

## Acceptance Criteria

- `apps/web/package.json` ganha `react-i18next`, `i18next`, `i18next-browser-languagedetector`.
- `apps/web/src/i18n/index.ts`: setup config (default `pt-AO`).
- `apps/web/src/i18n/locales/pt.json`: ≥80% das strings de UI extraídas (~500-1000 entries).
- `apps/web/src/i18n/locales/en.json`: existe mas vazio (placeholder W5-T3).
- Strapi: `curso`, `experiencia`, `programa`, `simulacao` content-types ganham `pluginOptions.i18n.localized: true` em campos texto principais (`titulo`, `descricao`, etc.).
- `apps/api/src/modules/strapi/strapi.client.ts` passa `?locale=` em queries.
- ESLint rule WARN para JSX text literal não-traduzido (preparação W3-T4 para erro).

## Verification Steps

- Trocar `i18n.locale` para `en` no console → 80% UI muda para EN (mostrando keys ausentes ou placeholders).
- Strapi admin: criar versão EN de 1 curso → BFF query com `?locale=en` retorna versão EN.
- `npm run lint -w apps/web` mostra warnings de strings não-traduzidas.
- E2E Playwright suite continua verde com locale default PT.
