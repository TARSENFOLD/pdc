# G9 — Vínculo Bilateral E2E (Conexão Formal · 3 Tipos · Visibilidade Pública)

## Status

Draft · Depende de `spec:G15`, `spec:G14` (notifications fanout).

## Estado actual auditado

- ✅ UI: file:apps/web/src/features/vinculos/VinculosPage.tsx, `ConectarButton.tsx`.
- ✅ Strapi: file:infra/strapi/src/api/vinculo/.../schema.json.
- ✅ Rota BFF: file:apps/api/src/routes/vinculos.ts — usa `socketService.emitirNotificacao` directamente (drift G15: deveria ir via event bus).
- ✅ Reputação: `persistirReputacao` chamada após approve (linha 126-127).
- ❌ Eventos `vinculo.solicitado`, `vinculo.aprovado`, `vinculo.rejeitado`, `vinculo.terminado` não emitidos.
- ❌ Mensagem opcional + upload doc opcional no pedido.
- ❌ Filtro de visibilidade pública (`visibleOnProfile`).

## Estado canónico (spec:IMPORTANTE/03 §5)

- 3 tipos: Estudante↔Mentor (mentorado), Estudante↔Instituição (aluno/candidato), Mentor↔Instituição (colaboração).
- Estados: `pendente`, `aprovado`, `recusado`, `concluido`.
- Apenas vínculos `aprovado + visibleOnProfile=true` aparecem no perfil público.

## Tickets

### G9-T1 — Refactor `vinculos.ts` para usar Event Bus

- Substituir chamadas directas `socketService.emitirNotificacao` por `eventBus.publishWithOutbox(VINCULO_SOLICITADO, ...)` etc.
- Remover `void persistirReputacao(...)` — passa a ser feito pelo Ranking hook (G15).
- **DoD E2E**:
  - **BFF**: routes emitem eventos canónicos.
  - **Impacto**: G15 hooks correm consistentemente; Notify hook trata fanout multi-canal (não só socket).

### G9-T2 — Adicionar mensagem + upload doc opcional ao pedido

- `POST /vinculos/:id/pedir`: aceita `{ mensagem?, documentoUrl? }` (doc upload via `spec:G8`).
- UI: modal Soul & Elite com textarea + upload widget.
- Destinatário vê mensagem e doc na decisão.
- **DoD E2E**:
  - **UI**: modal mobile-first.
  - **Contrato**: `PedidoVinculoPayload` actualizado.
  - **BFF**: persiste em `vinculo.metadata.mensagem` + `vinculo.metadata.documentoUrl`.
  - **Persistência**: campos JSON.
  - **Impacto**: pedido é mais qualitativo; mentor decide com contexto.

### G9-T3 — Toggle visibilidade pública

- Após vínculo aprovado, ambos os perfis recebem prompt: "Mostrar este vínculo no teu perfil público?".
- Default `false` (privacidade primeiro).
- Toggle posterior em `/configuracoes/vinculos`.
- Backend serializer (`perfil.serializer.ts`) filtra `visibleOnProfile=true` only.
- **DoD E2E**:
  - **UI**: prompt Soul & Elite + página settings.
  - **Contrato**: `VisibilityVinculoPayload`.
  - **BFF**: serializer respeita.
  - **Persistência**: `vinculo.visibleOnProfile` boolean.
  - **Impacto**: respeita privacidade canónica spec:IMPORTANTE/03 §6.

### G9-T4 — Vínculo concluído (terminação manual)

- Botão "Terminar vínculo" em `VinculosPage.tsx` para casos onde já não faz sentido.
- Confirma via modal.
- Estado `concluido`. Não destrói registo (audit).
- **DoD E2E**:
  - **UI**: ação destrutiva com confirmação dupla.
  - **BFF**: `PATCH /vinculos/:id/terminar`.
  - **Persistência**: `vinculo.dataTerminacao` + estado.
  - **Impacto**: emite `vinculo.terminado` → G15 Notify ambos os perfis.

## Eventos canónicos

- **Emite**: `vinculo.solicitado`, `vinculo.aprovado`, `vinculo.rejeitado`, `vinculo.terminado`.
- **Hooks G15**: Ranking (ambos perfis) · Feed (não, é privado) · Match (boost de afinidade futura) · Achievement (`rede-em-crescimento` aos 5 vínculos) · Notify (ambos perfis).