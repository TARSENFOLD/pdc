# Guia Técnico: Como Contribuir

Obrigado pelo teu interesse em contribuir para o projeto PDC v2! Valorizamos todas as contribuições.

## Regras Gerais

-   **Zero `any`:** Todo o código deve ser estritamente tipado com TypeScript. Não são permitidas utilizações de `any`.
-   **Imports `.js` no BFF:** No backend (apps/api), os imports de módulos devem usar a extensão `.js` para garantir compatibilidade com o runtime Node.js após a compilação TypeScript.
-   **Tamanho Máximo de Ficheiro:** Nenhum ficheiro de código no BFF (`apps/api`) deve exceder as 200 linhas de código. Se um ficheiro ficar muito grande, refatora-o em módulos menores.
-   **Zero Mocks:** Não são permitidos ficheiros mock ou dados falsos. Em vez disso, usa erros explícitos ou dados reais quando necessário.
-   **Convencional Commits:** Todas as mensagens de commit devem seguir a especificação Conventional Commits (e.g., `feat: add user profile endpoint`, `fix: correct calculation bug`). Isto ajuda na geração automática de changelogs e na organização do histórico.
-   **ESLint e Prettier:** O código deve estar formatado corretamente e passar nas verificações do ESLint. Executa `npm run lint:fix` ou `npm run format` antes de submeteres as alterações.

## Fluxo de Trabalho de Contribuição

1.  **Fork do Repositório:** Cria um fork do repositório `pdc-v2`.
2.  **Clonar:** Clona o teu fork para a tua máquina local.
3.  **Criar Branch:** Cria uma nova branch para a tua feature ou fix (e.g., `feat/add-new-dashboard`, `fix/login-error`).
4.  **Desenvolvimento:** Implementa as tuas alterações, seguindo as regras gerais.
5.  **Testar:** Executa os testes (se existirem) para garantir que as tuas alterações não introduzem regressões.
6.  **Formatar e Lintar:** Executa `npm run lint:fix` e `npm run format` para garantir a conformidade com os padrões de código.
7.  **Commit:** Submete as tuas alterações usando mensagens de commit no formato Conventional Commits.
8.  **Push:** Envia a tua branch para o teu fork.
9.  **Pull Request (PR):** Abre um Pull Request do teu fork para a branch principal do repositório original.

## Revisão de Código

As contribuições serão revistas por membros da equipa. Fornece uma descrição clara do teu PR, explicando o "porquê" da mudança e como testá-la.

## Requisitos Específicos

-   **Monorepo:** O projeto utiliza npm workspaces. As instalações de dependências devem ser feitas na raiz ou nos subdiretórios (`apps/web`, `apps/api`, `packages/shared`).
-   **TypeScript:** Utiliza a versão mais recente do TypeScript suportada pelo projeto.
