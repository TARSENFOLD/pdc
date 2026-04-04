# PDC v2 — Roadmap GSD

> Fonte de verdade para o estado de entrega e próximas tarefas.  
> Actualizar após cada milestone concluído.  
> **Última actualização:** 2026

---

## Estado Real das Fases

| Fase | Estado | Notas |
|------|--------|-------|
| Fase 0 — Fundação | ✅ Completa | Monorepo, tooling, Docker, CI/CD |
| Fase 1 — Auth Segura | ✅ Parcial | JWT httpOnly + RBAC + rate limiting ✅; Google OAuth + 2FA ❌ |
| Fase 2 — Design System | ✅ Completa | Componentes base, layouts por role, landing, auth pages |
| Fase 3 — API Layer | ✅ Completa | Strapi client, R2, 7 módulos de domínio |
| Fase 4 — Core Produto | ✅ Parcial | Sim Tipo 1+2, Cursos, Experiências, Projetos, Mentorias, Conquistas ✅; Sim Tipo 3, Programas, Conquistas automáticas, Feed ❌ |
| Fase 5 — LTI 1.3 | ✅ Completa | OIDC, AGS, NRPS, JWKS, admin CRUD, frontend |
| Fase 6 — Moderação/Admin | ✅ Completa | Denúncias, painel admin, audit trail, CSP/CORS |
| Fase 7 — IA e Realtime | ✅ Completa | DeepSeek streaming, RAG, quiz gen, Socket.IO, TutorChat, QuizPlayer |

**Resultado:** Fases 0–7 completas no essencial. Pendente: build limpo, features transversais, auth completo, páginas públicas, SEO/performance, telemetria robusta.

---

## ⚡ Task #1 — Fix TypeScript Build Errors (M0-T1)

**Porquê agora:** `tsc --noEmit` falha em `apps/web` devido a erros pré-existentes. REQ-NF-003 (zero TypeScript errors) bloqueia produção e todo o trabalho seguinte. São correções pontuais (< 2h) com impacto imediato.

**O que fazer:**
1. `apps/web/src/lib/api/admin.ts` e `denuncias.ts` — substituir `apiClient` por `fetch` (client não existe)
2. `AdminAuditPage.tsx` e `AdminUtilizadoresPage.tsx` — `Avatar` não aceita prop `name`; usar `fallback`
3. `LtiPlataformasPage.tsx` — variantes `"destructive"/"outline"/"secondary"` inválidas; `isOpen` → `open` no Modal; `headers` não existe na API do Table
4. `DenunciaDetailPage.tsx` e `SolicitarMentoriaModal.tsx` — propriedades de tipo incorrectas
5. Confirmar com `npx tsc --noEmit` nos dois workspaces

---

## M0 — Build Limpo e Qualidade Base

**Goal:** `tsc --noEmit` passa sem erros em `apps/web` e `apps/api`. Base sólida para continuar.

| ID | Título | Estado | Prioridade |
|----|--------|--------|------------|
| **M0-T1** | **Fix: `apiClient` → fetch em `lib/api/admin.ts` e `denuncias.ts`** | `[ ]` | 🔴 Crítico |
| M0-T2 | Fix: `Avatar` prop `name` → `fallback` em AdminAuditPage e AdminUtilizadoresPage | `[ ]` | 🔴 Crítico |
| M0-T3 | Fix: LtiPlataformasPage — variantes Button, prop Modal (`isOpen`→`open`), API Table | `[ ]` | 🔴 Crítico |
| M0-T4 | Fix: DenunciaDetailPage e SolicitarMentoriaModal — propriedades incorrectas | `[ ]` | 🔴 Crítico |
| M0-T5 | Verificar `tsc --noEmit` em ambos os workspaces (zero erros) | `[ ]` | 🔴 Crítico |
| M0-T6 | Actualizar `STATE.md` e `REQUIREMENTS.md` com estado real (Fases 0–7 completas) | `[ ]` | 🟠 Alto |

---

## M1 — Features Transversais

**Goal:** Likes, Bookmarks, Avaliações e Comentários implementados. Alimentam o feed e a telemetria.

| ID | Título | Estado | Prioridade |
|----|--------|--------|------------|
| M1-T1 | Strapi: collections `like`, `bookmark`, `rating`, `comment` com índices únicos | `[ ]` | 🔴 Crítico |
| M1-T2 | BFF: `POST/GET /interactions/like` — toggle, count, status por utilizador | `[ ]` | 🔴 Crítico |
| M1-T3 | BFF: `POST/GET /interactions/bookmark` — toggle e listagem pessoal | `[ ]` | 🔴 Crítico |
| M1-T4 | BFF: `POST/GET /ratings` — avaliação 1–5 por `targetType`+`targetId` | `[ ]` | 🔴 Crítico |
| M1-T5 | BFF: `POST/GET /comments` — comentários com moderação (estado `pendente`) | `[ ]` | 🟠 Alto |
| M1-T6 | BFF: `entity_score` — job que agrega likes+ratings+completion num único score | `[ ]` | 🟠 Alto |
| M1-T7 | Frontend: componentes `LikeButton`, `BookmarkButton`, `RatingStars` | `[ ]` | 🟠 Alto |
| M1-T8 | Frontend: integrar componentes nas páginas Cursos, Experiências, Simulações, Projetos | `[ ]` | 🟠 Alto |
| M1-T9 | Frontend: página `/perfil/:id` com feed de conquistas e projetos públicos | `[ ]` | 🟡 Médio |

---

## M2 — Feed e Algoritmo de Ranking

**Goal:** 4 feeds personalizados (Geral, Vocacional, Institucional, Trending) com scoring determinístico.

| ID | Título | Estado | Prioridade |
|----|--------|--------|------------|
| M2-T1 | Strapi: collection `entity_score` (aggregated score por entidade) | `[ ]` | 🔴 Crítico |
| M2-T2 | BFF: pipeline candidatos — 5 fontes (in-network, área, trending, novo, institucional) | `[ ]` | 🔴 Crítico |
| M2-T3 | BFF: hidratação de features (engagement, completion_rate, recency, author_reputation) | `[ ]` | 🔴 Crítico |
| M2-T4 | BFF: fórmula de scoring com pesos configuráveis por tipo de feed | `[ ]` | 🔴 Crítico |
| M2-T5 | BFF: filtros pós-ranking (anti-repetição, limite por autor, conteúdo bloqueado) | `[ ]` | 🟠 Alto |
| M2-T6 | BFF: `GET /feed/geral`, `/feed/vocacional`, `/feed/institucional`, `/feed/trending` | `[ ]` | 🔴 Crítico |
| M2-T7 | Frontend: `FeedPage` com 4 tabs e scroll infinito | `[ ]` | 🟠 Alto |
| M2-T8 | Admin: configuração de pesos do feed via painel (sem deploy) | `[ ]` | 🟡 Médio |

---

## M3 — Auth Completo (OAuth + 2FA)

**Goal:** Google OAuth e OTP 2FA para mercado angolano. Completar REQ-1-008/009/010.

| ID | Título | Estado | Prioridade |
|----|--------|--------|------------|
| M3-T1 | Strapi: campos `googleId`, `otpSecret`, `otpEnabled` no schema `Perfil` | `[ ]` | 🟠 Alto |
| M3-T2 | BFF: `GET /auth/google` + `GET /auth/google/callback` com `passport-google-oauth2` | `[ ]` | 🟠 Alto |
| M3-T3 | Frontend: botão "Entrar com Google" nas páginas Login e Criar Conta | `[ ]` | 🟠 Alto |
| M3-T4 | BFF: `POST /auth/otp/send` via SendGrid — código 6 dígitos, expiração 10min | `[ ]` | 🟠 Alto |
| M3-T5 | BFF: `POST /auth/otp/verify` — valida OTP e completa login com cookie JWT | `[ ]` | 🟠 Alto |
| M3-T6 | BFF: `POST /auth/otp/sms` via Twilio para números angolanos (+244) | `[ ]` | 🟡 Médio |
| M3-T7 | Frontend: fluxo de 2FA no login (step 2 após password bem-sucedida) | `[ ]` | 🟠 Alto |

---

## M4 — Completar Core Produto

**Goal:** Programas, Simulação Tipo 3 e Conquistas automáticas. Completar REQ-4-003/009/013.

| ID | Título | Estado | Prioridade |
|----|--------|--------|------------|
| M4-T1 | Strapi: collection `programa` com relações a cursos/experiências + `inscricao_programa` | `[ ]` | 🟠 Alto |
| M4-T2 | BFF: `GET/POST /programas`, `PATCH /programas/:id`, `POST /programas/:id/inscrever` | `[ ]` | 🟠 Alto |
| M4-T3 | Frontend: `ProgramasPage` (catálogo + detalhe + inscrição) | `[ ]` | 🟠 Alto |
| M4-T4 | BFF: Simulação Tipo 3 — ambiente interativo com questões + feedback AI inline | `[ ]` | 🟠 Alto |
| M4-T5 | Frontend: `SimulacaoTipo3` player com AI tutor inline (integra `TutorChat`) | `[ ]` | 🟠 Alto |
| M4-T6 | BFF: motor de conquistas automáticas — regras trigger por evento de telemetria | `[ ]` | 🟠 Alto |
| M4-T7 | BFF: `POST /conquistas/verificar` — executa regras após cada evento relevante | `[ ]` | 🟠 Alto |
| M4-T8 | Strapi: campos `trigger`, `condicao` e `tipo` (automatica/manual/institucional) na collection `conquista` | `[ ]` | 🟠 Alto |

---

## M5 — Páginas Públicas e SEO

**Goal:** Zona pública completa, catálogos, SEO estruturado. Performance Lighthouse ≥ 90.

| ID | Título | Estado | Prioridade |
|----|--------|--------|------------|
| M5-T1 | Frontend: `ExplorarPage` — catálogo geral com filtros por tipo | `[ ]` | 🟠 Alto |
| M5-T2 | Frontend: `ProgramasCatalogo` — `/programas` público com filtros | `[ ]` | 🟠 Alto |
| M5-T3 | Frontend: `MentoresPage` — `/mentores` com filtros área, avaliação, disponibilidade | `[ ]` | 🟠 Alto |
| M5-T4 | Frontend: `InstituicoesPage` — `/instituicoes` com filtros | `[ ]` | 🟠 Alto |
| M5-T5 | Frontend: `PerfilPublicoPage` — `/perfil/:id` com conquistas e projetos | `[ ]` | 🟠 Alto |
| M5-T6 | Frontend: `/termos` e `/privacidade` — páginas legais | `[ ]` | 🟡 Médio |
| M5-T7 | SEO: meta tags + Open Graph + Twitter Card em todas as páginas públicas | `[ ]` | 🟠 Alto |
| M5-T8 | SEO: JSON-LD para Cursos (`schema.org/Course`) e Mentores (`schema.org/Person`) | `[ ]` | 🟡 Médio |
| M5-T9 | Performance: lazy loading por rota com `React.lazy` + `Suspense` | `[ ]` | 🟠 Alto |
| M5-T10 | Performance: `manifest.json` + service worker básico (PWA offline shell) | `[ ]` | 🟡 Médio |
| M5-T11 | Performance: Lighthouse ≥ 90 em mobile na landing page | `[ ]` | 🔴 Crítico |

---

## M6 — Telemetria Completa

**Goal:** Pipeline robusto com idempotência por `eventId`, batch processing e actualização automática do perfil vocacional.

| ID | Título | Estado | Prioridade |
|----|--------|--------|------------|
| M6-T1 | Strapi: adicionar `eventId` UUID, `sessionId`, `correlationId` ao schema `telemetria` | `[ ]` | 🔴 Crítico |
| M6-T2 | BFF: `POST /telemetria/batch` com deduplicação por `eventId` (idempotência) | `[ ]` | 🔴 Crítico |
| M6-T3 | Frontend: `useTelemetry` hook com buffer (máx 20 eventos ou flush a cada 30s) | `[ ]` | 🟠 Alto |
| M6-T4 | Frontend: implementar os 40+ tipos de eventos do catálogo (navegação, simulação, cursos, decisão) | `[ ]` | 🟠 Alto |
| M6-T5 | BFF: job assíncrono (cron 5min) — re-calcular `perfil_vocacional` por aluno | `[ ]` | 🟠 Alto |
| M6-T6 | BFF: `GET /admin/relatorios/instituicao/:id` — relatório de telemetria institucional | `[ ]` | 🟡 Médio |

---

## M7 — Qualidade e Produção

**Goal:** Zero erros de lint/type, observabilidade com Sentry, acessibilidade, documentação actualizada.

| ID | Título | Estado | Prioridade |
|----|--------|--------|------------|
| M7-T1 | Sentry integrado em `apps/web` e `apps/api` com DSN por variável de ambiente | `[ ]` | 🟠 Alto |
| M7-T2 | BFF: `GET /health` com status de PostgreSQL (via Strapi) e Redis | `[ ]` | 🟠 Alto |
| M7-T3 | Substituir todos os `console.log` por `pino` logger estruturado | `[ ]` | 🟠 Alto |
| M7-T4 | Acessibilidade: axe-core sem erros críticos (labels, alt text, foco de teclado) | `[ ]` | 🟠 Alto |
| M7-T5 | Design: aplicar `Instrument Serif` para headings de impacto (hero, títulos h1) | `[ ]` | 🟡 Médio |
| M7-T6 | Mensagens realtime entre utilizadores (`socket.emit('mensagem')` + notificação) | `[ ]` | 🟡 Médio |
| M7-T7 | Documentação: actualizar `docs/api/` com todos os novos endpoints (M1–M4) | `[ ]` | 🟡 Médio |
| M7-T8 | Actualizar `STATE.md` e `REQUIREMENTS.md` com estado real das fases concluídas | `[ ]` | 🟠 Alto |

---

## Sequência Recomendada

```
M0 (Fix builds) → M1 (Interações) → M2 (Feed) → M3 (Auth completo)
                                                        ↓
                                      M4 (Core produto)  M5 (Públicas + SEO)
                                                        ↓
                                         M6 (Telemetria) + M7 (Qualidade)
```

M0 desbloqueado por ser rápido e necessário.  
M1 antes de M2 porque o feed consome os scores gerados pelas interações.  
M3 pode correr em paralelo com M4/M5 se houver capacidade.  
M6 e M7 são contínuos — podem ser feitos incrementalmente em qualquer momento.

---

## Decisões de Arquitectura Registadas

| Data | Decisão | Racional |
|------|---------|---------|
| Abr 2026 | Monorepo npm workspaces (sem Turborepo/Nx) | Overhead desnecessário para equipa pequena |
| Abr 2026 | Hono v4 como BFF (não Express) | 3× menos overhead; TypeScript nativo |
| Abr 2026 | TailwindCSS v4 (CSS-first, sem tailwind.config.js) | Melhor performance; tokens nativos |
| Abr 2026 | JWT httpOnly cookies (nunca localStorage) | Elimina vulnerabilidade crítica do projecto anterior |
| Abr 2026 | DeepSeek principal + Ollama falllback | DeepSeek para produção; Ollama para dev local |
| Abr 2026 | Upload até 50MB direto; vídeos via YouTube/Vimeo | Custo controlado; R2 para assets estáticos |
| Abr 2026 | Scoring determinístico no feed (não ML) | ML requer volume de dados que o MVP não tem ainda |
| Abr 2026 | Modelo polimórfico para interações (targetType + targetId) | Evita N tabelas separadas por tipo de entidade |

---

*Generated from 19 .planning specs — Abr 2026*
