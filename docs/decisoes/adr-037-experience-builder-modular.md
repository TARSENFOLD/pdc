# ADR-037 — Experience Builder modular

**Status:** Aceite  
**Data:** 2026-06-07  
**Caixa:** C

## Contexto

A Experiência era persistida em três objetos JSON fixos. Isso preservava os
painéis canónicos, mas impedia instituições com jornadas diferentes de compor
uma narrativa adequada e confundia a edição com um formulário único.

## Decisão

Adicionar `secoes` como JSON estruturado e validado por `@pdc/shared`. Cada
seção possui tipo, ordem, visibilidade e itens multimédia. Esta estrutura é
editorial e não reutiliza os módulos pedagógicos de Curso.

Os campos `painelRealidade`, `muralVozes` e `guiaInstitucional` permanecem
durante a migração. A submissão para revisão exige boas-vindas, realidade,
percurso, depoimentos, infraestrutura e próximos passos.

## Consequências

- Instituições podem criar jornadas para universidades, escolas técnicas e
  empresas sem estrutura fixa por anos.
- Drafts passam a ser carregados por endpoint autenticado do autor.
- Uploads precisam apresentar sucesso, erro, preview e remoção no próprio
  builder.
- O consumo apresenta as seções em sequência focada, sem a navegação global.
