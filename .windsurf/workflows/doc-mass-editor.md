---
description: Edição em massa de documentação .md — auditar, corrigir e alinhar todos os docs com o estado real do codebase
---

# Doc Mass Editor (Persona: Investigador + Guardião de Qualidade)

## Contexto
O projecto tem **46 ficheiros .md** activos distribuídos por 5 zonas de autoridade.
Muitos estão desactualizados, com datas antigas, claims incorrectos, links quebrados,
ou inconsistências entre si. O `docs/a_implementar/` contém 16 tickets de reescrita pendentes.

## Inventário (46 ficheiros, 5 zonas)

### Zona 1 — Governação Raiz (5 ficheiros)
- `README.md` — Front Door canónico
- `CONTRIBUTING.md` — Guia de contribuição
- `AGENTS.md` — Mandato de agentes IA
- `CLAUDE.md` — Mandato operacional Claude
- `GEMINI.md` — Mandato operacional Gemini

### Zona 2 — Planning (6 ficheiros)
- `.planning/CONSTITUTION.md` — Leis inegociáveis
- `.planning/PROJECT.md` — Visão do produto
- `.planning/REQUIREMENTS.md` — Mapa de requisitos
- `.planning/STATE.md` — Estado operacional
- `.planning/roadmap.md` — Roadmap de waves
- `.planning/PROSPERITY.md` — Manual de governação

### Zona 3 — Specs Canónicas (5 ficheiros, READONLY)
- `specs/IMPORTANTE/01–05` — Constituição Soberana
- ⚠️ **NUNCA EDITAR specs/ sem autorização explícita do user**

### Zona 4 — ADRs (13 ficheiros)
- `docs/decisoes/adr-001` a `adr-023` — Registos de decisão arquitectural
- `docs/decisoes/006-*`, `017-*` — Design system (legacy naming)

### Zona 5 — Guias & Docs Operacionais (22 ficheiros)
- `docs/README.md` — Índice canónico
- `docs/api/` — Auth, AI, Catálogo, Simulações
- `docs/guia-tecnico/` — Setup, Deploy, Arquitectura, Contribuir, Hooks, Mobile
- `docs/guia-utilizador/` — Estudante, Mentor, Instituição, Moderador, Comité
- `docs/telemetria/` — Pipeline, Eventos
- `docs/vocacional/` — Modelo
- `docs/seed/` — README
- `docs/projeto/` — README

### Zona 6 — A Implementar (16 tickets pendentes)
- `docs/a_implementar/A1–E3` — Reescritas planeadas
- ⚠️ Cada ficheiro é um ticket de trabalho com instruções detalhadas

### Zona 7 — Suplementar
- `apps/edge/README.md`
- `apps/web/DESIGN.md`
- `audit/baseline-2026-04-26.md`

## Sealed Envelope

```
[SEALED ENVELOPE — PDC v2 INTEGRITY]

Spec Soberana: CONSTITUTION.md § 5 (Doc is Law), PROSPERITY.md § 1 (Supremacia da Verdade)
Wave/Contexto: Wave 0 (Meta-Governação) — Saneamento Documental
Caixa Autorizada: B (Código mais maduro que doc — docs desactualizados vs codebase real)

Scope IN (Ficheiros permitidos):
- Todos os .md das Zonas 1, 2, 4, 5, 7
- docs/a_implementar/* (ler como instruções, executar sobre alvos)

Scope OUT (PROIBIDO TOCAR):
- specs/IMPORTANTE/* (Zona 3 — Constituição Soberana, READONLY)
- docs/_archive/* (Congelado)
- awesome-design-md/* (Referência externa)
- Qualquer ficheiro .ts/.tsx/.css (não é scope deste workflow)

Blacklist Nominal (AP-01 a AP-07): Aplicável na totalidade.
Extra: AP-DOC-01: Nunca marcar um requisito como Done sem evidência no código.
Extra: AP-DOC-02: Nunca apagar informação sem consultar o user.
Extra: AP-DOC-03: Nunca inventar features que não existem no codebase.

Critério Done:
[ ] Todas as datas actualizadas para reflectir última auditoria
[ ] Links internos entre docs verificados e corrigidos
[ ] Claims técnicos alinhados com codebase real
[ ] REQUIREMENTS.md estados [x]/[~]/[ ] actualizados
[ ] STATE.md dívida técnica e bugs actualizados
[ ] ADRs com data de última validação actualizada
[ ] docs/README.md matriz de saúde actualizada
[ ] Nenhum doc referencia tecnologia/versão incorrecta
[ ] Consistência de terminologia entre docs
```

## Protocolo de Execução

### Fase 0: Triagem (READ-ONLY)
1. Ler todos os 16 tickets em `docs/a_implementar/`
2. Classificar cada um: **Já implementado** | **Parcial** | **Pendente** | **Obsoleto**
3. Reportar ao user antes de editar

### Fase 1: Governação Raiz (Zona 1 + 2)
4. Actualizar `README.md` — stack, waves, estado, datas
5. Actualizar `.planning/STATE.md` — dívida técnica real, bugs resolvidos vs pendentes
6. Actualizar `.planning/REQUIREMENTS.md` — estados de cada requisito
7. Actualizar `.planning/roadmap.md` — reflectir progresso real
8. Actualizar `.planning/CONSTITUTION.md` — data de auditoria
9. Verificar `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` — consistência mútua

### Fase 2: ADRs (Zona 4)
10. Para cada ADR: verificar se a decisão ainda é válida
11. Actualizar campo `last_validated` (se existir) ou adicionar
12. Verificar se há ADRs duplicados (e.g. `adr-005` tem dois ficheiros!)
13. Corrigir encoding corrompido (e.g. `\C3\A3o` em `adr-005-edge-telemetry.md`)

### Fase 3: Guias Operacionais (Zona 5)
14. `docs/README.md` — actualizar matriz de saúde
15. `docs/telemetria/pipeline.md` — alinhar com Edge Worker real (SET NX EX, tag-don't-drop)
16. `docs/guia-tecnico/deploy.md` — verificar instruções actuais
17. `docs/guia-tecnico/arquitectura.md` — alinhar com 4 camadas reais
18. `docs/api/auth.md` — verificar fluxo JWT + refresh rotation

### Fase 4: Tickets a_implementar (Zona 6)
19. Para cada ticket já concluído: mover conteúdo relevante e marcar como Done
20. Para cada ticket parcial: executar o trabalho restante
21. Para tickets obsoletos: marcar explicitamente com razão

### Fase 5: Verificação Cruzada
22. Grep por datas antigas (< 2026-04-29) em todos os docs editados
23. Grep por referências a ficheiros/funções que não existem
24. Verificar que hierarquia de autoridade é consistente entre README, docs/README, PROSPERITY

## Regras de Ouro
- **Ler antes de escrever** — nunca editar um doc sem o ler primeiro
- **Preservar voz autoral** — corrigir factos, não reescrever estilo
- **Incremental** — commit lógico por zona, não um mega-diff
- **Evidência** — cada mudança deve referenciar o que motivou a correcção
- **Consultar user** — se uma decisão parece incorrecta mas não temos certeza, PERGUNTAR
