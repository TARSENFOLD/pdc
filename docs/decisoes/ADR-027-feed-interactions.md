# ADR 027: Implementação de Interações no Feed e Rota de Detalhes (Caixa C)

## Contexto
O layout de Feed (Wave 1) exigia que os cartões de publicações contivessem funcionalidades completas e reais ("Soul & Elite"), banindo mocks e stubs. Foram detetadas as seguintes lacunas ("Divergência Crítica" - Caixa C):
1. **Comentários**: Não existia uma Rota/Página de detalhe de Publicação (`FeedPostDetailPage`) para hospedar o formulário e a lista de comentários.
2. **Interações e RBAC**: O cartão de perfil do Feed assumia o "Estudante" e não consumia dados reais de Vínculos. As ações de Like e Share não estavam conectadas.

## Decisão
1. **Rota de Detalhes (`/app/feed-posts/:id`)**: Criar a página dedicada para consumir a leitura detalhada de um post e listar/criar comentários através da `commentsApi` exportada em `interactions.ts`.
2. **Componente `FeedCard` Autocontido**: Extrair a lógica do card do `FeedPage.tsx` para `FeedCard.tsx`, garantindo que este possua gestão de estado local optimista para `likes` (via `likeApi.toggle`) e `bookmarks` (`bookmarkApi.toggle`).
3. **Navegação de Rede**: Todos os nomes e avatares dentro do feed passarão a encaminhar o utilizador (via `Link`) para a rota `/app/rede/:userId`, ativando a integração profunda.
4. **Resolução Dinâmica do Cartão de Perfil**: O `ProfileSummaryCard` avaliará `user.role`. Estudantes apresentarão as Conquistas (`user.conquistas.length`), e todos consumirão o `vinculosApi.getMeus().pagination.total`.

## Consequências
- **Positivas**: Alinhamento estrito com a Lei das 5 Camadas (E2E), removendo strings estáticas e stubs ("Caixa D"). A interface fica responsiva, conectada ao BFF, e cumpre a diretiva "Mobile-First" (Share utiliza o standard de Partilha do SO se disponível).
- **Negativas**: Aumento pontual da complexidade da página de Feed com estado local por `FeedCard`. Requer carregamento assíncrono do novo route chunk (`FeedPostDetailPage`).

**Data:** 2026-05-13
**Autor:** Agente IA (Arquiteto de Slice)
**Status:** Aceite (Integridade PDC v2)
