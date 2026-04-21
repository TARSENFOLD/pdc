# E1 — Migração F10: 15 áreas vocacionais + slug 'estudante' canónico

## Status

Draft · Bloqueia B6, B7, B8, E3, E4 · Crítica.

## Estado actual — DRIFT TRIPLO

- file:packages/shared/src/schemas/enums.ts declara **15 áreas** (canónico).
- file:infra/strapi/src/api/perfil-vocacional/.../schema.json declara **10 áreas** (`AGRONOMIA` em vez de `CIENCIAS_AGRARIAS`; `OUTRO` em vez de `OUTRA`).
- file:infra/strapi/src/api/programa/.../schema.json declara **10 áreas** (mesmo drift).
- file:infra/strapi/src/api/projeto/.../schema.json declara **10 áreas**.
- file:infra/strapi/src/api/perfil/.../schema.json `tipo` enum tem **6 valores** com `aluno` (não `estudante`).
- file:packages/shared/src/user.ts `RoleSchema` tem **6 valores** com `aluno`.
- file:apps/api/src/routes/area-enum.contract.spec.ts existe — provavelmente está adaptado para o drift ou a falhar.

## Estado canónico

**15 áreas** (canónicas em `enums.ts`):
`SAUDE, ENGENHARIA, TECNOLOGIA, DIREITO, GESTAO, EDUCACAO, ARTES, CIENCIAS_AGRARIAS, CIENCIAS_SOCIAIS, COMUNICACAO, CIENCIAS_NATURAIS, ARQUITETURA, TURISMO_HOTELARIA, DESPORTO, OUTRA`.

**Roles canónicas** (spec:IMPORTANTE/03 §1): 7 perfis com `estudante` (não `aluno`); `patrocinador` 🔮 futuro.

## Tickets

### E1-T1 — Atualizar shared RoleSchema para 7 perfis canónicos

- file:packages/shared/src/user.ts `RoleSchema`: substituir `aluno` por `estudante`. Adicionar `patrocinador` 🔮 (opcional, futuro).
- Adicionar `normalizeTipo()` helper exportado: aceita `aluno` legacy, retorna `estudante`.
- Adicionar `LegacyRoleSchema` para deserialização tolerante.
- **DoD E2E**:
  - **UI**: zero ocorrências de `aluno` em paths/copy novos; legacy paths mantêm-se com redirect.
  - **Contrato**: Zod aceita ambos legacy + canónico, retorna canónico.
  - **BFF**: middleware normaliza `tipo` à entrada e à saída.
  - **Persistência**: lifecycle Strapi normaliza à leitura.
  - **Impacto**: redirects pós-login + RBAC + bootstrap usam `estudante` consistentemente.

### E1-T2 — Atualizar Strapi enums (perfil-vocacional, programa, projeto, simulação, experiência)

- 4 schemas Strapi: substituir 10 áreas por 15 canónicas; mapear `AGRONOMIA` → `CIENCIAS_AGRARIAS`, `OUTRO` → `OUTRA`.
- `perfil.tipo`: substituir `aluno` por `estudante`. Manter `aluno` como valor antigo aceite via lifecycle de mapeamento à leitura, **mas escrita só aceita canónico**.
- **DoD E2E**:
  - **Contrato**: schemas batem 1:1 com `enums.ts`.
  - **BFF**: filtros de catálogo funcionam para todas as 15 áreas.
  - **Persistência**: dados existentes sobrevivem (script de migração T3).
  - **Impacto**: filtros de feed, match terminal, recomendações cobrem 15 áreas.

### E1-T3 — Migration script Postgres (`infra/strapi/scripts/migrate-15areas-estudante.ts`)

- Mapear linhas existentes: `AGRONOMIA` → `CIENCIAS_AGRARIAS`, `OUTRO` → `OUTRA`. Iterar `perfil_vocacionais.area`, `programas.area`, `projetos.area`, `simulacoes.area`, `experiencias.area`.
- Mapear `perfis.tipo: 'aluno'` → `'estudante'`.
- Audit log de cada conversão (quantos rows, antes/depois) para `audit-logs`.
- Idempotente (correr 2× não duplica).
- Reversível com `--rollback`.
- **DoD E2E**: correr em dev local + staging copy de prod produz 0 erros + relatório claro.

### E1-T4 — Atualizar frontend filters + redirects pós-login

- file:apps/web/src/lib/api/catalogo.ts e similares: aceitar 15 áreas.
- Componentes de filtro (`SimulacoesCatalogoPage`, `CursosCatalogoPage`, `ExplorarPage`, etc.) listam 15 áreas com nomes PT canónicos.
- Redirects pós-login: `aluno` → `/estudante` (alias 301) → `/estudante` (canónico).
- **DoD E2E**:
  - **UI**: todas as 15 áreas aparecem em select/filter.
  - **Contrato**: payloads enviam só canónico.
  - **BFF**: aceita ambos por 1 release de transição.
  - **Persistência**: dados convergem.
  - **Impacto**: utilizador filtra por `ARQUITETURA` e vê resultados (área que não existia antes).

### E1-T5 — Atualizar seeds + fixtures de personas + behavior-patterns

- file:infra/strapi/scripts/seed-narrativo.ts: gerar instituições/programas/cursos em **15 áreas** (não 4).
- file:apps/api/src/modules/vocacional/__fixtures__/personas.ts: garantir que cobre arquétipos para 15 áreas.
- 100 behavior-patterns redistribuídos.
- **DoD E2E**: novo dev corre seed e tem dados em todas as 15 áreas.

### E1-T6 — Fix `area-enum.contract.spec.ts` para validar 15 áreas

Test que falha se Strapi enum ≠ shared enum.

- **DoD E2E**: contract test bloqueia regressão futura.

## Dependências

- Bloqueia B6, B7, B8, E3, E4.