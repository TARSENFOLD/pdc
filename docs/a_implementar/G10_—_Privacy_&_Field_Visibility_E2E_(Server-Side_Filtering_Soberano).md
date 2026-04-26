# G10 — Privacy & Field Visibility E2E (Server-Side Filtering Soberano)

## Status

Draft · Depende de `spec:G15`.

## Estado actual auditado

- ✅ Schema: file:packages/shared/src/user.ts — `VisibilitySettingsSchema` com 5 campos.
- ✅ Persistência: file:infra/strapi/src/api/perfil/.../schema.json `visibilitySettings: json`.
- ✅ Serializer: file:apps/api/src/modules/perfil/perfil.serializer.ts (referenciado).
- ❌ Página `/configuracoes/privacidade` não existe (só `ConfiguracoesPage.tsx` genérico).
- ❌ Audit log de alterações de privacidade.
- ❌ `notificationPreferences` por canal (web push, APNs, FCM, email digest, in-app) — só tem 4 toggles email.

## Estado canónico (spec:IMPORTANTE/03 §6)

- Lei suprema: **server-side filtering por viewer + role**. Frontend é UX, não autoridade.
- Cada campo tem 3 estados: obrigatório/opcional · público/privado · editável-pelo-próprio/admin.
- Privacy by default (campos sensíveis privados).

## Tickets

### G10-T1 — Página `/configuracoes/privacidade` Soul & Elite

- Refactor `ConfiguracoesPage.tsx` com tabs: Perfil · Privacidade · Notificações · Conta.
- Tab Privacidade: lista de cada campo com toggle (público / vínculos-aprovados / privado).
- Tab Notificações: por canal (in-app, web push, APNs, FCM, email digest) × por tipo (mensagens, conquistas, vínculos, mentorias, newsletter).
- **DoD E2E**:
  - **UI**: BentoGrid com 4 tabs, mobile-first.
  - **Contrato**: `VisibilitySettingsSchema` extendido para todos os campos relevantes; `NotificationPreferencesSchema` extendido para canais x tipos.
  - **BFF**: PUT `/perfis/me/privacidade` + `/notificacoes`.
  - **Persistência**: `perfil.visibilitySettings` + `notificationPreferences`.
  - **Impacto**: emite `perfil.privacidade_alterada` → audit log.

### G10-T2 — Reforçar serializer público (server-side filter)

- file:apps/api/src/modules/perfil/perfil.serializer.ts: garantir que `serializePublicProfile` aplica TODOS os filtros do `visibilitySettings` antes de devolver.
- Tests rigorosos: viewer anónimo, viewer autenticado mas sem vínculo, viewer com vínculo aprovado, viewer mentor vinculado, viewer super_admin.
- Cada combinação retorna o subset correcto.
- **DoD E2E**:
  - **BFF**: serializer faz `field-level filtering`.
  - **Persistência**: privado no DB nunca chega ao wire.
  - **Impacto**: GDPR/RGPD-aligned; mesmo se frontend tentar pedir, servidor não devolve.

### G10-T3 — Audit log de alterações de privacidade

- Cada PUT em `/perfis/me/privacidade` regista em `audit-log` quem alterou o quê quando.
- Visível em `AdminAuditPage.tsx` para super_admin.
- **DoD E2E**:
  - **BFF**: middleware audit.
  - **Persistência**: `audit-log` collection (já existe).
  - **Impacto**: forensics + accountability.

### G10-T4 — Privacy nutrition label (App Stores)

- Doc auto-gerado de "Privacy nutrition label" para App Store + Play Store data safety form.
- Lista de dados coletados, finalidade, partilha com terceiros.
- Render como página pública `/privacidade/dados-coletados`.
- **DoD E2E**:
  - **UI**: página Soul & Elite responsive.
  - **Persistência**: gerada de manifest declarativo.
  - **Impacto**: App Store/Play Store review aceita o privacy label.

## Eventos canónicos

- **Emite**: `perfil.privacidade_alterada`.
- **Hooks G15**: Ranking (não) · Feed (não) · Match (não) · Achievement (não) · Notify (apenas in-app: "as tuas preferências foram guardadas").