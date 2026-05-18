# Mapeamento Operacional de Secrets

Este documento define onde cada variável deve viver por service. Não inclui valores reais.
Valores reais ficam apenas em secret stores dos providers ou no gestor local autorizado.

## Política

- `api`: configurar no Railway service do BFF.
- `web`: configurar no Railway/Cloudflare Pages service do frontend quando aplicável.
- `edge`: configurar no Cloudflare Workers via `wrangler secret put`, exceto `BFF_URL`, que fica em `wrangler.toml`.
- `strapi`: configurar no Railway service do Strapi.
- Variáveis `per-environment` têm valores distintos para dev, staging e prod.
- Variáveis `cross-environment` podem manter o mesmo valor quando são metadados não secretos.
- Rotacionar imediatamente qualquer secret exposto em log, commit, issue, ticket ou screenshot.

## Tabela de Destino

| Env var                             | Service              | Environment scope | Rotation cadence | Source of truth                            |
| ----------------------------------- | -------------------- | ----------------- | ---------------- | ------------------------------------------ |
| `NODE_ENV`                          | api, web, strapi     | per-environment   | never            | Railway env                                |
| `PORT`                              | api, strapi          | per-environment   | never            | Railway env                                |
| `API_URL`                           | api                  | per-environment   | never            | Railway env                                |
| `FRONTEND_URL`                      | api                  | per-environment   | never            | Railway env                                |
| `VITE_API_URL`                      | web                  | per-environment   | never            | Railway or Cloudflare Pages env            |
| `VITE_EDGE_URL`                     | web                  | per-environment   | never            | Railway or Cloudflare Pages env            |
| `VITE_SENTRY_DSN`                   | web                  | per-environment   | on-incident      | Sentry project settings                    |
| `VITE_APP_VERSION`                  | web                  | per-deploy        | never            | CI release metadata                        |
| `STRAPI_URL`                        | api, scripts         | per-environment   | never            | Railway env                                |
| `STRAPI_API_TOKEN`                  | api, scripts         | per-environment   | 90d              | Strapi admin panel and Railway env         |
| `STRAPI_TIMEOUT`                    | api                  | cross-environment | never            | Railway env                                |
| `STRAPI_WRITE_TIMEOUT`              | api                  | cross-environment | never            | Railway env                                |
| `JWT_SECRET`                        | api                  | per-environment   | 90d              | Railway env                                |
| `UPSTASH_REDIS_REST_URL`            | api, edge            | per-environment   | on-incident      | Upstash console and Cloudflare/Railway env |
| `UPSTASH_REDIS_REST_TOKEN`          | api, edge            | per-environment   | 90d              | Upstash console and Cloudflare/Railway env |
| `UPSTASH_REDIS_REST_TOKEN_READONLY` | api                  | per-environment   | 90d              | Upstash console and Railway env            |
| `R2_ACCOUNT_ID`                     | api                  | per-environment   | on-incident      | Cloudflare dashboard and Railway env       |
| `R2_ACCESS_KEY_ID`                  | api                  | per-environment   | 90d              | Cloudflare R2 access keys and Railway env  |
| `R2_SECRET_ACCESS_KEY`              | api                  | per-environment   | 90d              | Cloudflare R2 access keys and Railway env  |
| `R2_BUCKET`                         | api                  | per-environment   | never            | Cloudflare dashboard and Railway env       |
| `R2_PUBLIC_URL`                     | api                  | per-environment   | never            | Cloudflare dashboard and Railway env       |
| `SENTRY_DSN`                        | api                  | per-environment   | on-incident      | Sentry project settings and Railway env    |
| `EDGE_PUBLIC_URL`                   | api                  | per-environment   | never            | Cloudflare Workers routes and Railway env  |
| `SENDGRID_API_KEY`                  | api                  | per-environment   | 90d              | SendGrid dashboard and Railway env         |
| `SENDGRID_FROM_EMAIL`               | api                  | per-environment   | on-incident      | SendGrid sender identity and Railway env   |
| `RESEND_API_KEY`                    | api                  | per-environment   | 90d              | Resend dashboard and Railway env           |
| `TWILIO_ACCOUNT_SID`                | api                  | per-environment   | on-incident      | Twilio console and Railway env             |
| `TWILIO_AUTH_TOKEN`                 | api                  | per-environment   | 90d              | Twilio console and Railway env             |
| `TWILIO_PHONE_NUMBER`               | api                  | per-environment   | on-incident      | Twilio console and Railway env             |
| `AI_PROVIDER`                       | api                  | per-environment   | never            | Railway env                                |
| `DEEPSEEK_API_KEY`                  | api                  | per-environment   | 90d              | DeepSeek console and Railway env           |
| `DEEPSEEK_BASE_URL`                 | api                  | cross-environment | never            | Railway env                                |
| `DEEPSEEK_MODEL`                    | api                  | per-environment   | never            | Railway env                                |
| `OLLAMA_BASE_URL`                   | api                  | dev only          | never            | local env                                  |
| `OLLAMA_MODEL`                      | api                  | dev only          | never            | local env                                  |
| `GOOGLE_CLIENT_ID`                  | api                  | per-environment   | on-incident      | Google Cloud Console and Railway env       |
| `GOOGLE_CLIENT_SECRET`              | api                  | per-environment   | 90d              | Google Cloud Console and Railway env       |
| `GOOGLE_REDIRECT_URI`               | api                  | per-environment   | never            | Google Cloud Console and Railway env       |
| `LINKEDIN_CLIENT_ID`                | api                  | per-environment   | on-incident      | LinkedIn Developer Portal and Railway env  |
| `LINKEDIN_CLIENT_SECRET`            | api                  | per-environment   | 90d              | LinkedIn Developer Portal and Railway env  |
| `LINKEDIN_REDIRECT_URI`             | api                  | per-environment   | never            | LinkedIn Developer Portal and Railway env  |
| `OAUTH_REDIRECT_BASE_URL`           | api                  | per-environment   | never            | Railway env                                |
| `DATABASE_URL`                      | strapi, scripts      | per-environment   | 90d              | Neon/Railway database settings             |
| `RATE_LIMIT_PROFILE`                | api                  | per-environment   | never            | Railway env                                |
| `SEO_BOT_RENDER_ENABLED`            | api, web             | per-environment   | never            | Railway env                                |
| `TINA_RATE_LIMIT_PER_USER`          | api                  | per-environment   | never            | Railway env                                |
| `TINA_RATE_LIMIT_GLOBAL`            | api                  | per-environment   | never            | Railway env                                |
| `DEV_SKIP_OTP`                      | api                  | dev only          | never            | local env                                  |
| `BFF_URL`                           | edge, web service middleware | per-environment   | never            | Cloudflare `wrangler.toml` and Railway env |
| `TELEMETRY_SECRET`                  | edge                 | per-environment   | 90d              | Cloudflare Worker secrets                  |
| `APP_KEYS`                          | strapi               | per-environment   | 90d              | Railway env                                |
| `API_TOKEN_SALT`                    | strapi               | per-environment   | 90d              | Railway env                                |
| `ADMIN_JWT_SECRET`                  | strapi               | per-environment   | 90d              | Railway env                                |
| `TRANSFER_TOKEN_SALT`               | strapi               | per-environment   | 90d              | Railway env                                |
| `ENCRYPTION_KEY`                    | strapi               | per-environment   | 90d              | Railway env                                |

## Governação de Rotação

- Responsável: SRE/DevOps acompanha todos os secrets com cadence `90d`.
- Rastreamento: alertas automáticos 7 dias antes do vencimento em calendário operacional ou ferramenta de incidentes.
- Auditoria: cada rotação deve gerar registo em ticket operacional ou canal `#ops-security`, com timestamp, ambiente, responsável e evidência de validação.

## Operação de Rotação

1. Criar o novo secret no provider de origem.
2. Atualizar primeiro staging e validar login, OTP, upload R2, telemetria e OAuth.
3. Atualizar produção fora de janelas críticas.
4. Reiniciar apenas os services que consomem a variável rotacionada.
5. Manter período de graça quando o provider permitir dois secrets ativos, para cutover sem downtime.
6. Verificar logs, métricas e tokens ativos para confirmar que o secret antigo não está mais em uso.
7. Revogar o secret antigo no provider de origem.
8. Registar o incidente ou rotação programada no canal operacional.

Rollback: se o novo secret causar erro em produção, reverter para o secret antigo, reiniciar apenas os services afetados, notificar stakeholders no canal operacional e investigar antes de nova tentativa.

## Cloudflare Worker

O Worker Edge não deve receber secrets pelo Railway. Use estes comandos por ambiente:

```bash
wrangler secret put TELEMETRY_SECRET --env staging
wrangler secret put UPSTASH_REDIS_REST_URL --env staging
wrangler secret put UPSTASH_REDIS_REST_TOKEN --env staging
wrangler secret put TELEMETRY_SECRET --env production
wrangler secret put UPSTASH_REDIS_REST_URL --env production
wrangler secret put UPSTASH_REDIS_REST_TOKEN --env production
```

`BFF_URL` permanece em `apps/edge/wrangler.toml` porque é rota pública por ambiente, não secret.

## Frontend

O frontend consome o BFF através de `VITE_API_URL`, definida no service `web`.

Importante: `API_URL` é variável interna do service `api` e não altera chamadas de backend feitas pelo browser.
