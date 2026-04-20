# PDC v2 — Visão do Produto (Canónica)

> **Frase de autoridade:** O PDC não é uma plataforma de ensino. É uma infraestrutura de decisão educacional — transforma a incerteza vocacional em escolhas de carreira precisas, antes que as decisões erradas custem dinheiro.

**Status:** Canónico · **Substitui:** versões dispersas em `docs/projeto/SISTEMA_MESTRE_FINAL.md`, `.planning/PROJECT.md` e a spec original perdida.

## 1. O Problema que o PDC Resolve
Em Angola e em mercados emergentes, a escolha de curso universitário é uma **aposta**, não uma decisão informada. O PDC resolve isto dando ao estudante a experiência real do curso antes de se comprometer com a matrícula.

## 2. O que o PDC É (e o que NÃO é)
| O PDC É | O PDC NÃO é |
| --- | --- |
| Uma infraestrutura de decisão vocacional | Um repositório passivo de conteúdo |
| Um sistema que mede **comportamento real** | Um teste de personalidade genérico |
| Uma plataforma de marketing institucional | Uma cópia do Canvas/Moodle |
| **Independente de IA** | Dependente de qualquer LLM |

## 3. Core Value (Promessa Mensurável)
O estudante toma uma decisão de carreira baseada em evidência real do seu próprio comportamento. O sistema usa o **Motor de Heurísticas** (`packages/shared/src/heuristics.ts`) para calcular:
- **Fluidez Cognitiva ($\phi$):** Constância e ritmo de decisão.
- **Resiliência ao Erro ($R$):** Recuperação após falha.
- **Estabilidade de Foco:** Micro-interrupções de atenção.
- **Hesitação:** Tempo + entropia de movimento antes de uma decisão.

## 4. Stack Canónica (Soberana)
- **Frontend:** React 18 · Vite 5 · TailwindCSS v4 · Motion (UI Imersiva PWA-First).
- **BFF:** Hono v4 · Node.js 24 LTS · Jose v5 (RPC type-safe).
- **Edge:** Cloudflare Workers (`apps/edge`) · Telemetria L1.
- **CMS:** Strapi v5 · PostgreSQL 16.
- **Cache/Rate-limit:** Upstash Redis.
- **IA (opcional):** DeepSeek + RAG (Tina — Oráculo Interpretativo).

## 5. Arquitetura em 4 Camadas (L1–L4)
1. **L1 — Factos (Edge):** Telemetria, catálogos públicos.
2. **L2 — Cérebro Matemático (BFF/Shared):** Cálculo determinístico de $\phi$ e $R$.
3. **L3 — Verniz Inteligente (BFF):** Tina (IA).
4. **L4 — Core de Negócio (BFF/Strapi):** Auth soberano, RBAC, Realtime.

## 6. Identidade Visual — "Soul & Elite"
- **Princípio:** Herança Invisível (ADR-006).
- **Cores:** Claro `#F8F9FA` base; Terracota `#D2691E` (≤ 5%).
- **Tipografia:** Inter (UI), Instrument Serif (Autoridade), JetBrains Mono (Dados).

---
*Última validação: 20 de Abril de 2026 · Fonte de verdade: Epic 01.*
