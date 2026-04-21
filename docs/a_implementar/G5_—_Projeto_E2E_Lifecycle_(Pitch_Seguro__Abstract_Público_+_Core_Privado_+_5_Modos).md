# G5 — Projeto E2E Lifecycle (Pitch Seguro: Abstract Público + Core Privado + 5 Modos)

## Status

Draft · Depende de `spec:G15`, `spec:E1`, `spec:E3-T2` (split abstract/core).

## Estado actual auditado

- ✅ UI: file:apps/web/src/features/projetos/ProjetoFormPage.tsx, `ProjetoListPage.tsx`, `ProjetoDetailPage.tsx`, `PerfilShowcase.tsx`.
- ✅ Strapi: file:infra/strapi/src/api/projeto/.../schema.json (sem split — refactor em `spec:E3-T2`), `voto-projeto`.
- 🟡 Rota BFF: file:apps/api/src/routes/projetos.ts — só GET + DELETE. **POST/PUT ausentes** (✅ ProjetoFormPage existe mas chama qual endpoint?).
- ❌ Eventos: nenhum emitido.
- ❌ ACL para `core` privado.
- ❌ Sistema de pedidos de acesso (mentores/patrocinadores solicitam ver Core).
- ❌ Selo "Aptidão Validada" automatizado.
- ❌ 5 modos enum.

## Estado canónico (spec:IMPORTANTE/04 §3.5)

- Estudantes, Mentores E Instituições podem criar.
- 2 camadas: Pitch Público (abstract) + Core Privado (encriptado, ACL).
- 5 modos: Exposição · Colaboração · Mentoria · Financiamento · FeedbackComunitário.
- Selo "Aptidão Validada" gerado automaticamente quando ligado a Programa onde aluno passou.
- Sempre gratuito.

## Tickets

### G5-T1 — POST/PUT routes para Projetos (criação real)

- Estender file:apps/api/src/routes/projetos.ts:
  - `POST /projetos`: aceita `CriarProjetoPayload` com `abstract` + `core?` + `modos[]`.
  - `PUT /projetos/:id`: edição parcial respeitando ACL.
- `core` é **encriptado at-rest** (libsodium ou KMS) com chave por projeto persisted em `projeto-keys` collection.
- Auto-aprove se autor tem 7+ dias de conta; senão `estado: 'review'`.
- **DoD E2E**:
  - **UI**: `ProjetoFormPage.tsx` (refactor) com 2 abas (Pitch Público | Core Privado) + checkbox modos.
  - **Contrato**: `CriarProjetoPayload` em `@pdc/shared/projetos.ts`.
  - **BFF**: routes + lógica de encriptação.
  - **Persistência**: schema novo (per `spec:E3-T2`).
  - **Impacto**: emite `projeto.publicado` → G15 hooks.

### G5-T2 — Sistema de pedidos de acesso ao Core

- Modal "Pedir acesso ao Core" no `ProjetoDetailPage.tsx` para mentores e patrocinadores (futuro).
- POST `/projetos/:id/pedidos-acesso` cria `projeto-acesso-pedido { perfilSolicitante, motivo, status: 'pendente', dataResposta? }`.
- Notifica autor (Notify hook).
- Autor aprova/rejeita via dashboard `/dashboard/projetos/:id/pedidos`.
- Aprovação gera ACL temporal: solicitante pode ver `core` por 30 dias.
- **DoD E2E**:
  - **UI**: modal Soul & Elite + dashboard de pedidos para autor.
  - **Contrato**: `PedidoAcessoCore` schema.
  - **BFF**: rota POST + endpoint para autor responder; serializer respeita ACL.
  - **Persistência**: `projeto-acesso-pedido` collection nova.
  - **Impacto**: emite `projeto.acesso_solicitado` / `projeto.acesso_concedido` / `projeto.acesso_recusado` → G15 hooks → Notify.

### G5-T3 — Hub de Colaboração (Modo Colaboração)

- Se modo Colaboração activo: dashboard `/dashboard/projetos/:id/colaboracao` com:
  - Chat partilhado (Socket.IO room `projeto:{id}:colab`).
  - Lista de colaboradores aceites + pedidos pendentes.
  - Link para repositório externo (`repositorioUrl`).
- Pedido para entrar como colaborador via `POST /projetos/:id/colaboradores/pedir`.
- **DoD E2E**:
  - **UI**: Bento layout + GlassCard para chat.
  - **Contrato**: `PedidoColaboracao` schema.
  - **BFF**: socket room por projeto; persistência de mensagens.
  - **Persistência**: `projeto-colaboracao-msg` collection.
  - **Impacto**: emite `projeto.colaborador_aceite` → G15 → Match Hook recomenda projeto a perfis afins.

### G5-T4 — Selo "Aptidão Validada" automático

- Lifecycle hook em `projeto`: se `relatedPrograma` aponta para Programa onde o autor é estudante com `tentativa.score ≥ 70` em ≥3 simulações da área:
  - Atribui badge `selo: 'aptidao_validada'`.
  - Emite `projeto.selo_atribuido`.
  - Visível no card pública e no perfil.
- **DoD E2E**:
  - **UI**: badge cobalt no card do projeto + perfil.
  - **Contrato**: `selo` enum.
  - **BFF**: lifecycle hook.
  - **Persistência**: campo `selo` em `projeto`.
  - **Impacto**: G15 → Notify autor "ganhaste selo Aptidão Validada"; achievement.

### G5-T5 — Votos + Endorsements

- Componentes `Votar` e `Endorsar` no `ProjetoDetailPage.tsx`.
- `voto-projeto` schema com `tipo: ['upvote','endorsement','fork']`.
- Pesos diferentes contribuem para reputação do autor (via Ranking hook).
- **DoD E2E**:
  - **UI**: botões com contador realtime.
  - **Contrato**: já existe schema.
  - **BFF**: POST `/projetos/:id/votos` + emite `projeto.endorsement_recebido`.
  - **Persistência**: existing.
  - **Impacto**: G15 → Ranking re-avalia reputação; conquistas `5-endorsements`, `viral-100-likes`.

## Eventos canónicos

- **Emite**: `projeto.publicado`, `projeto.acesso_solicitado`, `projeto.acesso_concedido`, `projeto.acesso_recusado`, `projeto.colaborador_aceite`, `projeto.endorsement_recebido`, `projeto.selo_atribuido`.
- **Hooks G15**: Ranking · Feed (**Geral + Vocacional** da área) · Match (sugere projetos a mentores Tier ≥ Prata) · Achievement (`primeiro-projeto`, `colaborador-recebido`, `aptidao-validada`) · Notify.