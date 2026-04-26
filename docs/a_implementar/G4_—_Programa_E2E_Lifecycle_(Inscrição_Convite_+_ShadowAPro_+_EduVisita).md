# G4 — Programa E2E Lifecycle (Inscrição/Convite + ShadowAPro + EduVisita)

## Status

Draft · Depende de `spec:G15`, `spec:E1`, `spec:E3`.

## Estado actual auditado

- ✅ UI: file:apps/web/src/features/instituicao/CriarProgramaPage.tsx, `InstituicaoProgramasPage.tsx`, `ProgramasCatalogoPage.tsx`, `ProgramaDetailPage.tsx`.
- ✅ Strapi: file:infra/strapi/src/api/programa/.../schema.json com `tipo: ['standard','shadowapro','eduvisit']`.
- ✅ Rota BFF: file:apps/api/src/routes/programas.ts.
- ❌ **5 elementos canónicos faltam** (resolvido em `spec:E3-T1`): proposito, metodologia, cronograma estruturado, responsavel relation, regrasMatricula.
- ❌ Eventos: nenhum dos 7 canónicos é emitido.
- ❌ Workflow Moderador para aprovação (spec:IMPORTANTE/04 §3.4 "🔴 Todos os Programas precisam ser aprovados pelo Moderador").
- ❌ Triggers especiais para `shadowapro` (vínculo automático mentor) e `eduvisit` (calendário).

## Estado canónico (spec:IMPORTANTE/04 §3.4)

- 5 elementos obrigatórios: Propósito, Metodologia, Recursos, Cronograma, Responsável.
- Aprovação Moderador obrigatória (`draft → review → approved → published`).
- Acesso por inscrição livre OU convite individual OU convite institucional.
- Programas seed canónicos: `shadowapro` (acompanhar profissional) e `eduvisit` (visita guiada).

## Tickets

### G4-T1 — Wizard `CriarProgramaPage` com 5 elementos canónicos

- Wizard: 1.Propósito · 2.Metodologia · 3.Recursos · 4.Cronograma · 5.Responsável · 6.Acesso · 7.Conteúdos opcionais (cursos/exp/sim/proj).
- Cronograma: editor visual de etapas (timeline) com `[{titulo, dataInicio, dataFim, responsavel}]`.
- Responsável: search-select de perfis (mentor ou instituição-staff).
- Acesso: escolha "inscrição livre" / "por convite" / "misto" + selector de capacidade.
- Tipo: dropdown `standard | shadowapro | eduvisit` (após `spec:E3-T1`).
- Submete sempre em `estado: 'review'` (Moderador).
- **DoD E2E**:
  - **UI**: wizard 7 passos, BentoGrid no resumo, AsymmetricButton CTA.
  - **Contrato**: `CriarProgramaPayloadSchema` actualizado.
  - **BFF**: POST `/programas` com lifecycle hook que valida 5 elementos.
  - **Persistência**: `programa` + relations (cursos[], experiencias[], etc).
  - **Impacto**: emite `programa.criada` → entra fila Moderador.

### G4-T2 — Workflow Moderador aprovação Programa

- Página file:apps/web/src/features/moderacao/FilaAprovacaoPage.tsx (refactor): listar programas em `review` ordenados por antiguidade.
- Aprovar/Rejeitar com motivo. Rejeição volta a `draft` notifica autor.
- Super Admin pode forçar publish.
- **DoD E2E**:
  - **UI**: fila com BentoGrid, preview, AsymmetricButton.
  - **BFF**: `POST /moderacao/programas/:id/aprovar` + `/rejeitar` requer `checkRole(['moderador','super_admin'])`.
  - **Impacto**: emite `programa.aprovado` ou `moderador.rejeitou` → G15 hooks; estado `published` injecta no Feed Institucional.

### G4-T3 — Triggers especiais ShadowAPro

- Página file:apps/web/src/features/catalogo/MentoresCatalogoPage.tsx + `MentorPublicoPerfilPage.tsx`: adicionar **botão "Shadow a Pro"** no card e perfil de cada mentor.
- Click → modal de candidatura (motivo, dias preferidos) → POST `/programas/shadowapro/candidatar { mentorId, motivo, dias }`.
- BFF cria `programa-inscricao` + emite `shadowapro.vinculo_criado` → notifica mentor.
- Mentor aprova → cria `vinculo` (status aprovado) entre estudante e mentor + sessão agendada.
- **DoD E2E**:
  - **UI**: botão Soul & Elite no card, modal GlassCard.
  - **Contrato**: `ShadowAProCandidatura` schema.
  - **BFF**: rota dedicada com checkRole(estudante).
  - **Persistência**: cria sessão agendada em `agenda` collection.
  - **Impacto**: emite eventos → G15 → match boost para mentor; achievement `mentor-vinculado` para estudante.

### G4-T4 — Triggers especiais EduVisita

- Página file:apps/web/src/features/catalogo/InstituicoesCatalogoPage.tsx + `InstituicaoPublicoPerfilPage.tsx`: adicionar **botão "Agendar EduVisita"**.
- Click → calendário com slots da instituição + form de candidatura.
- BFF: POST `/programas/eduvisit/agendar` cria `eduvisita-agendamento` collection (criar) + envia para aprovação da instituição.
- Instituição aprova via dashboard → cria evento no calendário + adiciona aos calendários ICS dos participantes.
- **DoD E2E**:
  - **UI**: calendário Soul & Elite mobile-first.
  - **Contrato**: `EduVisitaAgendamento` schema.
  - **BFF**: rotas dedicadas + integração com email (Resend) para ICS.
  - **Persistência**: `eduvisita-agendamento` + `agenda`.
  - **Impacto**: emite `eduvisita.agendada` → G15 → notifica participantes em todos os canais (incluindo email com ICS attachment).

### G4-T5 — Convites institucionais (uma instituição inscreve outra OU os seus alunos)

- Dashboard instituição: secção "Programas onde participo / agendo".
- Action "Convidar instituição" (super_admin de instituição A pode convidar instituição B).
- Action "Inscrever os meus alunos" (instituição com `planoAtivo: institucional_premium` pode bulk-enrol estudantes vinculados).
- **DoD E2E**:
  - **UI**: painel B2B Soul & Elite.
  - **BFF**: `POST /programas/:id/convidar-instituicao` + `POST /programas/:id/inscrever-alunos-em-massa`.
  - **Persistência**: `programa-convite` collection (criar).
  - **Impacto**: emite `programa.convite_enviado` + `programa.convite_aceite`; G15 hooks; track conversão B2B.

## Wireframe — Botão "Shadow a Pro" no card de Mentor

```wireframe
<html><head><style>
:root{--surface-canvas:#F8F9FA;--surface-elevated:#FAF6EE;--surface-recessed:#F2EFE8;--ink-primary:#2A2724;--ink-secondary:#5A5751;--ink-tertiary:#8A867F;--accent-terracotta:#D2691E;--accent-success:#2F7A4F;--radius-md:10px;--radius-lg:14px;--radius-asym-a:18px 6px 18px 6px}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;background:var(--surface-canvas);padding:24px;min-height:100vh}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:1200px;margin:0 auto}
.card{background:var(--surface-elevated);border-radius:var(--radius-lg);padding:20px;display:flex;flex-direction:column}
.head{display:flex;gap:14px;margin-bottom:14px}
.av{width:56px;height:56px;border-radius:var(--radius-asym-a);background:var(--accent-terracotta);color:#FFFCF7;display:flex;align-items:center;justify-content:center;font:700 22px 'Instrument Serif',Georgia,serif;flex-shrink:0}
.id{flex:1}
.name{font:600 15px Inter}
.meta{font:11px 'JetBrains Mono',monospace;color:var(--ink-tertiary);letter-spacing:.06em;margin-top:3px}
.tier{font:9px 'JetBrains Mono',monospace;color:var(--accent-success);background:rgba(47,122,79,.10);padding:3px 8px;border-radius:999px;letter-spacing:.06em;align-self:flex-start}
.bio{font:13px Inter;color:var(--ink-secondary);line-height:1.5;margin:8px 0 16px}
.stats{display:flex;justify-content:space-between;font:11px 'JetBrains Mono',monospace;color:var(--ink-tertiary);margin-bottom:12px;padding:10px;background:var(--surface-recessed);border-radius:var(--radius-md);letter-spacing:.05em}
.actions{display:flex;gap:8px;margin-top:auto}
.btn{font:500 12px Inter;padding:10px 12px;border-radius:var(--radius-md);border:1px solid rgba(42,39,36,.12);background:transparent;cursor:pointer;min-height:44px;color:var(--ink-primary);flex:1}
.shadow{background:var(--accent-terracotta);color:#FFFCF7;border:none;border-radius:var(--radius-asym-a);font-weight:600}
</style></head><body>
<div class="grid">
  <div class="card">
    <div class="head"><div class="av">BD</div><div class="id"><div class="name">Eng.ª Beatriz Domingos</div><div class="meta">ENGENHARIA CIVIL · ISPTEC</div><div class="tier" style="margin-top:4px">TIER OURO</div></div></div>
    <div class="bio">15 anos em estruturas e fundações. Mentor de elite em projeto de obra real.</div>
    <div class="stats"><span>4.9 ⭐</span><span>87 MENTORADOS</span><span>3/5 SLOTS</span></div>
    <div class="actions">
      <button class="btn" data-element-id="ver-perfil">Ver perfil</button>
      <button class="btn shadow" data-element-id="shadow-bd">Shadow a Pro →</button>
    </div>
  </div>
  <div class="card">
    <div class="head"><div class="av">JM</div><div class="id"><div class="name">Dr. João Mateus</div><div class="meta">MEDICINA · UAN</div><div class="tier" style="margin-top:4px">TIER PRATA</div></div></div>
    <div class="bio">Cardiologista no Hospital Américo Boavida. Adora ensinar.</div>
    <div class="stats"><span>4.7 ⭐</span><span>34 MENTORADOS</span><span>2/3 SLOTS</span></div>
    <div class="actions">
      <button class="btn" data-element-id="ver-perfil-jm">Ver perfil</button>
      <button class="btn shadow" data-element-id="shadow-jm">Shadow a Pro →</button>
    </div>
  </div>
</div>
</body></html>
```

## Eventos canónicos

- **Emite**: `programa.criada`, `programa.publicado`, `programa.aprovado`, `moderador.aprovou`, `moderador.rejeitou`, `programa.inscricao`, `programa.convite_enviado`, `programa.convite_aceite`, `shadowapro.vinculo_criado`, `eduvisita.agendada`.
- **Hooks G15**: Ranking · Feed (**Institucional**) · Match (especial: shadowapro recomenda mentores top-tier; eduvisita recomenda instituições afinidade área) · Achievement (`mentor-vinculado` para estudante, `5-mentorados-aceites` para mentor) · Notify (todos canais; eduvisita anexa ICS).