# Arquivo Fundacional — PDC v2

> **Propósito:** Este directório contém o conhecimento fundacional do PDC v2, destilado e organizado a partir de 54 ficheiros em `/fv/` + 36 ficheiros em `/Transferências/PDC/` + 19 ficheiros em `/Documentos/Traycer/` (specs fundadoras, conversas, notas, diagnósticos, visão de produto, análises externas, tickets de auditoria).
>
> **Por que existe:** Os directórios `/fv/`, `/Transferências/PDC/` e `/Documentos/Traycer/` contêm a "alma", história e inteligência do projecto — specs fundadoras, decisões, visão, regras de negócio, diagnósticos, análises externas — que não estavam formalizados na documentação oficial. Este arquivo traz esse conhecimento para dentro do repo, organizado e referenciável.
>
> **Data de criação:** Abril 2026

---

## Navegação por Secção

### 01 — Alma e Visão
A essência do produto, o problema que resolve, e como deve parecer e sentir-se.

| Ficheiro | Conteúdo | Origem `/fv/` |
|----------|----------|---------------|
| [`visao-produto-evasao.md`](01-alma-e-visao/visao-produto-evasao.md) | Problema da evasão, PDC como solução, valor por público | `Notes/Estou preocupada com o.txt`, `Notes/me foi feita uma questao.txt` |
| [`efeitos-de-rede.md`](01-alma-e-visao/efeitos-de-rede.md) | Flywheel, gamificação, streaks, FOMO, Hub de Oportunidades | `Notes/Estou preocupada com o.txt` |
| [`design-soul-elite.md`](01-alma-e-visao/design-soul-elite.md) | Paleta, tipografia, princípios de design, directrizes por componente | `Notes/Estou preocupada com o.txt`, `Notes/o meu projeto sofreu alteracao.txt` |

### 02 — Modelo de Negócio
Entidades, regras e lógica do produto.

| Ficheiro | Conteúdo | Origem `/fv/` |
|----------|----------|---------------|
| [`programas-vs-projetos.md`](02-modelo-negocio/programas-vs-projetos.md) | Definição canónica, tipos, modos, edu-visita, schemas | `Notes/Progra vs Projeto.txt` |
| [`perfis-privacidade.md`](02-modelo-negocio/perfis-privacidade.md) | Separação perfil/dashboard, 24 steps, field-level visibility | `Notes/Plan Perfis V2 com Privacidade.md` |
| [`vinculos-logica.md`](02-modelo-negocio/vinculos-logica.md) | Tipos, estados, regras de negócio, UX | `Arquivos/vinculos-logica.md` |
| [`instituicoes-funcionalidades.md`](02-modelo-negocio/instituicoes-funcionalidades.md) | Dashboard institucional, gaps, funcionalidades gerais | `Notes/Instituições.txt`, `Notes/FUNCIONALIDADES.txt` |

### 03 — Roles e Permissões
RBAC completo e API de moderação.

| Ficheiro | Conteúdo | Origem `/fv/` |
|----------|----------|---------------|
| [`moderacao-strapi.md`](03-roles-permissoes/moderacao-strapi.md) | Content-types, fluxos REST, RBAC por tipo de conta, checklist completa | `Notes/API de Moderação Strapi.md` |

### 04 — Diagnóstico e Auditoria
Estado real vs documentado, lições aprendidas.

| Ficheiro | Conteúdo | Origem `/fv/` |
|----------|----------|---------------|
| [`diagnostico-alma-vs-drift.md`](04-diagnostico-auditoria/diagnostico-alma-vs-drift.md) | Drift map completo: o que foi perdido, o que foi adicionado, remediação | `Notes/Diagnóstico Onde está.txt` |
| [`verificacao-34-tickets.md`](04-diagnostico-auditoria/verificacao-34-tickets.md) | Milestones pendentes, features missing por área | `Notes/verification verifique.txt` |
| [`licoes-massacre-design.md`](04-diagnostico-auditoria/licoes-massacre-design.md) | O que aconteceu, impacto, 7 lições anti-drift | `Notes/o meu projeto sofreu alteracao.txt`, `Notes/Diagnóstico Onde está.txt` |

### 05 — Referência Técnica
Padrões, inspirações, conceitos avançados.

| Ficheiro | Conteúdo | Origem `/fv/` |
|----------|----------|---------------|
| [`percurso-adaptativo-ia.md`](05-referencia-tecnica/percurso-adaptativo-ia.md) | Micro-learning, IA como auditora, dashboards de saúde, ética | `Notes/1. Percurso de Aprendizagem Adaptat.txt` |
| [`canvas-lms-benchmark.md`](05-referencia-tecnica/canvas-lms-benchmark.md) | Padrões a adoptar do Canvas LMS, o que não copiar | `Notes/O que você está querendo fazer é us.txt` |

### 06 — Engenharia e Refactoring
Plano de execução, tickets, bugs e hotspots identificados na auditoria profunda.

| Ficheiro | Conteúdo | Origem `/fv/` |
|----------|----------|---------------|
| [`plano-refactoring-5-waves.md`](06-engenharia/plano-refactoring-5-waves.md) | 18 decisões fechadas, decomposição W0-W5, princípios de placement, migração edge | `traycer-epics/specs/` (5 specs: 3e8a4789, 2856bafe, 9e1df3cf, fcd9896a, ed419cbd) |
| [`inventario-tickets-w0-w5.md`](06-engenharia/inventario-tickets-w0-w5.md) | Catálogo completo: 34 tickets W0-W5 + 15 saneamento + 4 fix + 11 auditorias = 64 total | `traycer-epics/tickets/` (60+ ficheiros) |
| [`bugs-hotspots-criticos.md`](06-engenharia/bugs-hotspots-criticos.md) | 4 hotspots críticos, 4 médio-altos, schema divergences, lacunas de testes, inventário técnico | `traycer-epics/specs/` + `traycer-epics/executions/` |
| [`entitlements-core-trio-analysis.md`](06-engenharia/entitlements-core-trio-analysis.md) | Triplo desync vocacional, dead code comercial, 12 hotspots, bug `alunoId` vs `perfil`, `heuristics.ts` órfã | `Recente/Refactoring_Analysis_—_Onda_Entitlements_+_Core_Trio.md` |
| [`plano-mestre-ondas-1-4.md`](06-engenharia/plano-mestre-ondas-1-4.md) | ~65 rotas por onda, triggers notificação (15), pipeline feed, Action​Bar, vínculos, zonas Mentor/Instituição/Moderador/Comité/Admin, content-types Strapi | `docs/PDC_v2_—_Plano_Mestre_de_Execução__Ondas_1_a_4.md` (713 linhas) |
| [`audit-premium-ui-e2e-tickets.md`](06-engenharia/audit-premium-ui-e2e-tickets.md) | 30 tickets W-1 a W5: outbox idempotency, hookResults, 6 Full-Spec schemas, builder primitives, Soul & Elite dashboards, pipeline editorial | `Transferências/PDC/Audit & Premium UI End To End/` (30 .md) |

### 07 — UX Specs e Design Algorítmico
Directrizes de redesign por página e decisões de design do algoritmo vocacional.

| Ficheiro | Conteúdo | Origem `/fv/` |
|----------|----------|---------------|
| [`specs-ux-por-pagina.md`](07-ux-specs/specs-ux-por-pagina.md) | 11 páginas: Dashboard, Feed, Simulações, Sim Tipo 2 HUD, Relatório Vocacional, Experiência, Ranking, Hub Oportunidades, Conquistas, Mensagens, Configurações | `Notes/Estou preocupada com o.txt` (linhas 440–906) |
| [`algoritmo-decisoes-design.md`](07-ux-specs/algoritmo-decisoes-design.md) | Fórmulas φ/R/H, schema telemetria, behavior_patterns, hierarquia L1–L3, prompt Tina, motor heurísticas, anti-fraude, pitch do músculo | `Notes/Estou preocupada com o.txt` (linhas 987–1550) |

### 08 — Análises Externas
Análises técnicas independentes ao PDC v2 (transcrições de podcast/review).

| Ficheiro | Conteúdo | Origem |
|----------|----------|--------|
| [`arquitectura-resiliencia-telemetria.md`](08-analises-externas/arquitectura-resiliencia-telemetria.md) | Midnight Rollover Bug, RedLock, DLQ, circuit breaker, cold storage, edge tag-not-drop, worker isolation, schema mismatches | `Transferências/PDC/Analyses/` (3 transcrições: telemetry-midnight, redlock-dlqs, falhas-invisiveis) |
| [`design-governanca-doc-is-law.md`](08-analises-externas/design-governanca-doc-is-law.md) | Design invisível (Ubuntu+Apple), anti-fraude biomecânica, Doc-is-Law automatizado, contract-driven dev, CI de links, stack validation, PDC como canal marketing | `Transferências/PDC/Analyses/` (3 transcrições: engenharia-comportamental, doc-lei-automatizada, marketing) |

### 09 — Specs Traycer Originais
As 13 specs fundadoras do Traycer (~266KB) que originaram as 6 specs `IMPORTANTE/`. Mais detalhadas, com diagnósticos, diagramas Mermaid, modelos de dados e wireframes HTML.

| Ficheiro | Conteúdo | Origem |
|----------|----------|--------|
| [`produto-visao-arquitectura.md`](09-traycer-specs/produto-visao-arquitectura.md) | Plano Mestre, visão do produto, diagnóstico pré-v2 (segurança/arquitectura/custo), stack proposto, fases de reconstrução, trio GSD original | `Documentos/Traycer/` (IDs: 868a324b, d34f63b8, 631b796e + 3 GSD) |
| [`mapa-paginas-features-transversais.md`](09-traycer-specs/mapa-paginas-features-transversais.md) | Mapa completo de páginas (80+ rotas, 6 zonas), guards, menus laterais por role, 10 features transversais com modelos de dados e endpoints, catálogo completo de eventos telemetria | `Documentos/Traycer/` (IDs: c67e1ed4 34KB, ae07e114 47KB) |
| [`design-system-completo.md`](09-traycer-specs/design-system-completo.md) | Stack frontend, 5 princípios design, anti-padrões, tokens completos (cores/tipografia/espaçamento/animações), componentes base, padrões de página | `Documentos/Traycer/` (ID: dc2a19a2, 43KB) |
| [`algoritmos-dados-seguranca.md`](09-traycer-specs/algoritmos-dados-seguranca.md) | Algoritmo ranking/feed (4 fases, 4 feeds), telemetria pipeline, perfil vocacional 6 dimensões, segurança 7 camadas + rate limits, modelo dados Strapi (ERD + migrações), IA/RAG (DeepSeek + pgvector), LTI 1.3 (OIDC + grade passback), SEO/performance Angola | `Documentos/Traycer/` (IDs: 15428b59, 1a81656f, ef76adef, 36c60fa0, 01e25234, 26799a9d, 6f5d9251) |

---

## Classificação de Valor

| Classificação | Significado | Ficheiros |
|---------------|-------------|-----------|
| 🔴 **OURO** | Informação única não duplicada noutro lugar do codebase | visao-produto, efeitos-de-rede, design-soul-elite, programas-vs-projetos, perfis-privacidade, vinculos-logica, moderacao-strapi, diagnostico-alma-vs-drift, plano-refactoring-5-waves, bugs-hotspots-criticos, entitlements-core-trio-analysis, plano-mestre-ondas-1-4, audit-premium-ui-e2e-tickets, specs-ux-por-pagina, algoritmo-decisoes-design, arquitectura-resiliencia-telemetria, design-governanca-doc-is-law, produto-visao-arquitectura, mapa-paginas-features-transversais, design-system-completo, algoritmos-dados-seguranca |
| 🟡 **REFERÊNCIA** | Histórico/contexto útil para decisões futuras | verificacao-34-tickets, licoes-massacre-design, percurso-adaptativo-ia, canvas-lms-benchmark, instituicoes-funcionalidades, inventario-tickets-w0-w5 |

---

## Relação com Outras Fontes de Verdade

```
specs/IMPORTANTE/01-05    ← AUTORIDADE SOBERANA (READONLY)
.planning/*.md            ← Specs de produto (13 UUIDs)
.planning/CONSTITUTION.md ← Leis inegociáveis
docs/decisoes/adr-*.md    ← Decisões arquitecturais ratificadas
docs/ROADMAP_PRODUTO_DISRUPTIVO.md ← Plano de execução priorizado
──────────────────────────────────────────────
docs/arquivo-fundacional/ ← ESTE DIRECTÓRIO
   Conhecimento destilado que informa todas as fontes acima.
   NÃO é fonte de verdade para implementação — é referência.
   Para implementar, consultar specs e ADRs.
```

---

## Mapeamento Fontes → Arquivo

Para cada ficheiro OURO das fontes externas, onde foi absorvido:

| Ficheiro `/fv/` | Absorvido em |
|-----------------|-------------|
| `Notes/Estou preocupada com o.txt` (1571 linhas) | `01-alma-e-visao/visao-produto-evasao.md`, `efeitos-de-rede.md`, `design-soul-elite.md` |
| `Notes/Diagnóstico Onde está.txt` (1182 linhas) | `04-diagnostico-auditoria/diagnostico-alma-vs-drift.md`, `licoes-massacre-design.md` |
| `Notes/API de Moderação Strapi.md` (769 linhas) | `03-roles-permissoes/moderacao-strapi.md` |
| `Notes/Progra vs Projeto.txt` (230 linhas) | `02-modelo-negocio/programas-vs-projetos.md` |
| `Notes/Plan Perfis V2 com Privacidade.md` (71 linhas) | `02-modelo-negocio/perfis-privacidade.md` |
| `Arquivos/vinculos-logica.md` (41 linhas) | `02-modelo-negocio/vinculos-logica.md` |
| `Notes/verification verifique.txt` (491 linhas) | `04-diagnostico-auditoria/verificacao-34-tickets.md` |
| `Notes/o meu projeto sofreu alteracao.txt` (4343 linhas) | `04-diagnostico-auditoria/licoes-massacre-design.md` |
| `Notes/Instituições.txt` (51 linhas) | `02-modelo-negocio/instituicoes-funcionalidades.md` |
| `Notes/FUNCIONALIDADES.txt` (12 linhas) | `02-modelo-negocio/instituicoes-funcionalidades.md` |
| `Notes/1. Percurso de Aprendizagem Adaptat.txt` (38 linhas) | `05-referencia-tecnica/percurso-adaptativo-ia.md` |
| `Notes/O que você está querendo fazer é us.txt` (107 linhas) | `05-referencia-tecnica/canvas-lms-benchmark.md` |
| `Notes/me foi feita uma questao.txt` (40 linhas) | `01-alma-e-visao/visao-produto-evasao.md` |
| `Arquivos/SISTEMA_MESTRE_FINAL.md` | Referenciado (já parcialmente absorvido nas specs) |
| `Arquivos/planning-2026-04/` | Referenciado como backup do GSD original (read-only) |
| `traycer-epics/specs/` (5 ficheiros, ~154KB) | `06-engenharia/plano-refactoring-5-waves.md`, `bugs-hotspots-criticos.md` |
| `traycer-epics/tickets/` (60+ ficheiros) | `06-engenharia/inventario-tickets-w0-w5.md` |
| `traycer-epics/executions/` (11 ficheiros) | `06-engenharia/bugs-hotspots-criticos.md` (estado de execução) |
| `Recente/Refactoring_Analysis_—_Onda_Entitlements_+_Core_Trio.md` (231 linhas) | `06-engenharia/entitlements-core-trio-analysis.md` |
| `docs/PDC_v2_—_Plano_Mestre_de_Execução__Ondas_1_a_4.md` (713 linhas) | `06-engenharia/plano-mestre-ondas-1-4.md` |
| `Notes/Estou preocupada com o.txt` (linhas 440–906) | `07-ux-specs/specs-ux-por-pagina.md` |
| `Notes/Estou preocupada com o.txt` (linhas 987–1550) | `07-ux-specs/algoritmo-decisoes-design.md` |
| `Transferências/PDC/Analyses/` (8 .txt, 5 únicos) | `08-analises-externas/arquitectura-resiliencia-telemetria.md`, `design-governanca-doc-is-law.md` |
| `Transferências/PDC/Audit & Premium UI End To End/` (30 .md) | `06-engenharia/audit-premium-ui-e2e-tickets.md` |
| `Documentos/Traycer/` (13 specs UUID + 3 GSD, ~266KB) | `09-traycer-specs/produto-visao-arquitectura.md`, `mapa-paginas-features-transversais.md`, `design-system-completo.md`, `algoritmos-dados-seguranca.md` |

---

*Criado: Abril 2026 · Fontes: 54 ficheiros `/fv/` + 31 `traycer-epics/` + 14 `Recente/` + 2 `docs/` + 36 `Transferências/PDC/` + 19 `Documentos/Traycer/` (13 specs fundadoras + 3 GSD + 3 duplicatas).*
