# ADR-046 — Migração do BFF e CMS do Railway para VPS Hetzner

**Data:** 2026-07-04
**Estado:** Aceite
**Caixa:** B — decisão de infraestrutura madura; evoluir a documentação e substituir Railway por VPS própria.

## Contexto

O PDC v2 hospedava o BFF (Hono API) e o CMS (Strapi v5) no **Railway**, um PaaS gerido. Com o crescimento da plataforma, tornou-se prioritário:

- Reduzir custos operacionais previsíveis.
- Diminuir lock-in num único PaaS.
- Manter controlo total sobre o runtime de aplicações (Docker, resource limits, reverse proxy).
- Simplificar a arquitectura: o VPS não executa PostgreSQL nem object storage;
  desde o ADR-053, mantém apenas a exceção explícita do Redis persistente do BFF.

A experiência deixou claro que cada componente deve ficar onde o serviço é mais forte: Cloudflare para edge, CDN, DNS e WAF; Neon para PostgreSQL serverless; Upstash para o plano Redis partilhado com o Edge; Hetzner para execução de containers e, desde o ADR-053, Redis persistente do BFF.

## Decisão

1. **Remover o Railway** como provedor de BFF e CMS.
2. **Hospedar BFF e CMS num VPS Hetzner CX23** (2 vCPU / 4 GB RAM / 40 GB NVMe), executando em Docker.
3. **Usar Traefik** como reverse proxy com descoberta automática de containers, Let's Encrypt automático e health checks.
4. **Manter todos os outros serviços cloud**:
   - Cloudflare Pages (frontend/PWA)
   - Cloudflare Workers (edge/BFF)
   - Cloudflare R2 (media storage)
   - Neon (PostgreSQL)
   - Upstash (Redis de telemetria Edge e rate limiting)
   - Resend (email)
   - Sentry (observabilidade)
   - DeepSeek (AI/Tina)
5. **Alocar resources limitados** no VPS para caber nos 4 GB de RAM:
   - Traefik: 128 MB
   - BFF: 1 GB
   - Strapi: 2 GB
6. **Documentar** a nova arquitectura em `docs/guia-tecnico/deploy.md` e criar `docker-compose.prod.yml`, `scripts/deploy-vps.sh`, `scripts/setup-vps.sh` e `.github/workflows/deploy-vps.yml`.
7. **Corrigir o drift** em `apps/edge/wrangler.toml`, alinhando `BFF_URL` para `https://api.usepdc.com`.

> **Evolução:** o ADR-053 substitui a decisão original de não executar Redis no
> VPS. O incidente de quota de 17 de Julho demonstrou que OTP e tokens não podem
> partilhar o mesmo limite diário da telemetria Edge.

## Consequências

- **Custo mais previsível**: preço fixo mensal do VPS vs modelo de consumo do Railway.
- **Maior controlo operacional**: acesso root, logs, resource limits, updates.
- **Maior responsabilidade**: backups, segurança, SSL, firewall e monitorização passam a ser nossa.
- **Latência para Angola**: mantém-se similar, porque a Cloudflare Edge continua a responder perto do utilizador; o BFF/CMStrapi apenas servem chamadas que não são cacheadas na edge.
- **RAM apertada**: o CX23 é suficiente para arrancar, mas monitorização de memória é obrigatória. Upgrade para CPX31/41 se Strapi+API consumirem consistentemente >85% de RAM.
- **CI/CD**: o deploy passa a ser feito via GitHub Actions + SSH/rsync, em vez de integração nativa do Railway.

## Risco residual

- Indisponibilidade do VPS se não houver monitorização e failover.
- Vazamento de secrets se `.env` no VPS não tiver permissões restritas (`chmod 600`).
- Possível downtime durante a mudança de DNS, mitigado com TTL baixo e validação de health checks.

## Alternativas consideradas

- **Manter Railway**: rejeitado por custos crescentes e lock-in.
- **Cloudflare Tunnel**: não usado na fase inicial porque o VPS já tem IP público; Traefik + firewall Hetzner é suficiente. Pode ser adicionado futuramente para esconder o IP.
- **Nginx**: rejeitado a favor do Traefik pela simplicidade de descoberta de containers e SSL automático.
- **Coolify**: rejeitado para evitar adicionar outra camada de gestão; preferimos configuração declarativa em Docker Compose.
