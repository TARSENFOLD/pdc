# G7 — Onboarding por Role E2E (3 fluxos: Estudante · Mentor · Instituição)

## Status

Draft · Depende de `spec:G15`, `spec:E1` (slug `estudante`), `spec:E4-T4` (OTP Twilio real), `spec:G8` (upload mídia).

## Estado actual auditado

- ✅ UI: file:apps/web/src/features/auth/EscolhaTipoContaPage.tsx, `RegistoEstudantePage.tsx`, `RegistoMentorPage.tsx`, `RegistoInstituicaoPage.tsx`, `TwoFactorPage.tsx`, `AuthSplitLayout.tsx`.
- ✅ BFF: file:apps/api/src/routes/auth.ts, `auth.register.ts`, `auth.otp.ts`, `auth.oauth.ts`.
- 🟡 OTP Twilio mockado (spec:IMPORTANTE/02 P2).
- ❌ Eventos `perfil.criado`, `perfil.role_alterado`, `2fa.ativado`, `oauth.vinculado` não emitidos.
- ❌ Tutorial guiado pós-signup não existe.
- ❌ Achievement de boas-vindas.

## Estado canónico (spec:IMPORTANTE/03 §7 + §8)

- 3 fluxos signup: Estudante (simples), Mentor (+docs), Instituição (Alvará+NIF+Estatuto).
- OTP obrigatório.
- 2FA opcional.
- Bootstrap 4 camadas.
- Redirect role-aware.
- Comité Científico, Moderador, Super Admin **não** passam por signup público.

## Tickets

### G7-T1 — Refactor escolha tipo conta + signup com 3 fluxos diferenciados

- `EscolhaTipoContaPage.tsx`: 3 cards Soul & Elite (Estudante / Mentor / Instituição) com bullets de benefícios.
- Cada card → fluxo dedicado.
- **Estudante**: nome + email + password + telefone + nível ensino + região.
- **Mentor**: estudante fields + área especialidade + áreas formação + anos experiência + upload de docs profissionais (R2 via `spec:G8`) + bio.
- **Instituição**: nome oficial + tipo + natureza + região + upload Alvará + NIF + Estatuto + Localização + Representante (R2).
- Após submeter: estado `aprovado: false` para mentor + instituição (esperam aprovação Super Admin).
- **DoD E2E**:
  - **UI**: 3 fluxos distintos Soul & Elite, mobile-first, validação inline Zod.
  - **Contrato**: 3 schemas: `RegistoEstudantePayload`, `RegistoMentorPayload`, `RegistoInstituicaoPayload`.
  - **BFF**: `POST /auth/register/estudante` (etc), upload de docs antes via `spec:G8`.
  - **Persistência**: `perfil` com `tipo` correcto + `aprovado: false` para mentor/instituição.
  - **Impacto**: emite `perfil.criado` → G15 → Notify Super Admin "novo mentor/instituição aguarda aprovação".

### G7-T2 — OTP via SMS real (depende `spec:E4-T4`)

- Após submit do registo: redirect para `/verificar-otp` com email/telefone.
- Backend envia SMS via Twilio (real, não mock).
- Code 6 dígitos, expiração 10 min, max 3 tentativas.
- Falha 3× → bloquear 15 min.
- **DoD E2E**:
  - **UI**: input OTP 6 slots Soul & Elite, mobile-first, autocomplete `one-time-code`.
  - **Contrato**: `OtpVerifyPayload`.
  - **BFF**: `POST /auth/otp/verify` real.
  - **Persistência**: `perfil.email_verified` ou `phone_verified`.
  - **Impacto**: emite `oauth.vinculado` (se via Google/LinkedIn) ou nenhum extra; só após OTP é que `perfil.criado` é considerado completo.

### G7-T3 — Tutorial guiado pós-signup (Welcome Tour)

- Após primeiro login confirmado: overlay Soul & Elite com 5 passos (depende do role).
- **Estudante**: 1.Faz primeiro Micro-Desafio (3 perguntas) 2.Explora Áreas 3.Vive primeira Experiência 4.Faz primeira Simulação 5.Constrói Perfil Vocacional.
- **Mentor**: 1.Completa perfil profissional 2.Publica primeiro Curso 3.Aceita primeira mentoria 4.Vê analytics dos mentorados 5.Configura disponibilidade.
- **Instituição**: 1.Completa branding 2.Publica primeira Experiência 3.Cria primeiro Programa 4.Convida estudantes 5.Vê dashboard saúde dos alunos.
- Skippable mas tracked.
- **DoD E2E**:
  - **UI**: GlassCard overlay com spotlight, AsymmetricButton "Avançar", barra progresso terracota.
  - **BFF**: `POST /onboarding/complete-step` regista progresso.
  - **Persistência**: `perfil.onboardingProgresso` JSON.
  - **Impacto**: emite `onboarding.passo_concluido` → Achievement de boas-vindas + Notify celebra primeiro passo.

### G7-T4 — Achievement "Bem-vindo ao PDC"

- Conquista auto-disparada no evento `perfil.criado` após primeiro login confirmado (OTP + 2FA opcional).
- Visível no perfil + toast realtime.
- **DoD E2E**:
  - **BFF**: regra adicionada em `conquistas.engine.ts` (slug `bem-vindo-pdc`).
  - **Persistência**: `conquista` collection.
  - **Impacto**: G15 Notify hook celebra.

### G7-T5 — Workflow Super Admin aprovação de Mentor/Instituição

- Página file:apps/web/src/features/admin/AdminUtilizadoresPage.tsx: filtro "Aguardam aprovação" mostra mentores e instituições com `aprovado: false`.
- Card preview com docs + botões Aprovar/Rejeitar com motivo.
- Aprovar emite `perfil.role_alterado` (formal) ou novo `perfil.aprovado`.
- **DoD E2E**:
  - **UI**: BentoGrid com cards.
  - **BFF**: `PATCH /admin/perfis/:id/aprovar` com `checkRole(['super_admin'])`.
  - **Persistência**: `aprovado: true` + audit log.
  - **Impacto**: G15 Notify hook avisa mentor/instituição "estás aprovado, podes publicar".

## Eventos canónicos

- **Emite**: `perfil.criado`, `perfil.aprovado`, `perfil.role_alterado`, `oauth.vinculado`, `2fa.ativado`, `login`, `logout`, `onboarding.passo_concluido`.
- **Hooks G15**: Ranking (perfil novo: 0) · Feed (sem injection imediata; cresce com atividade) · Match (perfil enters pool) · Achievement (`bem-vindo-pdc`, `perfil-completo`, `assiduidade-exemplar`) · Notify (Super Admin para approvals; utilizador para conquistas).