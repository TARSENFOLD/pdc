# B2 — docs/guia-tecnico/arquitectura.md (4 camadas reais)

## Status

Draft · Bloqueia B3, B4.

## Estado actual

file:docs/guia-tecnico/arquitectura.md:

- Diagrama Monorepo (linhas 22–36) **omite ****`apps/edge`**.
- Stack table (linha 96–112) diz **Vite 6** — file:apps/web/vite.config.ts mostra Vite 5 / `apps/web/package.json` diz `vite: ^6.0.0` (drift entre arquivos).
- Diz frontend deploy = **Vercel** (linha 110) — vai mudar para Cloudflare Pages (`spec:E5`).
- JWT secção (linhas 64–76) só fala em HS256 — não menciona JWS RS256 do telemetry-token (file:packages/shared/src/telemetry-token.ts).

## Estado canónico

- **4 camadas L1–L4** (spec:IMPORTANTE/01 §5):
  - L1 Factos (Edge / Cloudflare Workers).
  - L2 Cérebro Matemático (`@pdc/shared` + BFF).
  - L3 Verniz IA (Tina).
  - L4 Core (Hono + Strapi).
- Vite **6** (apenas a versão do package.json é a verdade).
- JWT HS256 para user-session + JWS RS256 para telemetry-token (file:apps/api/src/modules/auth/telemetry-token.ts).

## Tickets

### B2-T1 — Reescrever diagrama Mermaid com 4 camadas

Incluir: Browser PWA → Edge Worker → Upstash Queue → BFF Consumer (worker isolado) → Strapi/Postgres + R2; em paralelo Browser → BFF (auth + RPC) → Strapi.

- **DoD E2E**: novo dev compreende em <5min onde reside cada parte.

### B2-T2 — Atualizar stack table com versões reais auditadas

Validar cada versão contra `package.json` real. Adicionar Cloudflare Workers, Upstash Redis, R2, Motion, Socket.IO, Jose, Sentry, Resend, DeepSeek.

- **DoD E2E**: tabela bate 100% com `package.json` files.

### B2-T3 — Documentar dois tipos de tokens JWT

Bloco dedicado: HS256 (user session) vs RS256 (telemetry-token). Onde cada um vive, como roda, JWKS endpoint, expiração.

- **DoD E2E**: dev percebe que cliente não pode forjar telemetry tokens.

### B2-T4 — Substituir Vercel por Cloudflare Pages na linha 110

Coordenar com `spec:E5`.

- **DoD E2E**: zero menções a Vercel no doc após `spec:E5` aceite.

## Dependências

- Bloqueia B3 (deploy precisa de arquitectura limpa).
- Depende de `spec:E5` para confirmação Cloudflare.

</TRAYCER_SPEC>