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

## Checklist de Produção

Antes do primeiro deploy em produção, confirma:

- [ ] `JWT_SECRET` e `JWT_REFRESH_SECRET` gerados com `openssl rand -base64 64` (≥ 64 chars)
- [ ] `STRAPI_API_TOKEN` com tipo **Full access** gerado no painel Strapi
- [ ] CORS configurado — `FRONTEND_URL` aponta para o domínio real
- [ ] `R2_PUBLIC_URL` configurado e bucket com permissão pública
- [ ] Health check activo: `GET /health` retorna `{ status: 'ok' }`
- [ ] SSL/TLS activo em todos os domínios (Railway + Vercel fornecem automaticamente)
- [ ] Sentry configurado (Fase 6) para captura de erros em produção

---

## Rollback

### Vercel
No painel Vercel → Deployments → selecciona o deploy anterior → **Promote to Production**.

### Railway
No painel Railway → serviço → Deployments → selecciona o deploy anterior → **Redeploy**.
