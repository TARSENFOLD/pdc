# E5 — ADR-019 Migração Frontend Vercel → Cloudflare Pages + Sec Hardening

## Status

Draft · **CRÍTICA** · Bloqueia DEPLOY.

## Estado actual

- file:apps/web/vercel.json configurado (linhas 1–51) — região `cdg1` (Paris).
- file:docs/guia-tecnico/deploy.md diz Railway para frontend.
- Drift directo de host.
- Incidente Vercel 19 Abril 2026 confirmado: vector OAuth via Context.ai → env vars não-sensitive expostas.
- file:.env.example é fixture (decisão tua) — outros `.env*` precisam bloqueio rígido.
- file:.gitignore precisa de cobertura completa de `.env*`.
- Sem `gitleaks` ou `git-secrets` no pre-commit.

## Estado canónico

- **Frontend**: Cloudflare Pages (`spec:E5` ratifica via ADR-019).
- `vercel.json` arquivado.
- Cloudflare Pages config: `wrangler.toml` em `apps/web/` ou `pages/wrangler.toml`.
- `.env*` (excepto `.env.example`) bloqueados em pre-commit + CI.
- `gitleaks` no pre-commit.

## Tickets

### E5-T1 — ADR-019: Migração Frontend Vercel → Cloudflare Pages

- Contexto: incidente Vercel + análise técnica (`chat:` desta sessão).
- Decisão: migrar para Cloudflare Pages.
- Justificação: latência África (PoPs Lagos/Joanesburgo), coerência com Edge Worker, custo (banda ilimitada), free SSL, ausência de lock-in (sem Next.js).
- Consequências: perda de DX polish da Vercel; ganho de simplicidade operacional.
- Reavaliação: se Cloudflare Pages introduzir limites bloqueantes para PWA.
- **DoD E2E**: ADR aceite e linkada de file:.planning/CONSTITUTION.md.

### E5-T2 — Setup Cloudflare Pages

- Conectar Pages ao repo via Cloudflare dashboard.
- Build command: `npm ci && npm run build -w packages/shared && npm run build -w apps/web`.
- Output: `apps/web/dist`.
- Env vars (no dashboard, não no repo): `VITE_API_URL=https://api.usepdc.com`, `NODE_VERSION=24`.
- Branch deploys: `main` → produção (`usepdc.com`), `develop` → preview (`staging.usepdc.com`), PRs → preview deploys.
- **DoD E2E**: PR cria preview URL clicável; merge `main` deploya produção.

### E5-T3 — Migrar headers/redirects de vercel.json → Cloudflare Pages `_headers` + `_redirects`

- Criar `apps/web/public/_headers` (cache rules: assets immutable 1 ano, manifest.json 1h).
- Criar `apps/web/public/_redirects` (sitemap.xml e robots.txt → BFF).
- Arquivar file:apps/web/vercel.json em `apps/web/_archive/vercel.json` (rastreabilidade histórica).
- **DoD E2E**: cache headers funcionam em produção via `curl -I`; sitemap responde via redirect.

### E5-T4 — DNS + TLS via Cloudflare

- Apex `usepdc.com` → Cloudflare Pages.
- `staging.usepdc.com` → preview branch.
- `api.usepdc.com` → Railway (CNAME).
- `edge.usepdc.com` → Cloudflare Worker (route).
- TLS automático via Cloudflare (free SSL).
- **DoD E2E**: todos os subdomínios HTTPS válidos com cert Cloudflare.

### E5-T5 — Pre-commit + CI block para `.env*` (excepto `.env.example`)

- file:.husky/pre-commit: adicionar regex check que falha se algum `.env*` (excepto `.env.example`) está staged.
- Adicionar **gitleaks** (`gitleaks-action` no CI) que falha PRs com segredos expostos noutros ficheiros.
- Excepção whitelist explícita para `.env.example`.
- Atualizar file:.gitignore para cobrir `.env`, `.env.local`, `.env.production`, `.env.staging`, `.env.*.local`.
- **DoD E2E**:
  - **UI**: N/A.
  - **Contrato**: dev tenta `git commit -m "x" .env` → bloqueado localmente com mensagem clara.
  - **BFF**: N/A.
  - **Persistência**: zero `.env*` (excepto example) no histórico git futuro.
  - **Impacto**: incidente de leak não pode acontecer por engano humano.

### E5-T6 — Documentar política `.env.example`-as-fixture

- Banner topo de file:.env.example: *"Este ficheiro é uma fixture intencional (paridade dev↔prod). NÃO usar como template para produção. Segredos reais vivem nos secret stores dos providers."*
- Linkar em file:.planning/CONSTITUTION.md (via `spec:C4`).
- **DoD E2E**: novo dev percebe a política em <1min.

### E5-T7 — Auditoria das credenciais expostas no `.env.example`

- Verificar se as credenciais lá presentes são realmente fixtures (sandbox) ou se são produtivas.
- Se forem produtivas: **rotacioná-las imediatamente** e substituir por sandbox.
- Lista a verificar: Upstash, R2, DeepSeek, Sentry DSN, Resend, Neon DB, Clerk.
- **DoD E2E**: auditoria documentada; credenciais produtivas (se houver) rotacionadas; fixtures confirmadas como sandbox.

### E5-T8 — Decisão Clerk in/out

- file:.env.example tem `CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` mas file:docs/decisoes/adr-003-jwt-cookies.md rejeita Clerk.
- Decidir: ou Clerk é experimentação morta (remover do `.env.example`), ou ADR-003 está superseded (criar ADR-020).
- **DoD E2E**: zero ambiguidade — `.env.example` e ADRs concordam.

## Dependências

- Bloqueia DEPLOY.
- Coordena com B3 (deploy doc), C4 (CONSTITUTION).

</TRAYCER_SPEC>