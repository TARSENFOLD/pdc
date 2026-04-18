---
id: "e10d381e-4ae7-4a5f-90c7-94df3b81adc5"
title: "W0-T2 Docs Governance"
createdAt: "1776496010702"
updatedAt: "1776496130025"
type: execution
---

### User Query (Status: Completed)

Implementar `ticket:W0-T2: Documentation governance reset (recreate ghosts + sync + archive + audit Auth Fix)` (W0-T2: Documentation governance reset).

Trabalho a fazer:

1. Recriar .planning/roadmap.md com taxonomia 5-Waves (W0..W5) + tabela de mapeamento M*/Onda* → W*-T*.
2. Recriar .planning/CONSTITUTION.md v2.1 ratificada com as 5 emendas: Type Integrity total, SSOT @pdc/shared, Bootstrap-driven UI emendado (registry expõe O QUE EXISTE), Telemetria Resiliente, file limit 300.
3. Atualizar `/home/cj/pdc-v2/.planning/PROJECT.md` em 4 pontos: tema (claro base + dark opcional + Terracota acento), tipografia (Inter+Instrument Serif+JetBrains Mono), file limit (300), Tina (camada de tradução + assistente global, não tutor genérico).
4. Honesty pass em `/home/cj/pdc-v2/.planning/REQUIREMENTS.md`: marcar `[~]`/`[ ]` os REQs falsamente `[x]` (REQ-4-002, REQ-7-005, REQ-NF-003, etc. — ver §6.3 do atlas).
5. Mover `/home/cj/pdc-v2/.planning_backup/` inteiro para docs/_archive/planning-2026-04/ via `git mv` preservando histórico, com README explicativo.
6. Auditar pdc-v2/specs/4e02dfe2-b436-4a1f-8741-5b4bddc6be2f/ — extrair tickets ainda relevantes como spinoff `W*-T*`; arquivar restante em docs/_archive/specs-4e02dfe2/.
7. Atualizar `/home/cj/pdc-v2/.planning/STATE.md` linhas 53-55 para referenciar apenas docs que existem.

Specs: `spec:Refactoring Analysis — PDC v2 Restauração da Alma + Cherry-Pick`, spec:63eac955-69ad-45d7-8599-09637d3ce043/2856bafe-6fa6-4f8f-9d1a-80c50a1c739c.

Guardrails: STATE.md actual NÃO descartar (corrigir referências fantasma); .planning_backup/ move-se intacto; taxonomia híbrida G1 (tickets antigos M*/Onda* preservados como histórico).

### Execution Plan (Status: Not Started)

[object Promise]

### Verification (Status: Not Started)