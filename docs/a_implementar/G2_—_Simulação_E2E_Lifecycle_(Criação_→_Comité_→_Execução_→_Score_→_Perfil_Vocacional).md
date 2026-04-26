# G2 — Simulação E2E Lifecycle (Criação → Comité → Execução → Score → Perfil Vocacional)

## Status

Draft · Depende de `spec:G15`, `spec:E1`, `spec:E2`, `spec:E4` (heuristics consolidação).

## Estado actual auditado

- ✅ UI builders: file:apps/web/src/features/mentor/CriarSimulacaoPage.tsx.
- ✅ Players: file:apps/web/src/features/simulacoes/Tipo1Player.tsx, `Tipo2Player.tsx`, `Tipo3Player.tsx` (+ specs).
- ✅ Catálogos: `SimulacaoListPage.tsx`, `SimulacaoDetailPage.tsx`, `SimulacaoPlayerPage.tsx`, `SimulacaoPublicoDetailPage.tsx`.
- ✅ Relatório: `RelatorioVocacional.tsx` + spec.
- ✅ Strapi: `simulacao`, `tentativa` (com `dataInicio/dataFim` + `metadata` per ADR-012).
- ✅ Rota BFF: file:apps/api/src/routes/simulacoes.ts + spec.
- ✅ Validação Comité: file:apps/web/src/features/comite/ValidacaoCientificaPage.tsx.
- ✅ Anti-fraude dual-layer: file:packages/shared/src/sanity/rules.ts.
- ✅ Heuristics: file:packages/shared/src/heuristics.ts + `heuristics-calculator.ts` (D1: paralelo em `apps/api/src/modules/analysis/heuristics.engine.ts` — fechado em `spec:E4-T1`).
- 🟡 `tentativa.concluida` mapeado para `simulacao.concluida` em `EVENT_TO_TRIGGER_MAP` (file:apps/api/src/modules/conquistas/conquistas.engine.ts linha 64).
- ❌ Faltam eventos: `simulacao.publicada` (após Comité), `tentativa.iniciada`, `tentativa.falhada`, `simulacao.aprovada`, `simulacao.rejeitada`.

## Estado canónico (spec:IMPORTANTE/04 §3.2)

- 3 tipos canónicos (Tipo 1 vídeo+checklist, Tipo 2 lab/iframe, Tipo 3 interactivo HUD).
- **Score derivado server-side** a partir de telemetria (regra anti-fraude D20–D22).
- Lifecycle obrigatório: `draft → review → approved (Comité) → published`.
- Tentativa concluída actualiza Perfil Vocacional automaticamente.

## Tickets

### G2-T1 — Builder Simulação com 3 tipos diferenciados

- Wizard adaptativo conforme tipo escolhido: Tipo 1 (vídeo URL + checklist), Tipo 2 (config iframe externo + critérios JSON), Tipo 3 (cenários + HUD config).
- Materiais necessários: campo "Lab Setup" (Enfermagem, Código, Diagnóstico, etc.).
- Tentativas máximas (0 = sem limite).
- Toggle "Pedir validação Comité Científico" obrigatório (não opt-in para simulações — sempre vai a Comité).
- **DoD E2E**:
  - **UI**: wizard adaptativo, preview do player no passo final, mobile-friendly mas com aviso "experiência completa em desktop".
  - **Contrato**: `CriarSimulacaoPayloadSchema` em `@pdc/shared`.
  - **BFF**: POST `/simulacoes` cria com `estado: 'review'`; emite `simulacao.criada`.
  - **Persistência**: Strapi `simulacao` + `executorConfig` JSON.
  - **Impacto**: simulação aparece na fila do Comité; G15 hooks correm com evento `simulacao.criada`.

### G2-T2 — Workflow Comité Científico de aprovação

- Página file:apps/web/src/features/comite/ValidacaoCientificaPage.tsx lista simulações `estado=review` ordenadas por antiguidade.
- Cada item: preview do player + botões Aprovar/Rejeitar com motivo obrigatório.
- Aprovar: `PATCH /comite/simulacoes/:id { estado: 'approved' }` → emite `comite.aprovou` + `simulacao.publicada`.
- Rejeitar: `PATCH /comite/simulacoes/:id { estado: 'draft', motivo }` → emite `comite.rejeitou`.
- Notifica autor via Notify hook.
- **DoD E2E**:
  - **UI**: fila Soul & Elite com BentoGrid; preview iframe seguro; AsymmetricButton "Aprovar".
  - **Contrato**: schema `ComiteAcaoPayload`.
  - **BFF**: `checkRole(['comite_cientifico','super_admin'])`.
  - **Persistência**: estado actualizado + audit-log.
  - **Impacto**: simulação aprovada entra no catálogo público + match terminal sugere a estudantes da área.

### G2-T3 — Execução com sanity dual-layer + score derivado

- `Tipo1/2/3Player.tsx`: emitem telemetria via `useTelemetry` hook (Edge primary, BFF fallback per `spec:E2`).
- Cliente NUNCA declara score (regra D20).
- `tentativa.iniciada` ao começar; `tentativa.concluida` ao submeter; `tentativa.falhada` se exceder tempo ou tentativas.
- Score derivado: BFF consumer agrega telemetria por `tentativaId` + aplica `heuristics-calculator` → calcula φ, R, foco, hesitação → score 0–100.
- Após score persistido, dispara `tentativa.concluida` no event bus.
- **DoD E2E**:
  - **UI**: HUDPanel (Tipo 2/3) mostra cronómetro + sanity status; toast "Score em cálculo" com loader Soul & Elite.
  - **Contrato**: `TentativaConcluidaPayload` com `tentativaId` mas sem `score`.
  - **BFF**: consumer reconstrói score; sanity dual-layer (edge + BFF).
  - **Persistência**: `tentativa.score` server-derived; `metadata` regista violations etiquetadas.
  - **Impacto**: G15 hooks → Perfil Vocacional re-avaliado, conquista `explorador-vocacional` se ≥3 simulações, notifica autor+estudante.

### G2-T4 — Relatório Vocacional Premium com Threaded Insights da Tina

- `RelatorioVocacional.tsx`: Bento layout com 6 dimensões (φ, R, foco, hesitação + 2 áreas), GlassCard lateral com `ThreadedInsights` da Tina (`spec:E4-T6`).
- Cada insight ancorado a uma simulação ou módulo específico.
- Botão "Partilhar relatório com mentor vinculado" (gera link com TTL 7 dias).
- **DoD E2E**:
  - **UI**: Bento responsive, Instrument Serif para score, JetBrains Mono para métricas.
  - **Contrato**: `RelatorioVocacionalSchema`.
  - **BFF**: GET `/vocacional/relatorio` autoriza apenas próprio + mentores vinculados.
  - **Persistência**: `perfil-vocacional` + `tina-insight` collection.
  - **Impacto**: estudante partilha → mentor recebe via Notify hook + acesso temporário ao relatório.

### G2-T5 — Tests E2E de fluxo completo

- Playwright: mentor cria simulação Tipo 2 → Comité aprova → estudante executa → recebe score real (não hardcoded 8.5).
- Vitest integration: telemetria duplicada (mesmo eventId) é deduped via SET NX EX (`spec:E2`).
- **DoD E2E**: testes passam.

## Wireframe — Player Tipo 2 com HUD lateral (mobile responsive collapsing)

```wireframe
<html><head><style>
:root { --surface-canvas-dark:#0E0D0C; --surface-elevated-dark:#18171A; --ink-primary-dark:#ECE7DD; --ink-secondary-dark:#B5AFA3; --ink-tertiary-dark:#807A6F; --accent-terracotta:#D2691E; --accent-success:#2F7A4F; --accent-warning:#C68A2E; --radius-md:10px; }
*{margin:0;padding:0;box-sizing:border-box} body{font-family:Inter,system-ui,sans-serif;background:var(--surface-canvas-dark);color:var(--ink-primary-dark);height:100vh;display:flex;flex-direction:column;overflow:hidden}
.top{display:flex;justify-content:space-between;padding:14px 20px;border-bottom:1px solid rgba(236,231,221,.08);align-items:center}
.title{font:600 13px Inter} .title small{color:var(--ink-tertiary-dark);margin-left:10px;font-weight:400}
.timer{font:600 14px 'JetBrains Mono',monospace;color:var(--accent-warning);padding:6px 12px;border:1px solid rgba(198,138,46,.30);border-radius:var(--radius-md);min-height:44px;display:flex;align-items:center}
.exit{background:transparent;color:var(--ink-tertiary-dark);border:1px solid rgba(236,231,221,.12);border-radius:var(--radius-md);padding:8px 14px;font-size:13px;cursor:pointer;min-height:44px}
.body{flex:1;display:grid;grid-template-columns:1fr 240px;overflow:hidden}
.scenario{padding:24px;overflow-y:auto;display:flex;flex-direction:column;gap:18px}
.eyebrow{font:11px 'JetBrains Mono',monospace;color:var(--accent-terracotta);letter-spacing:.12em}
.h2{font-family:'Instrument Serif',Georgia,serif;font-size:24px;line-height:1.2;margin-top:6px}
.opt{padding:14px;background:var(--surface-elevated-dark);border:1px solid rgba(236,231,221,.08);border-radius:var(--radius-md);cursor:pointer;min-height:44px;font-size:14px;color:var(--ink-primary-dark)}
.opt.sel{border-color:var(--accent-terracotta);background:rgba(210,105,30,.08)}
.confirm{background:var(--accent-terracotta);color:#FFFCF7;border:none;border-radius:18px 6px 18px 6px;padding:12px 22px;font:600 13px Inter;cursor:pointer;min-height:44px;align-self:flex-start;margin-top:8px}
.hud{background:rgba(0,0,0,.4);border-left:1px solid rgba(236,231,221,.08);padding:18px;display:flex;flex-direction:column;gap:14px;overflow-y:auto}
.hud-section{display:flex;flex-direction:column;gap:5px}
.hud-label{font:10px 'JetBrains Mono',monospace;color:var(--ink-tertiary-dark);letter-spacing:.10em}
.hud-big{font:600 24px 'JetBrains Mono',monospace} .hud-big.ok{color:var(--accent-success)} .hud-big.warn{color:var(--accent-warning)}
.hud-bar{height:4px;background:rgba(236,231,221,.06);border-radius:2px;overflow:hidden}
.hud-fill{height:100%;background:var(--accent-terracotta)}
.sanity{font:9px 'JetBrains Mono',monospace;color:var(--accent-success);letter-spacing:.10em;padding:4px 6px;background:rgba(47,122,79,.10);border-radius:4px;align-self:flex-start;margin-top:auto}
@media(max-width:768px){.body{grid-template-columns:1fr}.hud{display:none}}
</style></head><body>
<div class="top">
  <div class="title">Diagnóstico Médico — Tipo 2 <small>3 de 8</small></div>
  <div class="timer">28:42</div>
  <button class="exit" data-element-id="exit-sim">Sair</button>
</div>
<div class="body">
  <div class="scenario">
    <div><div class="eyebrow">CENÁRIO CLÍNICO</div><h2 class="h2">Doente 56a · Dor torácica 2h · TA 152/94 · ECG inversão T inferior. Que pedido prioritário fazes?</h2></div>
    <div class="opt" data-element-id="opt-a"><span style="color:var(--ink-tertiary-dark);margin-right:8px;font:600 11px monospace">A</span>Repetir ECG e aguardar troponina</div>
    <div class="opt sel" data-element-id="opt-b"><span style="color:var(--ink-tertiary-dark);margin-right:8px;font:600 11px monospace">B</span>Activar protocolo dor torácica + AAS 300mg + nitratos</div>
    <div class="opt" data-element-id="opt-c"><span style="color:var(--ink-tertiary-dark);margin-right:8px;font:600 11px monospace">C</span>Pedir ecocardiograma urgente antes de fármacos</div>
    <div class="opt" data-element-id="opt-d"><span style="color:var(--ink-tertiary-dark);margin-right:8px;font:600 11px monospace">D</span>Encaminhar observação sem intervenção</div>
    <button class="confirm" data-element-id="confirm">Confirmar decisão</button>
  </div>
  <div class="hud">
    <div class="hud-section"><div class="hud-label">FLUIDEZ φ</div><div class="hud-big ok">0.81</div><div class="hud-bar"><div class="hud-fill" style="width:81%"></div></div></div>
    <div class="hud-section"><div class="hud-label">RESILIÊNCIA R</div><div class="hud-big">0.67</div><div class="hud-bar"><div class="hud-fill" style="width:67%"></div></div></div>
    <div class="hud-section"><div class="hud-label">DECISÕES MUDADAS</div><div class="hud-big">2</div></div>
    <div class="sanity">SANITY DUAL-LAYER OK</div>
  </div>
</div>
</body></html>
```

## Eventos canónicos

- **Emite**: `simulacao.criada`, `simulacao.publicada`, `simulacao.aprovada`, `simulacao.rejeitada`, `tentativa.iniciada`, `tentativa.concluida`, `tentativa.falhada`, `comite.aprovou`, `comite.rejeitou`.
- **Hooks G15**: Ranking (autor + executante) · Feed (Vocacional sempre) · Match (sugere a estudantes área-afim) · Achievement (`explorador-vocacional`, `top-8-percent`) · Notify (autor, executante, mentores vinculados).