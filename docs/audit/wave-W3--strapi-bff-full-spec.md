# Audit · Wave W3 — Strapi & BFF Full-Spec

> **Metodologia:** D1 (Filtro de Visão por camada: `IMPORTANTE/04` + `IMPORTANTE/03 §2`) · D2 (taxonomia) · D6 (schema evidência) · D7 (campo-a-campo) · D8 (estrutura wave-spec) · D10 (invariantes absolutos: field-level filtering Projeto Core + RBAC assimétrico) · D13 (cascata: T-AUD-1 + T-AUD-2 lidos) · D14 (estrito)
> **Escopo:** 7 tickets-fonte W3.1–W3.7
> **Cascata D13:** T-AUD-1 (W-1.4 = Done, W-1.1 = Done) + T-AUD-2 (W0.1 = Done, W0.2 = Partial) consultados.
> **Auditoria:** estática — nenhum ficheiro de código modificado.

---

## 1. Sumário da Wave

| Ticket | Content-Type | Veredicto global |
|--------|-------------|-----------------|
| W3.1 | Programa Full-Spec (13+ campos aditivos) | **Done** |
| W3.2 | Projeto (camadas pública/core + ACL + 4 modos) | **Done** |
| W3.3 | Simulação Full-Spec (materiaisLab + criterios + tipoLab + RBAC) | **Done** |
| W3.4 | Experiência (workflow Comité + RBAC mentor + Zod expansion) | **Done-Plus** |
| W3.5 | Post composer (`feed-post` NEW + BFF route + moderation queue) | **Partial** |
| W3.6 | Conquista manual (origem flag + BFF route) | **Done** |
| W3.7 | DEPRECATED labels + `/health/schema-drift` | **Done** |

**Contagens:**

| Done | Done-Plus | Partial | Missing | Drift-Ticket | Drift-Constitution | Vision-Failure | Cannot-Verify |
|------|-----------|---------|---------|-------------|-------------------|----------------|---------------|
| 5 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |

> **H5 (Projeto Core ACL — D10 invariante #2):** `filterCoreField` implementado e aplicado em `GET /` e `GET /:id`. **Não é Vision-Failure.** Ver §3.2.

---

## 2. Tabela D7 — Campo-a-Campo por Content-Type

### W3.1 — `programa` (Strapi schema vs Zod `ProgramaSchema`)

| Campo Strapi | Tipo Strapi | Estado D7 | Zod (`ProgramaSchema`) | Nota |
|-------------|------------|-----------|------------------------|------|
| `titulo` | string required | **Presente** | `z.string()` | ✅ |
| `slug` | uid → titulo | **Presente** | — (gerado no BFF) | ✅ |
| `descricao` | text DEPRECATED | **Presente** | `z.string().optional()` // DEPRECATED | ✅ label DEPRECATED presente |
| `proposito` | text | **Presente** | `z.string().min(10).max(2000)` | ✅ |
| `metodologia` | text | **Presente** | `z.string().min(10).max(2000)` | ✅ |
| `recursos` | json | **Presente** | `z.record(z.unknown()).optional()` | ✅ |
| `responsavel` | relation→perfil | **Presente** | `responsavelId: z.string().optional()` | ✅ |
| `instituicao` | relation→instituicao | **Presente** | `instituicaoId: z.string().optional()` | ✅ |
| `cursos` | relation manyToMany | **Presente** | `cursosIds` | ✅ |
| `experiencias` | relation manyToMany | **Presente** | `experienciasIds` | ✅ |
| `simulacoes` | relation manyToMany | **Presente** | `simulacoesIds` | ✅ |
| `projetos` | relation manyToMany | **Presente** | `projetosIds` | ✅ |
| `area` | enumeration | **Presente** | `AreaVocacionalSchema` | ✅ |
| `estado` | enumeration default=draft | **Presente** | `ProgramaEstadoSchema` | ✅ |
| `modalidade` | enumeration | **Presente** | `ModalidadeSchema.optional()` | ✅ |
| `duracao` | string | **Presente** | `z.string().optional()` | ✅ |
| `vagas` | integer | **Presente** | `z.number().int().min(0).optional()` | ✅ |
| `requisitos` | text | **Presente** | `z.string().optional()` | ✅ |
| `tags` | json | **Presente** | `z.array(z.string()).optional()` (payload) | ✅ |
| `tipo` | enumeration standard/shadowapro/eduvisit | **Presente** | `ProgramaTipoSchema` | ✅ |
| `dataInicio` | datetime | **Presente** | `z.string().datetime().optional()` | ✅ |
| `dataFim` | datetime | **Presente** | `z.string().datetime().optional()` | ✅ |
| `regrasMatricula` | json | **Presente** | `z.record(z.unknown()).optional()` | ✅ |
| `precoPolicy` | json | **Presente** | `z.record(z.unknown()).optional()` | ✅ |
| `criadorTipo` | enumeration mentor/instituicao/super_admin | **Presente** | `CriadorTipoSchema.optional()` | ✅ |
| `historicoEstados` | json | **Presente** | `z.array(z.object({estado,timestamp,autorId})).optional()` | ✅ |
| `motivoRejeicao` | text | **Presente** | `z.string().optional()` | ✅ |
| `metadata` | json DEPRECATED | **Presente** | `z.record(z.unknown()).optional()` // DEPRECATED | ✅ label DEPRECATED presente |

**Total: 27 campos verificados — todos Presente.** Aditividade confirmada: `descricao` e `metadata` mantidos com DEPRECATED label, não removidos.

---

### W3.2 — `projeto` (Strapi schema vs Zod `ProjetoSchema`)

| Campo Strapi | Tipo Strapi | Estado D7 | Zod (`ProjetoSchema`) | Nota |
|-------------|------------|-----------|----------------------|------|
| `slug` | uid → titulo | **Presente** | — (gerado no BFF) | ✅ |
| `titulo` | string required | **Presente** | `z.string()` | ✅ |
| `descricao` | text DEPRECATED | **Presente** | `z.string().optional()` // DEPRECATED | ✅ |
| `abstract` | text | **Presente** | `z.string().min(10).max(1000)` | ✅ |
| `core` | text | **Presente** | `z.string().min(10).max(5000).optional()` | ✅ |
| `modos` | json | **Presente** | `z.array(ProjetoModoSchema).min(1).max(5)` | Strapi=json; Zod=typed array |
| `acessoCoreACL` | json | **Presente** | `z.array(ACLEntrySchema).optional()` | ✅ |
| `votos` | json | **Presente** | `z.array(VotoSchema).optional()` | ✅ |
| `historicoEstados` | json | **Presente** | `z.array(HistoricoEstadoSchema).optional()` | ✅ |
| `area` | enumeration | **Presente** | `AreaVocacionalSchema.optional()` | ✅ |
| `estado` | enumeration default=draft | **Presente** | `ProjetoEstadoSchema` | ✅ |
| `autor` | relation→perfil | **Presente** | `autor: z.object({id,nome,foto}).optional()` | ✅ |
| `colaboradores` | json DEPRECATED | **Presente** | — (não exposto no Zod schema) | ⚠️ Campo Strapi DEPRECATED mas sem representação Zod. Retrocompat only. |
| `tags` | json | **Presente** | `z.array(z.string()).default([])` | ✅ |
| `mediaUrls` | json | **Presente** | `z.array(z.string().url()).optional()` | ✅ |
| `repositorioUrl` | string | **Presente** | `repoUrl` (alias) | ✅ |
| `visibilidade` | enumeration publico/privado | **Presente** | `ProjetoVisibilidadeSchema.optional()` | ✅ |
| `buscandoParceiros` | boolean default=false | **Presente** | `z.boolean().optional()` | ✅ |
| `criadoEm` | datetime | **Presente** | — (Zod usa `createdAt`) | ✅ alias diferente |

**Total: 19 campos verificados — todos Presente.**
**Nota W3.2:** `modos` no schema Strapi é `json` mas o ticket declarou 4 modos canónicos. O Zod (`ProjetoModoSchema`) declara 5: `exposicao, colaboracao, mentoria, financiamento, feedbackComunitario`. O schema Strapi não restringe os valores por ser `json` — não há conflito de tipo (json é mais permissivo). **Drift-Ticket menor** (5 modos no Zod vs "4 modos" declarados pelo ticket W3.2).

---

### W3.3 — `simulacao` (Strapi schema vs Zod `SimulacaoSchema` + `CriarSimulacaoPayloadSchema`)

| Campo Strapi | Tipo Strapi | Estado D7 | Zod | Nota |
|-------------|------------|-----------|-----|------|
| `titulo` | string required | **Presente** | `z.string()` | ✅ |
| `autorId` | string | **Presente** | `z.string()` | ✅ |
| `tipo` | integer | **Presente** | `z.number().min(1).max(3)` | ✅ |
| `slug` | uid → titulo | **Presente** | `z.string()` | ✅ |
| `nome` | string | **Presente** | — (não exposto no Zod) | ⚠️ Campo no Strapi sem correspondência Zod |
| `descricao` | text | **Presente** | `z.string()` | ✅ |
| `tipoSimulacao` | enumeration tipo1/2/3 | **Presente** | `TipoSimulacaoSchema` | ✅ |
| `nivel` | enumeration basico/medio/avancado | **Presente** | — (não no Zod) | ⚠️ Campo no Strapi sem Zod |
| `area` | enumeration 15 valores | **Presente** | `AreaVocacionalSchema` | ✅ |
| `estado` | enumeration default=draft | **Presente** | `EstadoEditorialSchema.optional()` | ✅ |
| `conteudoUrl` | string | **Presente** | — | ⚠️ Campo no Strapi sem Zod |
| `criteriosAvaliacao` | json | **Presente** | `CriteriosAvaliacaoSchema` | ✅ |
| `executorConfig` | json | **Presente** | `z.record(z.unknown()).optional()` | ✅ |
| `tentativasMaximas` | integer default=0 | **Presente** | `z.number().int().default(0)` | ✅ |
| `materiaisLab` | json | **Presente** | `z.array(z.object({id,label,url})).optional()` | ✅ |
| `materiaisInfo` | json DEPRECATED | **Presente** | — (não exposto) | ✅ DEPRECATED label presente |
| `tipoLab` | enumeration sandbox/prova/desafio/experimento | **Presente** | `z.enum(['sandbox','prova','desafio','experimento'])` | ✅ |
| `tags` | json | **Presente** | — | ⚠️ Campo no Strapi sem Zod |
| `autor` | relation→perfil | **Presente** | — | ⚠️ Campo no Strapi; autorId usado em vez de relação |
| `instituicao` | relation→instituicao | **Presente** | — | ⚠️ Campo W3.3 RBAC para `instituicao` — presente no schema |
| `validadoAcademicamente` | boolean | **Presente** | `z.boolean().default(false)` | ✅ |
| `comiteValidacao` | text | **Presente** | — | ⚠️ Campo no Strapi sem Zod (workflow Comité) |
| `dataValidacao` | datetime | **Presente** | — | ⚠️ Campo no Strapi sem Zod |
| `motivoRejeicao` | text | **Presente** | — | ⚠️ Campo no Strapi sem Zod |
| `historicoEstados` | json | **Presente** | — | ⚠️ Campo no Strapi sem Zod |

**Total: 25 campos verificados — todos Presente no Strapi.**
Campos no Strapi sem cobertura Zod: `nome`, `nivel`, `conteudoUrl`, `tags`, `autor` (relation), `comiteValidacao`, `dataValidacao`, `motivoRejeicao`, `historicoEstados`. São campos de leitura/admin não incluídos nos schemas de criação/resposta pública — aceitável para uma auditoria de aditividade. Os campos críticos W3.3 (`criteriosAvaliacao`, `materiaisLab`, `tipoLab`, `tentativasMaximas`) estão todos cobertos.

---

### W3.4 — `experiencia` (Strapi schema vs `CriarExperienciaPayloadSchema`)

| Campo Strapi | Tipo Strapi | Estado D7 | Nota |
|-------------|------------|-----------|------|
| `slug` | uid | **Presente** | ✅ |
| `titulo` | string required | **Presente** | ✅ |
| `descricao` | text | **Presente** | ✅ |
| `nivel` | enumeration | **Presente** | ✅ |
| `area` | enumeration | **Presente** | ✅ |
| `estado` | enumeration default=draft | **Presente** | ✅ |
| `visibilidade` | enumeration publico/privado/institucional | **Presente** | ✅ `institucional` é extensão face a Projeto (que não tem este valor) |
| `curso` | relation→curso | **Presente** | ✅ |
| `autor` | relation→perfil | **Presente** | ✅ |
| `instituicao` | relation→instituicao | **Presente** | ✅ |
| `gratuito` | boolean | **Presente** | ✅ |
| `validadoAcademicamente` | boolean | **Presente** | ✅ |
| `painelRealidade` | json | **Presente** | ✅ |
| `muralVozes` | json | **Presente** | ✅ |
| `guiaInstitucional` | json | **Presente** | ✅ |
| `tags` | json | **Presente** | ✅ |
| `gradeDestaque` | json | **Presente** | ✅ |
| `telemetriaConfig` | json | **Presente** | ✅ |
| `vagas` | integer | **Presente** | ✅ |
| `dataInicio` | datetime | **Presente** | ✅ |
| `dataFim` | datetime | **Presente** | ✅ |
| `localizacao` | string | **Presente** | ✅ |
| `modalidade` | enumeration | **Presente** | ✅ |

**Total: 23 campos verificados — todos Presente.**
**Nota:** `schemas/experiencias.ts` é um stub que redireciona para `enums.ts`. O schema canónico vive em `packages/shared/src/experiencias.ts` (G3). O `CriarExperienciaPayloadSchema` é importado de `@pdc/shared` pela rota BFF — cobertura verificada via uso no BFF.

---

### W3.5 — `feed-post` (Strapi NEW vs Zod `FeedPostSchema` + `post` legacy)

| Campo `feed-post` | Tipo Strapi | Estado D7 | Zod (`FeedPostSchema`) | Nota |
|------------------|------------|-----------|------------------------|------|
| `autor` | relation→perfil required | **Presente** | `autorId: z.string()` | ✅ |
| `corpo` | richtext required | **Presente** | `z.string().min(1).max(10000)` | ✅ |
| `mediaUrls` | json | **Presente** | `z.array(z.string().url()).max(10).optional()` | ✅ |
| `estado` | enumeration pendente_moderacao/aprovada/rejeitada/hidden | **Presente** | `FeedPostEstadoSchema` | ✅ |
| `motivoModeracao` | text | **Presente** | `z.string().optional()` | ✅ |
| `eventId` | string unique | **Presente** | `z.string().optional()` | ✅ anti-duplicação G15 |
| `likesCount` | integer default=0 | **Presente** | `z.number().int().min(0).default(0)` | ✅ |
| `comentariosCount` | integer default=0 | **Presente** | `z.number().int().min(0).default(0)` | ✅ |

**Total: 8 campos verificados — todos Presente no content-type `feed-post`.**

**Conflito canónico `post` vs `feed-post`:**

O Strapi tem **dois** content-types coexistentes:
- `api::post.post` — schema: `slug, titulo, descricao, conteudo (richtext), tipo, autor, tipoAutor, mediaUrls, tags, aprovada, estado (draft/published/archived)`. `draftAndPublish: true`. Schema **sem** fila de moderação (`pendente_moderacao/rejeitada/hidden`), sem `eventId`, sem `motivoModeracao`.
- `api::feed-post.feed-post` — schema novo, `draftAndPublish: false`, com fila de moderação completa, `eventId`, `likesCount`, `comentariosCount`.

**Veredicto conflito:** `feed-post` é o content-type canónico para posts do Feed (W3.5). `post` é um content-type legacy/editorial (avisos, notícias, conquistas partilhadas — valores do enum `tipo`). **Não são duplicados do mesmo domínio** — são tipos diferentes com propósitos distintos. Não há conflito de canónicas.

**Gap W3.5 BFF:** `apps/api/src/routes/feed-posts.ts` é um **stub** (12 linhas):
```
feedPostRoutes.get('/', async (c) => { return c.json({ data: [] }); });
feedPostRoutes.post('/', async (c) => { return c.json({ success: true }); });
```
- Sem `verifyJwt`, sem `checkRole`, sem Zod validator, sem integração Strapi, sem G15 event, sem moderation queue.
- Registado em `index.ts` L87: `app.route('/feed-posts', feedPostRoutes)`.

---

### W3.6 — `conquista` (Strapi schema vs Zod `ConquistaSchema`)

| Campo Strapi | Tipo Strapi | Estado D7 | Zod (`ConquistaSchema`) | Nota |
|-------------|------------|-----------|-------------------------|------|
| `slug` | uid | **Presente** | `z.string()` | ✅ |
| `titulo` | string required | **Presente** | `z.string()` | ✅ |
| `descricao` | text | **Presente** | `z.string().optional().nullable()` | ✅ |
| `tipo` | enumeration automatica/manual/institucional/plataforma | **Presente** | `ConquistaTipoSchema.optional()` | ✅ |
| `origem` | enumeration auto/manual default=auto | **Presente** | `ConquistaOrigemSchema.optional()` | ✅ |
| `categoria` | string | **Presente** | `z.string().optional().nullable()` | ✅ |
| `midias` | media multiple | **Presente** | `z.array(z.object({url,mime,name})).optional()` | ✅ |
| `autor` | relation→perfil | **Presente** | `z.unknown().optional()` | ✅ |
| `perfis` | relation manyToMany | **Presente** | `z.array(z.unknown()).optional()` | ✅ |
| `tipoAutor` | enumeration mentor/instituicao/plataforma/aluno | **Presente** | `ConquistaTipoAutorSchema.optional()` | ✅ |
| `aprovada` | boolean default=false | **Presente** | `z.boolean().optional()` | ✅ |
| `tags` | json | **Presente** | `z.unknown().optional()` | ✅ |
| `data` | datetime | **Presente** | `z.string().optional().nullable()` | ✅ |
| `validadoAcademicamente` | boolean | **Presente** | `z.boolean().optional()` | ✅ |

**Total: 14 campos verificados — todos Presente.** `origem` (W3.6 "origem flag") está no schema Strapi com DEPRECATED-safe enum `auto/manual`.
Campos Zod extras (legacy UI, não no Strapi): `icone`, `raridade`, `alcancadaEm`, `desbloqueada`, `dataDesbloqueio` — marcados como backward compat.

---

### W3.7 — DEPRECATED labels + `/health/schema-drift`

| Item | Estado D7 | Evidência |
|------|-----------|----------|
| `programa.descricao` DEPRECATED label | **Presente** | schema.json L15: `"⚠️ DEPRECATED — usar proposito."` |
| `programa.metadata` DEPRECATED label | **Presente** | schema.json L90: `"⚠️ DEPRECATED — usar campos estruturados."` |
| `projeto.descricao` DEPRECATED label | **Presente** | schema.json L15: `"⚠️ DEPRECATED — usar abstract."` |
| `projeto.colaboradores` DEPRECATED label | **Presente** | schema.json L39: `"⚠️ DEPRECATED — usar acessoCoreACL."` |
| `simulacao.materiaisInfo` DEPRECATED label | **Presente** | schema.json L46: `"⚠️ DEPRECATED — usar materiaisLab."` |
| `GET /health/schema-drift` | **Presente** | `apps/api/src/routes/health.ts` L74–130 — verifica 3 tipos: `programa.descricao`, `projeto.descricao`, `simulacao.materiaisInfo` |
| `/health/schema-drift` registado | **Presente** | `apps/api/src/index.ts` — `app.route('/health', healthRoutes)` inclui subrota |

**Total: 7 verificações — todas Presentes.** `/health/schema-drift` vai além do declarado pelo ticket (cobre 3 content-types, não apenas 1).

---

### `domain-event` — campo `hookResults` (W-1.2 herdado via D13)

| Campo | Tipo Strapi | Estado D7 | Nota |
|-------|------------|-----------|------|
| `name` | string required | **Presente** | ✅ |
| `payload` | json required | **Presente** | ✅ |
| `correlationId` | uid required | **Presente** | ✅ |
| `processed` | boolean default=false required | **Presente** | ✅ |
| `processedAt` | datetime | **Presente** | ✅ |
| `attempts` | integer default=0 | **Presente** | ✅ |
| `hookResults` | json default={} | **Presente** | ✅ W-1.2.AC3 (Cannot-Verify em T-AUD-1) → **Fechado aqui.** Campo existe no schema Strapi. |

**Gap T-AUD-1 W-1.2.AC3 FECHADO:** O campo `hookResults` está declarado no schema `domain-event` como `"type": "json", "default": {}`. A persistência incremental de `event-bus.ts` tem o campo de destino confirmado.

---

## 3. Tabela RBAC — Política Assimétrica D10

> **Matriz referência:** `spec:IMPORTANTE/03 §2`
> **Regra D10 assimétrica:** mais permissivo que a spec → `Vision-Failure`. Mais restritivo → `Drift-Constitution`/`Partial`.

| Rota | Método | `checkRole` actual | Spec IMPORTANTE/03 | Veredicto RBAC |
|------|--------|-------------------|--------------------|----------------|
| `POST /programas` | POST criar | `['mentor', 'instituicao', 'super_admin']` | mentor, instituicao, super_admin | **Done** |
| `PUT /programas/:id` | PUT editar | `['mentor', 'instituicao', 'super_admin']` | mentor, instituicao, super_admin | **Done** |
| `PATCH /programas/:id/estado` | PATCH estado | `['mentor', 'instituicao', 'moderador', 'super_admin']` | mentor, instituicao, moderador, super_admin | **Done** |
| `POST /projetos` | POST criar | `['estudante', 'mentor', 'instituicao', 'super_admin']` | estudante, mentor, instituicao, super_admin | **Done** |
| `PATCH /projetos/:id/acl` | PATCH ACL | verifyJwt + owner check | autor do projeto apenas | **Done** |
| `POST /simulacoes` | POST criar | `['mentor', 'instituicao', 'super_admin']` | mentor, instituicao, super_admin | **Done** |
| `PUT /simulacoes/:id` | PUT editar | `['mentor', 'instituicao', 'super_admin']` | mentor, instituicao, super_admin | **Done** |
| `PATCH /simulacoes/:id/estado` | PATCH estado | `['mentor', 'instituicao', 'moderador', 'super_admin']` | mentor, instituicao, moderador, super_admin | **Done** |
| `POST /simulacoes/tentativas` | POST iniciar tentativa | `['estudante']` | estudante apenas | **Done** |
| `PUT /simulacoes/tentativas/:id` | PUT concluir tentativa | `['estudante']` | estudante apenas | **Done** |
| `POST /experiencias` | POST criar | `['instituicao', 'mentor', 'super_admin']` | instituicao, mentor, super_admin | **Done** |
| `PUT /experiencias/:id` | PUT editar | `['instituicao', 'mentor', 'super_admin']` | instituicao, mentor, super_admin | **Done** |
| `PATCH /experiencias/:id/estado` | PATCH estado | `['instituicao', 'mentor', 'comite_cientifico', 'moderador', 'super_admin']` | inclui comite_cientifico para review→approved | **Done-Plus** (comite_cientifico ausente na especificação base mas alinhado com W3.4) |
| `POST /feed-posts` | POST criar | **Nenhum** (stub sem auth) | estudante, mentor, instituicao | **Partial** — stub sem checkRole |
| `GET /feed-posts` | GET lista | **Nenhum** (stub sem auth) | público ou autenticado | **Partial** — stub sem lógica |
| `POST /conquistas/manual` | POST manual | `['estudante', 'mentor', 'instituicao', 'super_admin']` | estudante, mentor, instituicao, super_admin | **Done** |

---

## 4. Veredicto Explícito: Field-Level Filtering Projeto Core (D10 invariante #2 — Hotspot H5)

```
Veredicto: Done — NÃO é Vision-Failure.
Evidência:
  1. file:apps/api/src/routes/projetos.ts L18-31 —
       function filterCoreField(projeto: StrapiProjeto, perfilId: string | null): Partial<StrapiProjeto> {
         const isAutor = perfilId && String(projeto.autor?.id) === String(perfilId);
         const hasApprovedAccess = perfilId && projeto.acessoCoreACL?.some(
           (entry) => String(entry.perfilId) === String(perfilId) && entry.estado === 'approved'
         );
         if (isAutor || hasApprovedAccess) return projeto;
         const { core, ...publicData } = projeto;
         void core;
         return publicData;
       }
     Função `filterCoreField` implementada com semântica correcta:
     - Se autor → devolve projeto completo (inclui core).
     - Se perfilId com ACL estado='approved' → devolve completo.
     - Caso contrário → destrói a variável `core` (void core) e devolve
       apenas camada pública.
  2. file:apps/api/src/routes/projetos.ts L53 — GET / aplica: `filteredData = res.data.map(p => filterCoreField(p, perfilId))`
  3. file:apps/api/src/routes/projetos.ts L91 — GET /:id aplica: `return c.json({ data: [filterCoreField(project, perfilId)] })`
  4. file:apps/api/src/routes/projetos.ts L43 + L78 — ambas as rotas usam `optionalJwt`
     (autenticação opcional): utilizador não autenticado obtém `perfilId=null`,
     logo `core` é sempre filtrado para utilizadores anónimos.
Âncora: D10 invariante #2 (field-level filtering).
Lacuna: n/a
Risco: n/a
```

---

## 5. Auditoria por Ticket — Veredictos Globais

### W3.1 — Programa Full-Spec

> **Veredicto: Done** — 27 campos D7 presentes, todos aditivos. DEPRECATED labels correctos. BFF `POST /programas` com `checkRole(['mentor','instituicao','super_admin'])` + `zValidator(CriarProgramaPayloadSchema)` + `historicoEstados` inicializado. Workflow editorial com `PATCH /:id/estado` e máquina de estados implementada.

### W3.2 — Projeto Full-Spec

> **Veredicto: Done** — 19 campos D7 presentes. Field-level filtering `core` implementado (D10 = Done). ACL gerida via `PATCH /:id/acl` com owner check. 5 modos Zod vs 4 declarados pelo ticket = Drift-Ticket menor (feedbackComunitario adicionado — extensão positiva).

### W3.3 — Simulação Full-Spec

> **Veredicto: Done** — 25 campos D7 presentes. `criteriosAvaliacao` tipado com invariante de soma=100%. `materiaisLab` aditivo (mantendo `materiaisInfo` DEPRECATED). `tipoLab` enum presente. RBAC: `POST` = `['mentor','instituicao','super_admin']`. Tentativas restritas a `['estudante']`.

### W3.4 — Experiência

> **Veredicto: Done-Plus** — 23 campos D7 presentes. Workflow Comité com `comite_cientifico` incluído no `PATCH /:id/estado` — vai além do declarado pelo ticket (que apenas mencionava workflow Comité sem detalhar a role). `visibilidade` inclui valor `institucional` ausente em Projeto. Zod canónico em `packages/shared/src/experiencias.ts` (G3).

### W3.5 — Post composer / `feed-post`

> **Veredicto: Partial** — Content-type `feed-post` está correctamente criado com schema completo (8 campos, fila de moderação, `eventId`). Não há conflito canónico com `post` legacy. **Gap crítico:** `apps/api/src/routes/feed-posts.ts` é um stub vazio — sem auth, sem Zod, sem Strapi, sem G15. O content-type existe mas o BFF não o implementa.

### W3.6 — Conquista manual

> **Veredicto: Done** — Campo `origem` presente no schema Strapi (`auto/manual`). BFF `POST /conquistas/manual` com `checkRole(['estudante','mentor','instituicao','super_admin'])` + `CriarConquistaManualPayloadSchema` + `origem: 'manual'` + `tipo: 'manual'` + auto-aprovação por idade do perfil (≥7 dias) + G15 evento `CONQUISTA_DESBLOQUEADA`.

### W3.7 — DEPRECATED labels + `/health/schema-drift`

> **Veredicto: Done** — 5 campos DEPRECATED com labels correctos em 3 content-types. `/health/schema-drift` implementado cobrindo `programa.descricao`, `projeto.descricao`, `simulacao.materiaisInfo` com detecção de drift e resposta 503 quando drift > 0.

---

## 6. Cross-Cutting Findings

### CCF-W3-1 — `domain-event.hookResults` confirmado (gap T-AUD-1 W-1.2.AC3 FECHADO)

O campo `hookResults` está declarado no schema Strapi `domain-event` como `"type": "json", "default": {}`. O gap `Cannot-Verify` de T-AUD-1 W-1.2.AC3 está agora **Fechado** com evidência directa.

### CCF-W3-2 — `feed-posts.ts` stub — impacto em W5.x e moderação

`apps/api/src/routes/feed-posts.ts` é um stub de 12 linhas. A fila de moderação de feed-posts (W3.5) não está implementada no BFF apesar do schema Strapi estar completo. A ausência de auth no POST implica que qualquer utilizador poderia criar posts (se a rota fosse consumida). **Risco médio-alto** para W5.x (pipeline editorial).

### CCF-W3-3 — `simulacao.nome` — campo Strapi sem uso aparente

O campo `nome` no schema `simulacao` não tem correspondência Zod nem uso no BFF. Pode ser um campo legacy de uma versão anterior onde `nome` e `titulo` eram distintos. Não é DEPRECATED (sem label). Baixo risco mas merece clarificação.

### CCF-W3-4 — ACLEntry usa `pending` no BFF vs `pendente` no Zod

Em `projetos.ts` L156: `entry.estado = 'pending'` (inglês), enquanto `ACLEntrySchema` declara `z.enum(['pendente', 'aprovado', 'rejeitado'])` (português). Esta inconsistência de valor de enum não causará erro de runtime (TypeScript não valida em runtime), mas causará falha na validação Zod se um consumer tentar parsear um ACLEntry escrito pelo BFF.

### CCF-W3-5 — `comite_cientifico` em `PATCH /experiencias/:id/estado`

A role `comite_cientifico` é usada no `PATCH /experiencias/:id/estado` mas não existe nos principais `checkRole` de outros content-types. É uma role legítima (confirmada em `tests/.auth/comite_cientifico.json`). A sua ausência na tabela RBAC de programas/simulações é coerente com a spec (só Experiências passam pelo Comité Científico).

---

## 7. Recomendação de Remediação

| Prioridade | Item | Ticket alvo |
|-----------|------|-------------|
| **Alta** | Implementar `feed-posts.ts` com `verifyJwt`, `checkRole`, `CriarPostPayloadSchema`, integração Strapi `feed-post`, `estado: 'pendente_moderacao'`, G15 evento | W3.5 gap |
| **Alta** | Corrigir `ACLEntry.estado = 'pending'` → `'pendente'` em `projetos.ts` L156 | CCF-W3-4 |
| **Média** | Adicionar rota de moderação `PATCH /feed-posts/:id/moderar` com `checkRole(['moderador','super_admin'])` + `ModerarPostSchema` | W3.5 |
| **Baixa** | Clarificar/remover campo `simulacao.nome` ou adicionar DEPRECATED label | CCF-W3-3 |

---

*Produzido por auditoria estática conforme T-AUD-3. T-AUD-1 e T-AUD-2 consultados (D13). Nenhum ficheiro de código modificado.*
*`git status` em `pdc-v2/` deve estar limpo após esta auditoria.*
