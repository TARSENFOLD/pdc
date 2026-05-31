# Estratégia de Deploy e Infraestrutura — Guia Soberano (B3)

O PDC v2 utiliza uma arquitectura distribuída multi-provider para garantir latência zero na Edge, escalabilidade elástica no Core e presença nativa em dispositivos móveis.

---

## 🏛️ Matriz de Infraestrutura (Distributed Stack)

| Componente | Provider | Estratégia | Domínio Prod |
|------------|----------|------------|--------------|
| **Frontend (PWA)** | **Cloudflare Pages** | Build Automático (Vite 6) | `usepdc.com` |
| **Edge (Factos)** | **Cloudflare Workers** | Wrangler / Global Edge (`pdc`, root `wrangler.toml`) | `edge.usepdc.com` |
| **BFF (Cérebro)** | **Railway** | Dockerfile (Root Context) | `api.usepdc.com` |
| **CMS (Strapi v5)** | **Railway** | Node.js (Infra Context) | `cms.usepdc.com` |
| **Base de Dados** | **Neon** | Serverless PostgreSQL 16 | `neon.tech` (Proxy) |
| **Cache & Queue** | **Upstash** | Serverless Redis (HTTP/TCP) | `upstash.io` |
| **Storage (Media)** | **Cloudflare R2** | S3-Compatible Storage | `r2.dev` / CDN |
| **E-mail** | **Resend** | Transactional API | `resend.com` |
| **AI (Tina)** | **DeepSeek** | Inference API (RAG) | `deepseek.com` |
| **Observabilidade** | **Sentry** | Full-stack Tracing | `sentry.io` |

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

### Configuração por Provider
- **Cloudflare (Pages/Workers)**: Configurar via Dashboard em `Settings > Variables` ou `wrangler secret put NAME`.
- **Railway**: Utilizar o `Secret Store` do serviço. Marcar chaves sensíveis como `Sensitive`.
- **Upstash/Neon/Resend**: Os segredos devem ser injectados no BFF via Railway enviroment variables.

---

## 🌊 Ambientes: Staging vs Produção

| Recurso | Staging / Preview | Produção |
|---------|-------------------|----------|
| **Branch** | `develop` / PR Branches | `main` |
| **Web** | `staging.usepdc.com` | `usepdc.com` |
| **API (BFF)** | `api-staging.usepdc.com` | `api.usepdc.com` |
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

Deploy manual equivalente ao CI:

```bash
npm run deploy:web
```

---

## 🏥 Health Checks Pós-Deploy

Após cada deploy, o responsável de Operações (Ops) deve validar:

1.  **Core Connectivity**: `curl -I https://api.usepdc.com/health` (deve retornar `200 OK`).
2.  **Auth Authority**: Validar endpoint JWKS em `https://api.usepdc.com/.well-known/jwks.json`.
3.  **Telemetry Ingestion**: Executar um teste de ingestão na Edge via `scripts/test-edge-prod.sh`.
4.  **PWA Manifest**: Validar `https://usepdc.com/manifest.webmanifest`.
5.  **Performance Gate**: Lighthouse Score em Mobile ≥ 90.
6.  **Accessibility Gate**: Axe-core com zero violações críticas em `https://usepdc.com/login`.

---
*Doc is Law — Última auditoria: 21 de Abril de 2026.*
