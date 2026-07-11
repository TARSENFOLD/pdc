# Mapeamento de Bugs de Producao — PDC v2

> Data: 11 de Julho de 2026
> Branch: `feat/migrate-bff-cms-to-hetzner`
> Status: remediado localmente, exceto acoes externas indicadas.

## Resumo

Esta passagem consolidou os 7 pontos levantados na auditoria de producao.
Os pontos de codigo foram corrigidos com testes; o ficheiro local de segredos foi removido.
A rotacao das chaves Resend continua a exigir acao no dashboard do provedor.

## Estado dos 7 Pontos

| ID | Estado | Resolucao |
|---|---|---|
| BUG-LINT-01 | Corrigido | `apps/web/src/lib/api/http.ts` agora tipa schemas Zod como entrada `unknown` e saida `T`, sem `any` no retorno. |
| BUG-TEST-01 | Corrigido | `web-push.service.spec.ts` foi estabilizado; suite API completa passou. |
| BUG-SEC-01 | Mitigado localmente | `secrets.txt` foi removido do disco local. Rotacao das chaves Resend deve ser feita no dashboard. |
| BUG-SEC-02 | Corrigido | `verifyJwt` valida JWT dentro do `try/catch`, mas executa `await next()` fora dele; erros downstream deixam de virar 401. |
| BUG-SEC-03 | Corrigido | Edge ignora `perfilId` enviado pelo cliente e usa apenas o `perfilId` verificado pelo JWS. |
| BUG-OPS-01 | Corrigido | Shutdown do BFF fecha Socket.IO e HTTP server com drain e timeout de 10s. |
| BUG-GOV-01 | Registado | Rule of 300 permanece como divida estrutural ja adiada em governanca; nao foi misturada neste hotfix. |

## Evidencia Local

- `npm run typecheck`: verde antes dos fixes finais; deve ser reexecutado apos este documento.
- `npm run lint`: verde antes dos fixes finais; deve ser reexecutado apos este documento.
- `npm test -w @pdc/shared`: 19 ficheiros, 141 testes.
- `npm test -w @pdc/api`: 84 ficheiros, 535 testes.
- `npm test -w @pdc/web`: 30 ficheiros, 167 testes.
- `npm test -w @pdc/edge`: 3 ficheiros, 14 testes.
- `npx playwright test --project=chromium`: bloqueado localmente por Chromium ausente; `npx playwright install chromium` ficou sem progresso e foi interrompido.

## Acao Externa Obrigatoria

Rotacionar no Resend as chaves que estavam em `secrets.txt`.
Nao ha valor de chave neste documento para evitar novo vazamento em texto plano.
