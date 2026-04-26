# Por Dentro do Curso (PDC v2) — Visão do Produto (Canónica)

> **Frase de autoridade:** O PDC não é uma plataforma de ensino. É uma infraestrutura de decisão educacional — transforma a incerteza vocacional em escolhas de carreira precisas, antes que as decisões erradas custem dinheiro.

## 1. O Problema que o PDC Resolve
Em Angola e em mercados emergentes, a escolha de curso universitário é uma **aposta**, não uma decisão informada. 
- **Evasão:** Até 60% de evasão no primeiro ano universitário em Angola.
- **Custo:** Famílias perdem dinheiro; instituições perdem reputação.
- **Solução:** O PDC permite que o estudante experimente profissões antes de se comprometer com a matrícula.

## 2. Core Value (A Promessa)
**O estudante faz uma escolha de carreira baseada em evidência real do seu próprio comportamento — não em suposições.**
Se tudo o resto falhar, o fluxo `Simulação → Score → Perfil Vocacional → Recomendação` tem de funcionar.

## 3. Arquitetura em 4 Camadas (Soberana)
O sistema opera numa pipeline de alta fidelidade:
1. **L1 — Factos (Edge):** Telemetria bruta capturada no Cloudflare Workers para escala e baixo custo (100k req/dia grátis).
2. **L2 — Cérebro Matemático (Shared/BFF):** Cálculo determinístico de Fluidez Cognitiva ($\phi$) e Resiliência ($R$) — independente de IA.
3. **L3 — Verniz Inteligente (BFF):** Tina (Oráculo Interpretativo) via DeepSeek + RAG para insights laterais.
4. **L4 — Core de Negócio (BFF/Strapi):** Auth soberano, RBAC, Realtime e Persistência.

## 4. Tech Stack (Ratificada)

| Camada | Tecnologia | Papel |
| --- | --- | --- |
| **Frontend** | React 18 · Vite 5 · TailwindCSS v4 | UI Imersiva PWA-First |
| **BFF** | Hono v4 · Node.js 24 LTS · Jose v5 | Orquestração + RPC type-safe |
| **Edge** | Cloudflare Workers (`apps/edge`) | Ingestor de Telemetria L1 |
| **CMS** | Strapi v5 · PostgreSQL 16 | Persistência e Gestão de Conteúdo |
| **Cache/Queue** | Upstash Redis | Fila de telemetria + Rate limit |
| **Infra** | Vercel (Web) + Railway (API/Strapi) | Hospedagem Soberana |
| **IA** | DeepSeek + LangChain.js | Tina — Assistente de Decisão |

## 5. Constraints & Regras de Ouro
- **I. Identidade Total:** O anonimato é proibido. Todos os dados são identificados para fins pedagógicos e de responsabilidade.
- **II. Zero Any:** Tipagem estrita obrigatória em todos os workspaces. `any` é um bug de governação.
- **III. Rule of 300:** Nenhum ficheiro fonte > 300 linhas (Exceção: `shared/index.ts`).
- **IV. Stateless Security:** JWT exclusivamente em httpOnly cookies (ADR-003).
- **V. Doc is Law:** Se o código contradiz o Markdown, o código é defeituoso.

## 6. Out of Scope (MVP)
- **Gateway de pagamento:** Fase comercial posterior (usar CTAs).
- **Turborepo / Nx:** Overhead desnecessário para o estágio atual.
- **Mocks:** Proibido o uso de dados falsos em qualquer ambiente.
- **Antifraude biométrico:** Fase de segurança avançada posterior.

## 7. Contexto & Moat
- **Repositório de referência:** `/home/cj/1-PDC/` (extração de lógica legada).
- **Specs Detalhadas:** Epic `332ffcdb` no Traycer (13 specs UUIDs).
- **Barreira Competitiva:** Os dados comportamentais acumulados são um ativo único que nenhum concorrente pode replicar rapidamente.

---
*Última validação: 21 de Abril de 2026 · Fonte de verdade: Alma Original + Epic 01.*