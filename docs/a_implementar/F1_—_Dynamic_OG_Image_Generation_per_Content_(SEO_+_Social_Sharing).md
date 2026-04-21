# F1 — Dynamic OG Image Generation per Content (SEO + Social Sharing)

## Status

Draft · Bloqueia DEPLOY (SEO).

## Estado actual

file:apps/web/index.html tem `og:image` fixo: `https://usepdc.com/og-default.png` para **todas** as páginas. Resultado:

- Quando se partilha link de curso/projeto/perfil/conquista no WhatsApp, LinkedIn, Twitter, Facebook → vê-se sempre a mesma imagem genérica.
- Perde-se a oportunidade viral de cada conteúdo.
- Discovery + clique-through-rate sub-óptimos.

file:apps/api/src/routes/seo.ts existe (sitemap + robots) — bom ponto de extensão.

## Estado canónico

- **OG image dinâmica por conteúdo** com templates Soul & Elite por tipo:
  - Curso: título + autor + área + score médio.
  - Simulação: título + tipo (Tipo 1/2/3) + duração + área.
  - Experiência: instituição + curso (preview do programa) + área.
  - Programa: título + tipo (standard/shadowapro/eduvisit) + responsável.
  - Projeto: título + autor + tags principais + selo (se "Aptidão Validada").
  - Perfil público: nome + headline + tier reputação + área principal.
  - Conquista: título + autor + tier.
- Renderização **server-side no Edge** (latência mínima global) ou no BFF.
- Cache CDN agressivo (1 dia para conteúdo aprovado, 5 min para edição).
- Tokens canónicos spec:IMPORTANTE/05 aplicados literalmente (cores, tipografia, bordas assimétricas).
- Fallback `/og-default.png` se geração falha.

## Tickets

### F1-T1 — Endpoint `/seo/og` no BFF (ou Edge Worker)

- Endpoint: `GET /seo/og?type={curso|simulacao|experiencia|programa|projeto|perfil|conquista}&id={uuid}` retorna PNG 1200×630.
- Stack: SVG → Resvg-wasm (renderização sem dependência de browser headless) — vive bem em Cloudflare Workers.
- Ou alternativa: `@vercel/og` style com `satori` + `resvg` no BFF Node (mais simples mas menos cache-friendly).
- **Decisão preferida**: implementar no Edge Worker para latência global e cache CDN automático.
- Cache header `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`.
- **DoD E2E**:
  - **UI**: imagem gerada respeita Soul & Elite (off-white sand + terracota acento + Instrument Serif título).
  - **Contrato**: Zod schema OGRequest validado.
  - **BFF/Edge**: gera PNG <500ms p95.
  - **Persistência**: cache CDN; conteúdo edited → revalida.
  - **Impacto**: partilha de URL no WhatsApp mostra preview rico, único por conteúdo.

### F1-T2 — Componente `<SEOHead>` por página com OG dinâmico

- file:apps/web/src/components/layout/SEOHead.tsx (já existe) recebe props: `type`, `id`, `title`, `description`, `imageUrl?` (override).
- Por defeito gera `<meta property="og:image" content="https://api.usepdc.com/seo/og?type=...&id=..." />`.
- Dimensões corretas: `og:image:width=1200`, `og:image:height=630`.
- `og:type`: `article` para cursos/simulações/experiências; `profile` para perfis; `website` para landing.
- `twitter:card=summary_large_image`.
- **DoD E2E**:
  - **UI**: cada página usa o componente; React Helmet/SSR-friendly.
  - **Contrato**: type-safe.
  - **BFF**: endpoint serve a URL.
  - **Persistência**: meta tags presentes no HTML servido.
  - **Impacto**: validador OG do Facebook/LinkedIn confirma preview correcto.

### F1-T3 — 7 templates SVG canónicos (Soul & Elite)

- Curso · Simulação · Experiência · Programa · Projeto · Perfil · Conquista.
- Cada template: 1200×630 SVG com:
  - Background: `--surface-elevated` (#FAF6EE).
  - Eyebrow: tipo do conteúdo + área (JetBrains Mono, terracota, 14px).
  - Título: Instrument Serif, 64px, ink-primary.
  - Descrição: Inter 400, 24px, ink-secondary, max 2 linhas.
  - Bottom-left: avatar do autor (40px, asymmetric border) + nome (Inter 600, 18px).
  - Bottom-right: marca PDC (Instrument Serif "Por Dentro do Curso") + dot terracota.
  - Borda decorativa assimétrica top-right (canto Kente subliminar).
- Wireframe abaixo.
- **DoD E2E**: cada template gera resultado ratificado pelo UX (pixel-perfect a spec:IMPORTANTE/05).

### F1-T4 — Server-side rendering (SSR) ou prerender de meta tags para crawlers

- Cloudflare Pages serve SPA; bots não executam JS → OG meta tags não chegam ao crawler.
- Solução: Cloudflare Worker middleware que detecta user-agent de bots (Facebook, LinkedIn, Twitter, WhatsApp) e responde com HTML estático **mínimo** (só `<meta>` tags) buscando dados ao BFF.
- OU: configurar prerender via `prerender.io` ou Cloudflare's snippets.
- **Decisão preferida**: middleware próprio no Cloudflare Pages (já temos Edge Worker; reaproveitar).
- **DoD E2E**: Facebook Sharing Debugger + LinkedIn Post Inspector mostram preview correcto.

### F1-T5 — Manter `og-default.png` como fallback Soul & Elite

- Substituir actual file:apps/web/public/og-default.png (que pode ainda usar tokens antigos) por nova versão alinhada com spec:IMPORTANTE/05.
- 1200×630, off-white sand, terracota acento, "Por Dentro do Curso." em Instrument Serif.
- **DoD E2E**: imagem fallback respeita design system.

### Wireframe — OG Template (Curso, 1200×630)

```wireframe

<html>
<head>
<style>
:root {
  --surface-elevated: #FAF6EE;
  --ink-primary: #2A2724;
  --ink-secondary: #5A5751;
  --ink-tertiary: #8A867F;
  --accent-terracotta: #D2691E;
  --radius-asym-a: 18px 6px 18px 6px;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Inter, system-ui, sans-serif; background: #2A2724; padding: 24px; min-height: 100vh; display: flex; justify-content: center; align-items: center; }
.og { width: 1200px; height: 630px; transform: scale(0.55); transform-origin: top left; background: var(--surface-elevated); position: relative; padding: 64px 72px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
.kente-corner { position: absolute; top: 0; right: 0; width: 240px; height: 240px; background: linear-gradient(135deg, transparent 50%, rgba(210,105,30,0.06) 50%); border-bottom-left-radius: 80px; }
.eyebrow { font: 600 18px 'JetBrains Mono', ui-monospace; color: var(--accent-terracotta); letter-spacing: 0.16em; }
.dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--accent-terracotta); margin: 0 12px 4px 12px; vertical-align: middle; }
.title { font-family: 'Instrument Serif', Georgia, serif; font-size: 84px; line-height: 1.05; letter-spacing: -0.02em; color: var(--ink-primary); max-width: 900px; margin-top: 28px; }
.desc { font-size: 28px; line-height: 1.45; color: var(--ink-secondary); margin-top: 18px; max-width: 760px; }
.bottom { display: flex; justify-content: space-between; align-items: flex-end; }
.author { display: flex; align-items: center; gap: 16px; }
.avatar { width: 64px; height: 64px; border-radius: var(--radius-asym-a); background: var(--accent-terracotta); color: #FFFCF7; display: flex; align-items: center; justify-content: center; font: 700 26px 'Instrument Serif', Georgia, serif; }
.author-name { font: 600 22px Inter; color: var(--ink-primary); }
.author-meta { font: 14px 'JetBrains Mono', ui-monospace; color: var(--ink-tertiary); letter-spacing: 0.05em; margin-top: 4px; }
.brand { text-align: right; }
.brand-name { font-family: 'Instrument Serif', Georgia, serif; font-size: 28px; color: var(--ink-primary); }
.brand-name em { color: var(--accent-terracotta); font-style: normal; }
.brand-tag { font: 12px 'JetBrains Mono', ui-monospace; color: var(--ink-tertiary); letter-spacing: 0.10em; margin-top: 4px; }
</style>
</head>
<body>
<div class="og">
  <div class="kente-corner"></div>
  <div>
    <div class="eyebrow">CURSO<span class="dot"></span>ENGENHARIA<span class="dot"></span>4.8 ⭐</div>
    <div class="title">Cálculo Estrutural Aplicado: Da Teoria à Obra.</div>
    <div class="desc">Aprende a dimensionar vigas, lajes e fundações com casos reais angolanos. 12 módulos · 8 simulações.</div>
  </div>
  <div class="bottom">
    <div class="author">
      <div class="avatar">BD</div>
      <div>
        <div class="author-name">Eng.ª Beatriz Domingos</div>
        <div class="author-meta">MENTORA · ISPTEC · TIER OURO</div>
      </div>
    </div>
    <div class="brand">
      <div class="brand-name">Por Dentro do Curso<em>.</em></div>
      <div class="brand-tag">USEPDC.COM</div>
    </div>
  </div>
</div>
</body>
</html>
```

## Dependências

- Coordena com E3 (templates de Programa/Projeto precisam dos novos campos).
- Bloqueia DEPLOY (SEO + social sharing são parte do go-live).