# ADR-034 — Contrato de Paginação do BFF

Data: 2026-05-13

## Status

Aceite

## Contexto

O Strapi devolve listas no formato `{ data, meta: { pagination } }`. O web client do PDC v2 consome os endpoints do BFF como contrato público e já tipa as listas principais como `{ data, pagination }`.

A divergência causou falhas de runtime como `data.pagination is undefined` em páginas de catálogo e administração. Corrigir isto no cliente HTTP genérico mascararia contratos quebrados e acoplaria o transporte web a detalhes internos do Strapi.

## Decisão

O contrato público dos endpoints paginados do BFF é:

```ts
{
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
}
```

O formato `{ meta: { pagination } }` permanece interno às integrações com Strapi. Endpoints do BFF que expõem listas paginadas devem converter explicitamente a resposta Strapi antes de responder ao web client.

## Consequências

- `apps/web/src/lib/api/http.ts` permanece transporte puro e não normaliza payloads de domínio.
- Novos endpoints paginados devem usar um adaptador tipado no BFF.
- A UI pode continuar a consumir `pagination` na raiz sem conhecer a estrutura Strapi.
