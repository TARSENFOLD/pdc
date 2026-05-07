# Setup Local

Guia passo-a-passo para correr o PDC v2 em ambiente de desenvolvimento.

## Pré-requisitos

| Ferramenta | Versão mínima | Instalação |
|-----------|--------------|------------|
| Node.js | 24 LTS | via nvm |
| npm | 10+ | incluído com Node 24 |
| Docker + Docker Compose | 26+ | [docs.docker.com](https://docs.docker.com/get-docker/) |
| Git | 2.40+ | gestor de pacotes do sistema |

---

## 1. Clonar o repositório

```bash
git clone <url-do-repositorio> pdc-v2
cd pdc-v2
```

---

## 2. Activar a versão correcta do Node

O projecto inclui `.nvmrc` com `24`. Se usas nvm:

```bash
nvm install   # instala Node 24 LTS se ainda não tiveres
nvm use       # activa a versão definida em .nvmrc
node -v       # deve mostrar v24.x.x
```

---

## 3. Instalar dependências

```bash
npm install          # instala todas as dependências do monorepo
```

O npm workspaces instala tudo de uma vez, incluindo `apps/web`, `apps/api` e `packages/shared`.

---

## 4. Configurar variáveis de ambiente

Copia os ficheiros de exemplo:

```bash
cp apps/api/.env.example apps/api/.env
cp infra/strapi/.env.example infra/strapi/.env
```

Edita `apps/api/.env`:

```dotenv
PORT=3001
FRONTEND_URL=http://localhost:5173

# ⚠️ Bypass de OTP (opcional em dev local)
# Define como true para saltar verificação de e-mail/sms
# Ver: docs/guia-tecnico/dev-skip-otp.md
DEV_SKIP_OTP=true

# JWT
JWT_SECRET=muda-isto-em-producao-min-32-chars

# URLs
API_URL=http://localhost:3001
OAUTH_REDIRECT_BASE_URL=http://localhost:5173

# Strapi
STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=<token-gerado-no-passo-6>

# Cloudflare R2 (opcional em dev local)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=pdc-dev
R2_PUBLIC_URL=https://pub-<hash>.r2.dev
```

Edita `infra/strapi/.env`:

```dotenv
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=pdc_strapi
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=strapi_password

APP_KEYS=chave1,chave2,chave3,chave4
API_TOKEN_SALT=salt-aleatorio
ADMIN_JWT_SECRET=jwt-secret-admin
TRANSFER_TOKEN_SALT=transfer-salt
JWT_SECRET=jwt-secret-strapi
```

---

## 5. Arrancar a base de dados com Docker

```bash
docker compose up -d postgres
```

Verifica que o PostgreSQL está disponível:

```bash
docker compose ps
# postgres   Up   0.0.0.0:5432->5432/tcp
```

---

## 6. Primeiro arranque do Strapi

```bash
docker compose up strapi
# ou em modo desenvolvimento local:
cd infra/strapi && npm run develop
```

1. Abre `http://localhost:1337/admin`
2. Cria a conta de administrador do Strapi
3. Vai a **Settings → API Tokens → Create new API Token**
   - Nome: `pdc-bff-dev`
   - Tipo: **Full access**
4. Copia o token gerado e cola em `apps/api/.env` → `STRAPI_API_TOKEN`

---

## 7. Povoar o Oráculo (Seed)

Para validar o sistema com dados reais e múltiplas roles, execute o script de sementeira:

```bash
# Na raiz do monorepo
npx tsx tests/helpers/seed.ts
```

**⚠️ AVISO DE AUTORIDADE:** 
Nunca registe utilizadores directamente no painel admin do Strapi. O PDC v2 exige a criação de um **Perfil** associado ao utilizador para o funcionamento do motor de mérito. Use sempre o frontend ou o script de seed.

---

## 8. Arrancar o Ambiente de Desenvolvimento (Monorepo)

```bash
npm run dev
# Arranca concorrentemente o Frontend (Vite), a API (BFF) e a Edge (Wrangler).
# API disponível em http://localhost:3001
# GET http://localhost:3001/health → { status: 'ok' }
# Frontend disponível em http://localhost:5173 (ou 5174 se a porta estiver em uso)
```

---

## Scripts úteis

```bash
# Build de todos os pacotes
npm run build --workspaces

# TypeScript check (sem emit)
node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit

# Lint
npm run lint --workspaces

# Rebuild tipos partilhados
node node_modules/typescript/bin/tsc -p packages/shared/tsconfig.json
```

---

## Resolução de Problemas

### `Cannot find module '@pdc/shared'`

Os tipos partilhados precisam de ser compilados primeiro:

```bash
node node_modules/typescript/bin/tsc -p packages/shared/tsconfig.json
```

### Strapi não arranca com PostgreSQL

Confirma que o container está a correr:

```bash
docker compose logs postgres
```

Se o problema persistir, reinicia o container:

```bash
docker compose restart postgres
```

### Porta 3001 já em uso

```bash
lsof -i :3001 | grep LISTEN
# kill -9 <PID>
```
