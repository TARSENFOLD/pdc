# Cloudflare R2

O upload multipart de vídeo depende da política CORS em `cors.json`. Ela
permite upload assinado a partir da aplicação, expõe o `ETag` exigido pela
conclusão multipart e mantém os origins limitados a produção e desenvolvimento
local.

Aplicar e verificar depois de definir `R2_BUCKET` para o bucket do ambiente:

```bash
npx wrangler r2 bucket cors set "$R2_BUCKET" --file infra/r2/cors.json
npx wrangler r2 bucket cors list "$R2_BUCKET"
```

Os uploads multipart abandonados devem ser removidos pelo próprio bucket como
última linha de defesa. A regra abaixo conserva sete dias para retentativas e
atua apenas no prefixo de vídeos:

```bash
npx wrangler r2 bucket lifecycle add "$R2_BUCKET" \
  pdc-abort-incomplete-video-uploads videos/ \
  --abort-multipart-days 7 --force
npx wrangler r2 bucket lifecycle list "$R2_BUCKET"
```

Esta configuração deve ser aplicada separadamente em cada bucket/ambiente. Não
é executada automaticamente durante o deploy da aplicação para evitar alterar
infraestrutura fora da revisão operacional.
