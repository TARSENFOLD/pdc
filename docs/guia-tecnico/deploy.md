# Deploy em Produção (Railway)

O PDC v2 é implantado integramente na infraestrutura **Railway**, utilizando networking interno para máxima performance e segurança.

| Serviço | Root Directory | Estratégia | URL |
|---------|----------------|------------|-----|
| Frontend (`apps/web`) | `apps/web` | Railway SPA (Static) | `usepdc.com` |
| BFF (`apps/api`) | (Raiz) | Dockerfile | `api.usepdc.com` |
| CMS (`infra/strapi`) | `infra/strapi` | Node.js | `interno` |

---

## 1. Frontend — apps/web

### Configuração Railway
1. Adicione um novo serviço a partir do GitHub.
2. Root Directory: `apps/web`.
3. Railway detetará o `package.json`. Use `npm run build`.
4. **Static Site Hosting:** Active a opção de "Static Site" se disponível ou configure o start command como:
   `npx serve -s dist -p ${PORT:-5173}`

### Variáveis (Frontend)
| Variável | Valor |
|----------|-------|
| `VITE_API_URL` | `https://api.usepdc.com` |

---

## 2. BFF — apps/api (Core)

### Configuração Railway
1. Adicione um novo serviço. **MUITO IMPORTANTE:** Root Directory deve ser a **RAIZ do repositório**.
2. O Railway usará automaticamente o `apps/api/Dockerfile`.
3. Configure o domínio personalizado para `api.usepdc.com`.

### Variáveis (BFF)
Refira-se ao ficheiro `apps/api/.env.production` para a lista completa. Segredos críticos:
- `STRAPI_URL`: Use o endereço interno do Railway (ex: `http://pdc-strapi.railway.internal`).
- `STRAPI_API_TOKEN`: Token Full Access gerado no painel Admin do Strapi.
- `JWT_SECRET`: 64 chars (openssl rand -base64 64).

---

## 3. Strapi & Postgres

### PostgreSQL
1. Adicione o plugin PostgreSQL ao projecto Railway.
2. O Railway injetará automaticamente as variáveis `DATABASE_URL` ou os campos individuais.

### Strapi Config
1. Root Directory: `infra/strapi`.
2. O Strapi v5 no Railway requer as seguintes variáveis:
   - `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`.
   - `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`.

---

## 4. Checklist de Lançamento (Serviços Externos)

1. **Upstash (Redis):** Necessário para Rate Limiting e Refresh Tokens.
2. **Cloudflare R2:** Bucket para uploads de media (Simulações/Perfis).
3. **Resend:** API Key para envio de OTP e notificações de sistema.
4. **DeepSeek:** API Key para o Oráculo (Tina v2.0).
5. **Google/LinkedIn Cloud:** IDs e Secrets para Login Social.
6. **Sentry:** DSN para observabilidade em produção.

---

## Verificação Pós-Deploy

1. `curl -I https://api.usepdc.com/health` -> deve retornar `200`.
2. Aceda a `https://usepdc.com/login` e valide o fluxo de autenticação real.
