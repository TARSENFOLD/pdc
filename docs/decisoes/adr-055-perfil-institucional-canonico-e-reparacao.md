# ADR-055: Perfil institucional canónico e reparação de associação

- Estado: aceite
- Data: 2026-09-02
- Caixa: A
- Relação: COR-0202

## Contexto

O frontend mantinha `BrandingPage.tsx` em paralelo com o editor institucional
por secções. A rota legada, o dashboard, o menu do utilizador e a command
palette podiam levar a destinos diferentes. As duas implementações também
usavam query keys distintas, impedindo atualização coerente do perfil.

Contas institucionais legadas podem ainda possuir um `perfil` sem a relação
`instituicaoGerida`. Nesse estado, a UI apresentava apenas uma mensagem
genérica e a administração não dispunha de uma reparação explícita, embora o
provisionamento canónico já fosse idempotente.

## Decisão

1. `/app/instituicao/perfil/identidade` é o destino canónico para identidade e
   branding institucional.
2. `/app/instituicao/branding` permanece como redirect com `replace`, para
   preservar links existentes.
3. `BrandingPage.tsx` é removida; o editor institucional por secções torna-se a
   única implementação de escrita.
4. Todas as leituras e atualizações do perfil institucional usam
   `institutionKeys.me()`.
5. Contas institucionais não usam o perfil pessoal nem o seu editor.
6. A ausência de `perfil.instituicaoGerida` devolve um erro semântico e uma
   ação de recuperação, em vez de “instituição não encontrada”.
7. Apenas Super Admin pode executar a reparação. A operação valida a role da
   conta alvo, reutiliza o provisionamento idempotente protegido por lease Redis
   único e renovável por utilizador e escreve audit trail. Renovação e release
   verificam atomicamente a posse do lock. O slug determinístico por gestor,
   protegido pelo índice único do Strapi, garante que workers concorrentes ou
   expirados convergem para a mesma instituição. Uma associação interrompida é
   recuperada no retry sem apagar esse registo canónico; essa recuperação
   depende da classificação do erro de unicidade devolvido pelo Strapi, pelo
   que uma alteração desse contrato de erro é incompatível. A API só confirma
   sucesso depois da persistência do registo de auditoria.
8. A reparação cria uma instituição em estado `draft`; não aprova a instituição
   nem ativa automaticamente qualquer feature flag.

## Consequências

- Todos os pontos de entrada institucionais convergem no mesmo editor.
- Alterações deixam de competir entre caches de nomes diferentes.
- Uma associação legada quebrada pode ser diagnosticada e reparada sem acesso
  direto à base de dados.
- O fluxo permanece fail-closed: criação de conteúdo exige verificação e
  rollout institucional explícito depois da reparação.

## Validação

- Testes cobrem redirect legado, navegação por role e bloqueio do editor
  pessoal para instituições.
- Testes do BFF cobrem erro semântico, RBAC, alvo não institucional e execução
  idempotente da reparação.
- Lint, typecheck, testes de shared/API/Web e E2E institucional devem passar
  antes do merge.
