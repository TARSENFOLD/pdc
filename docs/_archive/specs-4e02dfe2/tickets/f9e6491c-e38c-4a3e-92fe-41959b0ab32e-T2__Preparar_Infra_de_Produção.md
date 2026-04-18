---
id: "f9e6491c-e38c-4a3e-92fe-41959b0ab32e"
title: "T2: Preparar Infra de Produção"
assignee: ""
status: 0
createdAt: "2026-04-14T16:51:07.183Z"
updatedAt: "2026-04-14T16:51:29.710Z"
type: ticket
---

# T2: Preparar Infra de Produção

## Scope & Objectivo

Criar o Dockerfile do BFF, consolidar os templates de env eliminando inconsistências, e documentar a checklist de serviços externos para produção — tudo o que é necessário antes de configurar o deploy real.

**IN scope:**

- Criar file:apps/api/Dockerfile multi-stage (build + runtime) com `node:24-alpine` (conforme Abordagem D5)
- Eliminar file:.env.production.example e file:.env.staging.example da raiz (conforme Abordagem D3)
- Corrigir file:apps/api/.env.production — garantir que todas as variáveis correspondem ao que o código realmente lê (usar o módulo `env.ts` criado em T1 como referência)
- Corrigir file:apps/api/.env.staging — idem
- Adicionar `.env` e `.env.production` e `.env.staging` ao file:.gitignore (ficheiros com secrets nunca no Git)
- Documentar checklist de criação de contas nos serviços externos (Railway, Upstash, Vercel, SendGrid, R2, Google OAuth, Sentry) como secção no file:docs/guia-tecnico/deploy.md

**OUT of scope:**

- Criar contas nos serviços externos (isto é manual, feito pela utilizadora)
- Preencher os valores reais no `.env.production` (depende das contas criadas)
- Alterar código do BFF (apenas Dockerfile + configuração)

## Referências

- **Análise §2 H4**: Inconsistências entre templates `.env` (REDIS_URL vs UPSTASH_REDIS_REST_URL, POSTMARK_TOKEN vs SENDGRID_API_KEY)
- **Análise §2 H5**: Sem Dockerfile para o BFF
- **Análise §2 H3**: Strapi Dockerfile usa Node.js 20 (verificar se Strapi v5 suporta 24)
- **Abordagem D3**: Consolidação de .env
- **Abordagem D5**: Dockerfile multi-stage

## Guardrails

- **Invariante**: Strapi schemas e Dockerfile inalterados (H3 é apenas investigação — não mudar sem confirmar compatibilidade)
- **Risco**: O Dockerfile do BFF precisa de copiar `packages/shared` para o build (dependência do monorepo). Garantir que o `COPY` inclui o workspace shared para que `@pdc/shared` compile
- O `.dockerignore` deve excluir `node_modules`, `.env*`, `.planning/`, `tests/`

## Acceptance Criteria

1. ✅ `docker build -t pdc-api -f apps/api/Dockerfile .` (a partir da raiz do monorepo) completa sem erros
2. ✅ `docker run --env-file apps/api/.env pdc-api` arranca e `curl localhost:3001/health` retorna 200
3. ✅ file:.env.production.example e file:.env.staging.example eliminados do repositório
4. ✅ file:apps/api/.env.production e file:apps/api/.env.staging usam **exactamente** as mesmas variáveis que `env.ts` valida — zero variáveis fantasma
5. ✅ file:docs/guia-tecnico/deploy.md contém checklist passo-a-passo para cada serviço externo com:
  - Link para signup de cada serviço
  - Que variável de env preencher
  - Ordem recomendada (Railway → Upstash → Vercel → SendGrid → R2 → Google OAuth → Sentry)
6. ✅ `.env`, `.env.production`, `.env.staging` estão no `.gitignore`
7. ✅ `tsc --noEmit` continua a passar em todos os workspaces

## Verificação

1. Build do Docker: `docker build -t pdc-api -f apps/api/Dockerfile .` → exit 0
2. Run do container: `docker run -p 3001:3001 --env-file apps/api/.env pdc-api` → `curl http://localhost:3001/health` retorna 200
3. `git status` confirma que `.env.production.example` e `.env.staging.example` foram removidos
4. `grep -r "REDIS_URL\|POSTMARK_TOKEN\|COOKIE_DOMAIN" apps/api/.env.production` → zero matches (variáveis fantasma eliminadas)
5. Review de `docs/guia-tecnico/deploy.md` — checklist completa com links e variáveis
