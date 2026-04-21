# G6 — Post/Conquista E2E (Feed Social + Moderação Auto + Fanout)

## Status

Draft · Depende de `spec:G15`.

## Estado actual auditado

- ✅ Strapi: file:infra/strapi/src/api/post/.../schema.json, `conquista`, `conquista-utilizador`, `comment`, `like`, `bookmark`, `partilha`.
- ✅ Rotas BFF: file:apps/api/src/routes/conquistas.ts, `comments.ts`, `interactions.ts`.
- 🟡 Não há rota dedicada `POST /posts` nem UI `CriarPostPage` — frontend (FeedPage) deve ter inline composer mas verifica.
- ❌ Eventos `post.publicado`, `like.adicionado`, `bookmark.adicionado` não emitidos.
- ❌ Auto-moderação por idade do autor (<7 dias) não verificada.

## Estado canónico (spec:IMPORTANTE/04 §3.6)

- Posts/Comentários de utilizadores <7 dias entram em fila Moderador.
- Conquistas auto-geradas via Event Bus (já funciona via `conquistasHandler`).
- Interações: Like, Comment, Bookmark, Share, Report — sem Rating (usam Likes).

## Tickets

### G6-T1 — Composer de Post in-feed Soul & Elite

- Componente `PostComposer` no topo do `FeedPage.tsx`: avatar + textarea expansível + upload mídia (R2) + dropdown de privacidade (público/seguidores).
- Char limit: 2000.
- Markdown support básico.
- Botão "Publicar" AsymmetricButton.
- **DoD E2E**:
  - **UI**: GlassCard mobile-first, autoresize textarea, 44px touch.
  - **Contrato**: `CriarPostPayload` schema.
  - **BFF**: POST `/posts` com auto-moderação por idade.
  - **Persistência**: `post` Strapi com `aprovado: true|false`.
  - **Impacto**: emite `post.publicado` → G15 hooks; se `aprovado: false`, vai para Notify hook do moderador.

### G6-T2 — Workflow auto-moderação por idade

- Lifecycle Strapi: ao create de `post`/`comment`/`projeto`, lê `autor.createdAt`. Se `<7 dias`, força `aprovado: false`.
- BFF aplica mesmo check no `POST /posts`.
- Moderador vê fila em `FilaAprovacaoPage.tsx` (já existe).
- Auto-hide threshold: 3+ denúncias para post/comment, 5+ para projeto (per spec:IMPORTANTE/04 §5).
- **DoD E2E**:
  - **BFF**: lógica idempotente.
  - **Persistência**: `aprovado: false` esconde do feed público.
  - **Impacto**: posts inválidos nunca aparecem; Moderador vê fila ordenada por antiguidade.

### G6-T3 — Likes/Comments/Bookmarks/Shares com eventos

- Estender `interactions.ts` para emitir eventos:
  - `POST /interactions/like` → emite `like.adicionado { targetType, targetId, perfilId }`.
  - `POST /interactions/bookmark` → emite `bookmark.adicionado`.
  - `POST /interactions/share` → emite `partilha.criada`.
  - `comments.ts` POST → emite `comentario.criado` (já no enum).
- **DoD E2E**:
  - **Contrato**: schemas em `@pdc/shared/schemas/interacoes.ts`.
  - **BFF**: rotas existem; adicionar emissão.
  - **Persistência**: existing.
  - **Impacto**: G15 → Ranking actualiza engagement; Achievement `participante-ativo` (10 comentários), `viral-100-likes`.

### G6-T4 — Conquista feed: card especial Soul & Elite

- Conquistas auto-publicam um post no feed do utilizador (opcional, controlado por `notificationPreferences.publicarConquistasNoFeed`).
- Card Soul & Elite com badge tier + animação Motion subtle.
- **DoD E2E**:
  - **UI**: card distintivo no feed com selo.
  - **BFF**: handler `conquista.desbloqueada` cria post automaticamente se preference activa.
  - **Persistência**: `post { tipo: 'conquista', metadata }`.
  - **Impacto**: amplifica orgulho social; viralização.

## Wireframe — Composer + Feed Card de Conquista

```wireframe
<!DOCTYPE html><html><head><style>
:root{--surface-canvas:#F8F9FA;--surface-elevated:#FAF6EE;--surface-recessed:#F2EFE8;--ink-primary:#2A2724;--ink-secondary:#5A5751;--ink-tertiary:#8A867F;--accent-terracotta:#D2691E;--accent-success:#2F7A4F;--radius-md:10px;--radius-lg:14px;--radius-asym-a:18px 6px 18px 6px}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;background:var(--surface-canvas);padding:24px;min-height:100vh}
.feed{max-width:600px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
.composer{background:var(--surface-elevated);border-radius:var(--radius-lg);padding:16px;display:flex;gap:12px}
.av{width:40px;height:40px;border-radius:50%;background:var(--accent-terracotta);color:#FFFCF7;display:flex;align-items:center;justify-content:center;font:600 14px Inter;flex-shrink:0}
.compose-area{flex:1;display:flex;flex-direction:column;gap:10px}
.ta{width:100%;border:none;background:var(--surface-recessed);border-radius:var(--radius-md);padding:12px 14px;font:14px Inter;color:var(--ink-primary);resize:none;min-height:60px;outline:none}
.compose-actions{display:flex;justify-content:space-between;align-items:center}
.tools{display:flex;gap:8px}
.tool{width:36px;height:36px;border-radius:var(--radius-md);background:transparent;border:1px solid rgba(42,39,36,.10);color:var(--ink-tertiary);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px}
.publish{background:var(--accent-terracotta);color:#FFFCF7;border:none;border-radius:var(--radius-asym-a);padding:10px 18px;font:600 13px Inter;cursor:pointer;min-height:44px}
.card{background:var(--surface-elevated);border-radius:var(--radius-lg);padding:18px}
.card-head{display:flex;gap:12px;align-items:center;margin-bottom:12px}
.card-name{font:600 14px Inter}
.card-meta{font:11px 'JetBrains Mono',monospace;color:var(--ink-tertiary);letter-spacing:.05em}
.card-text{font:14px Inter;color:var(--ink-primary);line-height:1.5;margin-bottom:14px}
.conquista-card{background:linear-gradient(135deg,var(--surface-elevated),rgba(210,105,30,.08));border:1px solid rgba(210,105,30,.20);border-radius:var(--radius-asym-a);padding:20px;display:flex;gap:16px;align-items:center}
.badge-big{width:64px;height:64px;border-radius:var(--radius-asym-a);background:var(--accent-terracotta);color:#FFFCF7;display:flex;align-items:center;justify-content:center;font:700 28px 'Instrument Serif',Georgia,serif;flex-shrink:0}
.conq-text{flex:1}
.conq-eyebrow{font:10px 'JetBrains Mono',monospace;color:var(--accent-terracotta);letter-spacing:.12em}
.conq-title{font-family:'Instrument Serif',Georgia,serif;font-size:20px;line-height:1.15;margin:4px 0}
.conq-desc{font:13px Inter;color:var(--ink-secondary)}
.actions{display:flex;gap:18px;margin-top:12px;color:var(--ink-tertiary);font:12px 'JetBrains Mono',monospace}
.act{display:flex;align-items:center;gap:5px;cursor:pointer;min-height:44px}
</style></head><body>
<div class="feed">
  <div class="composer">
    <div class="av">A</div>
    <div class="compose-area">
      <textarea class="ta" placeholder="Partilha algo com a tua tribo…" data-element-id="post-text"></textarea>
      <div class="compose-actions">
        <div class="tools"><div class="tool" data-element-id="add-img">📷</div><div class="tool" data-element-id="add-link">🔗</div></div>
        <button class="publish" data-element-id="publish">Publicar</button>
      </div>
    </div>
  </div>
  <div class="card conquista-card">
    <div class="badge-big">★</div>
    <div class="conq-text">
      <div class="conq-eyebrow">CONQUISTA · TIER PRATA</div>
      <div class="conq-title">Top 8% — Estabilidade em decisão sob ambiguidade</div>
      <div class="conq-desc">Ana Manuela desbloqueou esta conquista após 12 simulações de Engenharia Civil.</div>
      <div class="actions"><div class="act" data-element-id="like-conq">♡ 24</div><div class="act" data-element-id="comment-conq">💬 5</div><div class="act" data-element-id="share-conq">↗ Partilhar</div></div>
    </div>
  </div>
  <div class="card">
    <div class="card-head"><div class="av" style="background:var(--accent-success)">JM</div><div><div class="card-name">João Mateus</div><div class="card-meta">MENTOR · MEDICINA · há 2h</div></div></div>
    <div class="card-text">Acabei de aprovar a primeira simulação Tipo 3 sobre cardiologia de emergência. Quem quer testar?</div>
    <div class="actions"><div class="act" data-element-id="like-jm">♡ 47</div><div class="act" data-element-id="comment-jm">💬 12</div><div class="act" data-element-id="bookmark-jm">⛉ Guardar</div><div class="act" data-element-id="share-jm">↗ Partilhar</div></div>
  </div>
</div>
</body></html>
```

## Eventos canónicos

- **Emite**: `post.publicado`, `comentario.criado`, `like.adicionado`, `bookmark.adicionado`, `partilha.criada`, `conquista.desbloqueada`.
- **Hooks G15**: Ranking · Feed (**Geral** + Vocacional dos seguidores) · Achievement (`participante-ativo`, `viral-100-likes`) · Notify (autor original do conteúdo curtido/comentado).