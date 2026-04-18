# PDC v2 — Requirements

> Fonte de verdade para requisitos com rastreabilidade por fase. Cada requisito tem ID único, fase, prioridade e critério de verificação. Actualizar após cada fase concluída.

## Como usar este ficheiro

- **ID:** `REQ-[FASE]-[NNN]` — ex: `REQ-0-001`
- **Prioridade:** 🔴 Crítico | 🟠 Alto | 🟡 Médio | 🟢 Baixo
- **Estado:** `[ ]` Todo | `[x]` Done | `[~]` In Progress | `[-]` Descartado

## Fase 0 — Fundação

**Objetivo:** Repositório limpo, tooling configurado, CI/CD básico, ambiente de desenvolvimento funcional.

| ID | Requisito | Prioridade | Estado | Nota de Honesty Pass |
| --- | --- | --- | --- | --- |
| REQ-0-001 | Estrutura de monorepo npm workspaces | 🔴 | `[x]` | `npm install` instala tudo |
| REQ-0-002 | Workspace `apps/web` React 18 | 🔴 | `[x]` | Build limpo |
| REQ-0-003 | Workspace `apps/api` Hono | 🔴 | `[x]` | Build limpo |
| REQ-0-004 | Workspace `infra/strapi` Strapi v5 | 🔴 | `[~]` | Saneamento de tipos em progresso |
| REQ-0-005 | ESLint + Prettier global | 🟠 | `[x]` | Lint passa na raiz |
| REQ-0-006 | Husky pre-commit | 🟠 | `[x]` | Hook reactivado (W0-T9) |
| REQ-0-007 | GitHub Actions CI | 🟠 | `[x]` | Build + Lint + A11y (warning) |
| REQ-0-008 | Docker Compose (PG + Redis) | 🟠 | `[x]` | Infra sobe localmente |
| REQ-0-012 | Dockerfile BFF multi-stage | 🔴 | `[x]` | Container funcional |

## Fase 1 — Autenticação Segura e Edge

**Objetivo:** Auth robusto com JWT httpOnly, 2FA e pipeline de Telemetria Edge.

| ID | Requisito | Prioridade | Estado | Nota de Honesty Pass |
| --- | --- | --- | --- | --- |
| REQ-1-001 | Endpoint `POST /auth/register` | 🔴 | `[~]` | Refactor para Role SSOT pendente |
| REQ-1-002 | JWT em httpOnly cookie | 🔴 | `[ ]` | Implementação parcial; rotação em falta |
| REQ-1-007 | Rate limiting via Upstash | 🔴 | `[x]` | Middleware integrado |
| REQ-1-010 | OTP por SMS (Twilio) | 🟡 | `[ ]` | Serviço mockado; integração real pendente |
| REQ-1-011 | Telemetria Edge (ADR-005) | 🔴 | `[ ]` | Worker rascunho. Falta JWS verify, TelemetryToken, e BFF consumer |

## Fase 2 — Design System e Frontend Base

| ID | Requisito | Prioridade | Estado | Nota de Honesty Pass |
| --- | --- | --- | --- | --- |
| REQ-2-001 | TailwindCSS v4 soberano | 🔴 | `[~]` | Purga de cores hardcoded em progresso |
| REQ-2-002 | Component Registry | 🔴 | `[ ]` | Registry ausente/desalinhado do approach |
| REQ-2-005 | React Query v5 SSOT | 🔴 | `[x]` | Único estado servidor |
| REQ-2-010 | Design responsivo | 🟠 | `[x]` | Refatoração PWA / "Herança Invisível" concluída |
| REQ-2-011 | SSOT/Shared Types | 🔴 | `[ ]` | Faltam `bootstrap.ts`, `heuristics.ts`, `registry/features.ts` |

## Fase 4 — Core do Produto

| ID | Requisito | Prioridade | Estado | Nota de Honesty Pass |
| --- | --- | --- | --- | --- |
| REQ-4-002 | Simulação Tipo 2 | 🔴 | `[ ]` | Score hardcoded = 8.5; tracking real pendente |
| REQ-4-003 | Simulação Tipo 3 | 🔴 | `[ ]` | Ausente (`Tipo3Player.tsx` não existe) |
| REQ-4-004 | Telemetria Idempotente | 🔴 | `[ ]` | Precision timestamps não normalizados |
| REQ-4-005 | Perfil Vocacional Auto | 🔴 | `[ ]` | Fórmulas determinísticas em falta no BFF |
| REQ-4-009 | Programas: gestão | 🟠 | `[~]` | UI de gestão pendente |
| REQ-4-013 | Conquistas automáticas | 🟠 | `[ ]` | Motor existe mas sem triggers de eventos/event-bus ausente |
| REQ-4-014 | Feed: ranking soberano | 🟠 | `[~]` | Algoritmo funcional; cache Redis pendente |
| REQ-4-015 | Reputação Contract | 🔴 | `[ ]` | Frontend e Backend dessincronizados (`/reputacao` vs `/reputation`) |

## Fase 7 — IA e Realtime

| ID | Requisito | Prioridade | Estado | Nota de Honesty Pass |
| --- | --- | --- | --- | --- |
| REQ-7-001 | AI tutor streaming | 🔴 | `[~]` | Modo streaming instável |
| REQ-7-005 | Mensagens Realtime | 🟠 | `[ ]` | Rota inbox/lista comentada; UI ausente |

## Requisitos Não Funcionais

| ID | Requisito | Prioridade | Estado | Nota de Honesty Pass |
| --- | --- | --- | --- | --- |
| REQ-NF-003 | Zero `any` em TS | 🔴 | `[~]` | Lint reports indicam ~23 ocorrências residuais (honest pass) |
| REQ-NF-005 | Acessibilidade Total | 🔴 | `[x]` | PWA + Contraste Tema Claro resolvidos, botões > 44px e iOS autocomplete fix. |
| REQ-NF-007 | Rule of 300 (linhas) | 🟡 | `[~]` | Shared index ainda excede limite |

*Last updated: Abril 2026 — Governance Reset (W0-T2)*
