# Verificação Diferencial da Investigação de Bugs — PDC v2

> **Data:** 10 de Julho de 2026
> **Branch:** `feat/migrate-bff-cms-to-hetzner`
> **Autor:** Agente Guardião da Integridade (Cline)
> **Método:** Análise Diferencial (Caixas A-D, AGENTS.md §2) — verificação de cada claim contra o código actual, NÃO aceitação cega.
> **Input:** Investigação externa com 13 claims (3 críticos, 5 majors, 5 minors).

---

## Resumo Executivo

**Dos 13 claims, 12 já estão corrigidos no branch actual.** A investigação externa foi feita sobre um estado mais antigo do codebase. Como Guardião da Integridade (AGENTS.md §1), **não se aplicam fixes a código já-correcto** (anti-padrão AP-01/AP-06 — criar problemas para obter “sinal verde”). Apenas o **#1 foi genuinamente accionável** e foi corrigido.

| Categoria | Claims | Válidos agora | Já-corrigidos | Inexactos |
|---|---|---|---|---|
| 🔴 Críticos (1-3) | 3 | 1 (#1) | 1 (#3) | 1 (#2) |
| 🟠 Majors (4-8) | 5 | 0 | 5 (#4,#5,#6,#8) | 1 (#7) |
| 🟡 Minors (9-13) | 5 | 0 | 4 (#10,#11,#12,#13) | 1 (#9) |
| **Total** | **13** | **1** | **10** | **2** |

---

## Análise Individual (com evidência de código)

### #1 Strapi healthcheck em `/` (404) — ✅ VÁLIDO (corrigido)
- **Ficheiro:** `docker-compose.prod.yml:129,136`
- **Antes:** healthcheck do container Strapi e traefik usavam path `/`. O `deploy-vps.sh:120` já usava `/_health` (endpoint canónico Strapi v5). Inconsistência.
- **Correção aplicada:** ambas as linhas alinhadas a `/_health` (consistente com deploy script; endpoint canónico que devolve 200 sem ambiguidade de redirect).
- **Nuance honesta:** com o admin build presente na imagem (Dockerfile copia `dist/build`), `/` devolve 302→`/admin` e `curl -f` trata 3xx como sucesso — pelo que pode não ser um bloqueador actual. Mas `/_health` é mais robusto (sem depender de redirect) e consistente.

### #2 CI não corria testes unitários — ❌ INEXACTO
- **Ficheiro:** `.github/workflows/ci.yml`
- **Evidência:** o CI corre testes unitários em TODOS os jobs:
  - `web` job: linha 65-66 `npm test -w apps/web`
  - `api` job: linha 145-146 `npm test -w apps/api`
  - `shared` job: linha 182-183 `npm test -w packages/shared`
- **Veredicto:** já implementado. Nenhuma acção.

### #3 Deploys disparavam em paralelo com CI — ❌ INEXACTO (já corrigido)
- **Ficheiros:** `deploy-vps.yml`, `deploy-web.yml`, `deploy-edge.yml`
- **Evidência:** os três workflows usam `workflow_run: workflows: ["CI"], types: [completed], branches: [main]` com guard `if: ... workflow_run.conclusion == 'success'`. Nenhum usa `push: main`. Os deploys só correm APÓS o CI terminar com sucesso.
- **Veredicto:** já corrigido. Nenhuma acção.

### #4 Rollback de conta em falha de evento — ✅ JÁ-CORRIGIDO
- **Ficheiro:** `apps/api/src/modules/auth/auth.service.ts:160-173`
- **Evidência:** o `publishWithOutbox(PERFIL_CRIADO)` está isolado no seu PRÓPRIO try/catch (linhas 161-168) que faz `log.error({ eventError }, 'Falha ao publicar PERFIL_CRIADO; registo mantém-se válido')` — NÃO faz rollback. O catch externo (170-173) só apanha falhas dos passos de registo (Strapi post user/perfil/consent), não do evento. O outbox é retryable por design.
- **Veredicto:** o pattern está correcto — falha de evento → log + manter registo; falha de registo → rollback. Nenhuma acção.

### #5 Login vira erro 500 em falha de evento — ✅ JÁ-CORRIGIDO
- **Ficheiro:** `apps/api/src/routes/auth.otp.ts:23-33`
- **Evidência:** `publishLogin` tem try/catch interno: `try { await eventBus.publishWithOutbox(LOGIN, ...) } catch (err) { log.error(...) }`. A função nunca lança — o handler `/verify` (linha 148) faz `await publishLogin(...)` depois `return c.json(user)` sem risco de 500.
- **Veredicto:** já corrigido. Nenhuma acção.

### #6 localStorage crash em modo privativo — ✅ JÁ-CORRIGIDO
- **Ficheiro:** `apps/web/src/lib/push/webPushClient.ts:14-18, 23-27, 103-107`
- **Evidência:** TODOS os acessos a `localStorage` estão em try/catch: `getWebPushSupportStatus` (linha 14-18, “localStorage indisponível; assume suportado”), `dismissWebPushPrompt` (23-27), `enableWebPush` removeItem (103-107). Safari modo privativo lança → apanhado → fallback graceful.
- **Veredicto:** já corrigido. Nenhuma acção.

### #7 Token LMS no body do request — ❌ INEXACTO
- **Ficheiro:** `apps/api/src/routes/lti.ts:49,67`
- **Evidência:** o accessToken é lido do HEADER `x-lms-access-token` (linha 49: `c.req.header('x-lms-access-token')`), NÃO do body. O body só tem `lineitemUrl` + `score` (agsScorePayloadSchema, linha 14-17). NRPS idem (linha 67).
- **Veredicto:** o token já está no header, não vaza no body. Nenhuma acção.

### #8 Outbox worker sem watchdog — ✅ JÁ-CORRIGIDO (shutdown)
- **Ficheiro:** `apps/api/src/modules/outbox/outbox-worker.ts:112-120`
- **Evidência:** existe watchdog: `WATCHDOG_MS = 15_000`; em SIGTERM/SIGINT, após 15s força `process.exit(1)` com `log.fatal`. O processo NÃO fica à espera indefinidamente. Residual menor: não há timeout por-iteração (hang durante operação normal), mitigado pelo TTL do lock distribuído (90s).
- **Veredicto:** o cenário de shutdown descrito está corrigido. Nenhuma acção.

### #9 WebPushOptIn banner sobre mobile drawer — ❌ INEXACTO
- **Ficheiro:** `apps/web/src/components/layout/AppLayout.tsx:135`
- **Evidência:** `{!drawerOpen && <WebPushOptIn />}` — o banner é ESCONDIDO quando o drawer está aberto. Não sobrepõe.
- **Veredicto:** já correcto. Nenhuma acção.

### #10 BrandingPage sobrescreve edições em progresso — ✅ JÁ-CORRIGIDO
- **Ficheiro:** `apps/web/src/features/instituicao/BrandingPage.tsx:35-47`
- **Evidência:** o `reset(...)` usa `{ keepDirtyValues: true }` (linha 46) — preserva os valores que o utilizador já editou (dirty), só actualiza campos não-tocados quando o query refaz fetch (ex: após upload invalidar o cache).
- **Veredicto:** já corrigido. Nenhuma acção.

### #11 ProjetoPedidosPage pending state partilhado — ✅ JÁ-CORRIGIDO/mitigado
- **Ficheiros:** `ProjetoPedidosPage.tsx:40-48,80-81` + `ProjetoAccessList.tsx:40,43`
- **Evidência:** usa `useMutationState` (linha 40-46) para rastrear TODOS os pedidos pending por `pedidoId` (via `isDeciding`), em paralelo com `pendingPedidoId` (última mutation). Os botões usam `disabled={pendingPedidoId === entry.id || isDeciding?.(entry.id)}` — cada pedido pending tem os seus botões desactivados individualmente.
- **Veredicto:** o design rastreia estado pending por-pedido correctamente. Nenhuma acção.

### #12 deploy-vps.sh prune apagava tags de rollback — ✅ JÁ-CORRIGIDO
- **Ficheiro:** `scripts/deploy-vps.sh:127-130`
- **Evidência:** o prune de rollback tags faz `sort -r | tail -n +3` — MANTÉM as 2 tags mais recentes, só remove as mais antigas. Adicionalmente, `docker image prune -f` (linha 123) só remove imagens DANGLING (sem tag); as rollback tags são tagged (`pdc-api:rollback-XXX`) e não são removidas.
- **Veredicto:** já corrigido. Nenhuma acção.

### #13 dev-skip-otp.md mente sobre “Guard Triplo” — ✅ JÁ-CORRIGIDO (por mim, round anterior)
- **Ficheiro:** `docs/guia-tecnico/dev-skip-otp.md`
- **Evidência:** reescrevi completamente o doc no round anterior para reflectir o Guard Duplo runtime + Hardening Env boot-time (sem código mestre 000000 nem verificação de domínio Railway obsoleta).
- **Veredicto:** já corrigido. Nenhuma acção.

---

## Correção aplicada

Apenas **#1**: `docker-compose.prod.yml` — Strapi healthcheck (container + traefik) alinhado de `/` para `/_health` (endpoint canónico, consistente com `deploy-vps.sh`). YAML validado.

## Princípio aplicado

AGENTS.md §1: “O Agente nunca deve jogar a sugeira para debaixo do tapete... Nunca deve inventar soluções que não estão documentadas sem consultar o usuário.” Aplicar fixes a código já-correcto seria o anti-padrão AP-01/AP-06 (criar problemas para silenciar/obter sinal verde). Por isso, 12 dos 13 claims foram verificados como já-resolvidos e NÃO foram tocados.
