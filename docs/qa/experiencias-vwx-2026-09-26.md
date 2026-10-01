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

### Atualização de robustez — 2026-10-01

- Suítes completas: API 1085/1085, shared 205/205, web 338/338.
- Lifecycle Strapi: 10/10, incluindo arquivo de publicação com rascunho incompleto.
- E2E Chromium: 18/18; repetição dos dois ciclos reais com mentor criador e
  administrador revisor separado: 2/2, incluindo rejeição, nova submissão,
  publicação, edição, arquivo e percurso VWX completo.
- Typecheck, lint dos workspaces e build web passaram.
- Recuperação de participação e conclusão usa identidade de evento estável e
  confirmação de persistência no outbox. Reabrir/repetir recupera uma gravação
  cujo evento falhou; falha ao libertar o lock não transforma sucesso em erro.
- Arquivo considera a versão pública mesmo depois de editar o rascunho;
  paginação das criações, erros explícitos, pesquisa com debounce, avaliações
  acessíveis e telemetria curricular foram cobertos/corrigidos.
- Navegação de mentores/admin, fila editorial, motivo de devolução e leitura
  pelo criador confirmados numa nova execução completa: 18/18. Capturas de
  Experiência/VWX a 390 px inspecionadas, sem overflow horizontal.
- Regressões finais: 25 testes API, 20 UI de navegação/editorial e 3 contratos
  da fila passaram. Quatro observações adicionais do CodeRabbit foram tratadas:
  preview para revisores, contrato validado da fila, sincronização do teste e
  limpeza do motivo anterior quando uma nova rejeição não fornece motivo.
- Guia autónomo: `docs/guia-utilizador/experiencias-vwx.md`.
  Conteúdo real continua fora do escopo; não houve escrita na base de produção.

### Primeira passagem — 2026-09-26

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

### Correção aprovada em 2026-10-01 — validação de rascunhos legados

- Caixa A: o BFF passa a aplicar as regras legadas já preservadas pelo Strapi
  e pelos ADR-037/058 quando a Experiência institucional não tem secções.
- Mantém título, descrição, painel de realidade, pelo menos três depoimentos
  e guia institucional obrigatórios; VWX continua a exigir as sete etapas.
- Texto, media, ficheiro e URL de CTA em branco não contam como conteúdo.
- Regressão reproduzida antes da correção: 8 dos 20 novos testes falhavam.
  Depois: 20/20 novos testes, 89/89 testes API selecionados e 9/9 testes Strapi
  passaram; lint e typecheck da API passaram. Não foi repetido o E2E de navegador
  nesta correção. Sem escrita em produção.
- O fundador esclareceu que não existe conteúdo real a importar nesta fase:
  o objetivo de entrega é a robustez e autonomia do fluxo para futuros criadores.

### Gates de publicação do sistema

- Rever e integrar a branch; publicar BFF, web e schema Strapi em conjunto.
- Confirmar as flags de acesso e de catálogo pretendidas no ambiente de destino.
- Validar upload/leitura no R2 do ambiente de destino.
- Repetir o percurso autenticado no domínio público. Testes locais não são deploy.
- Conteúdos reais serão adicionados depois; cada VWX continua a exigir evidência
  real de aprovação do parceiro antes da publicação do respetivo conteúdo.
