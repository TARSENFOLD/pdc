# B3 — docs/guia-tecnico/deploy.md (Cloudflare Pages + Workers + Railway BFF)

## Status

Draft · Depende de B2, E5, D1, D2.

## Estado actual

file:docs/guia-tecnico/deploy.md:

- Diz frontend = Railway Static Site (linha 18–21).
- file:apps/web/vercel.json existe — drift directo.
- Não menciona deploy do **Edge Worker** (Wrangler) — apesar de file:.github/workflows/deploy-edge.yml existir.
- Sem split staging/produção formal.
- Sem palavra sobre **release pipeline mobile** (Capacitor + TWA + App Store + Play Store).
- Lista chaves em `apps/api/.env.production` quando a política é nunca commitar `.env*`.

## Estado canónico

- **Frontend**: Cloudflare Pages (decisão `spec:E5`).
- **Edge Worker**: Cloudflare Workers via `apps/edge` (Wrangler).
- **BFF + Strapi + PostgreSQL + Redis (Upstash) + R2**: Railway + Upstash + Cloudflare R2 + Neon (DB).
- **Mobile**: Capacitor para iOS, TWA/PWABuilder para Android, distribuição via App Store + Play Store.
- Variáveis de ambiente **nunca em ficheiros versionados** (excepto `.env.example` que é fixture).

## Tickets

### B3-T1 — Reescrever para arquitectura distribuída multi-provider

Tabela: Frontend (Cloudflare Pages) · Edge (Cloudflare Workers) · BFF (Railway) · Strapi (Railway) · DB (Neon) · Cache/Queue (Upstash) · Storage (R2) · Mail (Resend) · AI (DeepSeek) · Observability (Sentry).

- **DoD E2E**: ops sabe em que provider cada serviço vive em <1min.

### B3-T2 — Adicionar pipeline release Mobile

Subsecção: PWA → Capacitor build (iOS) + TWA build (Android) → assinaturas → App Store Connect + Play Console upload → review.

- **DoD E2E**: ops corre o pipeline manualmente uma vez seguindo este doc e tem um TestFlight + Internal Track.

### B3-T3 — Documentar configuração de env vars por provider

- Cloudflare Pages: env vars via dashboard (sem `.env` no repo).
- Railway: secret store + sensitive flag.
- Upstash, Neon, Resend, Sentry: secrets externos.
- Banner: "**Nunca commitar ****`.env`****. ****`.env.example`**** é fixture intencional, não template de prod.**"
- **DoD E2E**: novo deploy não exige acesso ao repo para configurar segredos.

### B3-T4 — Adicionar split staging vs produção

Domínios: `staging.usepdc.com` (Cloudflare Pages preview branch) vs `usepdc.com` (production). API: `api-staging.usepdc.com` vs `api.usepdc.com`. Edge: `edge-staging.usepdc.com` vs `edge.usepdc.com`.

- **DoD E2E**: PR cria preview deploy automático em staging antes de merge.

### B3-T5 — Health checks pós-deploy

Lista verificável: `curl -I https://api.usepdc.com/health`, JWKS endpoint, telemetry batch test, manifest valid, lighthouse ≥90, axe-core zero violations.

- **DoD E2E**: ops pode validar deploy em <5min com checklist único.

## Dependências

- Depende de B2, E5, D1, D2.

</TRAYCER_SPEC>