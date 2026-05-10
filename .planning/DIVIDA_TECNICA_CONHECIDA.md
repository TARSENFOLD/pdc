# Dívida Técnica Conhecida — PDC v2

> Inventário honesto de problemas técnicos identificados, classificados e documentados.
> **Nenhum destes foi "varrido para debaixo do tapete"** — todos são decisões conscientes com justificação.
>
> Última actualização: 9 de Maio de 2026 · FIX-002: DT-13/DT-22 reconciliados pós-PROD-E (PE-T01..T04 concluídos)

---

## 🔴 Requer Strapi a Correr Para Corrigir

### DT-01 — InscricaoSchema com tipos incorrectos para Strapi v5

**Ficheiro:** `packages/shared/src/cursos.ts` (linhas 120-136)

**Problema:**
```ts
export const InscricaoSchema = z.object({
  id: z.string(),        // ← Strapi retorna number
  cursoId: z.string(),   // ← Não existe como top-level; é relação { data: { id } }
  estudanteId: z.string(), // ← Idem
  ...
});
```

O schema Zod define `id`, `cursoId` e `estudanteId` como `z.string()`, mas o Strapi v5 retorna IDs numéricos e relações como objectos nested (`{ data: { id: number } }`).

**Porquê não foi corrigido:** O FE usa `InscricaoComCurso` apenas como type hint (compile-time), sem `.parse()` runtime. Funciona por acidente. Corrigir exige auditar o schema Strapi real de `inscricoes`, actualizar o Zod, e verificar todos os consumidores.

**Risco:** Se alguém adicionar validação Zod runtime (`.parse()`), explode. Sem `.parse()`, é transparente.

**Para corrigir:**
1. Levantar Strapi (`docker compose up`)
2. Inspeccionar `GET /api/inscricoes?populate=*` no Strapi
3. Actualizar `InscricaoSchema` e `InscricaoComCursoSchema` com a shape real
4. Verificar consumidores no FE

---

### DT-02 — Nomes de campos Strapi não verificados nas queries BFF

**Ficheiros:**
- `apps/api/src/routes/estudante.ts` → `'filters[estudante][id][$eq]'`
- `apps/api/src/routes/estudante.ts` → `'filters[concluido][$eq]'`

**Problema:** As queries Strapi assumem nomes de relações (`estudante`, `curso`) e campos (`concluido`, `dataConclusao`) que podem não corresponder ao content-type real configurado no Strapi. Se o campo se chamar `aluno` em vez de `estudante`, a query retorna array vazio sem erro.

**Porquê não foi corrigido:** Sem Strapi a correr, é impossível verificar. As queries seguem convenções razoáveis mas não confirmadas.

**Risco:** Médio. Certificados e ranking podem retornar vazios silenciosamente.

**Para corrigir:**
1. Levantar Strapi
2. Verificar nomes reais em `/api/content-type-builder/content-types`
3. Actualizar queries se necessário

---

## 🟡 Dados Hardcoded / Mentira UI

### DT-03 — `pulseVariacao` sem cálculo real no dashboard do estudante

**Estado:** Mitigado em PROD-D-T01. O BFF devolve `null` — campo presente no schema mas sem cálculo telemetry-driven. Decisão documentada em ADR-033.

**Ficheiros:** `apps/api/src/routes/estudante.ts`, `apps/api/src/routes/dashboard/estudante.ts`

**Problema:** A variação deveria ser calculada a partir de telemetria real (comparação actividade semana actual vs anterior). A cálculo provisório (`Math.round(lastPattern.scoreGlobal * 10)`) foi removido em favor de `null` explícito porque dependia de `lastPattern` que não é dado de telemetria temporal mas de perfil comportamental — metodologia errada. Ver ADR-033.

**Porquê não foi corrigido por completo:** Corrigir exige pipeline de telemetria funcional + query temporal sobre eventos do utilizador (contar eventos nos últimos 7 vs 14 dias). Isso fica para PROD-E.

**Risco residual:** Tile de variação indisponível até PROD-E. O campo `pulseVariacao: null` é devolvido pelo BFF; a UI não renderiza tile quando `null`. Preferível a mostrar dados falsos.

**Para resolver em PROD-E:**
1. Implementar query de telemetria: contar eventos por utilizador nos últimos 7 vs 14 dias
2. Calcular variação percentual real
3. Substituir `null` pelo valor calculado no BFF (`apps/api/src/routes/estudante.ts` e `apps/api/src/routes/dashboard/estudante.ts`)

---

## 🟠 Performance

### DT-04 — Feed pipeline faz N+1 queries (getItemStats por candidato)

**Ficheiro:** `apps/api/src/routes/feed.ts` → `buildFeed()` → `mapConcurrent()`

```ts
const items = await mapConcurrent(candidates, async (cand) => {
  const stats = await getItemStats(cand.tipo, String(cand.id));
  // ...
}, HYDRATION_CONCURRENCY);
```

**Problema:** Para cada candidato no feed, faz uma chamada individual a `getItemStats` (que vai ao Strapi ou Redis). Com 100 candidatos = 100 requests. `HYDRATION_CONCURRENCY` limita a concorrência mas não elimina o volume.

**Porquê não foi corrigido:** Pré-existente. A função `buildFeed` e `getItemStats` já existiam antes das novas rotas. Refactoring para batch query exige redesenhar o data layer.

**Risco:** Latência degradada em feeds grandes. Mitigado pelo `HYDRATION_CONCURRENCY` limit e cache Redis nos stats.

**Para corrigir (Wave 4+):**
1. Batch `getItemStats` — aceitar array de IDs, retornar map
2. Single Strapi query com filtros `[$in]` em vez de N queries individuais
3. Pré-computar stats em background worker

---

## ✅ Resolvidos Nesta Sessão

| ID | Problema | Resolução |
|----|----------|-----------|
| ~~DT-05~~ | `home.ts` BFF servia dados mock hardcoded | **Removido** — mount eliminado do `index.ts` (dead code) |
| ~~DT-06~~ | ConquistaManualComposer não enviava `mediaUrls` | **Corrigido** — campo de URLs com validação adicionado ao formulário |
| ~~DT-07~~ | Feed `/` e `/geral` eram duplicatas sem explicação | **Documentado** — comment inline + lógica reduzida a `buildFeed()` call |
| ~~DT-08~~ | Ranking RBAC mismatch (FE 4 roles, BFF só estudante) | **Corrigido** — extraído para `ranking.ts` com `verifyJwt` sem role restriction |
| ~~DT-09~~ | Upload response `sizeBytes` vs schema `size` | **Corrigido** — alinhado BFF com `UploadResultSchema` |
| ~~DT-10~~ | Feed weights PUT sem validação Zod | **Corrigido** — `UpdateFeedWeightsPayloadSchema` aplicado |
| ~~DT-11~~ | Feed weights GET/PUT sem try/catch | **Corrigido** — try/catch com erro semântico 502 |
| ~~DT-12~~ | `checkRole(['estudante', 'estudante'])` duplicado | **Corrigido** — `['estudante']` |
| ~~DT-16~~ | Edge "Tag, Don't Drop" sem DLQ para poison pills | **Corrigido** — DLQ list-based `telemetry_dlq` + 5 retries + Sentry alerting |
| ~~DT-15~~ | Scoring telemetry-driven Tipo 2/3 | **Corrigido** — `sim-2-3.engine.ts` implementado (212 linhas: `aggregateLabEvent` + `derivePerSession` + `finalizeSession` + `handleLabEvent`; idempotência Redis); flags `SIM_TIPO_2/3_PUBLISH_ENABLED` promovidas para `STABLE` (PE-T03) |
| ~~DT-13~~ | `moderacao.ts` motivo de rejeição perdido | **Corrigido** — `moderacao.service.ts` unificado criado; `motivoRejeicao` persistido em todos os tipos de conteúdo; evento `CONTEUDO_REJEITADO` emitido via outbox (PE-T02) |
| ~~DT-22~~ | Evento `CONTEUDO_REJEITADO` ausente em `domain-events.ts` | **Corrigido** — `DomainEventName.CONTEUDO_REJEITADO = 'conteudo.rejeitado'` definido em `packages/shared/src/domain-events.ts` (linha 105) com payload `{ targetType, targetId, rejeitadorId, motivo }`; emitido em `moderacao.service.ts` via outbox (PE-T02) |

---

## 🔵 Adicionados em PROD-D (Pré-Produção)

### DT-14 — FOMO triggers spec-specific não implementados

**Origem:** REQUIREMENTS F6

**Problema:** `notify.hook.ts` existe e envia notificações básicas, mas os triggers FOMO específicos definidos na spec (`perfil_visualizado_por_instituicao`, `streak_quebrado`, "3 instituições viram o teu perfil hoje") não têm eventos correspondentes no bus, nem lógica de acumulação/agrupamento.

**Porquê não foi corrigido:** Os triggers exigem instrumentação adicional no fluxo de visualização de perfis e no cálculo de streaks — fora do scope pre-production hardening.

**Remediação:** Pós-launch. Criar eventos `PERFIL_VISUALIZADO`, `STREAK_QUEBRADO` no bus; adicionar acumuladores em `notify.hook.ts`; testar com dados reais.

---

## 🟤 Adicionados em Wave A — Compliance Pass (2026-05-09)

### DT-17 — Home cache TTL-only sem invalidation event-driven

**Origem:** Wave B decision D-NC2, D-NC4, D-S4 (Approach Spec)

**Problema:** O BFF `/app/home` usa cache Redis com TTL de 60s (`home:summary:${userId}`). Quando um utilizador se inscreve num curso ou conclui uma tentativa e volta imediatamente a `/app/home`, pode ver dados desatualizados por até 60s. Invalidação event-driven (subscriber que limpa a cache ao receber eventos `INSCRICAO_CRIADA`, `TENTATIVA_CONCLUIDA`, `POST_PUBLICADO`) não foi implementada no MVP.

**Porquê não foi corrigido:** Decisão deliberada (D-NC4 do Approach). O mapeamento `perfilId → userId` entre os payloads heterogéneos dos hooks G15 é ambíguo — uma implementação errada geraria invalidações falsas. Stale de 60s é aceitável no MVP aspiracional.

**Risco:** Baixo. Stale máximo 60s; não afeta dados críticos (reputação/scoring têm cache própria).

**Remediação:** Pós-Wave B. Adicionar subscriber no eventBus que escuta eventos relevantes e invalida `home:summary:${userId}`.

---

### DT-18 — HomeSummarySchema v2: campos opcionais não implementados

**Origem:** Wave B WB-T02, ADR-030

**Problema:** `HomeSummarySchema` em `packages/shared/src/home.ts` não inclui os 5 campos necessários para a home real: `recentActivitiesCursos`, `recentActivitiesSimulacoes`, `onboardingVideo`, `trendingComunidade`, `aprenderAgora`. A UI mostra apenas dados do payload atual (greeting, stats, quickActions, socialPulse).

**Porquê não foi corrigido:** Wave B necessária; requer ADR-030 (Caixa C — síntese de 5 fontes Strapi) antes do código.

**Risco:** Médio. A expansão é back-compat (campos opcionais com defaults) mas exige coordenação BFF → Shared → UI.

**Remediação:** Wave B WB-T02 (Shared schemas + `HomeSummarySchema` v2) + WB-T05 (BFF `home.ts` real com 5 queries Strapi) + WB-T06 (HomePage UI com 3 secções novas).

---

### DT-19 — Content-type `OnboardingVideo` ausente no Strapi

**Origem:** Wave B WB-T03, ADR-031

**Problema:** `/app/home` precisa de um vídeo de onboarding por role (7 roles × 1 vídeo). O content-type Strapi `onboarding-video` com campos `role`, `videoUrl`, `embedType`, `duracaoSegundos`, `thumbnailUrl`, `tituloPt`, `tituloEn` não existe. O BFF home.ts devolve `onboardingVideo: null` por defeito.

**Porquê não foi corrigido:** Wave B necessária. Requer novo content-type Strapi + seed idempotente non-fatal (7 placeholders, 1 por role) + ADR-031.

**Risco:** Alto (RH-3). Sem seed, a home rebenta em ambientes pristine. Mitigação: seed via lifecycle Strapi **non-fatal** (try/catch por role, log `strapi.log.error`, Strapi sobe mesmo se seed falhar).

**Remediação:** Wave B WB-T03 (Strapi OnboardingVideo content-type + auto-seed non-fatal + 6 migrações `motivoRejeicao`).

---

### DT-20 — Upload 50MB: limite atual 10MB em post-media/projeto/generic

**Origem:** Wave B WB-T04, ADR-032, D-D4

**Problema:** `MEDIA_SIZE_LIMITS` em `packages/shared/src/schemas/media.ts` tem ceiling de 10MB para `post-media`, `projeto`, `generic`. O pedido de produto é "50MB para tudo, até em posts". Upload direto ao R2 acima de certos limites deve considerar presigned URL para evitar timeout no BFF.

**Porquê não foi corrigido:** Wave B necessária. Requer: bump de `MEDIA_SIZE_LIMITS` (post-media/projeto/generic: 10→50MB, novo `onboarding-video`: 50MB) + análise CSP `frame-src` para vídeos embedded (YouTube/Vimeo) + ADR-032.

**Risco:** Médio. Magic-byte guard existente (PROD-B-T02) continua a aplicar-se — bump de limite não relaxa validação de tipo. Storage R2 cresce ~5× em post-media e projeto.

**Remediação:** Wave B WB-T04 (CSP `frame-src` + rate limit upload tier 50MB + `MEDIA_SIZE_LIMITS` bump).

---

### DT-21 — DLQ telemetria sem dashboard operacional

**Origem:** Wave B PROD-E / D-D6, Approach Spec §6 "Out of Scope"

**Problema:** A implementação DLQ list-based (PROD-E DT-16) usa `LPUSH telemetry_dlq` para poison pills com alerta Sentry. Não existe dashboard de operador para visualizar a fila `telemetry_dlq`, distribuição de erros por tipo, ou histórico de poison pills.

**Porquê não foi corrigido:** Decisão deliberada (Approach Spec §6). Dashboard fora do escopo do MVP. Inspeção manual via redis-cli ou Upstash console é suficiente na fase inicial. `Sentry.captureMessage('telemetry-poison-pill')` é o alerta automatizado disponível.

**Risco:** Baixo. Poison pills ficam em `telemetry_dlq` indefinidamente sem bloqueio de produção. Risco operacional: acumulação silenciosa sem visibilidade. Mitigado por alertas Sentry.

**Remediação:** Pós-PROD-E. Criar dashboard admin (Grafana ou page interna) que expõe `LLEN telemetry_dlq` e amostragem de entradas para inspeção de operador.

---

---

## Notas

- Os warnings de `@theme` / `@apply` no `index.css` são **Tailwind v4 syntax** — falso positivo do IDE CSS linter, não são bugs.
- O ficheiro `apps/api/src/routes/home.ts` continua no disco mas **não está montado** no `index.ts`. Pode ser eliminado fisicamente quando conveniente.
- Os 4 items pré-PROD (DT-01 a DT-04) estão classificados por **dependência** (Strapi a correr) e não por preguiça.
- DT-13, DT-15 e DT-22 foram resolvidos em PROD-E (PE-T02 e PE-T03); DT-16 foi resolvido em PE-T04. Ver tabela "Resolvidos Nesta Sessão".
- DT-17 a DT-21 foram adicionados em Wave A (Compliance Pass) para documentar transparentemente os itens Wave B/PROD-E pendentes. DT-22 foi adicionado em Wave A mas reconciliado como já resolvido em PROD-E PE-T02.

---

*Regra de Ouro: Se não está documentado aqui, não existe como dívida técnica consciente.*
*Última actualização: 9 de Maio de 2026 · FIX-002: DT-13, DT-15 e DT-22 movidos para "Resolvidos" — PROD-E concluído (PE-T01..T04 done); drift documental corrigido.*
