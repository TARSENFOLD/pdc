# ADR-038 — Relações e áreas canónicas de Programa

**Data:** 2026-06-13
**Estado:** Aceite
**Caixa:** C — contrato partilhado e persistência Strapi divergentes

## Contexto

O contrato de Programa expõe `cursosIds`, `experienciasIds`, `simulacoesIds` e
`projetosIds`, enquanto o Strapi persiste relações com os nomes sem o sufixo
`Ids`. A rota enviava os campos de transporte diretamente ao CMS e não derivava
os IDs na leitura. O enum `programa.area` no Strapi também mantinha dez valores
legados, contra as quinze áreas canónicas de `@pdc/shared`.

## Decisão

1. O BFF é a fronteira de tradução:
   - escrita: remove os campos `*Ids` e envia os IDs nas relações homónimas;
   - leitura: preserva os objetos populados e deriva os quatro arrays `*Ids`.
2. Listas vazias são enviadas ao Strapi para permitir remover relações na edição.
3. `programa.area` passa a aceitar exatamente as quinze áreas de
   `AreaVocacionalSchema`.
4. A evolução do enum é aditiva no contrato e não executa `UPDATE` de dados.
   Valores legados (`AGRONOMIA`, `OUTRO`) continuam bloqueados pelo BFF. Qualquer
   saneamento de linhas históricas exige ticket e auditoria próprios.
5. `recursos` e `precoPolicy` continuam armazenados como JSON Strapi, mas recebem
   schemas estruturados no contrato partilhado.
6. A participação usa o content type dedicado `inscricao-programa`, com relação
   obrigatória a `perfil` e `programa`, conclusão idempotente e índice único
   composto `(perfil, programa)`. O BFF traduz conflitos de unicidade em HTTP 409.

## Consequências

- Criação, edição e leitura usam uma representação estável para a UI.
- O hub mantém os objetos relacionados necessários para consumo.
- Deploys devem validar previamente que não existem linhas legadas incompatíveis;
  esta decisão não as altera nem as mascara.
