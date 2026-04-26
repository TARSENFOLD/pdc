# G12 — Match Terminal E2E (Algoritmo Soberano · Hub de Oportunidades B2B)

## Status

Draft · Depende de `spec:G15` (matchHook + match-suggestion collection), `spec:E1` (15 áreas).

## Estado actual auditado

- ✅ UI: file:apps/web/src/features/instituicao/PropostasPage.tsx.
- ✅ Strapi: file:infra/strapi/src/api/proposta/.../schema.json.
- ✅ Rota BFF: file:apps/api/src/routes/propostas.ts.
- ❌ Hub estudante "Match Terminal" não existe (spec:IMPORTANTE/02 B8 marcado ⏳).
- ❌ Algoritmo de match não implementado.
- ❌ Tracking conversão B2B inexistente.

## Estado canónico (spec:IMPORTANTE/02 B8 + Verdade Lateral 3)

- Instituição cria proposta → algoritmo cruza Perfil Vocacional dos estudantes com critérios → top N estudantes recebem no Hub Match Terminal → estudante aceita/rejeita/marca interesse → conversa privada inicia.
- Score ≥ tier mínimo (Bronze 0.4 / Prata 0.55 / Ouro 0.7 / Diamante 0.85).

## Tickets

### G12-T1 — Wizard "Criar Proposta Direta" para Instituição

- Página file:apps/web/src/features/instituicao/PropostasPage.tsx: refactor com wizard "Nova Proposta" → critérios (área, tier mínimo, número de candidatos N, mensagem, link/curso vinculado).
- Submit cria `proposta` + dispara matching algorithm.
- **DoD E2E**:
  - **UI**: wizard 3 passos Soul & Elite.
  - **Contrato**: `CriarPropostaPayload`.
  - **BFF**: POST `/propostas` com `checkRole(['instituicao','super_admin'])`.
  - **Persistência**: `proposta` collection.
  - **Impacto**: emite `proposta.criada` → G15 Match Hook gera `match-suggestion` para top N estudantes.

### G12-T2 — Hub estudante "Match Terminal"

- Nova página file:apps/web/src/features/estudante/MatchTerminalPage.tsx ("Hub de Oportunidades").
- BentoGrid com cards de oportunidades (propostas + cursos sugeridos + experiências sugeridas + projetos para colaborar + mentores recomendados).
- Cada card: GlassCard Soul & Elite com badge de tier requerido + score de afinidade visível.
- Ações: Aceitar / Marcar interesse / Rejeitar / Guardar.
- **DoD E2E**:
  - **UI**: BentoGrid mobile-first com lazy load.
  - **Contrato**: `MatchSuggestion` schema (G15).
  - **BFF**: `GET /match/sugestoes`.
  - **Persistência**: lê de `match-suggestion`.
  - **Impacto**: estudante reage → emite `match.suggestion_aceite` / `_rejeitada` / `_marcada_interesse` → notifica autor.

### G12-T3 — Conversa privada após match aceite

- Aceitar uma proposta cria conversation entre estudante e instituição/autor.
- Redirect para `/mensagens/:conversaId` com pre-filled context.
- **DoD E2E**:
  - **BFF**: `POST /match/sugestoes/:id/aceitar` cria conversation se não existe + emite `conversa.iniciada`.
  - **Impacto**: G13 Mensagens trata daqui em diante.

### G12-T4 — Analytics B2B de conversão

- Dashboard file:apps/web/src/features/instituicao/RelatoriosInstituicaoPage.tsx: secção "Funil Match Terminal".
- Métricas: candidatos sugeridos / vistos / interesse / aceite / matriculados.
- Top áreas de match.
- **DoD E2E**:
  - **UI**: Bento Soul & Elite com gráficos.
  - **BFF**: `GET /admin/match/analytics?instituicaoId=...`.
  - **Persistência**: agrega de `match-suggestion`.
  - **Impacto**: instituição mede ROI do PDC com dados.

### G12-T5 — Pesos Match tunáveis pelo super_admin

- Página file:apps/web/src/features/admin/FeedWeightsPage.tsx: adicionar tab "Pesos Match Terminal".
- Sliders para `pesoAreaAfinidade`, `pesoReputacao`, `pesoRecency`.
- Thresholds por tier.
- **DoD E2E**:
  - **UI**: sliders Soul & Elite com live preview.
  - **BFF**: `PUT /admin/match/weights`.
  - **Persistência**: `feature-flag` ou `match-weights` collection.
  - **Impacto**: super_admin tunes em produção sem deploy.

## Wireframe — Hub Match Terminal (mobile)

```wireframe
<html><head><style>
:root{--surface-canvas:#F8F9FA;--surface-elevated:#FAF6EE;--surface-recessed:#F2EFE8;--ink-primary:#2A2724;--ink-secondary:#5A5751;--ink-tertiary:#8A867F;--accent-terracotta:#D2691E;--institutional-cobalt:#004AAD;--accent-success:#2F7A4F;--radius-md:10px;--radius-lg:14px;--radius-asym-a:18px 6px 18px 6px}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;background:#2A2724;padding:20px;min-height:100vh;display:flex;justify-content:center}
.phone{width:380px;background:var(--surface-canvas);border-radius:36px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.4);border:8px solid #18171A;min-height:760px}
.head{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
.h1{font-family:'Instrument Serif',Georgia,serif;font-size:24px;line-height:1.1}
.h1 em{color:var(--accent-terracotta);font-style:italic}
.tag{font:9px 'JetBrains Mono',monospace;color:var(--accent-terracotta);background:rgba(210,105,30,.10);padding:4px 8px;border-radius:999px;letter-spacing:.08em}
.cards{display:flex;flex-direction:column;gap:12px}
.card{background:var(--surface-elevated);border-radius:var(--radius-lg);padding:14px;border-left:3px solid var(--accent-terracotta)}
.card.tier-ouro{border-left-color:#D4AF37}
.card-eyebrow{font:10px 'JetBrains Mono',monospace;color:var(--accent-terracotta);letter-spacing:.10em;display:flex;justify-content:space-between;align-items:center}
.card-score{background:var(--surface-recessed);padding:2px 6px;border-radius:999px;font-size:9px}
.card-title{font:600 14px Inter;margin:6px 0 4px}
.card-desc{font:12px Inter;color:var(--ink-secondary);line-height:1.45;margin-bottom:10px}
.card-from{display:flex;align-items:center;gap:8px;font:11px 'JetBrains Mono',monospace;color:var(--ink-tertiary);margin-bottom:10px;letter-spacing:.05em}
.av-mini{width:20px;height:20px;border-radius:50%;background:var(--accent-terracotta);color:#FFFCF7;display:flex;align-items:center;justify-content:center;font:600 10px Inter}
.actions{display:flex;gap:6px}
.btn{flex:1;font:600 11px Inter;padding:10px;border-radius:var(--radius-md);border:1px solid rgba(42,39,36,.12);background:transparent;cursor:pointer;min-height:44px;color:var(--ink-secondary)}
.btn.accept{background:var(--accent-terracotta);color:#FFFCF7;border:none;border-radius:var(--radius-asym-a)}
</style></head><body>
<div class="phone">
  <div class="head"><div class="h1">Hub de <em>Oportunidades</em></div><div class="tag">5 NOVAS</div></div>
  <div class="cards">
    <div class="card tier-ouro">
      <div class="card-eyebrow"><span>PROPOSTA · ISPTEC</span><span class="card-score">94% MATCH</span></div>
      <div class="card-title">Bolsa de Excelência Engenharia 2026</div>
      <div class="card-desc">Procuramos 12 estudantes com tier Ouro+ em Engenharia Civil. Avaliação técnica + entrevista.</div>
      <div class="card-from"><div class="av-mini">I</div>ISPTEC · 5 VAGAS</div>
      <div class="actions"><button class="btn" data-element-id="rej-1">Não me interessa</button><button class="btn accept" data-element-id="acc-1">Aceitar</button></div>
    </div>
    <div class="card">
      <div class="card-eyebrow"><span>CURSO SUGERIDO · MENTOR</span><span class="card-score">87% MATCH</span></div>
      <div class="card-title">Cálculo Estrutural Aplicado</div>
      <div class="card-desc">Eng.ª Beatriz Domingos publicou novo curso compatível com o teu perfil.</div>
      <div class="card-from"><div class="av-mini">B</div>BEATRIZ DOMINGOS · TIER OURO</div>
      <div class="actions"><button class="btn" data-element-id="rej-2">Mais tarde</button><button class="btn accept" data-element-id="acc-2">Ver curso</button></div>
    </div>
    <div class="card">
      <div class="card-eyebrow"><span>SHADOW A PRO</span><span class="card-score">82% MATCH</span></div>
      <div class="card-title">Acompanha Dr. João Mateus por 1 dia</div>
      <div class="card-desc">Cardiologista experiente, 2 vagas restantes este mês.</div>
      <div class="card-from"><div class="av-mini">J</div>DR. JOÃO MATEUS · MEDICINA</div>
      <div class="actions"><button class="btn" data-element-id="rej-3">Não</button><button class="btn accept" data-element-id="acc-3">Candidatar</button></div>
    </div>
  </div>
</div>
</body></html>
```

## Eventos canónicos

- **Consome**: `*.publicado` para gerar sugestões.
- **Emite**: `proposta.criada`, `match.suggestion_aceite`, `match.suggestion_rejeitada`, `match.suggestion_marcada_interesse`, `conversa.iniciada`.
- **Hooks G15**: principal consumidor do output do matchHook.