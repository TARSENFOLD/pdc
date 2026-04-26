# G14 — Notifications Fanout E2E (Socket · Web Push · APNs · FCM · Email Digest)

## Status

Draft · Depende de `spec:G15-T7` (notifyHook), `spec:D2-T5` (registo APNs/FCM tokens).

## Estado actual auditado

- ✅ UI: file:apps/web/src/features/perfil/ConfiguracoesPage.tsx (parcial — só toggles email).
- ✅ Strapi: file:infra/strapi/src/api/notificacao/.../schema.json.
- ✅ Rota BFF: file:apps/api/src/routes/notificacoes.ts.
- ✅ Socket emit já existe.
- ❌ Web Push (browser desktop) — sem código.
- ❌ APNs (iOS) — depende `spec:D2-T5`.
- ❌ FCM (Android) — depende `spec:D2-T5`.
- ❌ Email digest com agrupamento.
- ❌ Settings UI por canal × por tipo.

## Estado canónico

- 5 canais paralelos: Socket.IO · Web Push · APNs · FCM · Email digest.
- Settings granulares por canal × por tipo de notificação.
- Dedup por `(perfilId, eventId, canal)`.
- Agrupamento email digest (15 min default, configurável).

## Tickets

### G14-T1 — Web Push API (browser desktop)

- Service worker (já existe via `spec:D1`) regista Push subscription.
- Backend usa `web-push` npm com VAPID keys.
- Strapi `push-subscription` collection (criar): `perfilId`, `endpoint`, `keys (json: p256dh, auth)`, `platform: 'web'`, `criadaEm`, `ultimoUso`.
- Nova rota BFF: `POST /push/subscribe` + `DELETE /push/unsubscribe`.
- Notify hook (G15-T7) chama Web Push para subscriptions com `platform: web`.
- **DoD E2E**:
  - **UI**: prompt para activar push notifications.
  - **Contrato**: `PushSubscription` schema.
  - **BFF**: `POST /push/subscribe` + integração com `web-push`.
  - **Persistência**: `push-subscription` collection.
  - **Impacto**: utilizador desktop recebe notificações mesmo com aba fechada.

### G14-T2 — APNs (iOS) — após spec:D2-T5

- Reusa `push-subscription` collection com `platform: 'ios'` + token APNs.
- Notify hook chama Apple Push Notification service.
- VAPID + APNs key no secret store Railway.
- **DoD E2E**:
  - **BFF**: integração APNs.
  - **Persistência**: tokens iOS.
  - **Impacto**: app iOS recebe push native quando inactivo.

### G14-T3 — FCM (Android) — após spec:D2-T5

- Reusa `push-subscription` com `platform: 'android'` + token FCM.
- Notify hook chama Firebase Cloud Messaging via `firebase-admin`.
- **DoD E2E**:
  - **BFF**: integração FCM.
  - **Persistência**: tokens Android.
  - **Impacto**: app Android recebe push native.

### G14-T4 — Email digest agrupado

- Worker Railway separado: cada 15 min (configurável) lê `notificacao` com `entreguePor.email = false` + `criadaEm < now-15min`.
- Agrupa por destinatário em digest único.
- Render template Soul & Elite (HTML email canónico).
- Envia via Resend.
- Marca `entreguePor.email = true`.
- **DoD E2E**:
  - **UI**: template email Soul & Elite (Inter + Instrument Serif fontes web-safe fallback).
  - **BFF**: worker dedicado.
  - **Persistência**: `notificacao.entreguePor.email`.
  - **Impacto**: utilizador inactivo recebe digest único em vez de spam.

### G14-T5 — Settings UI canal × tipo

- Já parcial em `spec:G10-T1`. Estender para todos os tipos × todos os 5 canais.
- Default sensato: in-app sempre on; web push on por opt-in; APNs/FCM por opt-in (prompt no app); email digest on para mensagens privadas e conquistas grandes; off para resto.
- **DoD E2E**:
  - **UI**: matriz checkboxes Soul & Elite mobile-first.
  - **BFF**: PUT `/perfis/me/notificacoes`.
  - **Persistência**: `notificationPreferences` JSON.
  - **Impacto**: utilizador controla 100% do que recebe.

### G14-T6 — Página `/notificacoes` Soul & Elite (in-app inbox)

- Lista cronológica com filtros (não-lida / lida / por tipo).
- Tap → marca lida + redirect ao deep-link.
- Bulk action "Marcar todas como lidas".
- **DoD E2E**:
  - **UI**: lista virtualizada mobile-first.
  - **BFF**: existing `notificacoes.ts` routes.
  - **Persistência**: existing.
  - **Impacto**: utilizador tem histórico completo.

## Eventos canónicos (consume)

- Consome todos os eventos via G15 notifyHook.
- Não emite (é o terminal).