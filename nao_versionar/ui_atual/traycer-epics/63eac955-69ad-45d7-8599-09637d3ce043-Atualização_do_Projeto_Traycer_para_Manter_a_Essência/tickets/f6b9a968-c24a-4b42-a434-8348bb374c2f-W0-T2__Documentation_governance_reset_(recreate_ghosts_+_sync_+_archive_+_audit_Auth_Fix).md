---
id: "f6b9a968-c24a-4b42-a434-8348bb374c2f"
title: "W0-T2: Documentation governance reset (recreate ghosts + sync + archive + audit Auth Fix)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:50:36.082Z"
updatedAt: "2026-04-18T02:51:03.934Z"
type: ticket
---

# W0-T2: Documentation governance reset (recreate ghosts + sync + archive + audit Auth Fix)

## Scope & Objective

Reset coerente de toda a camada de planeamento: recriar `roadmap.md` (5-Waves) + `CONSTITUTION.md` v2.1 ratificada (5 emendas), sincronizar `PROJECT.md` com 4 decisões fechadas, fazer honesty pass aos 8 REQs falsos em `REQUIREMENTS.md`, arquivar `.planning_backup/` em `docs/_archive/planning-2026-04/`, auditar e fundir `pdc-v2/specs/4e02dfe2-.../` (Auth Fix) extraindo tickets ainda relevantes.

**In scope**: edição de docs `.md` + git mv + criação de tickets-spinoff do set Auth Fix se aplicável.
**Out of scope**: implementação de tickets spinoff (passa a ser W*-T* novo); migração de specs `Documentos/Traycer/tmp/` para `docs/produto/` (ticket separado W3 ou W4 — não crítico para foundation).

## References

- Atlas §6.3 (8 REQs falsos identificados + 4 drifts em PROJECT.md), §6.7 (8 fontes documentais), §6.8 (acção imediata) — spec:63eac955-69ad-45d7-8599-09637d3ce043/3e8a4789-7b06-404b-93c7-fc9e91c37167
- Approach §1.1 (decomposition), §1.3 (canónica = `.planning/` actual + correcções), §0 (decisões C4, C6, E2) — spec:63eac955-69ad-45d7-8599-09637d3ce043/2856bafe-6fa6-4f8f-9d1a-80c50a1c739c
- Ficheiros: file:.planning/PROJECT.md, file:.planning/REQUIREMENTS.md, file:.planning/STATE.md, file:.planning_backup/, file:pdc-v2/specs/4e02dfe2-b436-4a1f-8741-5b4bddc6be2f/

## Guardrails

- `STATE.md` actual NÃO descartar; corrigir referências fantasma (linhas 53-55).
- `.planning_backup/` move-se intacto (zero edição) para preservar histórico.
- `CONSTITUTION.md` v2.1 ratificada deve incluir as 5 emendas: Type Integrity total, SSOT @pdc/shared, Bootstrap-driven UI emendado (registry expõe O QUE EXISTE), Telemetria Resiliente, file limit 300.
- `roadmap.md` taxonomia híbrida G1: tickets antigos M*/Onda* preservados como histórico; novos prefixados `W{n}-T{n}`.

## Acceptance Criteria

- `.planning/roadmap.md` existe com taxonomia 5-Waves + tabela de mapeamento M*/Onda* → W*.
- `.planning/CONSTITUTION.md` existe v2.1 ratificada com as 5 emendas.
- `.planning/PROJECT.md` actualizado em 4 pontos: tema (claro base + dark opcional + Terracota acento), tipografia (Inter+Instrument Serif+JetBrains Mono), file limit (300), Tina (camada de tradução + assistente global, não tutor genérico).
- `.planning/REQUIREMENTS.md`: 8 REQs marcados `[x]` que são fachada movem para `[~]` ou `[ ]` com nota explicativa (REQ-4-002, REQ-7-005, REQ-NF-003, etc. — lista exacta no atlas §6.3).
- `.planning_backup/` movido para `docs/_archive/planning-2026-04/` com README a explicar motivo.
- `pdc-v2/specs/4e02dfe2-.../` auditado: tickets ainda relevantes extraídos como spinoff `W*-T*` no Epic; restante arquivado em `docs/_archive/specs-4e02dfe2/`.
- `STATE.md` linhas 53-55 actualizadas para referenciar apenas docs que existem.

## Verification Steps

- `ls .planning/` → 5 ficheiros: PROJECT, REQUIREMENTS, STATE, roadmap, CONSTITUTION.
- `cat .planning/PROJECT.md | grep -E "Inter|Instrument Serif|JetBrains Mono|300 linhas|tema claro"` → todos presentes.
- `grep -r "tema escuro com acentos âmbar" .planning/` → zero matches (drift removido).
- `git mv` history preservado para `.planning_backup/` → `docs/_archive/planning-2026-04/`.
- Manual: review do `roadmap.md` por humano confirma que todas as 5 Waves + W0 estão descritas e que tickets antigos M*/Onda* têm mapping.
