# ADR-052 - Resiliencia Redis e contratos de health

**Data:** 2026-07-12
**Estado:** Aceite
**Caixa:** C - o codigo e a operacao tratavam todas as dependencias Redis como equivalentes.

## Contexto

Em 12 de Julho de 2026, o Upstash atingiu o limite diario de 500000 pedidos.
O rate limiter global envolvia tambem `GET /health`, que passou a responder 500.
O Docker marcou o unico BFF como unhealthy e o provider Docker do Traefik removeu
o router, devolvendo o seu proprio 404 sem CORS para todas as rotas publicas.

Redis tambem suporta capacidades com requisitos diferentes: cache, rate limit,
tokens de seguranca, locks, idempotencia G15 e filas de telemetria. Um fallback
unico para todas elas cria bypass de autorizacao ou perda silenciosa de eventos.

## Decisao

1. `GET /health` e uma liveness local e nao consulta Redis, Strapi ou providers
   externos. O health check do container e do Traefik usa esta rota.
2. `GET /health/ready` relata readiness e degradacao de dependencias sem expor
   credenciais. Readiness nao remove o BFF do Traefik: falhas devem continuar a
   chegar ao Hono e receber erros semanticos com CORS.
3. O acesso a Redis classifica falhas como `quota`, `timeout`, `network`,
   `server` ou `misconfigured` e usa timeout, retry idempotente e circuit breaker
   observavel por capacidade.
4. Politicas de falha:
   - cache e rate limit: fail-open controlado; rate limit usa bucket local;
   - OTP, password reset, approval enforcement e locks: fail-closed com 503;
   - idempotencia G15 e telemetria: fail-durable; o evento permanece no outbox ou
     processing queue ate uma persistencia confirmar o ACK.
5. Um evento de dominio nunca recebe `processed=true` enquanto algum hook estiver
   ausente ou em `retryable_error`.
6. Operacoes de claim, consumo de token e release de lock sao atomicas.
7. Workers de outbox e telemetria executam em processos isolados do BFF e expoem
   heartbeat observavel.

## Consequencias

- Esgotar a quota Redis deixa funcoes dependentes degradadas, mas nao remove a
  API inteira do roteamento.
- Operacoes de seguranca podem devolver 503 durante outage; isto e preferivel a
  aceitar tokens repetidos ou utilizadores nao aprovados.
- O fallback de rate limit e local por processo e perde coordenacao global; deve
  ser acompanhado por metrica e alerta ate o Redis recuperar.
- Filas e outbox exigem reclaimer, retry e monitorizacao de idade/backlog.

O ADR-053 separou o Redis primário do BFF do Upstash usado pelo Edge. As
políticas de falha desta decisão permanecem válidas por capacidade.

## Validacao

- Fault injection para quota, timeout, network e recuperacao half-open.
- `/health` continua 200 com Redis indisponivel; `/health/ready` sinaliza degraded.
- Nenhum hook, OTP, lock ou evento de telemetria e confirmado antes do efeito
  atomico ou da persistencia duravel correspondente.
- Smoke de producao confirma router `pdc-api@docker`, CORS e SHA implantado.
