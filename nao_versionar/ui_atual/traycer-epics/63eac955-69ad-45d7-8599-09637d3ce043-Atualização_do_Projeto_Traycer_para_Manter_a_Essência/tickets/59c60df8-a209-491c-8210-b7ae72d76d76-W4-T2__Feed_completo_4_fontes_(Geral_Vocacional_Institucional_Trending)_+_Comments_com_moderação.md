---
id: "59c60df8-a209-491c-8210-b7ae72d76d76"
title: "W4-T2: Feed completo 4 fontes (Geral/Vocacional/Institucional/Trending) + Comments com moderação"
assignee: ""
status: 0
createdAt: "2026-04-18T02:57:07.557Z"
updatedAt: "2026-04-18T02:57:24.222Z"
type: ticket
---

# W4-T2: Feed completo 4 fontes (Geral/Vocacional/Institucional/Trending) + Comments com moderação

## Scope & Objective

Restaurar Feed conforme spec v2 (`15428b59` algoritmo de ranking) com 4 fontes/tabs: **Geral** (todos posts), **Vocacional** (filtrado pelo perfil), **Institucional** (instituições onde tenho vínculo), **Trending** (Log de Eventos de Prestígio gerado pelo sistema). Restaurar Comments com moderação completa (UI workflow para denúncias + aprovação).

**In scope**: refactor `FeedPage.tsx` com 4 tabs, integração com `routes/feed.ts` BFF, Comments UI completa, fluxo moderação UI consumindo `routes/moderacao.ts`.
**Out of scope**: refactor do algoritmo de ranking (existente; só consumir); criação de novos eventos de prestígio (W2 já fez via event bus).

## References

- Atlas §6.2 F2-style "Feed empobrecido", reversões 15+ — atlas spec
- Approach §1.1 W4, decisão (Feed completo, Comments restaurados) — approach spec
- Spec mestra Feed: `15428b59` — file:Documentos/Traycer/15428b59-2e22-44bd-bacb-dc83e9d61a17-PDC_—_Algoritmo_de_Ranking_e_Feed.md
- Ficheiros: file:apps/web/src/features/feed/FeedPage.tsx, file:apps/web/src/lib/api/feed.ts, file:apps/api/src/routes/feed.ts (existe), file:apps/api/src/routes/comments.ts (existe)

## Guardrails

- W3-T2 design primitives + W3-T3 i18n + W3-T4 a11y são dependências.
- W2-T2 event bus (publish `comentario.criado`, `denuncia.aberta`) é dependência para Trending.
- BFF `routes/feed.ts` existe; estender se necessário para suportar 4 fontes (provavelmente já suporta via query param `tab`).
- Empty states aspiracionais (não texto cinza); aplicar pattern W4-T5.

## Acceptance Criteria

- `FeedPage.tsx` tem 4 tabs funcionais (`Geral`/`Vocacional`/`Institucional`/`Trending`).
- Comments: UI thread + reply + denunciar + estados moderação (`pendente`, `aprovado`, `rejeitado`).
- `Log de Eventos de Prestígio` na Trending: events `tentativa.concluida`, `conquista.desbloqueada`, etc. (do event bus W2-T2) renderizados como cards.
- E2E `tests/e2e/feed/tabs.spec.ts` actualizado (existente) + `comments-moderation.spec.ts` (NOVO).
- Strings em `pt.json`.

## Verification Steps

- Cada tab carrega conteúdo distinto + relevante.
- Comentar num post → comentário aparece pending → moderador aprova → aparece publicado.
- Denunciar comentário → entra fila moderação.
- E2E suite verde.
