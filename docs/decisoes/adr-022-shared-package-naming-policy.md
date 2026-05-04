---
title: "ADR-022 — Shared Package Naming Policy: Remoção de infra.ts"
status: active
date: "2026-04-26"
context_wave: W2
---

# ADR-022 — Shared Package Naming Policy: Remoção de `infra.ts`

## Contexto

O ficheiro **packages/shared/src/infra.ts** (removido em W2) agrupava dois domínios semanticamente distintos sob um nome técnico genérico:

1. **Schemas de subscrição** (`SubscricaoTipoSchema`, `SubscricaoLtiSchema`) — modelam entidades de negócio de acesso (LTI, individual, institucional).
2. **Schema de resposta presigned** (`PresignedMediaResponseSchema`) — modela a resposta do endpoint BFF `/media/presigned`.

O nome `infra` não comunicava nenhum desses domínios. Qualquer consumidor externo precisava de saber o conteúdo do ficheiro para encontrar o que procurava.

## Decisão

**Rename duro em W2**, com remoção total de `infra.ts`:

| Origem | Destino | Conteúdo |
|--------|---------|----------|
| `infra.ts` → | `schemas/subscricoes.ts` | `SubscricaoTipoSchema`, `SubscricaoTipo`, `SubscricaoLtiSchema`, `SubscricaoLti` |
| `infra.ts` → | `schemas/media.ts` | `PresignedMediaResponseSchema`, `PresignedMediaResponse` (adicionado ao ficheiro existente) |

O `index.ts` substitui `export * from './infra.js'` por `export * from './schemas/subscricoes.js'` (o `schemas/media.ts` já estava exportado).

## Justificação

- **Coerência semântica**: os consumidores procuram schemas pelo domínio, não pela infraestrutura técnica.
- **Blast radius baixo**: apenas 2 consumidores reais (`lti.handler.ts` e `SovereignMediaUpload.tsx`), ambos importando via `@pdc/shared` sem path direto — o re-export do `index.ts` preserva o contrato público sem alteração nos consumidores.
- **Invariante §4.2 preservada**: os exports públicos do `@pdc/shared` continuam todos acessíveis; nenhum símbolo foi silenciosamente removido.

## Consequências

- `infra.ts` deixa de existir no repositório.
- Qualquer referência futura a ./infra.js nos exports do `index.ts` será um erro de compilação imediato (ts2307).
- Novos schemas de subscrição devem ir para `schemas/subscricoes.ts`; novos schemas de media para `schemas/media.ts`.
