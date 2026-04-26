# ADR-020 — Conquista Canonical Source

**Status:** Accepted  
**Date:** 2026-04-26  
**Deciders:** cj

## Context

`ConquistaSchema` was defined in `packages/shared/src/schemas/dashboard.ts` alongside dashboard stat schemas (`EstudanteStatsSchema`, `MentorStatsSchema`, `InstituicaoStatsSchema`). This placement was incorrect: `Conquista` is a domain entity, not a dashboard display aggregate.

The old schema (10 fields) did not match the Strapi CMS schema for the `conquista` collection type, which has 14 canonical attributes. This schema drift caused the contract between the BFF and Strapi to be invisible and unenforceable.

## Decision

`ConquistaSchema` is moved to `packages/shared/src/schemas/conquistas.ts` (the file that already owns `CriarConquistaManualPayloadSchema`). It is expanded to cover all 14 Strapi attributes:

| Attribute | Type | Required |
|---|---|---|
| slug | uid | yes |
| titulo | string | yes |
| descricao | text | no |
| tipo | enum (automatica/manual/institucional/plataforma) | no |
| origem | enum (auto/manual) | no |
| categoria | string | no |
| midias | media (multiple) | no |
| autor | relation → perfil | no |
| perfis | relation → perfil (many-to-many) | no |
| tipoAutor | enum (mentor/instituicao/plataforma/aluno) | no |
| aprovada | boolean | no |
| tags | json | no |
| data | datetime | no |
| validadoAcademicamente | boolean | no |

Legacy UI-only fields (`raridade`, `icone`, `alcancadaEm`, `desbloqueada`, `dataDesbloqueio`) are retained as optional fields for backward compatibility with the web app.

`dashboard.ts` is updated to re-export `{ ConquistaSchema, type Conquista }` from `conquistas.ts`.

## Consequences

- Single source of truth for `Conquista` shape across the entire monorepo.
- `user.ts` import path (`./schemas/dashboard.js`) continues to work without change.
- Web app code that accesses `desbloqueada`, `dataDesbloqueio` continues to compile.
- Schema drift between BFF and Strapi is now visible and auditable.
