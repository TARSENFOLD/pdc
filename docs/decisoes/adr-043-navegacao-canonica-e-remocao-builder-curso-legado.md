# ADR-043: Navegação canónica e remoção do builder de Curso legado

- Estado: aceite
- Data: 2026-06-14
- Caixa: C

## Contexto

O frontend mantinha duas rotas de edição de Simulação com a mesma função,
destinos inválidos no `CommandPalette`, dois componentes exportados como
`FeedCard` e um builder de Curso sem consumidores. O fluxo canónico de Curso
é o `SovereignCourseBuilder`, usado pelas rotas de Mentor e Instituição.

Documentação histórica ainda menciona o antigo CriarCursoPage,
mas as rotas e os testes atuais já usam o builder soberano. Manter ambos
permitiria divergência de contratos e experiência.

## Decisão

1. A rota de edição canónica de Simulação para Mentor é
   `/app/mentor/simulacoes/:id/editar`.
2. A rota legada `/app/mentor/simulacoes/editar/:id` permanece apenas como
   redirect com `replace`, preservando deep links existentes.
3. O cartão de conteúdo editorial passa a chamar-se `FeedContentCard`.
   `features/feed/components/FeedCard.tsx` permanece como cartão social.
4. `CriarCursoPage`, `CursoFormStep1`, `CursoFormStep2` e
   `CursoFormSidebar` são removidos após confirmação de zero importadores.
5. O `CommandPalette` usa exclusivamente rotas declaradas no router.
   A invariância é coberta por `command-palette-routes.spec.ts`, que valida
   os destinos explícitos e os aliases que já causaram `NotFound`.

## Consequências

- Existe uma única implementação de criação e edição de Curso.
- Links antigos de edição de Simulação continuam funcionais.
- Imports de cartões do feed deixam de depender de resolução ambígua.
- Referências históricas ao builder removido devem ser interpretadas como
  registo de dívida já resolvida, não como orientação de implementação.
