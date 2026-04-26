# E4 — Wave 2 Debt Closeout (D1 heuristics consolidação + OTP Twilio + Tina + Rating)

## Status

Draft · Depende de E1, E2, E3.

## Estado actual

Dívidas abertas declaradas em spec:IMPORTANTE/02 §11 + descobertas na auditoria:

- **D1**: file:apps/api/src/modules/analysis/heuristics.engine.ts paralelo a file:packages/shared/src/heuristics.ts + `heuristics-calculator.ts`.
- **D2**: 4× `any` em file:apps/web/src/features/feed/FeedPage.tsx.
- **D4**: 12 conquistas com naming mismatch — não disparam.
- **N9**: Threaded Insights da Tina (`W4-T5`).
- **P2**: OTP Twilio mockado.
- **P9**: Tina streaming instável.
- **T4**: Rating persistência incompleta.
- **T5**: Share não integrado.
- **T8**: Vínculos serialização pública por role pendente.

## Estado canónico

Cada dívida tem fix verificável; estado real espelhado em `.planning/REQUIREMENTS.md` (após `spec:C1`).

## Tickets

### E4-T1 — Consolidar heuristics (D1)

- file:apps/api/src/modules/analysis/heuristics.engine.ts deve ser **fina shell** que importa exclusivamente de `@pdc/shared/heuristics-calculator`.
- Eliminar duplicação matemática.
- Testes do BFF garantem paridade com testes do shared.
- **DoD E2E**: zero divergência matemática possível; refactor mantém score = score actual em sample real.

### E4-T2 — Limpar 4× any em FeedPage (D2)

- Tipar com schemas de file:packages/shared/src/schemas/dashboard.ts ou criar tipos próprios.
- **DoD E2E**: typecheck clean; ESLint `no-explicit-any` zero violations no `FeedPage.tsx`.

### E4-T3 — Resolver naming mismatch das 12 conquistas (D4)

- Auditar file:apps/api/src/modules/conquistas/conquistas.engine.ts + `conquistas.handler.ts` event subscribers.
- Garantir que cada uma das 12 regras canónicas dispara perante o evento certo.
- Test integration end-to-end: simulação concluída → conquista desbloqueada.
- **DoD E2E**: novo estudante completa simulação 1 → recebe conquista "Primeiro Passo" verificável em `/estudante/conquistas`.

### E4-T4 — OTP Twilio real (P2)

- Substituir mock em file:apps/api/src/modules/auth/otp.service.ts por chamada real.
- Variáveis `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` em `.env.example` (fixture com valores válidos para sandbox; reais em Railway).
- Fallback para Resend (email OTP) se telefone não disponível.
- Rate limit (5 SMS por hora por número via Upstash).
- **DoD E2E**:
  - **UI**: utilizador recebe SMS real em <30s.
  - **Contrato**: validação de formato E.164.
  - **BFF**: rate limit retorna 429 ao exceder.
  - **Persistência**: tentativas em audit log.
  - **Impacto**: registos de novas contas validados via SMS real.

### E4-T5 — Tina streaming estável (P9)

- Auditar file:apps/api/src/modules/tina/tina.service.ts + file:apps/web/src/features/tina/TinaChat.tsx.
- SSE (Server-Sent Events) ou WebSocket dedicado para streaming. Reconnect logic.
- Backpressure: chunk-based.
- Guardrails: rate limit + content filter.
- **DoD E2E**: utilizador faz pergunta longa; tokens chegam progressivamente sem cortes; reconnect transparente em rede instável.

### E4-T6 — Threaded Insights da Tina no Relatório (N9 / W4-T5)

- Componente `ThreadedInsights` em file:apps/web/src/features/simulacoes/RelatorioVocacional.tsx.
- Cada insight ancora-se a um `simulacaoId` específico.
- Drawer/sidebar lateral GlassCard (já existe primitivo).
- **DoD E2E**:
  - **UI**: Tina cria nota ancorada à simulação 3 → utilizador vê na lateral; click anchor → scroll para a secção relevante.
  - **Contrato**: schema `TinaInsight { id, anchorType, anchorId, text, createdAt }`.
  - **BFF**: persiste insights por perfil.
  - **Persistência**: Strapi `tina-insight` collection.
  - **Impacto**: relatório premium ganha as Notas da Tina canónicas.

### E4-T7 — Rating persistência completa (T4)

- Garantir CRUD completo em file:apps/api/src/routes/ratings.ts.
- Lifecycle: estudante completa ≥30% → pode avaliar; aggregate por entidade.
- **DoD E2E**:
  - **UI**: estrelas funcionam; média visível.
  - **Contrato**: 1–5 + comentário opcional.
  - **BFF**: anti rating-bombing (≥30% concluído).
  - **Persistência**: Strapi.
  - **Impacto**: feed ranking usa ratings.

### E4-T8 — Vínculos serialização pública por role (T8)

- file:apps/api/src/modules/perfil/perfil.serializer.ts: filtrar vínculos por `viewerRole + visibleOnProfile`.
- Test que mentor vê vínculos privados de aluno vinculado, mas estranho não.
- **DoD E2E**: GET `/perfis/:id` por viewer público nunca expõe vínculos privados.

## Dependências

- Depende de E1, E2, E3.

</TRAYCER_SPEC>