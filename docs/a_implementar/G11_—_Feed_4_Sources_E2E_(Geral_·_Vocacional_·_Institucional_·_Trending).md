# G11 — Feed 4 Sources E2E (Geral · Vocacional · Institucional · Trending)

## Status

Draft · Depende de `spec:G15` (feedHook + feed-entry collection), `spec:E4-T2` (4 any cleanup).

## Estado actual auditado

- ✅ UI: file:apps/web/src/features/feed/FeedPage.tsx, `FeedCard.tsx`.
- ✅ BFF: file:apps/api/src/routes/feed.ts — implementação on-the-fly (recomputa cada vez), 1 source apenas.
- ✅ Scoring: file:apps/api/src/modules/feed/feed.scoring.ts + `feed.weights.ts`.
- ✅ Admin pesos: file:apps/web/src/features/admin/FeedWeightsPage.tsx.
- ❌ 4 fontes não implementadas (só 1 endpoint).
- ❌ Sem tabs UI.
- ❌ Sem cache por (perfilId, source).
- ❌ Sem realtime invalidation por evento.
- 🔴 Inferência on-the-fly em vez de leitura de `feed-entry` collection (resolvido em `spec:G15-T4`).

## Estado canónico (spec:IMPORTANTE/02 A1, A4 + Verdade Lateral 2)

- 4 fontes: **Geral** (todos os públicos), **Vocacional** (filtrado pela área do perfil), **Institucional** (apenas conteúdos de instituição/mentor vinculado), **Trending** (algorithm-driven).
- Pesos tunáveis pelo super_admin.
- Cache 5 min com invalidação por evento.

## Tickets

### G11-T1 — Refactor `FeedPage.tsx` com 4 tabs

- Tabs Soul & Elite: Geral · Vocacional · Institucional · Trending.
- Cada tab faz fetch de `/feed?source={tipo}` (paginado).
- Loading: AspirationalEmpty Soul & Elite.
- Pull-to-refresh em mobile (gesture).
- Infinite scroll com IntersectionObserver.
- Composer integrado (G6) no topo.
- **DoD E2E**:
  - **UI**: tabs Soul & Elite, mobile-first, swipe entre tabs.
  - **Contrato**: `FeedQuery { source, page, pageSize }`.
  - **BFF**: `GET /feed` aceita `source`.
  - **Persistência**: lê de `feed-entry` (criado em G15-T4).
  - **Impacto**: utilizador navega 4 fontes distintas em <100ms cada (cache).

### G11-T2 — Implementar 4 sources no BFF

- `GET /feed?source=geral`: lê `feed-entry` ordered por score desc, paginado.
- `GET /feed?source=vocacional`: filtro por `area = perfil.areaInteresse[0]`.
- `GET /feed?source=institucional`: filtro por `entityAuthor.tipo = 'instituicao' OR (autor.tipo='mentor' AND autor.instituicao IS NOT NULL)`.
- `GET /feed?source=trending`: aplica `DEFAULT_WEIGHTS_TRENDING` + janela de últimas 48h.
- Cache Redis: `feed:{userId}:{source}:{page}` TTL 300s.
- **DoD E2E**:
  - **BFF**: 4 queries optimizadas com índices Postgres.
  - **Persistência**: `feed-entry` indexado por `(source, area, score, publicadoEm)`.
  - **Impacto**: regra Verdade Lateral 2 enforced.

### G11-T3 — Realtime invalidation de cache por evento

- Quando G15-T4 cria nova `feed-entry`, dispara invalidação Redis: `DEL feed:{*}:{source}:*` (ou apenas para perfis afins se possível).
- Socket.IO emite `feed.refreshed` para clientes activos com source afectado.
- Frontend reagia: mostra badge "Novo conteúdo disponível" + botão "Atualizar".
- **DoD E2E**:
  - **UI**: badge realtime Soul & Elite.
  - **BFF**: cache invalidation por evento.
  - **Impacto**: utilizador vê novo curso publicado em <60s sem refresh manual.

### G11-T4 — Comments inline com moderação

- Card de feed expansível com lista de comentários inline (carregamento lazy).
- Comments com avatar + 2 linhas + mais-+ se truncado.
- Ações: Reply, Like, Report.
- Moderação inline: comments com `aprovado=false` aparecem com placeholder "comentário em moderação".
- **DoD E2E**:
  - **UI**: collapse/expand mobile-first.
  - **Contrato**: `Comment` schema.
  - **BFF**: `GET /feed-entries/:id/comentarios` + `POST /comentarios`.
  - **Persistência**: existing.
  - **Impacto**: emite `comentario.criado` → G15 Notify autor do post.

### G11-T5 — Telemetria de scroll-depth

- `useTelemetry` no FeedPage emite eventos `feed.scrolled { source, depth, sessionDuration }`.
- Alimenta Match Hook: utilizador com alta scroll-depth em area X aumenta affinity score para área X.
- **DoD E2E**:
  - **UI**: throttled scroll listener.
  - **Persistência**: telemetria via Edge.
  - **Impacto**: G15 Match Hook usa para refinar sugestões.

## Eventos canónicos (consume mais que emit)

- **Consome**: todos os `*.publicado` para gerar `feed-entry`.
- **Emite**: `feed.scrolled` (telemetria), `feed.entry_clicked` (telemetria), `comentario.criado`.
- **Hooks G15**: leitor primário do output do feedHook.

</TRAYCER_SPEC>