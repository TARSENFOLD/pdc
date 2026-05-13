# @pdc/edge

Este é o Ingestor Edge (Cloudflare Worker) responsável pelo processamento de telemetria e tráfego desautenticado (ADR-005).

## Segredos (Secrets)

**Nunca introduza variáveis de ambiente secretas no ficheiro `wrangler.toml`.** O `wrangler.toml` destina-se apenas a configurações não críticas (vars) ou referências.

Os bindings de segredos, como as chaves do Upstash ou do Telemetry Token, devem ser obrigatoriamente configurados usando a CLI do wrangler para não comprometerem o repositório.
O mapeamento operacional autoritativo entre serviços está em `docs/operations/secrets-mapping.md`.

Execute os seguintes comandos e insira os segredos quando solicitado:
```bash
wrangler secret put TELEMETRY_SECRET
wrangler secret put UPSTASH_REDIS_REST_URL
wrangler secret put UPSTASH_REDIS_REST_TOKEN
```

## Validação JWS (Telemetry Token)

O endpoint `/telemetria/batch` está protegido pelo `jwsVerifyMiddleware`.
Este middleware **não partilha** chaves privadas com o BFF. Em vez disso:

1. Faz um fetch inicial à rota pública do BFF: `https://<bff>/.well-known/jwks.json`.
2. Mantém a chave pública na memória (Isolate Cache) durante 1 hora (`3600000ms`).
3. Valida os tokens RS256 localmente, assegurando `iss: pdc-v2-bff` e `aud: pdc-v2-edge` sem latência acrescida, protegendo assim o Edge contra ataques ou injecções fraudulentas.
