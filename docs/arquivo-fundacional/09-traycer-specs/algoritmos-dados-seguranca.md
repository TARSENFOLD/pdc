# Specs Traycer — Algoritmos, Modelo de Dados, Segurança, IA, LTI e SEO

> **Origem:** `/Documentos/Traycer/` — 7 specs (~116KB total)
> **IDs Traycer:** `15428b59` (Ranking/Feed), `1a81656f` (Telemetria), `ef76adef` (Segurança), `36c60fa0` (Modelo Dados), `01e25234` (IA/RAG), `26799a9d` (LTI), `6f5d9251` (SEO)
> **Data original:** 3 Abril 2026 · **Status:** OURO — pipelines, modelos de dados e regras field-level não presentes nas specs canónicas

---

## 1. Algoritmo de Ranking e Feed

> Inspiração: Arquitectura do X (Twitter) adaptada ao contexto educacional.

### Diferença Fundamental X vs PDC

| X (Twitter) | PDC |
|-------------|-----|
| Maximizar tempo na plataforma | Maximizar qualidade da decisão vocacional |
| Engagement rápido (likes, retweets) | Engagement profundo (simulações, tempo real, bookmarks) |
| Conteúdo de qualquer pessoa | Conteúdo validado (moderação + comité científico) |
| Feed único "For You" | **4 feeds** com propósitos distintos |
| ML com bilhões de parâmetros | Scoring determinístico + pesos configuráveis |

### Pipeline em 4 Fases

**Fase 1 — Geração de Candidatos** (→ ~500 items)
- Rede do utilizador (vínculos, seguidos)
- Fora da rede (recomendações por área)
- Conteúdo novo (recém publicado e aprovado)
- Conteúdo em alta (alto engagement recente)

**Fase 2 — Hidratação de Features**
- Score de engagement, freshness, autor, relevância por área

**Fase 3 — Scoring e Ranking**
- Pesos configuráveis via admin (`PUT /feature-flags/defaults/:domain`)
- Fórmula: `score = Σ(peso_i × feature_i)` normalizado

**Fase 4 — Filtragem e Mixing**
- Remove conteúdo já visto
- Garante diversidade de tipos (não 5 cursos seguidos)
- Intercala conteúdo "serendipity" (fora da área habitual)

### 4 Tipos de Feed

| Feed | Propósito | Fontes |
|------|-----------|--------|
| **Geral** | Timeline cronológica da rede | Posts, conquistas, projectos de vínculos |
| **Vocacional** | Recomendações por perfil | Cursos, simulações, experiências por área |
| **Institucional** | Conteúdo de instituições vinculadas | Programas, experiências, eventos |
| **Trending** | Conteúdo em alta global | Alto engagement recente, transversal |

---

## 2. Modelo de Telemetria e Perfil Vocacional

### Diagnóstico Pré-v2

| Problema | Impacto |
|----------|---------|
| Eventos em `learning-events.json` local | Dados perdidos ao reiniciar |
| Sem `eventId` UUID | Duplicados possíveis |
| Sem `sessionId`/`correlationId` | Rastreamento impossível |
| Apenas 4 campos no schema | Contexto insuficiente |
| `perfil-vocacional` sem campo `area` | Não sabe a que área se refere o score |
| Perfil vocacional calculado manualmente | Nunca é actualizado |

### Pipeline Proposto

```
Frontend (buffer 20 eventos / 30s)
  → POST /api/telemetria/batch
  → BFF: validação + deduplicação por eventId
  → PostgreSQL via Strapi
  → Job assíncrono (5 min)
  → Agregador de scores por área
  → perfis_vocacionais actualizado
  → Dashboard estudante + Relatórios institucionais + Motor recomendações
```

### Catálogo de Eventos (Completo)

**Navegação:** page.view, page.exit, navigation.click
**Conteúdo:** content.view, scroll_depth (25/50/75/100%), time_spent, video_play/progress/abandon
**Simulação (sinais vocacionais críticos):** start, question_answer, question_change, pause, abandon, complete
**Decisão (alta qualidade):** area_explore, bookmark, enroll, mentor_connect, institution_connect
**Interação social:** like, comment, share, rating, report

### Perfil Vocacional — 6 Dimensões

| Dimensão | Fonte principal |
|----------|----------------|
| Aptidão Técnica por Área | simulation.complete scores |
| Motivação Intrínseca | area_explore + time_spent |
| Padrão de Decisão | question_answer + timeToAnswer |
| Profundidade de Exploração | content views + scroll depth |
| Engagement Social | likes, comments, shares |
| Consistência | frequency + streaks |

**4 Tiers:** Explorador → Aprendiz → Praticante → Especialista (baseado em volume + qualidade de sinais)

---

## 3. Segurança — 7 Camadas

### Diagnóstico Pré-v2 (Problemas Críticos)

| Problema | Severidade |
|----------|-----------|
| Rate limiting em `Map` memória | 🟠 Não funciona multi-instância |
| Rate limiting só em `/api/auth/local` | 🔴 Todos os outros endpoints sem limite |
| `actorId` de headers `x-perfil-id` | 🔴 Falsificável |
| Ratings/votos em ficheiros JSON | 🔴 Dados perdidos ao reiniciar |
| Denúncias em `localStorage` | 🔴 Moderadores nunca vêem |
| Upload sem validação MIME real | 🟠 Apenas tamanho verificado |
| RBAC `allow by default` (linha 216) | 🔴 Recursos não mapeados ficam abertos |
| `sessionStorage` para auth | 🔴 XSS expõe sessão |
| Sem CSP header | 🟠 XSS sem mitigação |

### Arquitectura de Segurança

```
Request → TLS + CORS + Headers
  → Rate Limiting por Endpoint (Redis)
  → Autenticação JWT httpOnly
  → RBAC + Ownership
  → Validação Input + Mass Assignment
  → Lógica de Negócio
  → Audit Log
```

### Rate Limiting (Redis obrigatório)

| Endpoint | Limite | Window |
|----------|--------|--------|
| `/auth/login` | 5 tentativas | 15 min |
| `/auth/register` | 3 criações | 1 hora |
| `/auth/otp/verify` | 5 tentativas | 15 min |
| `/comments` POST | 10 por utilizador | 1 min |
| `/interactions/*` | 30 acções | 1 min |
| `/telemetry/batch` | 60 batches | 1 min |
| `/reports` POST | 5 denúncias | 1 hora |
| Global por IP | 1000 requests | 1 min |

### JWT — httpOnly Cookies

- Access token: 15 min, httpOnly, Secure, SameSite=Lax
- Refresh token: 7 dias, rotação automática, revogável
- Sem token em localStorage/sessionStorage

### RBAC — Princípio Deny by Default

```
Nenhum endpoint responde sem policy explícita.
Se o endpoint não tem policy → 403.
```

### Upload — Validação de Ficheiros

- Magic bytes (não apenas extensão)
- Tamanho max: imagens 5MB, vídeos 500MB, PDFs 25MB
- Tipos permitidos: JPEG, PNG, WebP, MP4, PDF
- Sanitização de filename (slug)

---

## 4. Modelo de Dados Completo (Strapi v2)

### Content-Types a Eliminar

| Content-Type | Motivo |
|-------------|--------|
| `api::estudante.estudante` | Duplicado de `api::perfil.perfil` |
| `api::comentario-conquista` | Unificar em `api::comentario` polimórfico |
| `api::comentario-simulacao` | Idem |
| `api::grupo`, `api::grupo-tarefa` | Não no roadmap V1 |
| `api::secao`, `api::outcome` | Não usado |
| `api::pagina` | Substituído por `site-config` |

### Diagnóstico de Schema

| Content-Type | Problema | Acção |
|-------------|---------|-------|
| `notificacao` | Relação com `admin::user` em vez de `perfil` | 🔴 Corrigir |
| `interacao` | Schema genérico 4 campos | 🔴 Substituir por collections separadas |
| `telemetria` | Sem eventId, sessionId, correlationId | 🔴 Expandir |
| `vinculo` | Relação com `estudante` (legado) | 🔴 Corrigir para `perfil` |
| `proposta` | Idem | 🔴 Corrigir |
| `perfil-vocacional` | Sem campo `area` | 🔴 Expandir |
| `audit-log` | Sem ipHash, userAgent, actorRole | 🟠 Expandir |
| `modulo-item` | Tipo `iframe` em falta | 🟠 Corrigir |
| `conquista` | Sem `tipo`, sem `categoria` | 🟠 Expandir |
| `post` | Sem mediaUrls, slug, tags | 🟠 Expandir |
| `curso` | `modulos` JSON + content-type `modulo` (ambiguidade) | 🟡 Limpar |
| `perfil` | `instituicaoRef` como JSON em vez de relação | 🟡 Migrar |

### ERD — Entidades Principais

**Perfil** (centro) → relaciona-se com: Curso (autor/inscrito), Simulação (autor), Experiência (autor), Programa (autor), Projeto (autor), Post (autor), Conquista (destinatário), Vínculo (2 partes), Notificação (destinatário), Rating, Like, Bookmark, Comentário, Denúncia, TelemetriaEvento

**Content-Types com workflow editorial:** Curso, Experiência, Simulação, Programa, Projeto
- Estados: `draft → review → approved → published → archived`

**Experiências são SEMPRE gratuitas** (constituição §10)
**Projetos são SEMPRE gratuitos** (constituição §10)

---

## 5. Estratégia de IA, RAG e Tutor Vocacional

### Stack de IA

| Uso | Modelo | Fallback |
|-----|--------|----------|
| Chat/Tutor | DeepSeek Chat (`deepseek-chat`) | Ollama local (`llama3.2`) |
| Raciocínio complexo | DeepSeek Reasoner (`deepseek-reasoner`) | — |
| Embeddings (RAG) | text-embedding-3-small (OpenAI) | — |
| Vector Store | pgvector (PostgreSQL) | — |

### Funcionalidades de IA

| Feature | Estado pré-v2 | V2 |
|---------|--------------|-----|
| Tutor IA streaming | ✅ Funciona (rate limit em Map) | Redis rate limit |
| Micro-desafios vocacionais | ✅ (fallbacks hardcoded) | Context-aware com perfil |
| Hero verdict vocacional | ✅ (sem contexto real) | Baseado em telemetria |
| Dashboard insights | ✅ (sem dados reais) | Telemetria real |
| Geração de quizzes | ❌ | Auto-gerados por módulo |
| RAG sobre conteúdos | ❌ | "Ask the Lesson" |
| Pré-orientação estruturada | ❌ Parcial | Pipeline completo |

### RAG Pipeline

```
Conteúdo (cursos, experiências, simulações)
  → Chunking (max 500 tokens)
  → Embedding (text-embedding-3-small)
  → pgvector store
  → Query: user question → embedding → similarity search → top-k chunks
  → DeepSeek Chat com contexto recuperado
```

---

## 6. LTI 1.3 como Serviço Próprio

**Valor B2B:** Alunos acedem ao PDC dentro do Canvas/Moodle. Notas aparecem automaticamente no gradebook. Sem contas separadas.

### Fluxo OIDC Launch

```
LMS → POST /lti/oidc/login (OIDC initiation)
BFF → valida issuer + client_id contra lti_platforms
BFF → redirect para LMS auth endpoint
LMS → POST /lti/callback (id_token JWT)
BFF → valida JWT, extrai claims, provisiona/actualiza perfil
BFF → redirect para Frontend com session cookie
```

### Grade Passback (Assignment and Grade Services)

- Outbox pattern para retry
- Score do PDC → gradebook do LMS
- Webhook para actualização automática

---

## 7. SEO, Performance e Distribuição

### Contexto Angola

| Realidade | Impacto no PDC |
|-----------|---------------|
| Redes 3G/4G lentas | Bundle JS < 200KB inicial |
| Custo dados elevado | Imagens otimizadas, lazy loading agressivo |
| Maioria mobile | Mobile-first obrigatório |
| Latência alta para EU/US | Railway (Europa) + Cloudflare CDN |
| Acesso instável | PWA + modo offline básico |

### SEO Externo

- Meta tags obrigatórias: title, description, robots, canonical
- Open Graph + Twitter Cards em todas as páginas públicas
- Sitemap dinâmico: `/sitemap.xml` com cursos, experiências, simulações, projectos
- Schema.org: Course, Organization, Person, Event
- Slugs descritivos: `/cursos/engenharia-civil` (não `/cursos/42`)

### Performance Budget

| Métrica | Target |
|---------|--------|
| LCP | < 2.5s |
| FID | < 100ms |
| CLS | < 0.1 |
| Bundle inicial | < 200KB (gzip) |
| Imagens | WebP, lazy, srcset |
| Fontes | swap + preload Inter/Instrument Serif |

### CDN e Media

- Cloudflare R2 para uploads (imagens, vídeos, PDFs)
- Cloudflare CDN para assets estáticos
- Responsive images com srcset + WebP fallback

---

*Destilado de 7 specs Traycer · IDs: 15428b59, 1a81656f, ef76adef, 36c60fa0, 01e25234, 26799a9d, 6f5d9251*
*Total original: ~116KB, 2500+ linhas · Diagramas Mermaid e wireframes HTML omitidos — consultar originais se necessário.*
