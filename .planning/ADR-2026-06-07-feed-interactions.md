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
