---
id: "bef1ac2f-1d8c-473a-ac7d-4b202f315198"
title: "T4: Sync Documentação .planning"
assignee: ""
status: 0
createdAt: "2026-04-14T16:51:51.313Z"
updatedAt: "2026-04-14T16:52:20.308Z"
type: ticket
---

# T4: Sync Documentação .planning

## Scope & Objectivo

Sincronizar STATE.md, REQUIREMENTS.md e roadmap.md com o estado real do código e do projecto, eliminando as 30+ discrepâncias identificadas na análise.

**IN scope:**

- Actualizar file:.planning/STATE.md:
  - Corrigir status de Fase 0 (API tsc status pós-T1)
  - Corrigir Fase 4 (Programas ✅, Feed ✅, Conquistas auto [~])
  - Corrigir M7 claim sobre "zero any" (reflectir estado real)
  - Actualizar "Current focus" para reflectir estado pós-launch
  - Actualizar "Último commit" e "Branch activa"
- Actualizar file:.planning/REQUIREMENTS.md:
  - REQ-2-001: `[x]` → `[~]` (hardcoded hex colors permanecem em 4 ficheiros)
  - REQ-4-009: `[ ]` → `[x]` (Programas implementados)
  - REQ-4-013: `[ ]` → `[~]` (Conquistas parcial — auto-trigger não wired)
  - REQ-4-014: `[ ]` → `[x]` (Feed scoring completo)
  - REQ-NF-003: actualizar lista de violações `any`
  - REQ-NF-007: actualizar lista de ficheiros > 200 linhas (auth.ts agora 134 ✓, listar os 9 reais)
- Actualizar file:.planning/roadmap.md:
  - M0-T1 a T4: `[ ]` → `[x]`
  - M0-T5: `[ ]` → `[~]` (web OK, API verificar pós-T1)
  - M1-T1 a T5, T7-T8: `[ ]` → `[x]`
  - M3-T2 a T5: `[ ]` → `[x]` (OAuth + OTP existem)
  - M5-T7, T9, T10: `[ ]` → `[x]` (SEO, lazy chunks, PWA)
  - M7-T1, T3, T5: `[ ]` → `[x]` (Sentry, pino, Instrument Serif)
  - Ondas 1-4: actualizar para `[x]`
  - Fase 1 header: "OAuth+2FA ❌" → "OAuth+2FA ✅"
- Actualizar file:docs/guia-tecnico/setup-local.md:
  - Adicionar instrução para executar seed: `npx tsx tests/helpers/seed.ts`
  - Adicionar aviso: "Nunca registar utilizadores directamente no painel admin do Strapi — usar o seed ou o frontend"

**OUT of scope:**

- Actualizar specs no Epic Traycer antigo (`332ffcdb`)
- Modificar código — apenas documentação
- Actualizar ficheiros em `/home/cj/Documentos/Traycer/` (cópia obsoleta — documentar que a fonte de verdade é `.planning/`)

## Referências

- **Análise §4 Bloco C**: Lista completa de acções de documentação
- **Relatório M0 Verification** (file:.planning/phases/m0/m0-VERIFICATION.md): Listagem detalhada de todas as discrepâncias com corrective actions
  - Secção "STATE.md Discrepancies" — 6 claims falsas
  - Secção "REQUIREMENTS.md Discrepancies" — 5 requisitos com status errado
  - Secção "roadmap.md Discrepancies" — 25+ tarefas outdated
  - Secção "REQ-NF-007 Updated Violations" — lista real dos 9 ficheiros > 200 linhas

## Guardrails

- **Invariante**: Só actualizar status para o que é verificável no código — não marcar como `[x]` sem evidência
- Usar o relatório de verificação file:.planning/phases/m0/m0-VERIFICATION.md como fonte de verdade para cada discrepância
- Para REQ-NF-007, listar os ficheiros reais e contagens de linhas actuais (verificar com `wc -l`)

## Acceptance Criteria

1. ✅ STATE.md → "Current Status" reflecte o estado real de cada fase (verificado contra código)
2. ✅ REQUIREMENTS.md → Os 6 requisitos identificados têm status correcto
3. ✅ roadmap.md → 25+ tarefas actualizadas de `[ ]` para `[x]` ou `[~]` conforme realidade
4. ✅ setup-local.md → Instrução de seed e aviso sobre registo via admin documentados
5. ✅ Nenhuma discrepância listada no relatório M0 permanece por corrigir
6. ✅ file:.planning/STATE.md referencia que a fonte de verdade para specs é este Epic (epic:4e02dfe2-b436-4a1f-8741-5b4bddc6be2f)

## Verificação

Para cada claim actualizada:

1. Verificar contra ficheiros reais (`grep`, `wc -l`, `find`)
2. Comparar com o relatório de verificação M0
3. Confirmar que o status final corresponde ao que o código realmente tem
