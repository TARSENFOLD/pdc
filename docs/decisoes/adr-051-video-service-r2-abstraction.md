# ADR-051 — Video Service com R2 e Abstracao de Provider

## Status

Aceite — 2026-07-10.

## Contexto

O PDC v2 tinha dois caminhos misturados para video: uploads R2 pequenos e URLs
externas. A spec MVP ainda dizia para usar YouTube/Vimeo acima de 50 MB, mas
cursos, experiencias longas e conteudo premium precisam de videos privados,
progresso, metadata e evolucao para streaming adaptativo sem reescrever o
dominio.

Guardar videos no VPS ou no Strapi acopla API, CMS, backups e trafego de media.
O Strapi deve persistir apenas metadata, chaves e relacoes. Os bytes vivem fora
do CMS.

## Decisao

O PDC passa a tratar video como entidade propria, referenciada por cursos,
posts, experiencias e simulacoes quando aplicavel.

- Provider canonico inicial: Cloudflare R2 por tras de uma abstracao
  compativel com `youtube`, `vimeo`, `loom`, `bunny`, `mux` e `cloudflare`.
- O Strapi guarda metadata (`provider`, `mode`, `visibility`, `status`, chaves
  R2, URLs externas, thumbnail, duracao, tamanho, legendas e capitulos).
- O BFF e a fronteira de autorizacao. Conteudo protegido recebe URL de playback
  curta depois de RBAC, inscricao ou ownership serem validados.
- O upload rapido existente continua limitado a 50 MB e serve posts,
  demonstracoes e pequenos videos.
- Upload profissional e multipart ficam como contrato/arquitetura desta ADR,
  mas so entram com worker de processamento real em uma leva posterior.

## Consequencias

- Campos legados (`url`, `videoUrl`, `mediaUrls`) permanecem para compatibilidade
  e migracao incremental.
- Novos itens de curso em video devem preferir `videoId`.
- YouTube/Vimeo deixam de ser escape obrigatorio para arquivos grandes e passam
  a ser providers externos suportados.
- Nenhum endpoint deve aumentar o limite simples para varios GB; objetos grandes
  exigem multipart, processamento assincorno e estados `processing/ready/failed`.

## Done

- Contratos `Video` em `@pdc/shared`.
- Content-type `video` no Strapi para metadata.
- BFF com criacao, confirmacao e playback assinado.
- Player de curso capaz de renderizar `videoId` protegido ou URL legada.
