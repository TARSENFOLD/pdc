# G13 — Mensagens E2E (Realtime · Push Native · Search Global Cmd+K)

## Status

Draft · Depende de `spec:G15`, `spec:G14`, `spec:D2-T5`.

## Estado actual auditado

- ✅ UI: file:apps/web/src/features/mensagens/MensagensPage.tsx, `ConversaPage.tsx`.
- ✅ Strapi: file:infra/strapi/src/api/mensagem/.../schema.json.
- ✅ Rota BFF: file:apps/api/src/routes/mensagens.ts.
- ✅ Realtime: socketService emite `nova_mensagem` (file:apps/api/src/modules/realtime/socket.service.ts linha 84-87).
- ✅ Inline socket handler: `mensagem:enviar` em `socket.service.ts` linhas 49-69.
- ❌ Eventos `mensagem.enviada`, `mensagem.lida`, `conversa.iniciada` não no event bus (passam direto pelo socket).
- ❌ Typing indicators.
- ❌ Unread counter persistente cross-device.
- ❌ Push native quando inactivo.
- ❌ Search global Cmd+K (spec:IMPORTANTE/02 F8).

## Estado canónico

- Mensagens via Socket.IO room por conversation.
- Push native (APNs/FCM) quando utilizador inactivo.
- Inline moderation flag.
- Search global Cmd+K integra mensagens.

## Tickets

### G13-T1 — Refactor mensagem flow para ir via Event Bus

- `mensagens.ts` POST emite `mensagem.enviada` → G15 → Notify hook trata fanout (socket + push native + email se inactivo > 24h).
- Remover lógica de socket directo do `socket.service.ts` linhas 49-69 (substituir por emissão de evento).
- **DoD E2E**:
  - **BFF**: cleaner separation of concerns.
  - **Impacto**: G15 hooks consistente; push native funciona out-of-the-box.

### G13-T2 — Typing indicators

- Cliente emite via socket `typing:start` / `typing:stop` para conversation room.
- Outros clientes vêem indicador "X está a escrever..." Soul & Elite.
- TTL 5s (auto-stop se sem `typing:start` recente).
- **DoD E2E**:
  - **UI**: indicador subtil mobile-first.
  - **BFF**: socket events.
  - **Impacto**: experiência conversacional moderna.

### G13-T3 — Unread counter cross-device

- Strapi `conversa-participante` collection (criar) com `unreadCount` por (conversaId, perfilId).
- Lifecycle: increment ao receber mensagem, reset ao abrir conversa.
- Realtime: socket emit `conversation:unread_updated`.
- Aparece como badge no avatar de cada conversa + counter global no menu.
- **DoD E2E**:
  - **UI**: badge Soul & Elite com counter.
  - **Persistência**: `conversa-participante`.
  - **Impacto**: utilizador abre app no telemóvel e vê o mesmo unread count que no desktop.

### G13-T4 — Search global Cmd+K

- Componente `CommandPalette` Soul & Elite (Linear/Raycast-style) accessível via Cmd+K (desktop) ou ícone search (mobile).
- Search across: conversations, mensagens, perfis, cursos, simulações, projetos, programas.
- Highlight matches.
- Recent searches em localStorage.
- **DoD E2E**:
  - **UI**: GlassCard overlay com input grande mobile-first.
  - **Contrato**: `SearchQuery { q, types[] }`.
  - **BFF**: `GET /search?q=...&types=...` com fuzzy match.
  - **Persistência**: lê de Strapi com índices.
  - **Impacto**: utilizador encontra qualquer entidade em <2s.

### G13-T5 — Inline moderation flag

- Botão "Reportar" em cada mensagem.
- Auto-flag se conteúdo contém keywords ou patterns suspeitos.
- Mensagens reportadas vão para fila moderador.
- **DoD E2E**:
  - **UI**: dropdown action por mensagem.
  - **BFF**: `POST /mensagens/:id/reportar`.
  - **Persistência**: `denuncia` collection.
  - **Impacto**: emite `denuncia.criada` → moderador.

## Eventos canónicos

- **Emite**: `mensagem.enviada`, `mensagem.lida`, `conversa.iniciada`, `denuncia.criada`.
- **Hooks G15**: Notify (multi-canal), Achievement (`primeira-mensagem`).

</TRAYCER_SPEC>