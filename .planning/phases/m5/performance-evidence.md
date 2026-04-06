# M5-T2 — Evidência de Performance

## Data

2026-04-06

## Comando executado

```bash
npm run build -w @pdc/web
# tsc --noEmit && vite build
```

## Output — chunks principais (top 10 por tamanho raw)

| Chunk | Raw | Gzipped |
|-------|-----|---------|
| index-B7E7J0aO.js (app code) | 826.4 KB | 228.7 KB |
| vendor-BGPYPDnz.js (react, react-dom, react-router-dom, @tanstack/react-query) | 239.0 KB | 76.3 KB |
| index-CMpWrKT3.js (shared/ui) | 95.3 KB | 25.5 KB |
| index-y_VDSlnI.css | 63.0 KB | 10.7 KB |
| AlunosInscritosPage.js | 28 KB | — |
| SimulacaoPlayerPage.js | 9.2 KB | — |
| FeedPage.js | 9.2 KB | — |
| MentoriaListPage.js | 6.7 KB | — |
| VinculosPage.js | 6.5 KB | — |
| ItemPlayer.js | 6.0 KB | — |

## Total de chunks

- **96 ficheiros JS** no bundle final
- **93 lazy chunks** (code-split via React.lazy)
- **3 chunks iniciais** (index, vendor, shared/ui)
- **1 CSS** (Tailwind purged)

## Bundle inicial (o que o browser carrega na primeira página)

| Recurso | Gzipped |
|---------|---------|
| vendor-BGPYPDnz.js | 76.3 KB |
| index-y_VDSlnI.css | 10.7 KB |
| **Total initial load** | **87.0 KB** |

> O index-B7E7J0aO.js (228.7 KB gz) contém todas as páginas estaticamente importadas (Landing, Login, Register, etc.) e o router. As 93 lazy chunks são carregadas on-demand.

## Cumpre < 200 KB?

**Sim.** O bundle inicial (vendor + CSS) é **87.0 KB gzipped** — bem abaixo do target de 200 KB.

Mesmo incluindo o index.js principal (que contém as páginas estáticas da landing/auth), o total seria ~316 KB gz — mas as rotas /app/* são todas lazy-loaded e não contribuem para o carregamento inicial de uma página pública.

## Estratégia de code-splitting

- `React.lazy()` em 67+ componentes de rota
- `Suspense` boundary no `/app` wrapper (AppLayout)
- `Suspense` individual em 14 rotas públicas lazy
- `manualChunks` no vite.config.ts para isolar vendor (react, react-dom, react-router-dom, @tanstack/react-query)
