# ADR-036 — Contratos BFF/Strapi nos fluxos de conteúdo

**Status:** Aceite  
**Data:** 2026-06-07  
**Caixa:** C

## Contexto

Os fluxos de criação e edição consultavam atributos que não existem nos schemas
canónicos do Strapi: `curso.capa` e `notificacao.userId`. O Strapi rejeitava as
queries com 400; o BFF convertia a falha em 502 e o navegador apresentava o
sintoma secundário como erro de CORS.

O cliente de media também usava `/api` como fallback de produção, embora o BFF
canónico esteja em `https://api.usepdc.com`.

## Decisão

- Popular apenas relações existentes no schema de curso (`autor`).
- Resolver notificações através de `perfil.userId`.
- Usar `https://api.usepdc.com` como fallback explícito de produção nos dois
  clientes de upload.
- Manter `autorId` no curso enquanto ele continuar definido no schema Strapi;
  a relação `autor` permanece a referência institucional.

## Consequências

Listagem, carregamento para edição, atualização e upload passam a atravessar o
BFF sem queries inválidas. Mudanças futuras de atributos Strapi devem atualizar
schema, contrato partilhado, BFF e testes na mesma alteração.
