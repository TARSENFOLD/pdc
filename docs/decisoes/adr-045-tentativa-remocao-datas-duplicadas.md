# ADR-045 — Remoção de `startedAt`/`finishedAt` duplicados em `tentativa`

**Data:** 2026-07-04
**Estado:** Aceite
**Caixa:** B — código/schema maduro que divergia da documentação; remoção de duplicados canónicos

## Contexto

O content-type Strapi `api::tentativa.tentativa` continha quatro campos de data/tempo:

- `startedAt` (datetime)
- `finishedAt` (datetime)
- `dataInicio` (datetime)
- `dataFim` (datetime)

O contrato canónico no `@pdc/shared` (`TentativaSchema`) e todas as rotas do BFF (`apps/api/src/routes/simulacoes-tentativas.ts`) utilizam exclusivamente `dataInicio` e `dataFim`. Os campos `startedAt`/`finishedAt` não são lidos nem escritos por código de aplicação.

## Decisão

1. Remover `startedAt` e `finishedAt` do schema `api::tentativa.tentativa`.
2. Manter `dataInicio` e `dataFim` como os campos canónicos de início e fim de tentativa.
3. Não introduzir migração de dados: os campos duplicados nunca foram populados pela aplicação (grep zero utilizações), pelo que não existem dados a migrar.
4. O BFF continua a enviar e esperar `dataInicio`/`dataFim` em todas as operações de tentativa.

## Consequências

- Schema Strapi alinhado com o contrato Zod partilhado.
- Elimina ambiguidade para administradores de conteúdo e futuros desenvolvedores.
- Requer rebuild do Strapi e validação de que o admin mostra apenas `dataInicio`/`dataFim`.
- Nenhuma alteração no BFF ou no frontend é necessária.

## Risco residual

Se existirem registos manuais em ambientes de produção que popularam `startedAt`/`finishedAt` fora da aplicação, esses dados devem ser migrados para `dataInicio`/`dataFim` antes do deploy. O BFF não faz fallback para os campos removidos.
