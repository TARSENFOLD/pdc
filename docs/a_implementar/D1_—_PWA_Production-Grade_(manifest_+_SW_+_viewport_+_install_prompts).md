# D1 — PWA Production-Grade (manifest + SW + viewport + install prompts)

## Status

Draft · Bloqueia D2.

## Estado actual

file:apps/web/public/manifest.json é **deficiente**:

- `theme_color: "#f59e0b"` (amber genérico) ≠ terracota canónica `#D2691E`.
- `background_color: "#0a0a0a"` é **PRETO PURO** — viola directamente spec:IMPORTANTE/05 §2 princípio 1 ("Aniquilação dos extremos").
- Apenas 2 ícones (192/512). Faltam: 144, 256, 384, 512 maskable, 1024 (App Store).
- Faltam: `id`, `lang`, `description`, `screenshots`, `shortcuts`, `categories`, `display_override`, `orientation`, `prefer_related_applications`.

file:apps/web/index.html linha 6: viewport tem `maximum-scale=1.0, user-scalable=no` — **viola WCAG SC 1.4.4** e bloqueia W3-T4.

file:apps/web/public/sw.js é **trivial**: cache-first em apenas 3 paths. Sem precaching, sem strategies, sem update flow, sem background sync, sem offline fallback.

## Estado canónico

- Manifest **production-grade** alinhado com Soul & Elite tokens.
- SW **Workbox-style** (custom, sem adicionar dependência se possível) com strategies (NetworkFirst para API, StaleWhileRevalidate para assets, CacheFirst para fonts).
- Viewport accessible.
- Install prompts UI nativa do PDC (não usar o default browser).

## Tickets

### D1-T1 — Reescrever manifest.json alinhado com tokens canónicos

- `theme_color: "#D2691E"` (terracota), `background_color: "#FAF6EE"` (warm sand) ou `#0E0D0C` (deep dark) — nunca `#000000`.
- Adicionar `id: "/"`, `lang: "pt-AO"`, `dir: "ltr"`, `description`, `categories: ["education", "productivity"]`, `orientation: "portrait"`, `display_override: ["window-controls-overlay", "standalone"]`.
- Ícones: 144, 192, 256, 384, 512 + 512 maskable + 1024 para App Store. Gerados a partir de file:apps/web/public/icon-source.svg (criar).
- `screenshots`: 3 capturas mobile (375x812) + 3 desktop (1920x1080) com `form_factor` correto.
- `shortcuts`: 4 atalhos (Iniciar simulação, Feed, Mensagens, Perfil).
- **DoD E2E**:
  - **UI**: manifest gerado bate com Soul & Elite tokens; icons aplicam mascarável correcto em iOS/Android.
  - **Contrato**: manifest passa em `manifest-validator.appspot.com` + PWABuilder com ≥95/100.
  - **BFF**: N/A.
  - **Persistência**: ícones servidos pelo Cloudflare Pages com cache 1 ano.
  - **Impacto**: install prompt funciona em iOS Safari, Android Chrome, Edge.

### D1-T2 — Service Worker production-grade

Estratégias por rota (sem dependência externa, idealmente):

- `/api/*` → NetworkFirst, fallback offline com mensagem aspiracional.
- `/assets/*` → CacheFirst (1 ano).
- `/manifest.json`, fonts → StaleWhileRevalidate.
- Background sync para telemetria offline (queue local que despacha quando volta online).
- Update flow: detectar nova versão → notificar utilizador (toast Soul & Elite) → reload controlado.
- **DoD E2E**:
  - **UI**: toast "Nova versão disponível" alinhado com Soul & Elite (GlassCard).
  - **Contrato**: telemetria offline usa mesmo schema Zod, despachada com `eventId` (idempotente).
  - **BFF**: telemetry consumer aceita batches replay.
  - **Persistência**: cache versionado, expirações respeitadas.
  - **Impacto**: utilizador em Luanda com 3G instável continua a usar a app sem perda de telemetria.

### D1-T3 — Fix viewport accessible

Substituir por `width=device-width, initial-scale=1.0, viewport-fit=cover`. Remover `maximum-scale` e `user-scalable=no`.

- **DoD E2E**: axe-core zero violations no viewport; pinch-to-zoom funciona.

### D1-T4 — Componente InstallPrompt nativo Soul & Elite

Componente React que:

- Detecta `beforeinstallprompt` (Android/Chromium) e instructions iOS Safari.
- Mostra GlassCard com AsymmetricButton CTA.
- Aceita `data-element-id="pwa-install"` para tracking.
- Frequência: máx 1× por sessão, não mostrar se já instalado, persistir dismiss em localStorage com TTL 7 dias.
- **DoD E2E**:
  - **UI**: GlassCard alinhado com Soul & Elite (wireframe abaixo).
  - **Contrato**: evento telemetria `pwa.install.prompted` / `pwa.install.accepted` / `pwa.install.dismissed`.
  - **BFF**: ingest via Edge.
  - **Persistência**: dismiss state em localStorage (não cookie).
  - **Impacto**: instalações trackeadas alimentam dashboard admin.

### D1-T5 — Splash screens iOS + Apple touch icons

Gerar 8 splash screens iOS (todos os tamanhos: iPhone SE→Pro Max, iPad). Apple-touch-icon 180×180. Adicionar `<link rel="apple-touch-icon">` + `<link rel="apple-touch-startup-image">` em `index.html`.

- **DoD E2E**: instalação iOS mostra splash certo, ícone correcto na home screen.

### Wireframe — Install Prompt (mobile, Soul & Elite)

```wireframe

<html>
<head>
<style>
:root {
  --surface-canvas: #F8F9FA;
  --surface-elevated: #FAF6EE;
  --ink-primary: #2A2724;
  --ink-secondary: #5A5751;
  --ink-tertiary: #8A867F;
  --accent-terracotta: #D2691E;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-asym-a: 18px 6px 18px 6px;
  --glass-bg-light: rgba(250, 246, 238, 0.92);
  --glass-border-light: rgba(42, 39, 36, 0.08);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Inter, system-ui, sans-serif; background: #2A2724; padding: 24px; min-height: 100vh; display: flex; justify-content: center; align-items: center; }
.phone-mock { width: 380px; height: 720px; background: var(--surface-canvas); border-radius: 36px; padding: 16px; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.4); border: 8px solid #18171A; }
.scrim { position: absolute; inset: 16px; background: rgba(14,13,12,0.42); backdrop-filter: blur(4px); border-radius: 24px; display: flex; align-items: flex-end; justify-content: center; padding: 16px; }
.install-card { width: 100%; background: var(--glass-bg-light); backdrop-filter: blur(18px) saturate(140%); border: 1px solid var(--glass-border-light); border-radius: var(--radius-lg); padding: 20px; box-shadow: 0 12px 32px rgba(42,39,36,0.18); }
.install-eyebrow { font: 11px 'JetBrains Mono', ui-monospace; color: var(--accent-terracotta); letter-spacing: 0.12em; margin-bottom: 8px; }
.install-title { font-family: 'Instrument Serif', Georgia, serif; font-size: 20px; line-height: 1.15; color: var(--ink-primary); margin-bottom: 6px; }
.install-desc { font-size: 13px; line-height: 1.5; color: var(--ink-secondary); margin-bottom: 14px; }
.install-actions { display: flex; gap: 10px; }
.btn { font: 500 13px Inter; padding: 12px 18px; border-radius: var(--radius-md); cursor: pointer; min-height: 44px; flex: 1; }
.btn-primary { background: var(--accent-terracotta); color: #FFFCF7; border: none; border-radius: var(--radius-asym-a); font-weight: 600; }
.btn-ghost { background: transparent; color: var(--ink-secondary); border: 1px solid rgba(42,39,36,0.12); }
</style>
</head>
<body>
<div class="phone-mock">
  <div class="scrim">
    <div class="install-card">
      <div class="install-eyebrow">PDC NA TUA MÃO</div>
      <div class="install-title">Instala o PDC para começares offline.</div>
      <div class="install-desc">Acesso instantâneo, simulações sem espera, telemetria que continua mesmo sem rede. 12 MB.</div>
      <div class="install-actions">
        <button class="btn btn-ghost" data-element-id="pwa-install-later">Mais tarde</button>
        <button class="btn btn-primary" data-element-id="pwa-install-accept">Instalar</button>
      </div>
    </div>
  </div>
</div>
</body>
</html>
```

## Dependências

- Bloqueia D2.
- Coordena com C4 (CONSTITUTION mobile-first).