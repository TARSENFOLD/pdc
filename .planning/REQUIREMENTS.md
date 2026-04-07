# PDC v2 — Requirements

> Fonte de verdade para requisitos com rastreabilidade por fase. Cada requisito tem ID único, fase, prioridade e critério de verificação. Actualizar após cada fase concluída.

## Como usar este ficheiro

- **ID:** `REQ-[FASE]-[NNN]` — ex: `REQ-0-001`
- **Prioridade:** 🔴 Crítico | 🟠 Alto | 🟡 Médio | 🟢 Baixo
- **Estado:** `[ ]` Todo | `[x]` Done | `[~]` In Progress | `[-]` Descartado

## Fase 0 — Fundação

**Objetivo:** Repositório limpo, tooling configurado, CI/CD básico, ambiente de desenvolvimento funcional no Fedora 43.

| ID | Requisito | Prioridade | Estado | Critério de Verificação |
| --- | --- | --- | --- | --- |
| REQ-0-001 | Criar repositório `pdc-v2` com estrutura de monorepo npm workspaces | 🔴 | `[x]` | `npm install` na raiz instala dependências de todos os workspaces |
| REQ-0-002 | Workspace `apps/web` com Vite + React 18 + TypeScript estrito | 🔴 | `[x]` | `npm run build` em `apps/web` sem erros ou warnings |
| REQ-0-003 | Workspace `apps/api` com Hono + Node.js 24 + TypeScript estrito | 🔴 | `[x]` | `npm run build` em `apps/api` sem erros ou warnings |
| REQ-0-004 | Strapi v5 instalado e funcional | 🔴 | `[~]` | `infra/strapi/package.json` v5.0 ✅; Config de prod ❌ |
| REQ-0-005 | ESLint + Prettier configurados em todos os workspaces | 🟠 | `[x]` | `npm run lint` na raiz passa sem erros |
| REQ-0-006 | Husky pre-commit: lint + type-check antes de cada commit | 🟠 | `[x]` | Commit com erro de lint é bloqueado automaticamente |
| REQ-0-007 | GitHub Actions: pipeline CI com build + lint em cada PR | 🟠 | `[x]` | PR com erro de build falha o CI |
| REQ-0-008 | Docker Compose para dev local (Strapi + PostgreSQL + Redis) | 🟠 | `[x]` | `docker compose up -d` inicia todos os serviços |
| REQ-0-009 | Pasta `.planning/` com PROJECT.md, REQUIREMENTS.md, STATE.md | 🟡 | `[x]` | Ficheiros existem e são válidos |
| REQ-0-010 | `.nvmrc` com Node.js 24 LTS | 🟡 | `[x]` | `nvm use` selecciona Node 24 automaticamente |
| REQ-0-011 | Volumes Docker com flag `:Z` para compatibilidade SELinux (Fedora) | 🟡 | `[x]` | Containers iniciam sem erros de permissão no Fedora 43 |

## Fase 1 — Autenticação Segura

**Objetivo:** Auth robusto com JWT httpOnly, 2FA, Google OAuth. Zero sessionStorage.

| ID | Requisito | Prioridade | Estado | Critério de Verificação |
| --- | --- | --- | --- | --- |
| REQ-1-001 | Endpoint `POST /auth/register` com validação Zod e bcrypt | 🔴 | `[x]` | Registo cria perfil no Strapi; password nunca retornada |
| REQ-1-002 | Endpoint `POST /auth/login` com JWT em httpOnly cookie | 🔴 | `[x]` | Cookie `access_token` definido com `httpOnly`, `secure`, `sameSite=strict` |
| REQ-1-003 | Access token com expiração de 15 minutos | 🔴 | `[x]` | Token expirado retorna 401; refresh token renova automaticamente |
| REQ-1-004 | Refresh token com expiração de 7 dias e rotação | 🔴 | `[x]` | Cada uso do refresh token gera novo par de tokens |
| REQ-1-005 | Endpoint `POST /auth/logout` revoga refresh token | 🔴 | `[x]` | Após logout, refresh token não funciona |
| REQ-1-006 | RBAC no servidor — 6 roles verificados em cada rota protegida | 🔴 | `[x]` | Rota de admin retorna 403 para role `aluno` |
| REQ-1-007 | Rate limiting via Upstash Redis em `/auth/*` (5 req/min por IP) | 🔴 | `[x]` | 6ª tentativa de login retorna 429 |
| REQ-1-008 | Login social Google OAuth 2.0 | 🟠 | `[x]` | `apps/api/src/routes/auth.ts` (Passport ✅) |
| REQ-1-009 | MFA/2FA via código 6 dígitos (Email/SMS) | 🟠 | `[x]` | `apps/api/src/routes/auth.ts` (BFF ✅) |
| REQ-1-010 | OTP por SMS (Twilio) como alternativa ao email | 🟡 | `[-]` | Descartado para MVP; mantida apenas estrutura no BFF |
| REQ-1-011 | Frontend: AuthContext sem sessionStorage — estado derivado do cookie | 🔴 | `[x]` | Refresh da página mantém sessão; DevTools não mostra token |
| REQ-1-012 | Endpoint `GET /auth/me` retorna perfil do utilizador autenticado | 🔴 | `[x]` | Retorna perfil completo; 401 sem cookie válido |
| REQ-1-013 | Mass assignment protection — apenas campos permitidos aceites | 🔴 | `[x]` | Campo `role` no body de registo é ignorado |

## Fase 2 — Design System e Frontend Base

**Objetivo:** Componentes unificados, premium, sem duplicação. React Query como único estado servidor.

| ID | Requisito | Prioridade | Estado | Critério de Verificação |
| --- | --- | --- | --- | --- |
| REQ-2-001 | TailwindCSS v4 com tokens de design (cores, tipografia, espaçamento) | 🔴 | `[x]` | Tokens definidos em CSS; sem valores hardcoded |
| REQ-2-002 | Componentes base: Button, Input, Card, Modal, Badge, Avatar, Spinner, Toast, Tabs, Table, Pagination | 🔴 | `[x]` | Cada componente tem variantes documentadas; sem duplicados |
| REQ-2-003 | Radix UI como base de componentes acessíveis (headless) | 🟠 | `[x]` | Componentes passam em testes de acessibilidade básicos (labels, foco) |
| REQ-2-004 | Motion v11+ para animações suaves (entrada, saída, hover, scroll) | 🟠 | `[x]` | Animações respeitam `prefers-reduced-motion` |
| REQ-2-005 | React Query v5 como único estado servidor — sem Redux, sem SWR | 🔴 | `[x]` | Nenhum import de `redux`, `react-redux`, `swr` no projecto |
| REQ-2-006 | Layout por role com sidebar adaptativa (6 roles diferentes) | 🔴 | `[x]` | Cada role vê apenas os itens de menu que lhe pertencem |
| REQ-2-007 | Landing page com copy forte, espaços em branco, animações suaves | 🔴 | `[x]` | Lighthouse Performance ≥ 90 em mobile |
| REQ-2-008 | Páginas de auth: login, registo, recuperação de password | 🔴 | `[x]` | Fluxo completo funcional com dados reais |
| REQ-2-009 | Dashboards por role (Estudante, Mentor, Instituição, Moderador, Admin) | 🟠 | `[x]` | Cada dashboard mostra dados reais do utilizador autenticado |
| REQ-2-010 | Design responsivo — mobile-first, funcional em ecrãs de 320px+ | 🟠 | `[x]` | Sem overflow horizontal em mobile; touch targets ≥ 44px |

## Fase 3 — API Layer Modular

**Objetivo:** Substituir o monolito `strapiApi.js` por módulos de API organizados por domínio.

| ID | Requisito | Prioridade | Estado | Critério de Verificação |
| --- | --- | --- | --- | --- |
| REQ-3-001 | Módulo `lib/api/perfis.ts` — CRUD de perfis (max 200 linhas) | 🔴 | `[x]` | Ficheiro tem menos de 200 linhas; tipagem completa |
| REQ-3-002 | Módulo `lib/api/cursos.ts` — catálogo, detalhe, inscrições | 🔴 | `[x]` | Idem |
| REQ-3-003 | Módulo `lib/api/simulacoes.ts` — catálogo, tentativas, scores | 🔴 | `[x]` | Idem |
| REQ-3-004 | Módulo `lib/api/experiencias.ts` — catálogo, detalhe | 🔴 | `[x]` | Idem |
| REQ-3-005 | Módulo `lib/api/notificacoes.ts` — CRUD + realtime | 🟠 | `[x]` | Idem |
| REQ-3-006 | Módulo `lib/api/mensagens.ts` — CRUD + realtime | 🟠 | `[x]` | Idem |
| REQ-3-007 | Módulo `lib/api/media.ts` — upload para Cloudflare R2 | 🔴 | `[x]` | Upload de ficheiro até 50MB retorna URL pública |
| REQ-3-008 | Zero mocks de dados (erro explícito) | 🔴 | `[~]` | BFF real ✅; UI esconde secções em erro em vez de avisar ❌ |
| REQ-3-009 | Cliente Strapi v5 tipado com tipos gerados dos schemas | 🟠 | `[x]` | Tipos TypeScript correspondem aos schemas Strapi |
| REQ-3-010 | Limites de input em todas as rotas BFF (Zod) | 🔴 | `[x]` | Input com campo extra é rejeitado com 400 |

## Fase 4 — Core do Produto

**Objetivo:** Fluxos principais funcionais com dados 100% reais.

| ID | Requisito | Prioridade | Estado | Critério de Verificação |
| --- | --- | --- | --- | --- |
| REQ-4-001 | Simulação Tipo 1: vídeo guiado + checklist + avaliação por critérios | 🔴 | `[x]` | Estudante completa simulação; score guardado no Strapi |
| REQ-4-002 | Simulação Tipo 2: iframe de laboratório externo + tracking de tentativas | 🔴 | `[x]` | Tentativa registada com `eventId` UUID único |
| REQ-4-003 | Simulação Tipo 3: ambiente interativo com feedback em tempo real | 🟠 | `[ ]` | Feedback gerado e guardado após conclusão |
| REQ-4-004 | Telemetria: todos os eventos com `eventId` UUID (idempotência) | 🔴 | `[x]` | Evento duplicado com mesmo `eventId` é ignorado |
| REQ-4-005 | Perfil Vocacional calculado automaticamente a partir de telemetria | 🔴 | `[x]` | Score actualizado após cada simulação concluída |
| REQ-4-006 | Relatório vocacional do estudante com recomendações | 🔴 | `[x]` | Relatório gerado com dados reais; sem texto genérico |
| REQ-4-007 | Cursos: módulos, itens (vídeo/pdf/texto/quiz/tarefa/iframe), submissões | 🔴 | `[x]` | Estudante completa módulo; progresso actualizado |
| REQ-4-008 | Experiências institucionais: sempre gratuitas, fluxo editorial completo | 🔴 | `[x]` | Experiência publicada visível sem login |
| REQ-4-009 | Programas: criação, inscrição, gestão de participantes | 🟠 | `[ ]` | Estudante inscreve-se; instituição vê lista de inscritos |
| REQ-4-010 | Projetos: abstract público + core privado com ACL por grant | 🔴 | `[x]` | Utilizador sem grant não acede ao core; owner sempre acede |
| REQ-4-011 | Projetos: 4 modos (portfolio, collaboration, mentorship, sponsorship) | 🟠 | `[x]` | Modo definido na criação; visível na listagem |
| REQ-4-012 | Vínculos: pedido, aprovação, rejeição, cancelamento | 🔴 | `[x]` | Vínculo duplicado é rejeitado (índice único) |
| REQ-4-013 | Conquistas: automáticas (trigger por evento) + manuais + institucionais | 🟠 | `[ ]` | Conquista automática criada após primeira simulação concluída |
| REQ-4-014 | Feed: algoritmo de ranking com sinais de telemetria | 🟠 | `[ ]` | Feed ordenado por score de relevância, não apenas por data |

## Fase 5 — LTI 1.3 Provider

**Objetivo:** PDC como ferramenta LTI integrável em qualquer LMS universitário.

| ID | Requisito | Prioridade | Estado | Critério de Verificação |
| --- | --- | --- | --- | --- |
| REQ-5-001 | OIDC login flow completo (initiation → callback → session) | 🔴 | `[x]` | Launch LTI de Canvas cria sessão PDC válida |
| REQ-5-002 | JWKS endpoint público (`/.well-known/jwks.json`) | 🔴 | `[x]` | Canvas consegue verificar assinatura do PDC |
| REQ-5-003 | AGS: grade passback para LMS externo | 🟠 | `[x]` | Score de simulação enviado para gradebook do Canvas |
| REQ-5-004 | NRPS: roster sync (lista de alunos do LMS) | 🟡 | `[x]` | Lista de alunos importada do Canvas |
| REQ-5-005 | Configuração de plataformas LTI via painel admin | 🟠 | `[x]` | Admin adiciona nova plataforma sem deploy |

## Fase 6 — Moderação, Admin e Segurança

| ID | Requisito | Prioridade | Estado | Critério de Verificação |
| --- | --- | --- | --- | --- |
| REQ-6-001 | Denúncias persistidas no Strapi (não localStorage) | 🔴 | `[x]` | Moderador vê denúncias reais no painel |
| REQ-6-002 | Fila de moderação com estados: pendente → em_análise → resolvida/rejeitada | 🔴 | `[x]` | Transição de estado registada no audit trail |
| REQ-6-003 | Painel admin: utilizadores, permissões, estatísticas, telemetria | 🟠 | `[x]` | Admin vê métricas reais da plataforma |
| REQ-6-004 | Audit trail completo com `ipHash`, `actorRole`, `serverTimestamp` | 🔴 | `[x]` | Cada acção sensível tem registo auditável |
| REQ-6-005 | CSP headers configurados no BFF | 🔴 | `[x]` | `Content-Security-Policy` presente em todas as respostas |
| REQ-6-006 | Sentry integrado em `apps/web` e `apps/api` | 🟠 | `[x]` | Erro não tratado aparece no Sentry |

## Fase 7 — IA e Realtime

| ID | Requisito | Prioridade | Estado | Critério de Verificação |
| --- | --- | --- | --- | --- |
| REQ-7-001 | AI tutor com DeepSeek em modo streaming | 🔴 | `[x]` | Resposta aparece progressivamente no chat |
| REQ-7-002 | RAG com LangChain.js — contexto da plataforma e do estudante | 🟠 | `[x]` | Tutor responde com base no conteúdo real do PDC |
| REQ-7-003 | Geração automática de quizzes a partir de conteúdo de cursos | 🟠 | `[x]` | Quiz gerado tem perguntas relevantes ao conteúdo |
| REQ-7-004 | WebSocket para notificações em tempo real | 🔴 | `[x]` | Notificação aparece sem refresh da página |
| REQ-7-005 | Mensagens em tempo real entre utilizadores | 🟠 | `[x]` | Mensagem enviada aparece instantaneamente no destinatário |
| REQ-7-006 | Fallback Ollama quando DeepSeek indisponível | 🟡 | `[x]` | Tutor continua a funcionar com Ollama local |

## Requisitos Não Funcionais (Transversais)

| ID | Requisito | Prioridade | Estado | Critério de Verificação |
| --- | --- | --- | --- | --- |
| REQ-NF-001 | Lighthouse Performance ≥ 90 em mobile na landing page | 🔴 | `[ ]` | Medido com Lighthouse CI |
| REQ-NF-002 | Tempo de resposta do BFF ≤ 200ms para endpoints de leitura | 🟠 | `[ ]` | Medido com k6 ou Artillery |
| REQ-NF-003 | Zero erros de lint/TypeScript (sem `any`) | 🔴 | `[~]` | `z.any()` em shared; `tsc` pendente |
| REQ-NF-004 | Zero `console.log` (usar `pino` logger) | 🟠 | `[x]` | `apps/api/src/index.ts` e `auth.ts` (pino) |
| REQ-NF-005 | Acessibilidade básica — labels, alt text, foco de teclado | 🟠 | `[ ]` | axe-core sem erros críticos |
| REQ-NF-006 | Funcional em conectividade lenta (2G/3G) — assets optimizados | 🟠 | `[ ]` | Lighthouse em modo "Slow 3G" |
| REQ-NF-007 | Modularidade (ficheiros < 200 linhas) | 🟡 | `[ ]` | **Violado:** `auth.ts` (477), `LandingPage.tsx` (440) ❌ |
| REQ-NF-008 | SEO: OG Head dinâmico em todas as páginas públicas | 🔴 | `[x]` | SEOHead implementado e verificado com metadados reais |

*Last updated: Abril 2026 — Auditoria técnica concluída; estado real sincronizado.*
