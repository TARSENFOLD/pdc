# C5 — Arquivar/Atualizar specs/001-refactoring-spec-consolidation

## Status

Draft · Coordena com A1, C3.

## Estado actual

file:specs/001-refactoring-spec-consolidation/spec.md:

- Linha 195/197: refere "≤200 linhas" (Rule of 200) — drift com Rule of 300 canónica.
- Modelo "Fase 0–7" (linhas 89–98) — drift com Waves W0–W5/W6.
- Tickets T1–T12 todos ✅ (informação histórica útil).
- Aceitação refere fluxos que continuam relevantes.

## Estado canónico

- Rule of 300 (spec:IMPORTANTE/01 §11 + CONSTITUTION).
- Modelo Waves W0–W6.
- Spec deve servir apenas como **registo histórico** se completa, ou ser actualizada se ainda activa.

## Tickets

### C5-T1 — Decidir Active vs Archive

Auditoria: dos FR-001 a FR-035, quantos ainda são objectivos abertos vs já realizados? Se 90%+ ✅, mover para `specs/_archive/001-refactoring-completed/`. Senão atualizar.

- **DoD E2E**: spec ou está em `_archive/` ou está actualizada e activa.

### C5-T2 — Se mantida activa: substituir "200" por "300" e "Fase" por "Wave"

Find-replace cuidadoso. Atualizar US3 (deploy) para mencionar Cloudflare Pages + Railway split.

- **DoD E2E**: spec não contém "200 linhas" nem "Fase".

### C5-T3 — Arquivar file:specs/002-micro-desafio-live-data/ se completo

Verificar se W2-EXT (Constelação Neural) substitui esta spec. Se sim, mover para `_archive/`.

- **DoD E2E**: file:specs/ raiz contém apenas IMPORTANTE/ + specs activas.

## Dependências

- Coordena com A1, C3 (roadmap clarifica o que está activo).