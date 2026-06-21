# ADR 040 - Canal obrigatório nas partilhas

## Estado

Aceite em 2026-06-14.

## Contexto

A unicidade de uma partilha usa `actor`, `targetType`, `targetId` e `canal`.
No PostgreSQL, valores `NULL` não são considerados iguais num índice único,
permitindo duplicados quando o canal está ausente.

## Decisão

- `partilha.canal` passa a ser obrigatório.
- Novos registos usam `interno` como valor padrão no CMS e no contrato partilhado.
- Registos existentes sem canal são atualizados para `interno` pelo script
  `infra/strapi/scripts/migrate-partilha-canal.ts` antes de aplicar a restrição.

## Consequências

O índice composto passa a garantir a idempotência por ator, alvo e canal.
Integrações continuam compatíveis porque a ausência de canal já significava
partilha interna no contrato público.
