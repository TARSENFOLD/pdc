# Estratégia de Deploy e Infraestrutura — Guia Soberano (B3)

O PDC v2 utiliza uma arquitectura distribuída multi-provider para garantir latência baixa na Edge, escalabilidade no Core e presença nativa em dispositivos móveis. Cada componente fica onde o serviço é mais forte: Cloudflare para edge, CDN, DNS e WAF; Hetzner para aplicações e Redis primário; Neon, Upstash, R2, Resend, Sentry e DeepSeek para serviços especializados.

---

## 🏛️ Matriz de Infraestrutura (Distributed Stack)

| Componente                  | Provider               | Estratégia                                           | Domínio Prod        |
| --------------------------- | ---------------------- | ---------------------------------------------------- | ------------------- |
| **Frontend (PWA)**          | **Cloudflare Pages**   | Build Automático (Vite 6)                            | `usepdc.com`        |
| **Edge (Factos)**           | **Cloudflare Workers** | Wrangler / Global Edge (`pdc`, root `wrangler.toml`) | `edge.usepdc.com`   |
| **BFF (Cérebro)**           | **Hetzner VPS**        | Docker + Traefik (Root Context)                      | `api.usepdc.com`    |
| **CMS (Strapi v5)**         | **Hetzner VPS**        | Docker + Traefik (Infra Context)                     | `cms.usepdc.com`    |
| **Base de Dados**           | **Neon**               | Serverless PostgreSQL 16                             | `neon.tech` (Proxy) |
| **Redis BFF**               | **Hetzner VPS**        | TCP privado + AOF                                    | rede Docker interna |
| **Queue Edge / Rate limit** | **Upstash**            | Serverless Redis HTTP                                | `upstash.io`        |
| **Storage (Media)**         | **Cloudflare R2**      | S3-Compatible Storage                                | `r2.dev` / CDN      |
| **E-mail**                  | **Resend**             | Transactional API                                    | `resend.com`        |
| **AI (Tina)**               | **DeepSeek**           | Inference API (RAG)                                  | `deepseek.com`      |
| **Observabilidade**         | **Sentry**             | Full-stack Tracing                                   | `sentry.io`         |

---

## 🖥️ VPS Hetzner (BFF + Strapi)

O VPS executa aplicações e o Redis primário do BFF. PostgreSQL e object storage
continuam externos.

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
    │
    ▼
Redis privado (sem porta publicada)
```

### Serviços e resources (CX23: 2 vCPU / 4 GB RAM / 40 GB NVMe)

| Serviço       | Container     | RAM Limite | Nota                                   |
| ------------- | ------------- | ---------- | -------------------------------------- |
| Reverse Proxy | `pdc-traefik` | 128 MB     | SSL automático via Let's Encrypt.      |
| BFF           | `pdc-api`     | 1 GB       | Build via `Dockerfile` (root context). |
| CMS           | `pdc-strapi`  | 2 GB       | Build via `infra/strapi/Dockerfile`.   |
| Redis BFF     | `pdc-redis`   | 384 MB     | AOF persistente em `pdc-redis-data`.   |

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
export RELEASE_SHA="COLE_AQUI_O_SHA_GIT_COMPLETO_DE_40_CARACTERES"
export RELEASE_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
sudo --preserve-env=RELEASE_SHA,RELEASE_DATE docker compose -f docker-compose.prod.yml up -d
```

`RELEASE_SHA` e `RELEASE_DATE` são metadados não secretos e obrigatórios para
deploy. O script rejeita SHA inválido e grava ambos nas labels OCI das imagens e
dos containers `pdc-api` e `pdc-strapi`. `RELEASE_SHA` também identifica a
release enviada pelo runtime da API ao Sentry e, por isso, qualquer comando
`compose up` ou `compose config` deve exportá-lo. Comandos de leitura que não
recriam serviços devem usar `scripts/deploy-vps.sh diagnostics`, que recupera a
identidade da release já instalada.

### Deploy automático (gated por CI)

O pipeline de deploy está **gated pelo CI**: nenhum deploy corre sem que o workflow `CI` termine com sucesso.

**Fluxo canónico:**

1. Push/merge para `main` → dispara o workflow `CI` (lint + typecheck + **testes unitários** + build).
2. Quando `CI` termina com `success`, o deploy faz checkout de
   `workflow_run.head_sha`, confirma que o checkout corresponde ao SHA aprovado e
   sincroniza exactamente essa revisão. O workflow falha antes do checkout se
   qualquer secret VPS obrigatório estiver ausente. O gatilho automático aceita
   apenas CI originado por `push` no `main` do próprio repositório; CI de pull
   request nunca recebe o caminho de deploy com secrets.
3. O GitHub dispara automaticamente:
   - `deploy-vps.yml` (Hetzner VPS — API + Strapi)
   - `deploy-web.yml` (Cloudflare Pages — frontend)
   - `deploy-edge.yml` (Cloudflare Workers — edge)
4. Se `CI` falhar (lint, typecheck, testes ou build), **nenhum deploy corre**.

> **Branch protection obrigatória**: configura `main` com required status checks `web — lint + typecheck + build`, `api — lint + typecheck + build`, `shared — lint + typecheck + build` e exige review approval antes do merge.

Secrets necessários no GitHub:

- `VPS_HOST`: `167.235.29.64`
- `VPS_USER`: `cj`
- `VPS_SSH_KEY`: chave privada SSH completa
- `VPS_HOST_KEY`: linha completa de `known_hosts` para o VPS; obter via
  `ssh-keyscan` e verificar a fingerprint por canal independente antes de gravar
  o secret

Deploy manual equivalente (bypass do gate, usar só em emergências):

```bash
cd /opt/pdc
RELEASE_SHA="COLE_AQUI_O_SHA_GIT_COMPLETO_DE_40_CARACTERES" \
RELEASE_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
bash scripts/deploy-vps.sh
```

O script valida o Docker Compose antes de construir, preserva as imagens atuais,
espera os health checks nativos via `docker inspect`, testa os endpoints dentro
dos containers com `docker compose exec -T` e só depois testa os domínios
públicos, incluindo CORS de `/bootstrap` e do polling Socket.IO para
`https://usepdc.com`. As portas `3001` e `1337` não são publicadas no host.
Consequentemente, `curl localhost:3001` e `curl localhost:1337` no VPS não são
checks válidos.
Se o deploy falhar, o rollback recria API/Strapi com as imagens anteriores e
repete a mesma validação de saúde. Um rollback não validado continua a ser falha.
O deploy também recusa preparar rollback se faltar uma das imagens ou se API e
Strapi não tiverem a mesma revisão/data OCI, evitando atribuir uma identidade
falsa a um estado parcial. Esta é uma limitação esperada do modelo de identidade
única de release: ao adicionar API ou Strapi a uma stack existente, o primeiro
deploy deve partir de uma instalação sem imagens anteriores para ambos; se só um
serviço tiver imagem anterior, o deploy é recusado e exige reconciliação manual.
Em staging, parametrizar os checks externos com
`PDC_DEPLOY_API_URL`, `PDC_DEPLOY_CMS_URL` e `PDC_DEPLOY_WEB_ORIGIN`.

### Backup e restore do Redis primário

O Redis mantém AOF `everysec` no volume durante o runtime. Para disaster
recovery, o utilitário canónico cria um RDB consistente via `BGSAVE`, comprime-o,
gera checksum SHA-256 e valida-o com `redis-check-rdb` da mesma imagem do
container:

```bash
cd /opt/pdc
bash scripts/redis-snapshot.sh backup
bash scripts/redis-snapshot.sh verify /opt/pdc/backups/redis/redis-UTC.rdb.gz
```

Configurar `REDIS_BACKUP_PASSWORD` com valor independente em `/opt/pdc/.env`.
O utilizador ACL `backup` não lê chaves e só executa `BGSAVE`, `LASTSAVE`,
`DBSIZE` e `PING`; o script aguarda a progressão de `LASTSAVE` e valida que
`INFO`, inclusive com múltiplas secções, permanece proibido. Por defeito ficam
14 snapshots em `/opt/pdc/backups/redis`; alterar com
`PDC_REDIS_BACKUP_RETENTION`. Cada comando Redis é limitado a 10 segundos;
ajustar apenas quando necessário com `PDC_REDIS_COMMAND_TIMEOUT_SECONDS`. A
transferência do RDB tem deadline independente de 300 segundos, configurável por
`PDC_REDIS_TRANSFER_TIMEOUT_SECONDS`. Uma cópia cifrada deve ser enviada para storage
fora do VPS depois da verificação.

Exemplo de cron diário, sem expor segredos:

```cron
17 2 * * * cd /opt/pdc && /usr/bin/bash scripts/redis-snapshot.sh backup >> /var/log/pdc-redis-backup.log 2>&1
```

Restore é destrutivo e exige confirmação explícita. O script valida primeiro o
snapshot, para o Redis, preserva todo o volume atual num `pre-restore-*.tar.gz`,
carrega o RDB e exige container saudável + `PING`. Se essa validação falhar,
repõe automaticamente o volume anterior:

```bash
cd /opt/pdc
bash scripts/redis-snapshot.sh restore \
  /opt/pdc/backups/redis/redis-UTC.rdb.gz --confirm
```

Ensaiar restore trimestralmente num VPS isolado e registar data, snapshot e
resultado. Um backup sem teste de restore não comprova recuperabilidade.

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
- **VPS Hetzner**: Secrets injetados via ficheiro `/opt/pdc/.env` com permissões `600`. O GitHub Actions sincroniza o repo via `rsync`, exclui ambientes locais e artefactos `dist`/`.strapi` gerados pelos containers, e preserva `/opt/pdc/.secrets-history`; os containers lêem o env file no deploy.
- **Upstash/Neon/Resend**: Os segredos devem ser injectados no BFF e Strapi via `/opt/pdc/.env` no VPS.

---

## 🌊 Ambientes: Staging vs Produção

| Recurso           | Staging / Preview         | Produção           |
| ----------------- | ------------------------- | ------------------ |
| **Branch**        | `develop` / PR Branches   | `main`             |
| **Web**           | `staging.usepdc.com`      | `usepdc.com`       |
| **API (BFF)**     | `api-staging.usepdc.com`  | `api.usepdc.com`   |
| **CMS**           | `cms-staging.usepdc.com`  | `cms.usepdc.com`   |
| **Edge**          | `edge-staging.usepdc.com` | `edge.usepdc.com`  |
| **Base de Dados** | Neon Branch `staging`     | Neon Branch `main` |

---

## Cloudflare Pages

O projecto Pages `pdc` serve exclusivamente o frontend/PWA. O `wrangler.toml` da raiz pertence ao Edge Worker; não adicionar `pages_build_output_dir` nele, para não misturar os contratos de deploy.

Configuração canónica no Cloudflare Pages:

| Campo                      | Valor                                   |
| -------------------------- | --------------------------------------- |
| **Build command**          | `npm run build:web`                     |
| **Build output directory** | `apps/web/dist`                         |
| **Production branch**      | `main`                                  |
| **Environment variable**   | `VITE_API_URL=https://api.usepdc.com`   |
| **Environment variable**   | `VITE_EDGE_URL=https://edge.usepdc.com` |

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

### Diagnóstico seguro no VPS

O modo de diagnóstico mostra `docker compose ps`, estado/health nativo e as
últimas linhas de logs de Traefik, API e Strapi. Tokens, credenciais em URLs e
campos comuns de segredo são redigidos antes de chegar ao terminal ou ao GitHub
Actions:

```bash
cd /opt/pdc
RELEASE_SHA="$(docker inspect pdc-api --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}')" \
  bash scripts/deploy-vps.sh diagnostics
```

Para confirmar a revisão e a data da release sem abrir o `.env`:

```bash
docker inspect pdc-api --format \
  'revision={{ index .Config.Labels "org.opencontainers.image.revision" }} created={{ index .Config.Labels "org.opencontainers.image.created" }}'
```

#### Traefik responde `404` com router `-`

No access log do Traefik, router `-` acompanhado de `404` significa que a
requisição não foi associada a um router. O `404` gerado pelo proxy também não
traz os headers CORS da API, pelo que o browser reporta
`Access-Control-Allow-Origin` ausente como efeito secundário. Verificar, nesta
ordem:

1. se o `Host` pedido é exactamente `api.usepdc.com` ou `cms.usepdc.com`;
2. se `pdc-api`/`pdc-strapi` estão `healthy`, na rede `pdc-network` e mantêm as labels `traefik.http.routers.*`;
3. se os logs do provider Docker no `pdc-traefik` indicam router descartado ou configuração inválida.

Quando o access log contém o nome do router mas responde `503`/`504`, o router
foi encontrado e o diagnóstico deve concentrar-se no backend/health, não no
DNS ou na regra `Host`.

#### Quota diária do Upstash

Quota esgotada, throttling ou indisponibilidade do Upstash aparece na API como
`429`, timeout ou erro de Redis. Confirmar apenas presença de configuração, sem
imprimir valores:

```bash
docker exec pdc-api sh -lc '
  for name in PDC_REDIS_URL UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN; do
    if [ -n "$(printenv "$name")" ]; then
      echo "$name=present"
    else
      echo "$name=missing"
    fi
  done
'

docker exec pdc-redis sh -ec '
  REDISCLI_AUTH="$REDIS_HEALTH_PASSWORD" redis-cli --user health ping | grep -q PONG
'
```

Validar `/health`, `/health/ready` e uma rota real como `/bootstrap`. `/health`
é liveness; `/health/ready` distingue `sessionRedis` (VPS) de `rateLimitRedis`
(Upstash). O probe de `sessionRedis` valida `PING` e escrita curta com TTL, por
isso também degrada se `maxmemory noeviction` já estiver a rejeitar sessões.
Quota Upstash não pode bloquear OTP, reset, locks ou refresh tokens.
O consumer de telemetria continua dependente do Upstash e deve preservar fila e
DLQ até a quota recuperar.

---

_Doc is Law — Última auditoria: 17 de Julho de 2026._
