# ADR-047 — 15 áreas vocacionais e slug 'estudante' canónico

**Data:** 2026-07-05
**Estado:** Aceite
**Caixa:** C — divergência crítica entre contrato partilhado e persistência Strapi

## Contexto

O contrato partilhado `@pdc/shared` declarava 15 áreas vocacionais e 7 roles canónicas (com `estudante`), enquanto o Strapi mantinha:

- `perfil-vocacional.area`, `programa.area`, `projeto.area`, `simulacao.area` e `experiencia.area` com 10 valores legados (`AGRONOMIA`, `OUTRO`).
- `perfil.tipo` com 6 valores, alguns dos quais ainda usavam `aluno` em ambientes legados.

Esta divergência bloqueava B6, B7, B8, E3 e E4 porque o BFF valida payloads com `AreaVocacionalSchema` (15 áreas) e `RoleSchema` (7 roles), enquanto a persistência aceitava valores incompatíveis. A inconsistência também quebrava filtros de catálogo, match terminal e recomendações.

## Decisão

1. **Contrato canónico (fonte de verdade):** `@pdc/shared` mantém `AreaVocacionalSchema` com as 15 áreas e `RoleSchema` com as 7 roles. Nenhum novo código deve usar `AGRONOMIA`, `OUTRO`, `aluno` ou `admin` como valores primários.

2. **Schemas Strapi sincronizados:** todos os content-types com enum `area` passam a aceitar exatamente as 15 áreas canónicas. `perfil.tipo` passa a aceitar as 7 roles canónicas, usando `estudante` em vez de `aluno`.

3. **Normalização tolerante:** `packages/shared/src/user.ts` exporta `LegacyRoleSchema` e `normalizeTipo()`, que aceitam `aluno` → `estudante` e `admin` → `super_admin` na leitura de dados persistentes. A escrita de novos registos só aceita valores canónicos.

4. **Migração aditiva e reversível:** o script `infra/strapi/scripts/migrate-15areas-estudante.ts` mapeia valores legados em Postgres (`AGRONOMIA` → `CIENCIAS_AGRARIAS`, `OUTRO` → `OUTRA`, `aluno` → `estudante`) e é:
   - idempotente (correr 2× não duplica alterações);
   - reversível via `--rollback`;
   - auditável (regista alterações em `audit_logs` ou em stdout como fallback).

5. **Guarda de produção:** o script recusa correr em `NODE_ENV=production` sem a flag `--force`, prevenindo execuções acidentais.

6. **Contract test anti-regressão:** `apps/api/src/routes/area-enum.contract.spec.ts` valida que os enums dos 5 content-types Strapi (`perfil-vocacional`, `programa`, `projeto`, `simulacao`, `experiencia`) e o enum `tipo` de `perfil` permanecem alinhados aos contratos partilhados, e rejeita áreas legadas.

7. **Seeds e fixtures:** `seed-narrativo.ts` e `apps/api/src/modules/vocacional/__fixtures__/personas.ts` cobrem as 15 áreas, garantindo que novos ambientes de desenvolvimento têm dados representativos.

## Consequências

- O BFF e o Strapi convergem para o mesmo vocabulário de domínio, eliminando drift silencioso.
- Filtros de catálogo, feed, match terminal e recomendações funcionam para todas as 15 áreas.
- Dados legados são saneados de forma auditada, sem remover campos ou valores antigos do schema.
- Content-types fora do scope (ex: `inscricao`, `conquista`, `post`, `vinculo`) ainda usam `aluno` em alguns enums; estes serão tratados num ticket posterior com ADR próprio, mantendo o princípio de migrações aditivas e reversíveis.

## Referências

- `specs/IMPORTANTE/03` (Roles)
- `specs/IMPORTANTE/04` (Tipos de Conteúdo)
- `docs/a_implementar/E1_—_Migração_F10__15_áreas_vocacionais_+_slug_'estudante'_canónico.md`
