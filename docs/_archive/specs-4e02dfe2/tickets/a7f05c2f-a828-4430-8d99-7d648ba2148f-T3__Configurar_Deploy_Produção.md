---
id: "a7f05c2f-a828-4430-8d99-7d648ba2148f"
title: "T3: Configurar Deploy Produção"
assignee: ""
status: 0
createdAt: "2026-04-14T16:51:29.731Z"
updatedAt: "2026-04-14T16:51:51.290Z"
type: ticket
---

# T3: Configurar Deploy Produção

## Scope & Objectivo

Guiar a configuração real de todos os serviços externos e deploy em `usepdc.com` / `api.usepdc.com`. Este ticket é parcialmente manual (criar contas, copiar credentials) e parcialmente automatizável (configurar variáveis no Railway/Vercel).

<user_quoted_section>⚠️ Este ticket depende de T2 (Dockerfile + checklist existem) e requer acção manual da utilizadora para criar contas nos serviços.</user_quoted_section>

**IN scope:**

- Criar contas nos serviços externos seguindo a checklist documentada em T2:
  1. **Railway** — deploy Strapi + PostgreSQL + BFF
  2. **Upstash** — Redis (auth, rate limiting, cache)
  3. **Vercel** — deploy frontend
  4. **SendGrid** — email OTP
  5. **Cloudflare R2** — storage de media
  6. **Google Cloud Console** — OAuth (Client ID + Secret)
  7. **Sentry** — monitorização
- Gerar `JWT_SECRET` forte para produção (`openssl rand -base64 64`)
- Gerar API token Full Access no Strapi de produção
- Configurar variáveis de ambiente em cada plataforma (Railway, Vercel)
- Configurar domínios: `usepdc.com` → Vercel, `api.usepdc.com` → Railway, `strapi.usepdc.com` → Railway (interno)
- Verificar health check do BFF em produção
- Verificar login end-to-end em produção (email/password com OTP real via SendGrid)

**OUT of scope:**

- Configurar Google OAuth SameSite/COOKIE_DOMAIN (diferido — Abordagem D7)
- Gateway de pagamento
- Configurar domínio `.ao`

## Referências

- **Análise §2 H1-H2**: Riscos de cookie cross-domain — diferidos (D7), mas anotar como known issue
- **Abordagem D1**: Token Full Access no Strapi de produção
- **Abordagem §2**: Estado-alvo completo
- file:docs/guia-tecnico/deploy.md — guia existente + checklist adicionada em T2

## Guardrails

- **NUNCA** incluir `DEV_SKIP_OTP=true` nas variáveis de produção (Abordagem §4 — Invariante comportamental)
- `JWT_SECRET` de produção deve ter ≥ 64 caracteres, gerado com `openssl rand -base64 64`
- CORS em produção deve listar apenas `https://usepdc.com` e `https://www.usepdc.com`
- Strapi admin deve estar acessível apenas internamente (não expor `strapi.usepdc.com` publicamente, ou proteger com auth)
- **Risco H1**: Login com Google OAuth **não vai funcionar** em produção até resolver SameSite Strict. Documentar como known issue — login email/password é o fluxo principal

## Acceptance Criteria

1. ✅ `https://api.usepdc.com/health` retorna `{ status: "ok" }` com HTTPS
2. ✅ `https://usepdc.com` carrega a landing page
3. ✅ Login email/password funciona em produção (com OTP real via SendGrid)
4. ✅ `GET /auth/me` retorna perfil completo em produção
5. ✅ Strapi de produção está acessível e com API token Full Access configurado
6. ✅ Redis (Upstash) está conectado — rate limiting e refresh tokens funcionam
7. ✅ Sentry recebe eventos de erro do BFF e do frontend
8. ✅ SSL/TLS activo em todos os domínios

## Verificação

1. `curl https://api.usepdc.com/health` → 200
2. Abrir `https://usepdc.com/login` → registar nova conta → receber OTP por email → verificar → aceder dashboard
3. Verificar em Sentry que erros de teste aparecem
4. `curl -H "Origin: https://evil.com" https://api.usepdc.com/health` → sem header `Access-Control-Allow-Origin` (CORS bloqueia)
