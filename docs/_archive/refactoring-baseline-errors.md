# Refactoring Baseline Errors — Pre-Fase 1

Data local: 2026-04-29
Escopo: epic `8dc1663f-4a62-407f-b07e-580ce406419d`, ticket T1.

Este ficheiro e um snapshot informativo local. Nao e fonte de verdade e nao deve ser usado como gate automatico.

## Estado Pos-Recuperacao Local — 2026-04-30

Este bloco nao substitui o baseline pre-Fase-1 acima; apenas regista o estado depois da recuperacao local.

| Gate | Resultado |
| --- | --- |
| `npm run typecheck --workspaces` | Verde, 0 erros |
| `npm run lint --workspaces` | Verde, 0 erros, 9 warnings |
| `npx playwright test --project=smoke` | Verde, 12/12 |

Warnings remanescentes:

- `apps/web`: 7 warnings `react-refresh/only-export-components` em contexts/router.
- `infra/strapi/scripts/seed-copy.ts`: 2 warnings `@typescript-eslint/no-unsafe-*` na leitura de `response.data`.

Incidentes corrigidos durante a validacao:

- Vite estava preso na porta 5173 com cache antigo e servia `504 Outdated Optimize Dep`; os processos antigos foram encerrados e o cache `.vite` foi limpo.
- `pdc-strapi` nao subia porque `infra/strapi/scripts/seed-narrativo.ts` declarava `const require` em top-level; foi renomeado para `nodeRequire`.
- Login real via BFF voltou a responder com `User` e cookies HTTP-only; o smoke nao usa storage state falso.
- `feed-posts.ts` deixou de responder com stub `GET []` / `POST { success: true }`; a rota cria `feed-post` real, valida Zod, exige auth/RBAC, dispara G15 `POST_SUBMETIDO` e suporta moderação protegida.
- A regra de produto foi refinada: posts normais são auto-aprovados e disparam `POST_PUBLICADO`; a fila de moderação fica reservada para exceções detectadas por heurísticas de risco.
- `PostComposer.tsx` deixou de ser shell "em manutenção" e envia publicações reais para moderação.
- O EventBus passou a usar `documentId` do Strapi v5 ao atualizar `domain-events`, corrigindo 404 no ciclo G15.
- `domain-events.ts` passou a expor `GET /domain-events/:id/my-impact` para criadores autenticados, com impacto agregado seguro; `EcosystemImpactPanel` usa esse endpoint em vez de ignorar `eventId`.
- O smoke voltou a passar sem os 400 de catálogo observados em `/catalogo/simulacoes` e `/catalogo/mentores`.

## Smoke

Comando:

```bash
npx playwright test --project=smoke
```

Resultado atual: falha antes de executar os 5 testes `critical-path`.

- A primeira tentativa em sandbox falhou por `EPERM` no pipe IPC do `tsx`.
- Foi instalado `chromium` via `npx playwright install chromium`.
- A segunda tentativa arrancou os web servers e o Playwright, mas falhou no projeto `setup`.
- Falha atual: os 7 logins de `tests/e2e/setup.auth.ts` ficam em `http://localhost:5173/login` ate timeout, sem redirecionar para `/app` ou `/verificar`.
- Impacto: o smoke corrigido nao foi exercitado ainda; o bloqueio esta no setup de auth, nao nas rotas do `critical-path.spec.ts`.

## Typecheck

Comandos workspace:

```bash
npx tsc --noEmit --pretty false
```

| Workspace | Erros TS | Estado |
| --- | ---: | --- |
| `packages/shared` | 0 | Verde |
| `apps/web` | 72 | Vermelho |
| `apps/api` | 19 | Vermelho |
| `apps/edge` | 0 | Verde |
| `infra/strapi` | 0 | Verde |

Principais familias observadas:

- `apps/web`: contratos de catalogo/shared desalinhados, `BuilderShell`/builders, `MuralVozes`, estados editoriais, payloads de simulacao, imports lazy sem default.
- `apps/api`: `User`/perfil sem `xp` e `reputacao`, `LtiScore.activityId`, serializer de perfil, `AreaVocacional`, strings opcionais em rotas, `Modalidade`, estados de projeto.

## Lint

Resumo por workspace, capturado via ESLint JSON:

| Workspace | Ficheiros analisados | Erros | Warnings | Fatal | Fixable errors |
| --- | ---: | ---: | ---: | ---: | ---: |
| `apps/web` | 276 | 326 | 5 | 2 | 35 |
| `apps/api` | 136 | 309 | 0 | 0 | 20 |
| `apps/edge` | 5 | 40 | 0 | 0 | 1 |
| `packages/shared` | 53 | 1 | 0 | 0 | 0 |
| `infra/strapi` | 5 | 14 | 29 | 0 | 1 |

Hotspots iniciais:

- `apps/web/src/components/builders/*`
- `apps/web/src/components/catalogo/*`
- `apps/web/src/components/layout/__tests__/Sidebar.render-by-role.spec.tsx`
- `apps/api/src/lib/redis.ts`
- `apps/api/src/modules/auth/*`
- `apps/api/src/routes/simulacoes.*`
- `apps/edge/src/middleware/jws-verify.spec.ts`
- `infra/strapi/scripts/seed-narrativo*.ts`

## Nota Sobre Routers

Os materiais em `/home/cj/clean-errors` classificam `apps/api/src/routes/{home,domain-events,feed-posts}.ts` como ausentes. No working tree atual, esses 3 ficheiros existem como untracked:

- `apps/api/src/routes/home.ts`
- `apps/api/src/routes/domain-events.ts` (resolvido em 2026-04-30: rota real com `my-impact`, ainda precisa teste BFF dedicado)
- `apps/api/src/routes/feed-posts.ts` (resolvido em 2026-04-30: implementação real inicial, ainda precisa testes BFF dedicados)

Eles devem ser classificados antes de executar T3. O ponto cego atual nao e apenas "router inexistente"; e determinar se estes routers untracked sao stubs do agente, implementacoes legitimas incompletas, ou artefactos a reespecificar.
