# Deploy em Produção

O PDC v2 usa uma stack de deploy separada por serviço:

| Serviço | Plataforma | URL |
|---------|-----------|-----|
| Frontend (`apps/web`) | Vercel | `usepdc.com` |
| BFF (`apps/api`) | Railway | `api.usepdc.com` |
| Strapi + PostgreSQL | Railway | interno |

---

## Frontend — Vercel

### Configuração do projecto

1. Liga o repositório Git ao Vercel
2. Define o **Root Directory** como `apps/web`
3. **Framework Preset**: Vite
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`

### Variáveis de ambiente (Vercel)

| Variável | Valor |
|----------|-------|
| `VITE_API_URL` | `https://api.usepdc.com` |

### Deploy automático

Cada push para `main` despoleta um deploy automático. PRs geram previews com URLs únicas.

---

## BFF — Railway

### Configuração do serviço

1. Cria um novo serviço Railway a partir do repositório
2. Define o **Root Directory** como `apps/api`
3. **Start Command**: `node dist/index.js`
4. **Build Command**: `npm run build`

### Variáveis de ambiente (Railway — BFF)

```dotenv
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://usepdc.com

# JWT — gera segredos com: openssl rand -base64 64
JWT_SECRET=<segredo-64-chars>
JWT_REFRESH_SECRET=<segredo-diferente-64-chars>

# Strapi
STRAPI_URL=https://strapi.usepdc.com
STRAPI_API_TOKEN=<token-full-access-gerado-no-strapi>

# Cloudflare R2
R2_ACCOUNT_ID=<id-conta-cf>
R2_ACCESS_KEY_ID=<access-key>
R2_SECRET_ACCESS_KEY=<secret-key>
R2_BUCKET_NAME=pdc-prod
R2_PUBLIC_URL=https://pub-<hash>.r2.dev
```

---

## Strapi + PostgreSQL — Railway

### Configuração do serviço Strapi

1. Cria um serviço Railway, root: `infra/strapi`
2. **Start Command**: `npm start`
3. **Build Command**: `npm run build`

### Base de dados PostgreSQL

1. Adiciona o plugin **PostgreSQL** no projecto Railway
2. O Railway injeta automaticamente `DATABASE_URL`

### Variáveis de ambiente (Railway — Strapi)

```dotenv
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production

# Gera cada valor com: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
APP_KEYS=<key1>,<key2>,<key3>,<key4>
API_TOKEN_SALT=<salt>
ADMIN_JWT_SECRET=<secret>
TRANSFER_TOKEN_SALT=<salt>
JWT_SECRET=<secret>

# URL pública do Strapi (usado pelo BFF)
PUBLIC_URL=https://strapi.usepdc.com
```

---

## Checklist de Produção (Serviços Externos)

Siga esta ordem recomendada para configurar a infraestrutura de produção:

### 1. Railway (PaaS & Base de Dados)
- **O que fazer:** Criar projecto no [Railway](https://railway.app/). Adicionar base de dados **PostgreSQL**.
- **Variáveis (Strapi):** `DATABASE_URL`, `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `JWT_SECRET`.
- **Variáveis (BFF):** `PORT=3001`, `NODE_ENV=production`.

### 2. Upstash (Redis)
- **O que fazer:** Criar conta no [Upstash](https://console.upstash.com/). Criar uma base de dados **Redis** (Global ou Regional).
- **Variáveis (BFF):**
  - `UPSTASH_REDIS_REST_URL`: URL do endpoint REST.
  - `UPSTASH_REDIS_REST_TOKEN`: Token de acesso REST.

### 3. Vercel (Frontend)
- **O que fazer:** Ligar o repositório ao [Vercel](https://vercel.com/). Configurar o domínio `usepdc.com`.
- **Variáveis (Web):** `VITE_API_URL=https://api.usepdc.com`.

### 4. SendGrid (Emails/OTP)
- **O que fazer:** Criar conta no [SendGrid](https://sendgrid.com/). Validar o "Sender Identity". Gerar uma **API Key**.
- **Variáveis (BFF):**
  - `SENDGRID_API_KEY`: A chave gerada.
  - `SENDGRID_FROM_EMAIL`: O email validado (ex: `noreply@usepdc.com`).

### 5. Cloudflare R2 (Storage de Media)
- **O que fazer:** No painel Cloudflare, criar um bucket **R2**. Configurar CORS para permitir o domínio do BFF e Frontend. Activar "Public Bucket" ou configurar um domínio personalizado.
- **Variáveis (BFF):**
  - `R2_ACCOUNT_ID`: Encontrado no dashboard do R2.
  - `R2_ACCESS_KEY_ID` & `R2_SECRET_ACCESS_KEY`: Criados em "Manage R2 API Tokens".
  - `R2_BUCKET_NAME`: O nome do bucket (ex: `pdc-media-prod`).
  - `R2_PUBLIC_URL`: URL pública do bucket.

### 6. Google Cloud Console (OAuth)
- **O que fazer:** Criar projecto no [Google Cloud](https://console.cloud.google.com/). Configurar "OAuth consent screen". Criar "OAuth 2.0 Client ID" (Web application).
- **Authorized Redirect URIs:** `https://api.usepdc.com/auth/google/callback`.
- **Variáveis (BFF):**
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`: `https://api.usepdc.com/auth/google/callback`.

### 7. Sentry (Monitoring)
- **O que fazer:** Criar projecto no [Sentry](https://sentry.io/) (Node.js/Hono).
- **Variáveis (BFF):**
  - `SENTRY_DSN`: O DSN do projecto.

---

## Verificação Final

Antes de considerar o deploy concluído, execute:

1. **Health Check:** `curl https://api.usepdc.com/health` -> deve retornar `200 OK`.
2. **Logs:** Verifique no Railway se o BFF arrancou sem erros de validação de `env.ts`.
3. **CORS:** Tente fazer login a partir de `usepdc.com` e verifique se não há erros de cross-origin.

---

## Rollback

### Vercel
No painel Vercel → Deployments → selecciona o deploy anterior → **Promote to Production**.

### Railway
No painel Railway → serviço → Deployments → selecciona o deploy anterior → **Redeploy**.
