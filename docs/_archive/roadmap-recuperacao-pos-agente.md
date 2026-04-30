# Roadmap — Recuperacao Pos-Agente / CI Pipeline Fix

Fonte principal: `/home/cj/clean-errors` + estado atual do working tree em 2026-04-30.

Objetivo imediato: preservar contexto, evitar atalhos de typecheck, e guiar a reversao cirurgica sem perder trabalho legitimo do branch.

## Principios Operacionais

- Fidelidade primeiro: CI verde nao e objetivo da Fase 1.
- Nao reverter ficheiros staged sem ordem explicita.
- Nao criar stubs para mascarar contrato quebrado.
- Nao usar `any`, `as unknown as`, `@ts-ignore` ou fallbacks falsos para calar ferramentas.
- Cada mudanca deve indicar se e preservacao, reversao, marcacao de divida ou implementacao real.

## Estado Atual

Concluido nesta sessao:

- T1 parcial: `tests/e2e/critical-path.spec.ts` foi alinhado para rotas reais do router atual:
  - `/app/home`
  - `/app/dashboard/estudante`
  - `/app/cursos`
  - `/app/feed`
- O smoke agora falha explicitamente se cair no `NotFoundPage` (`h1 = 404` ou texto `Pagina nao encontrada`).
- `tests/helpers/seed.ts` foi refeito para reconciliar utilizadores reais no Strapi e validar login via BFF.
- O setup auth do Playwright voltou a autenticar as 7 roles reais/legadas usadas pelos testes.
- O BFF e o Strapi local foram estabilizados sem criar storage state falso.
- `infra/strapi/scripts/seed-narrativo.ts` foi corrigido para voltar a compilar no `strapi develop` (`nodeRequire`, sem identificador top-level reservado `require`).
- Cache/processos Vite obsoletos foram limpos para eliminar `504 Outdated Optimize Dep` no smoke.
- `apps/api/src/routes/feed-posts.ts` deixou de ser stub: agora valida `CriarPostPayloadSchema`, exige auth/RBAC no POST, cria `feed-post` real no Strapi, dispara `DomainEventName.POST_SUBMETIDO`, lista apenas posts aprovados e expõe moderação protegida.
- Política de produto dos posts ajustada: publicação normal é auto-aprovada (`estado: "aprovada"`) e dispara `DomainEventName.POST_PUBLICADO`; posts com sinais de risco passam pelo `ModerationRiskEngine` e ficam em revisão/ocultos conforme score.
- `apps/api/src/modules/moderation/moderation-risk.engine.ts` implementa triagem determinística sem IA com `decision`, `score`, `severity` e `reasons`.
- A triagem de exceção cobre links suspeitos, linguagem abusiva básica, repetição/spam, conta recém-criada, reputação negativa e duplicado recente.
- `apps/web/src/features/feed/PostComposer.tsx` deixou de ser shell "em manutenção": agora usa `CriarPostPayloadSchema`, `feedApi.createPost` e envia publicações reais para moderação.
- `apps/api/src/modules/events/event-bus.ts` foi corrigido para atualizar `domain-events` pelo `documentId` do Strapi v5 quando disponível; isso remove 404 no ciclo G15 após persistir o outbox.
- `apps/api/src/routes/domain-events.ts` agora tem `GET /domain-events/:id/my-impact` para criadores autenticados, com impacto agregado seguro, e o GET operacional procura por `correlationId`, `documentId` ou id numérico.
- `apps/web/src/components/ecosystem/EcosystemImpactPanel.tsx` deixou de ignorar `eventId`; agora consulta `my-impact` e exibe contadores reais.
- Logs 400 do catálogo no smoke foram tratados:
  - `catalogo/simulacoes` ignora sorts inexistentes como `reputacao:desc` e usa fallback real `createdAt:desc`.
  - `catalogo/mentores` deixou de consultar campos de mentor em `/users` e passou a consultar `perfis` com `tipo=mentor`.
- `refactoring-baseline-errors.md` foi atualizado com snapshot pre-Fase-1 e estado pos-recuperacao.
- Playwright Chromium foi instalado localmente para remover o bloqueio de browser ausente.

Validacoes recuperadas:

- `npx tsx tests/helpers/seed.ts`: verde para `aluno`, `estudante`, `mentor`, `instituicao`, `moderador`, `comite_cientifico`, `super_admin`.
- `npx playwright test --project=smoke`: verde, 12/12.
- `npm run typecheck --workspaces`: verde em todos os workspaces.
- `npm run lint --workspaces`: verde em todos os workspaces.
- Teste funcional manual: `POST /feed-posts` com login real `aluno@traycer.test` retornou `201 Created`; post normal saiu `aprovada`, post com link suspeito/repetição saiu `pendente_moderacao`.
- `npm run test -w apps/api -- moderation-risk.engine.spec.ts --run`: verde, 4/4.
- Teste funcional manual: `GET /domain-events/:eventId/my-impact` retornou `200 OK` com `{ totalHooks, success, skipped, errors, processed }`.

Bloqueio atual:

- Nao ha bloqueio de CI local nas tres gates executadas (`typecheck`, `lint`, `smoke`).
- Restam warnings de lint que devem ser tratados como hardening, nao como bloqueio imediato:
  - 7 warnings `react-refresh/only-export-components` em contexts/router do frontend.
  - 2 warnings `@typescript-eslint/no-unsafe-*` em `infra/strapi/scripts/seed-copy.ts`.
- Existe um container antigo `strapi-strapi-1` de outro compose reiniciando por falta de `/srv/app/package.json`; o stack funcional usado pela app e `pdc-strapi` + `pdc-postgres` + `pdc-redis`.

## Baseline Atual

Typecheck:

| Workspace | Erros TS |
| --- | ---: |
| `packages/shared` | 0 |
| `apps/web` | 0 |
| `apps/api` | 0 |
| `apps/edge` | 0 |
| `infra/strapi` | 0 |

Lint:

| Workspace | Erros | Warnings |
| --- | ---: | ---: |
| `apps/web` | 0 | 7 |
| `apps/api` | 0 | 0 |
| `apps/edge` | 0 | 0 |
| `packages/shared` | 0 | 0 |
| `infra/strapi` | 0 | 2 |

Ver detalhes em `refactoring-baseline-errors.md`. Os numeros originais foram preservados como baseline pre-Fase-1; a contagem atual deve ser recalculada durante a frente de lint.

## Ponto Cego Encontrado

Os tickets de `/home/cj/clean-errors` dizem que estes routers nao existem:

- `apps/api/src/routes/home.ts`
- `apps/api/src/routes/domain-events.ts`
- `apps/api/src/routes/feed-posts.ts`

No working tree atual, eles existem como untracked. A classificacao correta antes de T3 e obrigatoria:

| Router | Estado atual | Risco |
| --- | --- | --- |
| `home.ts` | Stub simples com dados hardcoded | Pode violar `HomeSummarySchema` e inteligencia real da home |
| `domain-events.ts` | Rota parcial com RBAC e Strapi, mas casts/fallbacks suspeitos | Pode ser base util ou stub perigoso |
| `feed-posts.ts` | Stub trivial `GET []` + `POST { success: true }` | Alto risco de mascarar feed social real |

Estado apos 2026-04-30:

| Router | Classificacao atual | Proxima acao |
| --- | --- | --- |
| `feed-posts.ts` | Implementacao real inicial, nao-stub | Completar frontend de moderação/lista e cobrir com teste BFF |
| `domain-events.ts` | Implementacao real com `/my-impact` seguro e GET operacional | Adicionar testes BFF dedicados |
| `home.ts` | Ainda hardcoded | Reimplementar via `HomeSummarySchema` com dados reais por role |

## Sequencia Recomendada

### T1 — Smoke + Baseline

Estado: concluido no comportamento essencial.

Feito:

- `critical-path.spec.ts` alinhado com rotas reais e protecao anti-404.
- Baseline documentado.
- Auth setup restaurado com seed real e login via BFF.
- Smoke verde contra router atual.

Pendente:

- Nenhum bloqueio funcional da gate minima. A seguir, separar divida de lint warnings de trabalho de produto.

### T2 — Preservacoes Deliberadas

Objetivo:

- Confirmar `packages/shared/src/index.ts` sem `infra.js`.
- Confirmar `TopBar/AppLayout` pelo runtime atual.

Ponto de atencao:

- O estado atual parece ter `TopBar/AppLayout` em default/default, mas os docs mencionam named export. Documentar divergencia, nao refatorar ainda.

### T3 — API Index + Routers

Atualizar ticket antes de executar.

Novo escopo sugerido:

- Primeiro classificar `routes/home.ts`, `routes/domain-events.ts`, `routes/feed-posts.ts` untracked.
- Se forem stubs do agente, marcar/remover/converter conforme decisao.
- So depois restaurar `apps/api/src/index.ts` e FIXME.

Nao fazer:

- Nao apagar routers so porque sao untracked.
- Nao montar stub falso para deixar API verde.

### T4 — CriarExperienciaPage / MuralVozes

Objetivo original:

- Restaurar `muralArray.append({ autor, cargo, depoimento })`.

Ponto de atencao:

- O schema atual em `@pdc/shared` parece apontar para novo shape de `MuralVozes`.
- A Fase 1 pode preservar a inconsistencia historica, mas a Fase 2 deve migrar a pagina inteira de forma coordenada.

### T5 — FIXME nos Stubs Mark-only

Antes de marcar, validar lista real de stubs:

- `apps/web/src/components/catalogo/*`
- `apps/web/src/components/dashboard/ContentTypeCTAGrid.tsx`
- `apps/web/src/components/layout/BootstrapErrorScreen.tsx`
- Possiveis stubs adicionais criados depois: `apps/web/src/components/ecosystem/*`, `apps/web/src/components/ui/quiet/*`, `apps/web/src/components/ui/shells/*`

Ponto cego: ha mais untracked do que os 9 stubs originais.

### T6 — BuilderShell

Objetivo:

- Corrigir default -> named export sem alterar semantica.

Ponto de atencao:

- No working tree atual ha ficheiros separados `BuilderShell.tsx`, `BuilderSection.tsx`, etc., alem de `index.tsx`.
- O ticket original fala apenas em `components/builders/index.tsx`; precisa cobrir a estrutura real.

### T7 — PostComposer + ConquistaManualComposer

Objetivo:

- `PostComposer` ja saiu de shell minima e publica via rota real `/feed-posts`.
- `ConquistaManualComposer` ainda deve ser auditado separadamente para evitar shell falsa.

Ponto de atencao:

- Router atual lazy-importa `PostComposer` como default e `ConquistaManualComposer` como named.
- Definir export esperado antes de editar.

### T8 — Validacao Final + Handoff

Deve incluir:

- Resultado do smoke ou bloqueio claro.
- Snapshot typecheck/lint.
- Lista dos stubs ainda marcados.
- Decisao sobre routers untracked.
- Proxima fase: auditoria Zod <-> Strapi <-> consumidores.

## Tickets Novos Recomendados

### T1a — Corrigir setup.auth sem tocar no smoke

Estado: concluido.

Motivo:

- Smoke corrigido nao executa porque `setup.auth.ts` nao consegue autenticar nenhuma role.

Escopo proposto:

- Investigar login local contra BFF.
- Verificar fixtures em `tests/.auth/*`.
- Confirmar se `aluno` deve continuar alias ou se `estudante` e o unico slug canonico.
- Nao alterar as rotas do smoke.

Resultado:

- `aluno` foi preservado como alias/test role enquanto `estudante` permanece canonico no router.
- O seed cria/reconcilia usuarios e perfis reais no Strapi.
- O login e validado pelo BFF, sem mockar storage state.

### T10 — Lint hardening por workspace

Motivo:

- Smoke, typecheck e lint ja estao verdes, mas o projeto ainda tem warnings que devem ser eliminados antes de tratar a gate como "classe mundial".

Escopo proposto:

- Corrigir warnings `react-refresh/only-export-components` movendo contexts/helpers para ficheiros proprios, sem alterar runtime.
- Tipar `infra/strapi/scripts/seed-copy.ts` linha 343 sem `any`.
- Depois atacar hardening por grupos coerentes.
- Nao introduzir disables globais, ignores oportunistas, `any`, casts cegos ou stubs.

### T3a — Classificacao dos routers untracked

Motivo:

- `home.ts`, `domain-events.ts`, `feed-posts.ts` existem no working tree apesar dos tickets dizerem que faltam.

Escopo proposto:

- Cruzar cada router com `@pdc/shared`, specs e EventBus.
- Classificar como `preservar`, `marcar stub`, `reimplementar`, ou `remover`.
- Nenhuma mudanca de montagem em `apps/api/src/index.ts` antes desta classificacao.

### T9 — Auditoria de stubs extras

Motivo:

- A lista de untracked atual excede os 9 stubs originais.

Escopo proposto:

- Mapear todos os untracked em `apps/web/src/components` e `apps/web/src/features`.
- Separar artefactos reais de stubs agent-generated.
- Produzir matriz de consumidores.

## Proxima Acao Recomendada

1. Fechar T1 como concluido: smoke, typecheck e lint passam localmente; baseline/handoff existe.
2. Atualizar T3 para incluir classificacao dos 3 routers untracked.
3. Executar T2/T3 com diffs pequenos, mantendo a gate atual verde sempre que possivel.
4. Priorizar remocao de stubs/mocks agent-generated por implementacao real, guiada por `docs/ROADMAP_PRODUTO_DISRUPTIVO.md`.
