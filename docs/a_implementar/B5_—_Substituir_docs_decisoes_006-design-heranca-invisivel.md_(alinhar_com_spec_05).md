# B5 — Substituir docs/decisoes/006-design-heranca-invisivel.md (alinhar com spec 05)

## Status

Draft · Bloqueia: nada · Coordena com C4.

## Estado actual

file:docs/decisoes/006-design-heranca-invisivel.md define tokens **errados**:

- Off-white `#F0EFE7` (Lei diz `#F8F9FA` canvas + `#FAF6EE` elevated).
- Tinta `#333333` (Lei diz `#2A2724`).
- Terracota `#C1440E` (Lei diz `#D2691E`).
- Asymmetric radii `rounded-tr-2xl rounded-bl-2xl rounded-tl-sm rounded-br-sm` (Lei diz `--radius-asym-a: 18px 6px 18px 6px`).
- Não menciona os **5 primitivos** (BentoGrid, GlassCard, AsymmetricButton, HUDPanel, AspirationalEmpty) — todos já implementados em file:apps/web/src/components/ui/.

## Estado canónico

spec:IMPORTANTE/05 §3.1–3.10 + tokens vivos em file:apps/web/src/styles/tokens.css (que já estão correctos!).

## Tickets

### B5-T1 — Marcar ADR-006 como SUPERSEDED por spec IMPORTANTE/05

Adicionar banner no topo: *"Esta ADR foi superseded pela Spec Canónica 05 — Design System Soul & Elite (*spec:IMPORTANTE/05*). Mantida para rastreabilidade histórica."*

- **DoD E2E**: dev que consulta a ADR é redirecionado para a fonte canónica.

### B5-T2 — Criar ADR-017 — Design System Soul & Elite (Aceite)

Nova ADR formal que ratifica os tokens canónicos, lista os 5 primitivos, referencia file:apps/web/src/styles/tokens.css como single source of truth no código.

- **DoD E2E**: PR de design tem ADR claramente referenciada como base.

### B5-T3 — Validar que file:apps/web/src/styles/tokens.css bate 100% com spec:IMPORTANTE/05 §3

Auditoria token-a-token. Se houver drift no código, abrir ticket de fix em `spec:E4`.

- **DoD E2E**: tokens.css é cópia literal canónica.

## Dependências

- Coordena com C4 (CONSTITUTION cita ADR-017).