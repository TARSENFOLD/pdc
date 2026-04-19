# Por Dentro do Curso (PDC v2) — Project Manifesto

## What This Is
O PDC é uma infraestrutura de decisão educacional angolana que transforma a incerteza vocacional em escolhas de carreira precisas. Permite que estudantes experimentem profissões e cursos através de simulações práticas, experiências imersivas e orientação por mentores — antes de se comprometerem com a matrícula. Serve estudantes (base, secundário e superior), mentores, instituições, patrocinadores e moderadores (Não é dependente de IA, se a IA falhar ele continua).

## Core Value
**O estudante faz uma escolha de carreira baseada em evidência real do seu próprio comportamento — não em suposições.**
O sistema utiliza o motor de heurísticas para calcular a **Fluidez Cognitiva ($\phi$)** e a **Resiliência ao Erro ($R$)**, transformando telemetria bruta em autoridade de decisão.

## Tech Stack (Canónica)

| Camada | Tecnologia | Papel |
| --- | --- | --- |
| Frontend | React 18, Vite 5, TailwindCSS v4, Motion | UI Imersiva (PWA-First) |
| BFF | Hono v4, Node.js 24 LTS, Jose v5 | Orquestração de Negócio e Segurança |
| CMS | Strapi v5, PostgreSQL 16 | Gestão de Conteúdo e Persistência |
| Cache/Rate-limit | Upstash Redis | Performance e Resiliência |
| Storage | Cloudflare R2 | Ativos e Projetos |
| IA | DeepSeek + RAG (LangChain.js) | Oráculo Tina (Interpretação de Dados) |

## Context & Constraints
- **Mercado:** Angola (conectividade variável, mobile-first).
- **Problema:** Altos níveis de evasão no 1º ano universitário por má escolha vocacional.
- **Segurança:** JWT em httpOnly cookies (ADR-003). Nunca localStorage.
- **Integridade:** Zero `any`. Tipagem estrita nasce no `@pdc/shared`.
- **Limites:** Ficheiros até 300 linhas (ADR-005 emenda).

## Out of Scope (MVP)
- Gateway de pagamento em produção (fase comercial posterior).
- Turborepo/Nx (over-engineering para o estágio atual).
- Upload de vídeos > 50MB (usar embed YouTube/Vimeo).
- Antifraude avançado (biometria, etc.).

## Fonte de Verdade Documental
1. **ADRs:** `docs/decisoes/` — Decisões arquiteturais ratificadas.
2. **Specs:** `.planning/` — 13 especificações detalhadas (UUIDs).
3. **Estado:** `.planning/STATE.md` — A verdade nua sobre o progresso real.

---
*Regra de Ouro: O código é o músculo, a documentação é a alma. Se não está documentado, não existe.*
