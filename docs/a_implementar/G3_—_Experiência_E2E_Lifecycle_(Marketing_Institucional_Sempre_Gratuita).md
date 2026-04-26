# G3 — Experiência E2E Lifecycle (Marketing Institucional Sempre Gratuita)

## Status

Draft · Depende de `spec:G15`, `spec:E1`.

## Estado actual auditado

- ✅ UI: file:apps/web/src/features/instituicao/CriarExperienciaPage.tsx, file:apps/web/src/features/experiencias/ExperienciaDetailPage.tsx, `ExperienciaListPage.tsx`.
- ✅ Strapi: file:infra/strapi/src/api/experiencia/.../schema.json.
- ✅ Rota BFF: file:apps/api/src/routes/experiencias.ts.
- ✅ Schema Zod: file:packages/shared/src/experiencias.ts + `schemas/experiencias.ts`.
- 🟡 Evento `experiencia.publicada` no enum mas verificar se é emitido pelos routes.
- ❌ Faltam: 3 painéis canónicos estruturados (Realidade · Vozes · Guia) — schema actual é demasiado livre. Q&A interativo. Bloco vocacional Tina.

## Estado canónico (spec:IMPORTANTE/04 §3.1)

- **Sempre gratuita** (regra inegociável; alteração requer Super Admin + ADR).
- 3 painéis obrigatórios: **Painel de Realidade** (estatísticas mercado), **Mural de Vozes** (depoimentos vídeo), **Guia Institucional** (campus + corpo docente).
- Validação Comité Científico para autenticidade.

## Tickets

### G3-T1 — Refactor schema Strapi `experiencia` para 3 painéis estruturados

- Adicionar JSON estruturado com 3 secções obrigatórias: `painelRealidade { empregabilidade, salarioMedio, taxaConclusao, principaisEmpregadores }`, `muralVozes [{ tipo: 'aluno|professor|profissional', nome, videoUrl, citacao }]`, `guiaInstitucional { fotosCampus[], biblioteca, laboratorios, corpoDocente, timelineCurricular }`.
- Lifecycle hook: ao publish, valida que os 3 painéis estão preenchidos com mínimos (ex.: ≥3 vídeos no Mural).
- **Constraint Strapi**: `gratuito: true` hardcoded; lifecycle bloqueia qualquer tentativa de `gratuito: false`.
- **DoD E2E**:
  - **Contrato**: `ExperienciaCanonicaSchema` em `@pdc/shared` com 3 painéis.
  - **Persistência**: tentativa de publish sem painel completo retorna erro claro.
  - **Impacto**: experiências publicadas garantidamente seguem o canon.

### G3-T2 — Wizard `CriarExperienciaPage` com 3 separadores

- Tabs: "Painel de Realidade" · "Mural de Vozes" · "Guia Institucional" + tab final "Rever & Submeter".
- Mural de Vozes: upload de vídeos para R2 (max 50MB cada per spec:IMPORTANTE/01 §13) ou embed YouTube/Vimeo.
- Painel de Realidade: form com campos numéricos validados (ex.: empregabilidade 0–100%).
- Guia Institucional: upload de fotos para R2 + rich text para corpo docente + timeline drag-n-drop curricular.
- Botão "Submeter para Comité" (não há "Publicar" directo).
- **DoD E2E**:
  - **UI**: wizard 4 tabs Soul & Elite, mobile-first, 44px, AspirationalEmpty quando vazio.
  - **Contrato**: payload tipado.
  - **BFF**: POST `/experiencias` com `estado: 'review'` + `gratuito: true` forçado server-side.
  - **Persistência**: 3 painéis estruturados.
  - **Impacto**: emite `experiencia.criada` → Comité notificado.

### G3-T3 — Página detalhe pública com bloco vocacional Tina (autenticados)

- `ExperienciaDetailPage.tsx`: layout com 3 painéis + Q&A + GlassCard lateral com bloco Tina apenas para autenticados.
- Visitantes vêem 3 painéis completos (marketing).
- Autenticados vêem extra: "A Tina lê estes dados e diz: este curso parece-me compatível com perfis com R≥0.7 e φ≥0.8".
- Botão "Participar" (autenticado) → entra na lista de inscritos da instituição (sem cobrar).
- Botão "Faz uma pergunta" → Q&A interativo público com moderação inline.
- **DoD E2E**:
  - **UI**: hero com vídeo do Mural de Vozes, scroll-snap por painel, mobile-first.
  - **Contrato**: `ExperienciaParticipacaoPayload` (vazio, só `experienciaId`).
  - **BFF**: POST `/experiencias/:id/participar` requer auth, persiste em `experiencia-participante` collection (criar).
  - **Persistência**: tracking de participação.
  - **Impacto**: emite `experiencia.visualizada` (telemetria) e `experiencia.participacao` → instituição vê aluno no dashboard B2B; G15 Match Hook usa para boost de afinidade.

### G3-T4 — Q&A interativo

- Componente `ExperienciaQA` com lista de perguntas + respostas. Pergunta = `qa-pergunta` collection. Resposta = `qa-resposta`.
- Moderação: instituição/mentor autor responde; outras perguntas em fila se autor <7 dias.
- Likes em perguntas para sinal de relevância.
- **DoD E2E**:
  - **UI**: lista expansível mobile-first com 44px tap.
  - **Contrato**: `QAPerguntaPayload`, `QARespostaPayload`.
  - **BFF**: rotas `POST /experiencias/:id/qa/perguntar` e `/responder`.
  - **Persistência**: 2 collections novas em Strapi.
  - **Impacto**: emite `experiencia.qa.respondida` → Notify autor da pergunta.

## Wireframe — Página Experiência (3 painéis + bloco Tina)

```wireframe
<!DOCTYPE html><html><head><style>
:root{--surface-canvas:#F8F9FA;--surface-elevated:#FAF6EE;--surface-recessed:#F2EFE8;--ink-primary:#2A2724;--ink-secondary:#5A5751;--ink-tertiary:#8A867F;--accent-terracotta:#D2691E;--institutional-cobalt:#004AAD;--radius-md:10px;--radius-lg:14px;--radius-asym-a:18px 6px 18px 6px}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;background:var(--surface-canvas);color:var(--ink-primary)}
.hero{padding:60px 32px 40px;max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 380px;gap:40px;align-items:start}
.eyebrow{font:11px 'JetBrains Mono',monospace;color:var(--institutional-cobalt);letter-spacing:.12em}
.h1{font-family:'Instrument Serif',Georgia,serif;font-size:44px;line-height:1.05;margin:8px 0 16px}
.h1 em{color:var(--accent-terracotta);font-style:italic}
.sub{font-size:16px;color:var(--ink-secondary);margin-bottom:20px}
.cta{background:var(--accent-terracotta);color:#FFFCF7;border:none;border-radius:var(--radius-asym-a);padding:14px 22px;font:600 14px Inter;cursor:pointer;min-height:44px}
.video{aspect-ratio:9/16;background:var(--surface-elevated);border-radius:var(--radius-lg);position:relative;overflow:hidden}
.video::after{content:'▶';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#FFFCF7;font-size:48px;background:rgba(42,39,36,.4)}
.section{padding:48px 32px;max-width:1200px;margin:0 auto}
.section-eyebrow{font:11px 'JetBrains Mono',monospace;color:var(--accent-terracotta);letter-spacing:.12em}
.section-h{font-family:'Instrument Serif',Georgia,serif;font-size:32px;line-height:1.1;margin:8px 0 24px}
.realidade{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
.stat{background:var(--surface-elevated);border-radius:var(--radius-lg);padding:20px}
.stat-num{font-family:'Instrument Serif',Georgia,serif;font-size:36px;color:var(--accent-terracotta);line-height:1}
.stat-lab{font:11px 'JetBrains Mono',monospace;color:var(--ink-tertiary);letter-spacing:.06em;margin-top:8px}
.tina{background:rgba(250,246,238,.92);backdrop-filter:blur(18px) saturate(140%);border:1px solid rgba(42,39,36,.08);border-radius:var(--radius-lg);padding:20px;position:sticky;top:20px}
.tina-mark{width:28px;height:28px;border-radius:18px 6px 18px 6px;background:var(--accent-terracotta);color:#FFFCF7;display:inline-flex;align-items:center;justify-content:center;font:700 12px 'Instrument Serif',Georgia,serif;margin-right:8px;vertical-align:middle}
.tina-text{font-style:italic;font:14px Inter;color:var(--ink-primary);line-height:1.5;margin-top:12px}
@media(max-width:768px){.hero{grid-template-columns:1fr;padding:40px 16px}.realidade{grid-template-columns:1fr 1fr}}
</style></head><body>
<section class="hero">
  <div>
    <div class="eyebrow">EXPERIÊNCIA · ISPTEC · ENGENHARIA CIVIL</div>
    <h1 class="h1">Como é <em>realmente</em> ser engenheiro civil em Luanda.</h1>
    <p class="sub">3 painéis honestos: realidade do mercado, vozes de quem está lá, e o campus por dentro. Sempre gratuito.</p>
    <button class="cta" data-element-id="participar">Participar (gratuito)</button>
  </div>
  <div class="video"></div>
</section>
<section class="section">
  <div class="section-eyebrow">PAINEL 1 · REALIDADE DO MERCADO</div>
  <h2 class="section-h">Os números que ninguém te conta na entrevista de orientação.</h2>
  <div class="realidade">
    <div class="stat"><div class="stat-num">82%</div><div class="stat-lab">EMPREGABILIDADE 1 ANO</div></div>
    <div class="stat"><div class="stat-num">350k</div><div class="stat-lab">SALÁRIO MÉDIO INÍCIO (AOA)</div></div>
    <div class="stat"><div class="stat-num">68%</div><div class="stat-lab">TAXA DE CONCLUSÃO</div></div>
    <div class="stat"><div class="stat-num">12</div><div class="stat-lab">PRINCIPAIS EMPREGADORES</div></div>
  </div>
</section>
<section class="section" style="display:grid;grid-template-columns:1fr 320px;gap:32px">
  <div>
    <div class="section-eyebrow">PAINEL 2 · MURAL DE VOZES</div>
    <h2 class="section-h">5 depoimentos de alunos atuais e ex-alunos.</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="video" style="aspect-ratio:9/16"></div><div class="video" style="aspect-ratio:9/16"></div>
    </div>
  </div>
  <div class="tina">
    <div><span class="tina-mark">T</span><strong style="font:600 13px Inter">Tina · análise vocacional</strong></div>
    <div class="tina-text">"Os teus dados (φ=0.78, R=0.64) sugerem alta compatibilidade com este curso. A taxa de conclusão de 68% é consistente com o teu padrão de resiliência."</div>
  </div>
</section>
</body></html>
```

## Eventos canónicos

- **Emite**: `experiencia.criada`, `experiencia.publicada` (após Comité), `experiencia.visualizada`, `experiencia.participacao`, `experiencia.qa.respondida`, `comite.aprovou`.
- **Hooks G15**: Ranking (instituição/mentor) · Feed (**Institucional sempre** — Verdade Lateral 2) · Match (sugere a estudantes da área) · Achievement (`partilha-de-experiencia`) · Notify (estudantes que perguntaram, instituição vinculada).