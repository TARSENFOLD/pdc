# D2 — Capacitor iOS + TWA Android (release pipeline para App Store + Play Store)

## Status

Draft · Depende de D1 · Bloqueia DEPLOY.

## Estado actual

**Não existe** `apps/mobile/`. Não existe configuração Capacitor nem PWABuilder. Sem app stores config.

## Estado canónico

- **iOS**: Capacitor (encapsula a PWA `apps/web` numa shell nativa Swift, distribui via App Store Connect).
- **Android**: Trusted Web Activity via PWABuilder/Bubblewrap (oferece a PWA como app Android nativa, distribui via Play Console).
- Pipeline CI/CD que:
  1. Builda a PWA (`apps/web`).
  2. Sincroniza com Capacitor.
  3. Build iOS (Xcode cloud ou local) → upload TestFlight.
  4. Build Android (Bubblewrap CLI) → upload Play Internal Track.
- Assets de loja (screenshots, descriptions, privacy policy, terms).

## Tickets

### D2-T1 — Criar `apps/mobile/` com Capacitor (iOS shell)

- `npm init @capacitor/app` em `apps/mobile/`.
- Configurar `capacitor.config.ts` apontando para `webDir: "../web/dist"`.
- Bundle ID: `com.usepdc.app`. App name: "PDC".
- Splash screen + app icon do D1.
- Adicionar plugins essenciais: `@capacitor/push-notifications`, `@capacitor/share`, `@capacitor/status-bar`, `@capacitor/splash-screen`.
- **DoD E2E**:
  - **UI**: iOS app abre PWA com splash + status bar correctos.
  - **Contrato**: comunicação com BFF idêntica à PWA web (cookies httpOnly funcionam via `WKWebView` configurado).
  - **BFF**: aceita Origin do app nativo (CORS allowlist).
  - **Persistência**: telemetria offline funciona via WKWebView storage.
  - **Impacto**: app aparece na lista de apps nativos do iPhone.

### D2-T2 — Setup TWA Android via Bubblewrap

- `npx @bubblewrap/cli init --manifest=https://usepdc.com/manifest.json` em `apps/mobile/android-twa/`.
- Configurar `assetlinks.json` em `https://usepdc.com/.well-known/assetlinks.json` (Cloudflare Pages serve).
- Bundle ID: `com.usepdc.app`. Min SDK 21.
- App icon adaptive (foreground + background).
- **DoD E2E**:
  - **UI**: Android app abre sem chrome bar (Chrome Custom Tab disfarçada).
  - **Contrato**: assetlinks valida.
  - **BFF**: CORS permite Origin TWA.
  - **Persistência**: cookies partilhados com PWA web.
  - **Impacto**: app aparece em "Aplicações" no Android.

### D2-T3 — Pipeline CI/CD para builds mobile

GitHub Actions workflow `mobile-release.yml`:

- Trigger: tag `v*-mobile` ou manual.
- Build PWA → Capacitor sync → build iOS via `xcodebuild` (requer macOS runner) + assinatura → upload TestFlight via `altool`.
- Build Android via Bubblewrap → assinatura → upload Play Console via `gradle-play-publisher`.
- Secrets: certificados iOS/Android nos Secrets do GitHub.
- **DoD E2E**: tag dispara builds, testes a chegar a TestFlight + Internal Track sem intervenção manual.

### D2-T4 — Assets de loja (App Store + Play Store)

- App Store: 6.7" (iPhone Pro Max), 6.5", 5.5" screenshots × min 3 cada. Description PT/EN. Privacy nutrition label. Categoria: Education.
- Play Store: 1024×500 feature graphic, 512×512 icon, screenshots phone+tablet × min 4. Description PT/EN. Privacy policy URL.
- **DoD E2E**: review nas duas lojas aceite na primeira tentativa (sem rejeição por assets).

### D2-T5 — Push notifications nativas (iOS APNs + Android FCM)

- iOS: `@capacitor/push-notifications` + APNs key no Apple Developer.
- Android: FCM via Firebase project + token registration.
- BFF endpoint `/notificacoes/push/register` para guardar device tokens por perfil.
- BFF integração com APNs e FCM (via Resend? não — usar SDK directo).
- **DoD E2E**:
  - **UI**: prompt nativo de permissão; settings page para gerir.
  - **Contrato**: registo de token tipado em Zod.
  - **BFF**: dispatcher unificado (web push + APNs + FCM) baseado no que o perfil tem registado.
  - **Persistência**: device tokens em Strapi com timestamp de último uso.
  - **Impacto**: notificações de Match Terminal, mensagem nova, conquista chegam ao push center do device.

## Dependências

- Depende de D1 (manifest production-grade) e E5 (CORS allowlist deve incluir mobile origins).