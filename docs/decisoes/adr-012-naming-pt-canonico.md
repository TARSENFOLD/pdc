---
title: "ADR-012 — Naming PT Canónico"
status: active
date: "2026-04-19"
last_validated: "2026-04-20"
context_wave: W2
---

# ADR-012 — Naming PT Canónico

## Contexto

O projecto PDC v2 utiliza uma mistura de termos em Português (PT) e Inglês (EN) no seu código e esquema de dados. Havia uma dúvida sobre se deveríamos normalizar tudo para EN ou manter PT no domínio.

Especificamente para a entidade `tentativa`, o BFF enviava `dataInicio` e `dataFim`, enquanto o esquema original do Strapi utilizava `startedAt` e `finishedAt`. Para a entidade `telemetria`, havia uma inconsistência entre o campo `payload` no BFF e `dados` no Strapi.

## Decisão

Regressamos à raiz do projecto ("PT Canónico") para o modelo de domínio e contratos entre BFF e CMS:

1.  **Entidade Tentativa**: Adicionamos os campos `dataInicio` e `dataFim` ao Strapi para alinhar com o BFF. Mantivemos os campos EN (`startedAt`/`finishedAt`) no esquema para retrocompatibilidade e uso futuro por plugins Strapi, mas o BFF deve utilizar exclusivamente a versão PT.
2.  **Entidade Telemetria**: O campo de dados flexível foi normalizado como `dados` (PT) no Strapi. O BFF (`consumer.ts`) foi ajustado para mapear os eventos recebidos para este campo.
3.  **Endpoints**: Os endpoints da API do BFF devem preferir o Português (ex: `/reputacao` em vez de `/reputation`). Aliases em Inglês podem ser mantidos temporariamente com o header `Deprecation: true`.

## Justificação

*   **Consistência Semântica**: O payload de telemetria e as regras de negócio já utilizam termos em Português. Manter os nomes dos campos alinhados reduz a carga cognitiva e erros de mapeamento.
*   **Velocidade de Desenvolvimento**: Evita refactores massivos no frontend e BFF que já esperam os termos em PT.
*   **Abordagem Conservadora**: Estender o esquema do Strapi com campos PT (D22) é mais seguro do que renomear campos existentes em bases de dados em produção.

## Consequências

*   O esquema do Strapi fica ligeiramente mais populado (duplicação de campos de data).
*   Maior facilidade de leitura para desenvolvedores que falam Português, alinhando com a missão local do projecto.
