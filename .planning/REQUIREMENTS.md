# PDC v2 — Mapa de Requisitos (Sincronizado)

> **Status:** Alinhado com `specs/IMPORTANTE/02 — Mapeamento de Funcionalidades (Canónico)` em 23 de Abril de 2026.
> **Regra de Ouro:** Nenhum requisito é considerado "Done" sem passar pelo crivo do ESLint e do CodeRabbit.
>
> **⚠️ Convenção de Estado (rigorosa):**
> - `[x]` = Implementado **E2E** (5 camadas: UI + Shared + BFF + Persistência + Ecossistema)
> - `[~]` = Em progresso ou implementação parcial (schema existe mas sem UI, ou BFF sem persistência, etc.)
> - `[P]` = Parcial — funciona em cenários limitados mas não cobre a spec completa
> - `[ ]` = Não iniciado
> - `[-]` = Descartado
>
> **Referência detalhada:** `docs/arquivo-fundacional/09-traycer-specs/` contém as specs originais com modelos de dados, endpoints e regras field-level.

## Legenda
- **Estado:** `[ ]` Todo | `[x]` Done | `[~]` In Progress | `[-]` Descartado | `[P]` Parcial/Pausado

---

## 1. Núcleo de Decisão Vocacional (N1–N9)
| ID | Requisito | Estado | Wave | Notas |
| --- | --- | --- | --- | --- |
| N1 | Motor de Heurísticas $\phi$ (Fluidez) e $R$ (Resiliência) | `[x]` | W2 | Shared/heuristics.ts |
| N2 | Telemetria Edge-First (L1) | `[x]` | W1 | Apps/edge + Upstash |
| N3 | Idempotência de eventos (UUID + outbox) | `[x]` | W4 | Ativo no BFF |
| N4 | Sanity Validator dual-layer (edge + BFF) | `[x]` | W2 | Validado contra cheats |
| N5 | Score real derivado no BFF (sem hardcode) | `[x]` | W2 | Remove dependência de mocks |
| N6 | Perfil Vocacional automático | `[P]` | W4/P1 | P1 (2026-04-30) fechou loop: BFF persiste resultado em `/perfil-vocacionals` após calcular, FE usa `GET /vocacional/perfil-premium` via `Promise.allSettled`. Faltam: pesos por evento (spec `1a81656f`), validação E2E com Strapi real. |
| N7 | Reputação canónica `/reputacao/me` | `[x]` | W2 | BFF com 3 rotas (`/me`, `/:id`, `/:id/breakdown`), cache Redis, batch recalc. Schema `ReputacaoBreakdownSchema` no Shared (Zod validated). Frontend: `ReputacaoPage` completa (Bento grid, score circular, dimensions, breakdown), `RelatorioVocacional` consome `/reputacao/me`, rota na Sidebar + CommandPalette. Testes unit + integration. |
| N8 | Conquistas via Event Bus (12 regras) | `[x]` | W4 | 12 regras definidas |
| N9 | Relatório Vocacional Premium | `[~]` | W2 | MVP ok; Tina insights pendentes |

## 2. Conteúdo (Domínios) (C1–C10)
| ID | Requisito | Estado | Notas |
| --- | --- | --- | --- |
| C1 | Cursos — CRUD + módulos + itens | `[x]` | Estrutura completa |
| C2 | Simulações Tipo 1 (vídeo guiado + checklist) | `[x]` | Player funcional |
| C3 | Simulações Tipo 2 (laboratório iframe + tracking) | `[x]` | DT-15 fechado: scoring pipeline telemetry-driven em `sim-2-3.engine.ts` (aggregateLabEvent + derivePerSession + finalizeSession). `SIM_TIPO_2_PUBLISH_ENABLED` promovida de ALPHA → STABLE. Publicação controlada por flag operacional (enabled=false por defeito). |
| C4 | Simulações Tipo 3 (interativo + feedback realtime) | `[x]` | DT-15 fechado: mesmo pipeline de scoring Tipo 2/3. `SIM_TIPO_3_PUBLISH_ENABLED` promovida de ALPHA → STABLE. Publicação controlada por flag operacional (enabled=false por defeito). |
| C5 | Experiências (instituições, sempre gratuitas) | `[x]` | Marketing institucional |
| C6 | Programas (contêineres de Cursos + Experiências) | `[~]` | UI de gestão em progresso |
| C7 | Projetos (estudantes publicam) | `[x]` | Votação + feedback (Kudos) |
| C8 | Posts e Conquistas (feed social) | `[x]` | Moderação integrada |
| C9 | Quizzes e Tarefas dentro de Cursos | `[x]` | Notas automáticas |
| C10 | Certificados de conclusão | `[x]` | Página `/estudante/certificados` + BFF `GET /estudante/certificados` |

## 3. Features Transversais (T1–T12)
| ID | Requisito | Estado | Detalhe |
| --- | --- | --- | --- |
| T1 | Like / Curtir (toggle, 1 por user/entidade) | `[x]` | Interaction events |
| T2 | Bookmark / Guardar (privado, toggle) | `[x]` | Página `/guardados` |
| T3 | Comentar (3–1000 chars, 1 nível reply) | `[x]` | Moderação ativa |
| T4 | Avaliar (Rating) 1–5 estrelas | `[x]` | Persistência + elegibilidade: mentor always rateable; curso/simulação ≥30% progressoPercentual (403 caso contrário). 2026-05-03. |
| T5 | Partilhar (Share) interno/externo | `[ ]` | Por integrar |
| T6 | Denunciar (Report) + auto-hide | `[x]` | Fila para moderador |
| T7 | Telemetria (views, scroll, vídeo, decisões) | `[x]` | Identidade Total auditada |
| T8 | Vínculo (Conexão formal bilateral) | `[x]` | Fix: isConnected check em GET /perfis/:id usava senderId/receiverId/estado='connected' (inválidos) → corrigido para solicitante[userId]/destinatario[userId]/status='aprovado'. estudantes-vinculados idem. 2026-05-03. |
| T9 | Notificações sociais/vínculo (agrupamento) | `[~]` | Notificações realtime (Socket.IO) + persisted (`notify.hook.ts`). Agrupamento e push real pendentes pós-launch. |
| T10 | Endorsements / Kudos | `[x]` | `POST /projetos/:id/votos` tipo=endorsement + GET + DELETE; UI botão Star em ProjetoDetailPage; domain event PROJETO_ENDORSEMENT_RECEBIDO. 2026-05-03. |
| T11 | Project Votes (upvote / fork) | `[x]` | `POST /projetos/:id/votos` tipo=voto + GET + DELETE; UI botão ThumbsUp em ProjetoDetailPage. 2026-05-03. |
| T12 | Discussions / Threads | `[P]` | BFF `GET /discussions/:id/replies` funcional. Frontend: `DiscussionThread` + `DiscussionsPanel` (2 componentes com ~56 linhas de lógica). Falta: criação de thread, moderação inline, delete. |

## 4. Plataforma & Identidade (P1–P10)
| ID | Requisito | Estado | Notas |
| --- | --- | --- | --- |
| P1 | Auth JWT em httpOnly cookie + RBAC 7 roles (6 ativos + patrocinador futuro) | `[x]` | RBAC 7 roles completo + `requireApproved` middleware. Sessão absoluta de 90 dias e rotação atómica no Redis conforme ADR-054. |
| P2 | OAuth social login + OTP SMS (Twilio) | `[x]` | Google + LinkedIn com onboarding completo (`oauthVerified`, `oauthProvider`, `onboardingCompleto` em `perfil`). 5 estados canónicos documentados em ADR-010. PROD-A-T05. |
| P3 | 2FA obrigatório em dispositivo novo/não confiável | `[x]` | Browser pode ser confiado por 90 dias após OTP explícito; password login continua obrigatório. ADR-054. |
| P4 | FeatureRegistry SSOT | `[x]` | Registry híbrido com flags operacionais + 6 HUBs; `SIM_TIPO_2/3_PUBLISH_ENABLED` promovidas para `STABLE` (PE-T03 · DT-15 fechado) |
| P5 | `GET /bootstrap` (session/capabilities) | `[x]` | 4 camadas ativas |
| P6 | Rate limiting via Upstash | `[x]` | Middleware integrado |
| P7 | LTI 1.3 Grade Passback | `[P]` | Outbox pattern implementado. Grade passback real requer LMS de teste para validação E2E. OIDC launch flow parcial (ver `arquivo-fundacional/09-traycer-specs/algoritmos-dados-seguranca.md` §6). |
| P8 | Realtime Socket.IO (notificações + mensagens) | `[~]` | Mensagens UI pendente |
| P9 | Tina — Assistente IA (chat + interpretação) | `[~]` | Streaming instável |
| P10 | RAG sobre conteúdos | `[ ]` | "Ask the Lesson" |

## 5. Comunidade & Engagement (F1–F11)
| ID | Requisito | Estado | Notas |
| --- | --- | --- | --- |
| F1 | Streaks — Caminho da Vocação (N dias) | `[ ]` | Proxy via totalEventos no momento |
| F2 | Tribos / Círculos de Interesse (chats) | `[ ]` | REQ-4-010 |
| F3 | Perfil Público Showcase (LinkedIn vocacional) | `[ ]` | REQ-5-006 |
| F4 | Stories — formato vídeo curto vertical | `[ ]` | REQ-4-011 |
| F5 | Pílulas de Conhecimento — micro-simulações | `[ ]` | REQ-4-012 |
| F6 | Push FOMO / Notificações inteligentes | `[~]` | `notify.hook.ts` existe — base implementado, rate-limited per-user (PROD-C). Triggers FOMO específicos ("3 instituições viram o teu perfil", `perfil_visualizado_por_instituicao`, `streak_quebrado`) **não implementados**. Ver DT-14. |
| F7 | Endorsements / Kudos públicos | `[x]` | (= T10 — implementado 2026-05-03 via votos em projetos) |
| F8 | Top Bar com Command+K (search global) | `[x]` | T-REM-3 (2026-04-30). CommandPalette com search dinâmico via `GET /catalogo/explorar` (debounced 300ms), role-awareness (7 roles × nav items), navegação por teclado (↑↓↵), secções Nav + Conteúdo, loading state. |
| F9 | Sidebar slim (retrátil) | `[ ]` | REQ-NF-010 |
| F10 | 15 áreas vocacionais globais | `[x]` | Migrado de 4 áreas (F10) |
| F11 | Rate limit Micro-Desafio (3 grátis) | `[ ]` | REQ-NF-011 |

## 6. Feed & Algoritmo (A1–A5)
| ID | Requisito | Estado | Notas |
| --- | --- | --- | --- |
| A1 | Feed soberano (algoritmo de ranking) | `[x]` | Pipeline 4 passos + 3 rotas BFF (`/feed`, `/feed/geral`, `/feed/trending`). Pesos admin-tunable via Redis. Scoring 7 features × weights. |
| A2 | 4 fontes de feed (Geral/Voc/Inst/Trend) | `[x]` | Geral + Trending + Vocacional + Institucional implementados. `GET /feed/vocacional` (filtra por areaMatch do perfil-vocacional) e `GET /feed/institucional` (filtra por instituicaoNome do perfil). P5 — sessão 2026-04-30. |
| A3 | Comments com moderação inline | `[P]` | Integrado com feed global |
| A4 | Pesos de interação tunáveis via admin | `[x]` | REQ-3-003 |
| A5 | Algoritmo de viralização e descoberta | `[ ]` | Pendente Wave 5 |

## 7. Instituições (B2B) (B1–B9)
| ID | Requisito | Estado | Notas |
| --- | --- | --- | --- |
| B1 | Feature Flags institucionais | `[x]` | Overrides por instituição |
| B2 | Branding white-label (logo, cores) | `[~]` | Backend pendente |
| B3 | Upload de documentos (Alvará, NIF) | `[~]` | Persistência pendente |
| B4 | Workflow de aprovação de instituição | `[ ]` | Status schema pendente |
| B5 | Dashboard de "Saúde do Aluno" | `[ ]` | Risco de evasão (B2B core) |
| B6 | Exportação CSV de estudantes | `[x]` | Filtros 30/60/90d |
| B7 | Métricas por curso (matrículas, dropoff) | `[x]` | Avaliação automática de risco |
| B8 | Propostas diretas (Match Terminal) | `[ ]` | Wave 4 |
| B9 | Calendário de eventos institucionais | `[x]` | Funcional |

## 8. Moderação & Segurança (M1–M7)
| ID | Requisito | Estado | Notas |
| --- | --- | --- | --- |
| M1 | Fila de denúncias | `[x]` | Pendente/Analise/Resolvida |
| M2 | Ações: remover / avisar / ignorar | `[x]` | Com nota interna |
| M3 | Audit trail de moderação | `[x]` | Quem/O quê/IP |
| M4 | Suspender / banir conta | `[x]` | Nivel sistema |
| M5 | Validação científica (Comité) | `[x]` | Draft -> Approved |
| M6 | Auto-hide por threshold de denúncias | `[x]` | Automático |
| M7 | Rate limits globais (anti-spam) | `[x]` | Comments/Interactions |

## 9. Não-Funcionais (NF1–NF7)
| ID | Requisito | Estado | Notas |
| --- | --- | --- | --- |
| NF1 | Zero `any` em TypeScript | `[x]` | Confirmado por grep 2026-04-29 — zero `as any` / `: any` em todo o monorepo |
| NF2 | Acessibilidade total (PWA, contraste) | `[~]` | Foco em Wave 3 |
| NF3 | Rule of 300 linhas por ficheiro | `[~]` | Expansão de 200 -> 300 |
| NF4 | Performance (Sentry, redis cache) | `[x]` | Performance core |
| NF5 | i18n PT base + EN | `[ ]` | Wave 3/5 |
| NF6 | Workers-Clean (BFF portável) | `[x]` | Sem Node APIs exclusivas |
| NF7 | Lighthouse ≥ 90 mobile | `[~]` | Baseline `lighthouserc.json` com thresholds actuais (perf≥75, a11y≥85). Gap de 90 aceite para launch; remediação pós-launch Wave 5. |

## 10. Dívida Técnica Registada

> Fonte canónica: `specs/IMPORTANTE/02 — Mapeamento de Funcionalidades` (secção 11)

| ID | Item | Origem | Estado |
| --- | --- | --- | --- |
| D1 | `apps/api/src/modules/analysis/heuristics.engine.ts` paralelo a `@pdc/shared/heuristics` — consolidar em W3 | `R3-1` | `[x]` — engine é thin wrapper de 25 linhas que delega 100% para `@pdc/shared/heuristics-calculator` (auditado 2026-07-04). |
| D2 | `apps/web/src/features/feed/FeedPage.tsx` — zero casts `as any` confirmado por grep (auditado 2026-07-04) | `R3-1` | `[x]` |
| D3 | Métrica `domain_events_failed_total` em logs; exporter Prometheus/Sentry pendente | `R3-1` | `[ ]` |
| D4 | Naming mismatch de conquistas — `EVENT_TO_TRIGGER_MAP` implementado em conquistas.engine.ts | `T-FIX-3` | `[x]` — mapeamento corrige handler→engine. Condições p/ eventos não-cliente (vinculos) precisam queries Strapi directas (ver DIVIDA_TECNICA). |
| D5 | Outbox Replay scheduler co-located com BFF main (risco de saturação) | Análise técnica | `[x]` ✅ outbox-worker daemon isolado |
| D6 | "Midnight Rollover Bug" potencial na chave Redis de telemetria | Análise técnica | `[x]` ✅ SET NX EX 7d (UUID-based) |
| D7 | Race condition entre Edge URL e BFF fallback | Análise técnica | `[ ]` |

## 11. Bugs Activos (Auditoria de Implementação)

| ID | Descrição | Spec | Estado |
| --- | --- | --- | --- |
| BUG-01 | Edge `validEvents` ReferenceError no POST | E2 | `[x]` — variável `validEvents` não existe no Edge; POST usa `processedEvents.length` (auditado 2026-07-04). |
| BUG-02 | Drift de áreas: 4 vs 15 inconsistente (F10) | E1 | `[x]` |
| BUG-03 | Viewport `user-scalable=no` bloqueia a11y | D1 | `[x]` — já correcto: `width=device-width, initial-scale=1.0, viewport-fit=cover` sem `user-scalable=no` |
| BUG-04 | Manifest `theme_color` Amber vs Dark Elite | D1 | `[x]` — corrigido para `#0E0D0C` (Dark Elite) em 2026-04-30 |
| BUG-05 | OTP Twilio mockado (Impede onboarding real) — `REQ-1-010` | E4 | `[x]` |
| BUG-06 | Telemetria `payload` vs `dados` (D20 mismatch) | Auditoria | `[x]` |
| BUG-07 | Missing `Tentativa.metadata` no CMS (D21) | Auditoria | `[x]` — campo `metadata` presente no schema Strapi (`api::tentativa.tentativa`) e BFF envia em POST/PUT (auditado 2026-07-04). |
| BUG-08 | Drift nomenclature datas (D22: `startedAt`/`finishedAt` vs `dataInicio`/`dataFim`) | Auditoria | `[x]` — campos `startedAt`/`finishedAt` removidos do schema Strapi `api::tentativa.tentativa`; contrato canónico `dataInicio`/`dataFim` preservado. Ver ADR-045 (auditado 2026-07-04). |
| BUG-09 | Outbox Replay manual-only | Auditoria | `[x]` |
| BUG-10 | Cloudflare R2 Keys expostas em plain text | Auditoria | `[-]` | Deferido: gestão operacional (secrets manager / env encriptadas no host). Não é problema de código. Verificar na checklist de deploy. |

---

## 12. Referências ao Arquivo Fundacional

Para detalhes field-level sobre cada requisito, consultar:

| Tema | Ficheiro no arquivo-fundacional |
|------|--------------------------------|
| Features Transversais (T1-T12) | `09-traycer-specs/mapa-paginas-features-transversais.md` |
| Algoritmo Feed/Ranking (A1-A5) | `09-traycer-specs/algoritmos-dados-seguranca.md` §1 |
| Telemetria/Vocacional (N1-N9) | `09-traycer-specs/algoritmos-dados-seguranca.md` §2 |
| Segurança/Rate Limits (M1-M7) | `09-traycer-specs/algoritmos-dados-seguranca.md` §3 |
| Design System (NF2) | `09-traycer-specs/design-system-completo.md` |
| Mapa de Rotas por Role | `09-traycer-specs/mapa-paginas-features-transversais.md` Part A |
| Modelo Dados Strapi | `09-traycer-specs/algoritmos-dados-seguranca.md` §4 |
| Diagnóstico Hotspots | `06-engenharia/entitlements-core-trio-analysis.md` |
| Pesos Vocacionais (11 tipos) | `docs/ROADMAP_PRODUTO_DISRUPTIVO.md` §Tier 1 |

---
*Última auditoria: 4 de Julho de 2026 · H2-T6: reconciliação de D1/D2/BUG-01/BUG-07/BUG-08 após Integrity Hardening H1/H2.*
