# PDC v2 — Mapa de Requisitos (Sincronizado)

> **Status:** Restaurado a partir da Alma Original em 21 de Abril de 2026.
> **Regra de Ouro:** Nenhum requisito é considerado "Done" sem passar pelo crivo do ESLint e do CodeRabbit.

## Legenda
- **Estado:** `[ ]` Todo | `[x]` Done | `[~]` In Progress | `[-]` Descartado

## 1. Fundação e Tooling (Fase 0)
| ID | Requisito | Prioridade | Estado |
| --- | --- | --- | --- |
| REQ-0-001 | Monorepo npm workspaces | 🔴 | `[x]` |
| REQ-0-002 | TypeScript estrito em todas as camadas | 🔴 | `[~]` |
| REQ-0-005 | ESLint + Prettier (Zero Errors Target) | 🟠 | `[~]` |
| REQ-0-008 | Docker Compose (Strapi + PG + Redis) | 🟠 | `[x]` |

## 2. Autenticação e Segurança (Fase 1)
| ID | Requisito | Prioridade | Estado |
| --- | --- | --- | --- |
| REQ-1-002 | JWT em httpOnly cookies (SameSite=Strict) | 🔴 | `[x]` |
| REQ-1-006 | RBAC com 6 roles no servidor | 🔴 | `[x]` |
| REQ-1-009 | 2FA via Email (SendGrid) | 🟠 | `[x]` |
| REQ-1-010 | 2FA via SMS (Twilio - Angola) | 🟡 | `[-]` |

## 3. Core de Decisão Vocacional (Fase 2-4)
| ID | Requisito | Prioridade | Estado |
| --- | --- | --- | --- |
| REQ-4-001 | Simulações Tipo 1, 2 e 3 | 🔴 | `[x]` |
| REQ-4-004 | Telemetria com idempotência Redis | 🔴 | `[x]` |
| REQ-4-005 | Motor de Heurísticas ($\phi, R$) | 🔴 | `[x]` |
| REQ-4-006 | Relatório Vocacional Premium | 🔴 | `[x]` |
| REQ-4-014 | Feed com Algoritmo de Ranking | 🟠 | `[x]` |

## 4. Novas Diretrizes (Wave 3+)
| ID | Requisito | Prioridade | Estado |
| --- | --- | --- | --- |
| REQ-W3-001 | Identidade Total: Telemetria identificada | 🔴 | `[~]` |
| REQ-W3-002 | Hierarquia Institucional: Acesso ao rasto do aluno | 🔴 | `[ ]` |
| REQ-W3-003 | Design Tokens Soul & Elite (Tailwind v4) | 🔴 | `[~]` |

## 5. Requisitos Não-Funcionais
| ID | Requisito | Prioridade | Estado |
| --- | --- | --- | --- |
| REQ-NF-001 | Zero `any` em todo o código | 🔴 | `[~]` |
| REQ-NF-002 | Rule of 300: Máximo 300 linhas por ficheiro | 🟠 | `[~]` |
| REQ-NF-003 | Lighthouse Performance ≥ 90 | 🟠 | `[ ]` |

---
*Última auditoria: 21 de Abril de 2026.*