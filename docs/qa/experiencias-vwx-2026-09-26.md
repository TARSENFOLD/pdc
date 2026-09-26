# Experiências e VWX — verificação da branch

Branch: `codex/experiencias-vwx-e2e`, baseada em `fab199e` (main).
Escopo: catálogo, criação/edição, revisão/publicação, participação e percurso VWX.
Cursos não foram alterados. ADR-058 regista o contrato e a separação dos tipos.

## Ambiente

- BFF e web locais, Strapi 5, PostgreSQL e Redis reais e isolados.
- Credenciais e conteúdos fictícios de teste; sem escrita na base de produção.
- Flags de submissão e VWX ativadas apenas durante o ciclo E2E, com reposição
  do valor anterior pelo teste através da API administrativa (invalida a cache).
- Upload local usa o mesmo endpoint e validação de ficheiros; não prova R2 em produção.

## Percursos cobertos

- Criar Experiência e VWX, guardar, recarregar e editar pelo documentId.
- Upload de capa, persistência do URL e leitura do ficheiro após recarregar.
- Rascunho invisível publicamente; revisão, aprovação e versão publicada reais.
- Validação privada do parceiro antes de publicar VWX; outbox de publicação.
- Encontrar no catálogo com pesquisa e filtro por tipo; abrir por slug.
- Participar, recarregar e não duplicar participação.
- Guardar e retomar etapas/entregável VWX; outra conta não recebe a entrega.
- Concluir com etapas, entrega e reflexão; conclusão persiste após recarregar.
- Rascunhos legados e permissões existentes do estúdio.
- Capturas desktop e 390 px; teste de ausência de overflow horizontal.

## Reprodução

Com Strapi de teste em `127.0.0.1:1337`, PostgreSQL em `5433` e Redis em `6380`:

```bash
RELEASE_SHA=fab199e STRAPI_URL=http://127.0.0.1:1337 \
STRAPI_API_TOKEN=test-strapi-token PDC_REDIS_URL=redis://127.0.0.1:6380 \
npx playwright test -c playwright.experiencias.config.ts tests/e2e/experiencias \
  --project=chromium --reporter=list
```

## Resultados locais

- 18 testes Playwright/Chromium passaram (8 de preparação/autenticação e 10 dos percursos).
- 71 testes dos contratos API de Experiências/VWX e catálogo passaram.
- 205 testes shared e 9 de validação editorial Strapi passaram.
- Os 7 testes focados da interface passaram, incluindo rascunhos incompletos e
  exclusão de etapas removidas ao guardar progresso. Os dois percursos E2E foram
  repetidos após a revisão: ambos passaram.
- Typecheck de todos os workspaces e build de produção da web passaram.
- Capturas desktop e mobile inspecionadas: conteúdo legível, sem overflow
  horizontal. A capa branca é um PNG sintético usado para testar o upload.
- Suíte web geral: 332 passaram; um teste de vídeo excedeu o tempo de 5 s sob
  execução concorrente. Repetição isolada do ficheiro: os 13 testes passaram.
- CodeRabbit: corrigidos rascunhos incompletos, identidade das avaliações,
  dados legados nullable e etapas de progresso removidas. A sugestão de ocultar
  registos inválidos da listagem não foi adotada: um erro deve continuar explícito,
  não produzir um catálogo aparentemente vazio nem esconder conteúdo ao autor.
- Nova revisão focada do serviço e locks após as correções: zero observações.

## Antes de abrir aos utilizadores

- Rever e integrar a branch; publicar BFF, web e schema Strapi em conjunto.
- Confirmar as flags de acesso e de catálogo pretendidas no ambiente de destino.
- Validar upload/leitura no R2 do ambiente de destino.
- Publicar o conteúdo real de Experiências e registar a evidência real do parceiro VWX.
- Repetir o percurso autenticado no domínio público. Testes locais não são deploy.
