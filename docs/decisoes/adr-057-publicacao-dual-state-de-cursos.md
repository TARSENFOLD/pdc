# ADR-057 — Publicação dual-state de cursos

**Estado:** Aceite

**Data:** 2026-09-07

## Contexto

O fluxo editorial soberano define `draft → review → approved → published`, enquanto
o controlo de acesso D-02 só expõe conteúdo quando coexistem duas condições:

1. existe uma versão Strapi com `status=published`;
2. essa versão imutável mantém `estado=approved`.

Alterar apenas o campo `estado` para `published` no draft não cria uma versão
publicada no Strapi. Publicar uma versão com `estado=published`, por sua vez, não é
aceite pelo filtro público D-02, que exige `approved`.

## Decisão

Ao publicar um curso aprovado, o BFF executa nesta ordem:

1. atualiza explicitamente `status=draft` para `estado=published`, preservando o estado visível
   do workflow para o criador;
2. publica no Strapi um snapshot com `status=published` e `estado=approved`;
3. se a publicação do snapshot falhar, repõe o estado anterior do draft antes de devolver o erro;
4. emite `CURSO_PUBLICADO` pelo outbox somente após as duas escritas.

O catálogo e o consumo continuam a ler exclusivamente o snapshot publicado e
aprovado. O dashboard do criador continua a ler o draft corrente e apresenta o
estado `published`.

## Consequências

- Um `200` na transição de publicação implica que o curso está materializado na
  versão pública do Strapi e não apenas marcado no draft.
- Edições posteriores ficam isoladas no draft e não alteram silenciosamente o
  snapshot consumido pelos estudantes.
- A remoção deste mecanismo depende da conclusão da migração D-02 para uma única
  máquina de estados de publicação.
- Toda criação e edição anterior à publicação usa `status=draft`
  explicitamente, porque a REST API do Strapi 5 publica por omissão.
- Se a compensação também falhar, a operação devolve um erro explícito de
  reconciliação, regista as duas causas e não emite `CURSO_PUBLICADO`.

## Verificação

- Teste unitário do cliente Strapi confirma `status=published` na URL.
- Teste de contrato da rota confirma o snapshot `approved`, o draft `published` e
  a emissão do evento `CURSO_PUBLICADO`.
- O teste integrado deve comprovar: criar → publicar → obter publicamente →
  inscrever → consumir → concluir.
