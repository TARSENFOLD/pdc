# Estratégia de Deploy e Infraestrutura — Guia Soberano (B3)

O PDC v2 utiliza uma arquitectura distribuída multi-provider para garantir latência zero na Edge, escalabilidade no Core e presença nativa em dispositivos móveis. Cada componente fica onde o serviço é mais forte: Cloudflare para edge, CDN, DNS e WAF; Hetzner para execução de containers; Neon, Upstash, R2, Resend, Sentry e DeepSeek para serviços especializados.

---

## 🏛️ Matriz de Infraestrutura (Distributed Stack)

| Componente | Provider | Estratégia | Domínio Prod |
|------------|----------|------------|--------------|
| **Frontend (PWA)** | **Cloudflare Pages** | Build Automático (Vite 6) | `usepdc.com` |
| **Edge (Factos)** | **Cloudflare Workers** | Wrangler / Global Edge (`pdc`, root `wrangler.toml`) | `edge.usepdc.com` |
| **BFF (Cérebro)** | **Hetzner VPS** | Docker + Traefik (Root Context) | `api.usepdc.com` |
| **CMS (Strapi v5)** | **Hetzner VPS** | Docker + Traefik (Infra Context) | `cms.usepdc.com` |
| **Base de Dados** | **Neon** | Serverless PostgreSQL 16 | `neon.tech` (Proxy) |
| **Cache & Queue** | **Upstash** | Serverless Redis (HTTP/TCP) | `upstash.io` |
| **Storage (Media)** | **Cloudflare R2** | S3-Compatible Storage | `r2.dev` / CDN |
| **E-mail** | **Resend** | Transactional API | `resend.com` |
| **AI (Tina)** | **DeepSeek** | Inference API (RAG) | `deepseek.com` |
| **Observabilidade** | **Sentry** | Full-stack Tracing | `sentry.io` |

---

## 🖥️ VPS Hetzner (BFF + Strapi)

O VPS executa apenas aplicações. Não corre base de dados, Redis ou object storage.

```text
Internet
    │
    ▼
Cloudflare DNS
    │
    ▼
Hetzner VPS (167.235.29.64)
    │
    ▼
Traefik (80 / 443)
    │           │
    ▼           ▼
Hono API    Strapi
api.usepdc.com  cms.usepdc.com
```

### Serviços e resources (CX23: 2 vCPU / 4 GB RAM / 40 GB NVMe)

| Serviço | Container | RAM Limite | Nota |
|---------|-----------|------------|------|
| Reverse Proxy | `pdc-traefik` | 128 MB | SSL automático via Let's Encrypt. |
| BFF | `pdc-api` | 1 GB | Build via `Dockerfile` (root context). |
| CMS | `pdc-strapi` | 2 GB | Build via `infra/strapi/Dockerfile`. |

> A RAM é apertada. Monitorizar com `docker stats`. Se a utilização média passar consistentemente os 85%, fazer upgrade para CPX31/41.

### Setup inicial no VPS

Correr como `root` (apenas uma vez):

```bash
bash scripts/setup-vps.sh
```

Depois, criar `/opt/pdc/.env` a partir de `.env.hetzner.example` e preencher com valores reais:

```bash
scp .env.hetzner.example cj@167.235.29.64:/tmp/pdc.env
ssh cj@167.235.29.64
sudo install -m 600 /tmp/pdc.env /opt/pdc/.env
rm /tmp/pdc.env
sudo nano /opt/pdc/.env
```

Subir serviços:

```bash
ssh cj@167.235.29.64
cd /opt/pdc
sudo docker compose -f docker-compose.prod.yml up -d
```

### Deploy automático (gated por CI)

O pipeline de deploy está **gated pelo CI**: nenhum deploy corre sem que o workflow `CI` termine com sucesso.

**Fluxo canónico:**

1. Push/merge para `main` → dispara o workflow `CI` (lint + typecheck + **testes unitários** + build).
2. Quando `CI` termina com `success`, o GitHub dispara automaticamente:
   - `deploy-vps.yml` (Hetzner VPS — API + Strapi)
   - `deploy-web.yml` (Cloudflare Pages — frontend)
   - `deploy-edge.yml` (Cloudflare Workers — edge)
3. Se `CI` falhar (lint, typecheck, testes ou build), **nenhum deploy corre**.

> **Branch protection obrigatória**: configura `main` com required status checks `web — lint + typecheck + build`, `api — lint + typecheck + build`, `shared — lint + typecheck + build` e exige review approval antes do merge.

Secrets necessários no GitHub:

- `VPS_HOST`: `167.235.29.64`
- `VPS_USER`: `cj`
- `VPS_SSH_KEY`: chave privada SSH completa
- `VPS_HOST_KEY`: impressão digital da chave do host (via `ssh-keyscan`) para verificação pinned

Deploy manual equivalente (bypass do gate, usar só em emergências):

```bash
bash scripts/deploy-vps.sh
```

---

## 📱 Pipeline de Release Mobile

O PDC v2 é distribuído como PWA, mas possui "invólucros" nativos para presença nas lojas.

1.  **iOS (Capacitor)**:
    - `npm run build -w apps/web`
    - `npx cap sync ios`
    - Abertura no Xcode → Arquivo → Assinatura Team → Upload para App Store Connect.
    - Distribuição via **TestFlight (Internal)** para QA.
2.  **Android (TWA / PWABuilder)**:
    - Geração de Android App Bundle via PWABuilder (Trusted Web Activity).
    - Assinatura com Keystore de produção.
    - Upload para Google Play Console → **Internal Track**.

---

## 🔐 Gestão de Variáveis de Ambiente (Secrets)

> [!CAUTION]
> **NUNCA COMMITE FICHEIROS `.env`**. 
> O ficheiro `.env.example` é uma fixture de desenvolvimento, não um template para produção.
> O ficheiro `.env.hetzner.example` é um template para o VPS; os valores reais vivem apenas em `/opt/pdc/.env` no VPS.

### Configuração por Provider
- **Cloudflare (Pages/Workers)**: Configurar via Dashboard em `Settings > Variables` ou `wrangler secret put NAME`.
- **VPS Hetzner**: Secrets injetados via ficheiro `/opt/pdc/.env` com permissões `600`. O GitHub Actions sincroniza o repo via `rsync` e os containers lêem o env file no deploy.
- **Upstash/Neon/Resend**: Os segredos devem ser injectados no BFF e Strapi via `/opt/pdc/.env` no VPS.

---

## 🌊 Ambientes: Staging vs Produção

| Recurso | Staging / Preview | Produção |
|---------|-------------------|----------|
| **Branch** | `develop` / PR Branches | `main` |
| **Web** | `staging.usepdc.com` | `usepdc.com` |
| **API (BFF)** | `api-staging.usepdc.com` | `api.usepdc.com` |
| **CMS** | `cms-staging.usepdc.com` | `cms.usepdc.com` |
| **Edge** | `edge-staging.usepdc.com` | `edge.usepdc.com` |
| **Base de Dados** | Neon Branch `staging` | Neon Branch `main` |

---

## Cloudflare Pages

O projecto Pages `pdc` serve exclusivamente o frontend/PWA. O `wrangler.toml` da raiz pertence ao Edge Worker; não adicionar `pages_build_output_dir` nele, para não misturar os contratos de deploy.

Configuração canónica no Cloudflare Pages:

| Campo | Valor |
|-------|-------|
| **Build command** | `npm run build:web` |
| **Build output directory** | `apps/web/dist` |
| **Production branch** | `main` |
| **Environment variable** | `VITE_API_URL=https://api.usepdc.com` |
| **Environment variable** | `VITE_EDGE_URL=https://edge.usepdc.com` |

Domínios canónicos do Pages:

- `usepdc.com`
- `www.usepdc.com`

Estes domínios não devem estar associados ao Worker `pdc`. O Worker de telemetria deve responder apenas em `edge.usepdc.com` e `edge-staging.usepdc.com`.

O `apps/edge/wrangler.toml` deve manter `BFF_URL` alinhado com o domínio canónico:

```toml
[vars]
BFF_URL = "https://api.usepdc.com"

[env.production.vars]
BFF_URL = "https://api.usepdc.com"

[env.staging.vars]
BFF_URL = "https://api-staging.usepdc.com"
```

Deploy manual equivalente ao CI:

```bash
npm run deploy:web
```

---

## 🏥 Health Checks Pós-Deploy

Após cada deploy, o responsável de Operações (Ops) deve validar:

1.  **Core Connectivity**: `curl -I https://api.usepdc.com/health` (deve retornar `200 OK`).
2.  **Auth Authority**: Validar endpoint JWKS em `https://api.usepdc.com/.well-known/jwks.json`.
3.  **CMS Admin**: `curl -I https://cms.usepdc.com/admin` (deve retornar `200 OK`).
4.  **Telemetry Ingestion**: Executar um teste de ingestão na Edge via `scripts/test-edge-prod.sh`.
5.  **PWA Manifest**: Validar `https://usepdc.com/manifest.webmanifest`.
6.  **Performance Gate**: Lighthouse Score em Mobile ≥ 90.
7.  **Accessibility Gate**: Axe-core com zero violações críticas em `https://usepdc.com/login`.

---
*Doc is Law — Última auditoria: 4 de Julho de 2026.*
