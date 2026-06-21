# ADR-042 — Feed Entry com conteúdo e resolução de identidade no Strapi v5

## Estado

Aceite — 2026-06-14.

## Contexto

O hook de Feed publica `titulo` e `corpo`, mas o content-type `feed-entry` não
declarava esses atributos. O Strapi rejeitava a escrita com HTTP 400.

O hook de Match também recebia `autorId` como ID relacional numérico e tentava
usá-lo diretamente em `/perfis/:id`. No Strapi v5, essa rota espera
`documentId`, produzindo HTTP 404.

## Decisão

1. Evoluir `feed-entry` de forma aditiva com os campos opcionais `titulo`
   (string) e `corpo` (text).
2. Resolver perfis recebidos por ID relacional através de
   `GET /perfis?filters[id][$eq]=...`.
3. Manter `entityId`, `autorId` e IDs de eventos serializados como strings nas
   fronteiras do domínio.

## Consequências

- Eventos novos passam pelas camadas Feed e Match sem erro de contrato.
- Entradas antigas continuam válidas porque os novos campos são opcionais.
- Não há migração destrutiva nem alteração da autoridade editorial.
