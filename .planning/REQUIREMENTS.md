# PDC v2 — Mapa de Requisitos (Sincronizado)

> **Status:** Alinhado com `specs/IMPORTANTE/02 — Mapeamento de Funcionalidades (Canónico)` em 23 de Abril de 2026.
> **Regra de Ouro:** Nenhum requisito é considerado "Done" sem passar pelo crivo do ESLint e do CodeRabbit.

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
| N6 | Perfil Vocacional automático | `[x]` | W4 | 6 dimensões + 4 tiers |
| N7 | Reputação canónica `/reputacao/me` | `[x]` | W2 | Cache Redis ativa |
| N8 | Conquistas via Event Bus (12 regras) | `[x]` | W4 | 12 regras definidas |
| N9 | Relatório Vocacional Premium | `[~]` | W2 | MVP ok; Tina insights pendentes |

## 2. Conteúdo (Domínios) (C1–C10)
| ID | Requisito | Estado | Notas |
| --- | --- | --- | --- |
| C1 | Cursos — CRUD + módulos + itens | `[x]` | Estrutura completa |
| C2 | Simulações Tipo 1 (vídeo guiado + checklist) | `[x]` | Player funcional |
| C3 | Simulações Tipo 2 (laboratório iframe + tracking) | `[x]` | Score derivado real |
| C4 | Simulações Tipo 3 (interativo + feedback realtime) | `[x]` | Tipo3Player.tsx |
| C5 | Experiências (instituições, sempre gratuitas) | `[x]` | Marketing institucional |
| C6 | Programas (contêineres de Cursos + Experiências) | `[~]` | UI de gestão em progresso |
| C7 | Projetos (estudantes publicam) | `[x]` | Votação + feedback (Kudos) |
| C8 | Posts e Conquistas (feed social) | `[x]` | Moderação integrada |
| C9 | Quizzes e Tarefas dentro de Cursos | `[x]` | Notas automáticas |
| C10 | Certificados de conclusão | `[x]` | Página `/estudante/certificados` |

## 3. Features Transversais (T1–T12)
| ID | Requisito | Estado | Detalhe |
| --- | --- | --- | --- |
| T1 | Like / Curtir (toggle, 1 por user/entidade) | `[x]` | Interaction events |
| T2 | Bookmark / Guardar (privado, toggle) | `[x]` | Página `/guardados` |
| T3 | Comentar (3–1000 chars, 1 nível reply) | `[x]` | Moderação ativa |
| T4 | Avaliar (Rating) 1–5 estrelas | `[~]` | Persistência PostgreSQL migrada |
| T5 | Partilhar (Share) interno/externo | `[ ]` | Por integrar |
| T6 | Denunciar (Report) + auto-hide | `[x]` | Fila para moderador |
| T7 | Telemetria (views, scroll, vídeo, decisões) | `[x]` | Identidade Total auditada |
| T8 | Vínculo (Conexão formal bilateral) | `[~]` | Drift: schema shared vs apps/api serializer |
| T9 | Notificações sociais/vínculo (agrupamento) | `[x]` | Push + Socket.IO |
| T10 | Endorsements / Kudos | `[x]` | REQ-4-014 |
| T11 | Project Votes (upvote / fork) | `[x]` | Pesos contribuem para feed |
| T12 | Discussions / Threads | `[x]` | REQ-5-007 |

## 4. Plataforma & Identidade (P1–P10)
| ID | Requisito | Estado | Notas |
| --- | --- | --- | --- |
| P1 | Auth JWT em httpOnly cookie + RBAC 7 roles (6 ativos + patrocinador futuro) | `[~]` | Rotação de tokens pendente |
| P2 | OAuth social login + OTP SMS (Twilio) | `[~]` | Twilio mockado |
| P3 | 2FA obrigatório no login | `[x]` | Hardening completo |
| P4 | FeatureRegistry SSOT | `[x]` | 7 features + 6 HUBs |
| P5 | `GET /bootstrap` (session/capabilities) | `[x]` | 4 camadas ativas |
| P6 | Rate limiting via Upstash | `[x]` | Middleware integrado |
| P7 | LTI 1.3 Grade Passback | `[x]` | Outbox pattern + retry |
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
| F6 | Push FOMO / Notificações inteligentes | `[x]` | Baseadas em telemetria |
| F7 | Endorsements / Kudos públicos | `[x]` | (= T10) |
| F8 | Top Bar com Command+K (search global) | `[ ]` | REQ-NF-009 |
| F9 | Sidebar slim (retrátil) | `[ ]` | REQ-NF-010 |
| F10 | 15 áreas vocacionais globais | `[x]` | Migrado de 4 áreas (F10) |
| F11 | Rate limit Micro-Desafio (3 grátis) | `[ ]` | REQ-NF-011 |

## 6. Feed & Algoritmo (A1–A5)
| ID | Requisito | Estado | Notas |
| --- | --- | --- | --- |
| A1 | Feed soberano (algoritmo de ranking) | `[x]` | Cache Redis + pesos |
| A2 | 4 fontes de feed (Geral/Voc/Inst/Trend) | `[P]` | Parcial: grouped fetch pendente |
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
| NF1 | Zero `any` em TypeScript | `[~]` | Redução massiva (~40 remanescentes) |
| NF2 | Acessibilidade total (PWA, contraste) | `[~]` | Foco em Wave 3 |
| NF3 | Rule of 300 linhas por ficheiro | `[~]` | Expansão de 200 -> 300 |
| NF4 | Performance (Sentry, redis cache) | `[x]` | Performance core |
| NF5 | i18n PT base + EN | `[ ]` | Wave 3/5 |
| NF6 | Workers-Clean (BFF portável) | `[x]` | Sem Node APIs exclusivas |
| NF7 | Lighthouse ≥ 90 mobile | `[ ]` | Wave 5 |

## 10. Dívida Técnica Registada

> Fonte canónica: `specs/IMPORTANTE/02 — Mapeamento de Funcionalidades` (secção 11)

| ID | Item | Origem | Estado |
| --- | --- | --- | --- |
| D1 | `apps/api/src/modules/analysis/heuristics.engine.ts` paralelo a `@pdc/shared/heuristics` — consolidar em W3 | `R3-1` | `[ ]` |
| D2 | `apps/web/src/features/feed/FeedPage.tsx` contém 4 `any` — limpar em `W4-T2` | `R3-1` | `[ ]` |
| D3 | Métrica `domain_events_failed_total` em logs; exporter Prometheus/Sentry pendente | `R3-1` | `[ ]` |
| D4 | Naming mismatch de conquistas (12 regras nunca disparam) | `T-FIX-3` | `[ ]` |
| D5 | Outbox Replay scheduler co-located com BFF main (risco de saturação) | Análise técnica | `[ ]` |
| D6 | "Midnight Rollover Bug" potencial na chave Redis de telemetria | Análise técnica | `[ ]` |
| D7 | Race condition entre Edge URL e BFF fallback | Análise técnica | `[ ]` |

## 11. Bugs Activos (Auditoria de Implementação)

| ID | Descrição | Spec | Estado |
| --- | --- | --- | --- |
| BUG-01 | Edge `validEvents` ReferenceError no POST | E2 | `[~]` |
| BUG-02 | Drift de áreas: 4 vs 15 inconsistente (F10) | E1 | `[x]` |
| BUG-03 | Viewport `user-scalable=no` bloqueia a11y | D1 | `[ ]` |
| BUG-04 | Manifest `theme_color` Amber vs Dark Elite | D1 | `[ ]` |
| BUG-05 | OTP Twilio mockado (Impede onboarding real) — `REQ-1-010` | E4 | `[ ]` |
| BUG-06 | Telemetria `payload` vs `dados` (D20 mismatch) | Auditoria | `[x]` |
| BUG-07 | Missing `Tentativa.metadata` no CMS (D21) | Auditoria | `[ ]` |
| BUG-08 | Drift nomenclature datas (D22: StartAt vs Início) | Auditoria | `[ ]` |
| BUG-09 | Outbox Replay manual-only | Auditoria | `[x]` |
| BUG-10 | Cloudflare R2 Keys expostas em plain text | Auditoria | `[ ]` |

---
*Última auditoria: 23 de Abril de 2026 · Alinhado com `specs/IMPORTANTE/02`.*