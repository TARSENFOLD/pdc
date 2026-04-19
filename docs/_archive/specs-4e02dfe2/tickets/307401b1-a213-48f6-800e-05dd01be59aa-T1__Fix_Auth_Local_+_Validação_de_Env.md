---
id: "307401b1-a213-48f6-800e-05dd01be59aa"
title: "T1: Fix Auth Local + Validação de Env"
assignee: ""
status: 0
createdAt: "2026-04-14T16:50:35.045Z"
updatedAt: "2026-04-14T16:51:07.148Z"
type: ticket
---

# T1: Fix Auth Local + Validação de Env

## Scope & Objectivo

Desbloquear a autenticação local corrigindo o STRAPI_API_TOKEN, as inconsistências do `.env`, e adicionando validação fail-fast de variáveis de ambiente no arranque do BFF.

**IN scope:**

- Gerar novo API token **Full Access** no painel Strapi admin e substituir em file:apps/api/.env
- Corrigir `OAUTH_REDIRECT_BASE_URL` de `localhost:3000` → `localhost:5173` em file:apps/api/.env
- Criar file:apps/web/.env com `VITE_API_URL=http://localhost:3001`
- Criar file:apps/web/.env.production com `VITE_API_URL=https://api.usepdc.com`
- Criar módulo file:apps/api/src/lib/env.ts com validação Zod de variáveis obrigatórias (conforme Abordagem D4)
- Importar `env.ts` como primeira instrução em file:apps/api/src/index.ts
- Refactorizar file:apps/api/src/lib/redis.ts e file:apps/api/src/modules/auth/auth.service.ts para importar configuração de `env.ts` em vez de ler `process.env` directamente com defaults silenciosos
- Executar seed (file:tests/helpers/seed.ts) para criar 5 contas de teste
- Validar login end-to-end via frontend

**OUT of scope:**

- Alterar lógica de auth (JWT, RBAC, OTP, OAuth) — apenas configuração
- Configurar serviços externos de produção
- Alterar SameSite/COOKIE_DOMAIN (diferido para OAuth — Abordagem D7)

## Referências

- **Análise §1.1-1.3**: Cadeia de falha auth — o `getUserById()` falha com 403 porque o token não tem permissões
- **Análise §1.4**: O mesmo token é usado por 20+ módulos via `strapiClient`
- **Análise §1.6**: Estado actual dos `.env` com placeholders e inconsistências
- **Abordagem D1**: Token Full Access
- **Abordagem D3**: Consolidação de .env
- **Abordagem D4**: Fail fast com validação Zod
- **Abordagem §3**: Componente `env.ts` — responsabilidade, interface, relação com existentes

## Guardrails

- **Invariante**: API pública não muda — endpoints `/auth/*` mantêm os mesmos contratos (Abordagem §4 — Contractuais)
- **Invariante**: `DEV_SKIP_OTP=true` continua a funcionar — guard triplo em file:apps/api/src/modules/auth/auth.helper.ts não é tocado
- **Invariante**: Cookie names `access_token`, `refresh_token` inalterados
- **Invariante**: Shared types (`User`, `Role`) não são modificados
- **Risco H4**: Ao corrigir o `.env`, garantir que **todas** as variáveis usadas pelo código estão presentes (ver tabela Analysis §1.6)
- Em `env.ts`, variáveis opcionais em dev (Redis, SendGrid, R2) devem gerar **warning**, não erro — para não bloquear o setup inicial de novos devs

## Acceptance Criteria

1. ✅ `POST /auth/login` com `{ email: "aluno@traycer.test", password: "password123" }` retorna `200` com user data (DEV_SKIP_OTP=true)
2. ✅ `GET /auth/me` com cookie retorna `{ id, email, nome, role: "aluno" }` com perfil completo
3. ✅ `npx tsx tests/helpers/seed.ts` cria 5 contas sem erros e verifica login de cada uma
4. ✅ BFF sem `JWT_SECRET` recusa arrancar com mensagem: `"FATAL: JWT_SECRET é obrigatório"`
5. ✅ BFF sem `STRAPI_API_TOKEN` recusa arrancar com mensagem clara
6. ✅ BFF em `NODE_ENV=production` sem `UPSTASH_REDIS_REST_URL` recusa arrancar
7. ✅ BFF em `NODE_ENV=development` sem Redis arranca com warning (não erro)
8. ✅ `tsc --noEmit` passa em `apps/api` e `apps/web` (zero erros)
9. ✅ file:apps/web/.env existe com `VITE_API_URL`
10. ✅ `OAUTH_REDIRECT_BASE_URL` no `.env` aponta para `localhost:5173`

## Verificação

**Manual (passo a passo):**

1. `docker compose up -d` — Strapi + PostgreSQL + Redis arrancan
2. Abrir `http://localhost:1337/admin` → Settings → API Tokens → Create **Full Access** → copiar token
3. Colar token em `apps/api/.env` → `STRAPI_API_TOKEN=<novo-token>`
4. `npm run dev --workspace=apps/api` — BFF arranca sem erros
5. `npx tsx tests/helpers/seed.ts` — 5 contas ✓
6. `npm run dev --workspace=apps/web` → abrir `http://localhost:5173/login`
7. Login: `aluno@traycer.test` / `password123` → redirect para dashboard
8. DevTools → Network → `GET /auth/me` → resposta com perfil completo

**Validação env (negativa):**

1. Remover `JWT_SECRET` do `.env` → restart BFF → deve falhar com mensagem clara
2. Remover `STRAPI_API_TOKEN` → idem
3. Definir `NODE_ENV=production` + sem Redis vars → deve falhar
