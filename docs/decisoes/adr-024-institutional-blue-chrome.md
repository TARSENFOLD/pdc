# ADR-024 — Navy/Teal Chrome no App Interno

## Status

Aceite — 2026-04-30

## Contexto

A spec `IMPORTANTE/05` ainda apresenta terracota como acento canónico para múltiplos exemplos de UI. A Constituição atual, porém, restringe amber/laranja em dashboards e componentes app. A tentativa de combinar cobalto saturado com terracota no app interno criou conflito cromático e reduziu a sensação premium.

## Decisão

O app autenticado usa navy/teal como base: navy para chrome, navegação e estados ativos; teal para CTAs e ações recorrentes. Terracota deixa de ser acento operacional e continua disponível apenas como `--brand-authority` para landing, Tina e momentos raros de autoridade interpretativa.

Tokens semânticos:

- `--chrome-surface`
- `--chrome-surface-strong`
- `--chrome-active`
- `--chrome-active-soft`
- `--chrome-border`
- `--accent-trust`
- `--accent-trust-soft`
- `--brand-authority`

## Consequências

Catálogos, navegação e estados operacionais deixam de usar terracota como cor dominante. `bg-accent` no app passa a representar teal/trust, não terracota. Landing e Tina não são alteradas por esta ADR. Novas telas internas devem usar tokens de chrome para navegação/filtros e `--accent-trust` para CTAs.
