# ADR-053 - Redis dual-plane: VPS para segurança, Upstash para Edge

**Data:** 2026-07-17
**Estado:** Aceite
**Caixa:** C - a topologia documentada e o runtime misturavam capacidades com requisitos de disponibilidade incompatíveis.

## Contexto

Em 17 de Julho de 2026, o Upstash voltou a atingir `500001/500000` pedidos.
O BFF continuou roteável, mas OTP, challenges e refresh tokens ficaram
fail-closed, bloqueando login e criação de conta. A mesma instância também
recebia telemetria de alto volume do Cloudflare Edge, cache, rate limit, locks e
idempotência. Assim, a quota do plano de dados Edge tornou-se uma dependência
diária do plano de identidade.

Relaxar OTP ou persistir refresh tokens em memória foi rejeitado: ambos criariam
bypass de segurança ou sessões inconsistentes entre restarts.

## Decisão

1. O BFF usa Redis TCP persistente no VPS para OTP, challenges, password reset,
   refresh tokens, cache, locks e idempotência de eventos.
2. O Redis do VPS corre numa rede Docker privada, sem porta publicada, exige
   password, usa AOF com `appendfsync everysec` e volume nomeado.
3. Upstash permanece no plano partilhado com o Cloudflare Edge:
   `telemetry_queue`, DLQ/retries associados e rate limit distribuído.
4. O código expõe clientes explícitos: `redis` para o plano primário do BFF e
   `telemetryRedis` para a fila Edge. Não existe fallback silencioso entre os
   dois em produção.
5. O deploy exige credenciais independentes `REDIS_BFF_PASSWORD` e
   `REDIS_HEALTH_PASSWORD`, além de `PDC_REDIS_URL`; espera o health nativo do
   container e executa `PING` com o utilizador restrito `health` antes de
   declarar sucesso.
6. O utilizador `pdc` só acede ao namespace `pdc:*` e aos comandos usados pelo
   BFF; o utilizador `health` só executa `PING`; o utilizador `default` fica
   desativado.
7. As políticas do ADR-052 mantêm-se: capacidades de segurança continuam
   fail-closed e rate limit/cache só degradam segundo a política documentada.
8. O utilizador `backup` tem credencial independente e apenas pode executar
   `BGSAVE`, `LASTSAVE`, `DBSIZE`, `INFO` e `PING`. `INFO` é limitado pelo
   runbook à secção `persistence`. `scripts/redis-snapshot.sh` produz
   snapshots RDB comprimidos, checksum SHA-256 e validação por
   `redis-check-rdb`, incluindo a contagem de chaves do próprio RDB.
9. O runtime continua a usar AOF `everysec`; o RDB é o artefacto portátil de
   disaster recovery. Restore exige confirmação explícita, preserva o volume
   anterior e só termina com o health do container e `PING` válidos.

## Consequências

- Esgotar a quota Upstash deixa rate limit distribuído e telemetria Edge
  degradados, mas não bloqueia login, OTP ou refresh tokens.
- O VPS passa a alojar estado durável adicional. O volume `pdc-redis-data` entra
  na monitorização de disco/memória e gera snapshots diários com retenção
  configurável. Uma cópia deve sair do mesmo VPS para cumprir disaster recovery.
- A indisponibilidade total do VPS afeta API e Redis primário em conjunto; não
  piora o domínio de falha atual do BFF, mas exige restore do AOF no disaster
  recovery.
- Refresh tokens gravados apenas no Upstash antes desta mudança não migram.
  Sessões existentes podem exigir novo login quando o access token expirar.

## Alternativas rejeitadas

- **Ignorar OTP durante a quota:** bypass de autenticação, proibido.
- **Guardar tokens em memória:** perde rotação, revogação e consistência após
  restart.
- **Mover toda a telemetria para o Redis do VPS:** o Cloudflare Worker não usa o
  endpoint TCP privado e quebraria a arquitetura Edge-First.
- **Apenas aumentar o plano Upstash:** reduz a frequência, mas mantém identidade
  acoplada ao volume variável de telemetria.

## Validação

- `redis-cli` autenticado responde `PONG` dentro do container.
- Login cria challenge e envia OTP no Redis primário do VPS; o Upstash é
  validado separadamente para rate limiting e telemetria dentro da quota.
- Verificação OTP emite cookies e a rotação de refresh token persiste no Redis
  primário.
- `/health` permanece liveness; `/health/ready` distingue `sessionRedis` de
  `rateLimitRedis`; `sessionRedis` exige `PING` e uma escrita curta com TTL para
  detectar também `maxmemory noeviction`.
- O consumer continua a ler `telemetry_queue` no Upstash.
- `bash scripts/redis-snapshot.sh backup` cria e volta a verificar o snapshot;
  `verify` rejeita checksum ou RDB inválidos; um ensaio periódico de `restore`
  comprova o runbook e a reposição automática do volume anterior em falha.
