# ADR — Contratos das interações do Feed

**Data:** 2026-06-07  
**Caixa:** C — UI e BFF expunham contratos divergentes.

## Decisão

- O BFF é a fonte canónica para vínculos, comentários, notificações e media.
- Pedidos de vínculo usam `POST /vinculos/:perfilId/pedir`; resolução usa `PATCH /vinculos/:id/resolver`.
- Sugestões excluem o próprio perfil e vínculos pendentes ou aprovados.
- Comentários e posts normais são publicados diretamente, preservando os eventos do ecossistema.
- Media de posts usa o pipeline validado `POST /media/upload` com `entityType=post-media`.
- O feed lê `avatarUrl` persistido em R2 quando não existe media Strapi em `foto`.
- A partilha interna reutiliza conversas entre vínculos aprovados; não cria cópias ou “reposts” sem contrato.
- O mini feed do perfil combina posts aprovados do autor e conquistas; posts ocultos ou pendentes nunca são expostos.

## Consequências

- Clientes antigos deixam de inventar endpoints paralelos.
- Falhas dos hooks continuam observáveis em logs e outbox.
- Imagens e vídeos permanecem limitados pelos contratos e validação de magic bytes existentes.

## Correção de identidade observada na auditoria

- O access token transporta `perfilId`; rotas não precisam inferir ou inventar identidade.
- A expiração do access token não elimina um refresh token ainda válido.
- Telemetria nunca é assinada com perfil desconhecido.
- Entidades Strapi v5 são localizadas pelo ID público ou `documentId`, mas mutações usam sempre
  o `documentId` persistido quando disponível.
- A leitura de notificações valida o `userId` proprietário antes da mutação, impedindo acesso
  horizontal por IDs previsíveis.
- `avatarUrl` e `bannerUrl` apontando para R2 são a identidade visual canónica; relações
  `foto` e `capa` do Strapi permanecem somente como fallback de migração.
- O formato externo do DeepChat (`role=ai`, `text`) é normalizado em `@pdc/shared` para o
  contrato canónico da Tina (`role=assistant`, `content`) antes de chegar ao BFF.
- IDs numéricos devolvidos pelo Strapi são normalizados para string antes de entrarem no JWT,
  garantindo que refresh, middleware e bootstrap validam a mesma identidade.
- O contexto vocacional da Tina consulta `areasInteresse`, conforme o schema Strapi atual;
  o campo legado singular `areaInteresse` não é enviado ao CMS.
- A instituição recebe navegação operacional completa para cursos, simulações, experiências,
  programas, estudantes, propostas, relatórios e branding, reutilizando builders e RBAC já
  partilhados com mentores.
- A navegação institucional usa nomes literais do domínio (`Cursos`, `Simulações`,
  `Experiências` e `Programas`); metáforas como “vitrinas”, “roteiros” e “laboratórios” não
  substituem os tipos de conteúdo canónicos na interface operacional.
- Experiências pertencem ao perfil criador pela relação Strapi `autor`; consultas e ownership
  usam `autor.userId`. O campo inexistente `instituicaoId` não integra o contrato persistido.
- Consultas de experiências e simulações só pedem relações existentes no schema Strapi; media
  inexistente não pode derrubar a área de gestão.
