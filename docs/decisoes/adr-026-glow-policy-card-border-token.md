# ADR-026 — Glow Policy & `--card-border` Token

**Data:** 2026-05-03
**Estado:** Aceite
**Autores:** Equipa PDC v2
**Referências:** `DESIGN.md § 10.2–10.3`, `CLAUDE.md § 6`, `apps/web/src/styles/tokens.css`

---

## Contexto

Durante a sessão de polish visual de 2026-05-03, identificaram-se dois problemas
que afectavam o profissionalismo e a consistência visual da landing page:

1. **Glow excessivo** — `ctx.shadowBlur` com multiplicadores do tamanho da partícula
   (ex: `currentSize * 8`) criava halos brancos/laranja perturbadores, especialmente
   visíveis em dark mode e sobre backgrounds escuros.

2. **Bordas invisíveis em dark mode** — cards com `borderColor: '#000000'` hardcoded
   eram invisíveis no tema escuro, quebrando a consistência visual.

## Decisão

### Glow Policy

```ts
// ❌ BANIDO
ctx.shadowBlur = currentSize * 8;   // multiplicador — produz halos excessivos
ctx.shadowBlur = currentSize * 5;
ctx.shadowBlur = currentSize * 3;

// ✅ PERMITIDO (exclusivo: accent stars da landing)
ctx.shadowBlur = 2;                  // valor fixo, nunca multiplicador
ctx.shadowColor = rgba(accentRgb, 0.12 * starOpacity);  // alpha ≤ 0.12

// ✅ CORRETO (cool stars, componentes app, auth canvas)
ctx.shadowBlur = 0;
ctx.shadowColor = 'transparent';
```

**Eliminados da `NeuralConstellation` da landing:**
- Cross flares (`p.baseSize > 2.0 && twinkleIntensity > 0.6`) — halos em forma de cruz
- Double-pass bright core (`p.baseSize > 1.2`) — segundo arco interior amplificado
- Tamanho máximo de partícula reduzido de 4px para 1.8px

### `--card-border` Token

Definido em `apps/web/src/styles/tokens.css`:

```css
/* Raiz (light mode) */
--card-border: #000000;

/* Tema escuro */
.dark {
  --card-border: rgba(255, 255, 255, 0.08);
}
```

Todos os cards da landing que usavam `borderColor: '#000000'` migrados para:

```tsx
style={{ borderColor: 'var(--card-border)' }}
```

Ficheiros actualizados:
- `LandingFeatures.tsx`
- `LandingProblema.tsx`
- `LandingMentores.tsx`
- `LandingLivePulse.tsx`
- `CarrosselInstituicoes.tsx`

## Regras de Aplicação

- ❌ Nunca usar `ctx.shadowBlur` com multiplicador de tamanho em canvas de produto
- ❌ Nunca hardcodar `borderColor: '#000000'` — invisível em dark mode
- ✅ Usar sempre `var(--card-border)` para bordas de cards temáticas
- ✅ `ctx.shadowBlur = 0` é o default seguro em qualquer canvas

## Consequências

- Visual mais limpo e profissional, especialmente em dark mode.
- Token `--card-border` é agora parte do SSOT de cores — qualquer mudança
  de tema aplica-se automaticamente a todos os cards da landing.
- Partículas da landing ficam com tamanho máximo ≤ 1.8px — imperceptíveis
  individualmente, legíveis em conjunto como constelação.
