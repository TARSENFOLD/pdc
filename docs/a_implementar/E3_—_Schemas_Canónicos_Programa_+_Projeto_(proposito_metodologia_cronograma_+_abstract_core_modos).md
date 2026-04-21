# E3 — Schemas Canónicos Programa + Projeto (proposito/metodologia/cronograma + abstract/core/modos)

## Status

Draft · Depende de E1.

## Estado actual

**Programa** — file:infra/strapi/src/api/programa/.../schema.json:

- Tem: `titulo, descricao, area, modalidade, duracao, vagas, requisitos, tags, tipo (standard/shadowapro/eduvisit), dataInicio, dataFim, metadata`.
- **Faltam os 5 elementos obrigatórios** (spec:IMPORTANTE/04 §3.4): `proposito`, `metodologia`, `cronograma` (estruturado), `responsavel` (relação `→perfil`), `regrasMatricula`.
- Falta lista relacional `cursos[]`, `experiencias[]`, `simulacoes[]`, `projetos[]`.
- Falta `precoPolicy`, `criadorTipo` enum (mentor|instituicao).

**Projeto** — file:infra/strapi/src/api/projeto/.../schema.json:

- Tem: `slug, titulo, descricao, area, estado, autor, colaboradores, tags, mediaUrls, repositorioUrl, visibilidade (publico/privado), buscandoParceiros`.
- **Faltam camadas**: `abstract` (público) e `core` (privado/encriptado/ACL) — spec:IMPORTANTE/04 §3.5 "Pitch Seguro".
- **Falta enum modos**: `Exposicao | Colaboracao | Mentoria | Financiamento | FeedbackComunitario`.
- Falta sistema de pedidos de acesso ao Core (collection `projeto-acesso-pedido`).

## Estado canónico

spec:IMPORTANTE/04 §3.4 (Programa) + §3.5 (Projeto).

## Tickets

### E3-T1 — Estender schema Programa

- Adicionar: `proposito` (text required), `metodologia` (text), `cronograma` (json estruturado: { etapas: [{titulo, dataInicio, dataFim, responsavel}] }), `responsavel` (relation manyToOne perfil), `regrasMatricula` (json), `precoPolicy` (json), `criadorTipo` (enum mentor|instituicao).
- Relações: `cursos: relation manyToMany`, `experiencias: relation manyToMany`, `simulacoes: relation manyToMany`, `projetos: relation manyToMany`.
- Migration script para programs existentes (defaults vazios).
- **DoD E2E**:
  - **UI**: `CriarProgramaPage` (file:apps/web/src/features/instituicao/CriarProgramaPage.tsx) ganha campos para os 5 elementos + selector de cursos/experiências.
  - **Contrato**: Zod schema em file:packages/shared/src/programas.ts actualizado.
  - **BFF**: rota `programas.ts` aceita novos campos com validação.
  - **Persistência**: Strapi guarda + retorna; relations populated correctly.
  - **Impacto**: Programa "Shadow a Pro" e "EduVisita" usam o `tipo` enum + cronograma estruturado; aprovação Moderador (spec:IMPORTANTE/04 §3.4).

### E3-T2 — Refactor schema Projeto para "Pitch Seguro"

- Renomear/dividir: `descricao` curta + `abstract` (json public layer: titulo, problema, impacto, categoria, tags, mediaUrls de showcase) + `core` (json private layer encriptado: metodologia, dadosSensiveis, codigoFonte, planosTecnicos).
- Adicionar `modos` (json array de enum): `[Exposicao, Colaboracao, Mentoria, Financiamento, FeedbackComunitario]`.
- Adicionar relação `pedidosAcesso: relation oneToMany → projeto-acesso-pedido`.
- Criar nova collection `projeto-acesso-pedido` (perfilSolicitante, motivo, status, dataResposta).
- Adicionar `selo: enum [aptidao_validada, comite_aprovado, mentor_endorsed]`.
- **DoD E2E**:
  - **UI**: `ProjetoFormPage` ganha 2 abas (Pitch Público vs Core Privado) + checkboxes de modos + dashboard de pedidos.
  - **Contrato**: Zod com `abstract` (público sempre) + `core` (privado, ACL filtrado server-side).
  - **BFF**: serializer público nunca devolve `core` a quem não tem acesso. Endpoint POST `/projetos/:id/pedidos-acesso`.
  - **Persistência**: `core` encriptado at-rest (libsodium ou KMS). ACL guardado em `colaboradores[]` + `pedidosAcesso aprovados`.
  - **Impacto**: estudante pode publicar projeto sem revelar segredo; mentor solicita acesso; autor aprova/rejeita; selo "Aptidão Validada" gerado pelo Programa onde o aluno passou.

### E3-T3 — Atualizar shared schemas

- file:packages/shared/src/programas.ts + file:packages/shared/src/schemas/programas.ts: refletir novos campos.
- file:packages/shared/src/projetos.ts + file:packages/shared/src/schemas/projetos.ts: split abstract/core, modos enum.
- **DoD E2E**: typecheck + tests passam.

### E3-T4 — Lifecycle hooks Strapi para validação canónica

- Programa: ao publish, valida que tem `proposito`, `metodologia`, `responsavel`, `cronograma`. Se faltam, força `estado: draft`.
- Projeto: ao publish, valida que tem `abstract.titulo` + `abstract.problema`. `core` opcional.
- **DoD E2E**: tentativa de publicar Programa incompleto retorna erro claro com lista dos campos faltantes.

### Wireframe — Projeto Form Pitch Seguro (2 abas)

```wireframe

<html>
<head>
<style>
:root {
  --surface-canvas: #F8F9FA;
  --surface-elevated: #FAF6EE;
  --surface-recessed: #F2EFE8;
  --ink-primary: #2A2724;
  --ink-secondary: #5A5751;
  --ink-tertiary: #8A867F;
  --accent-terracotta: #D2691E;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-asym-a: 18px 6px 18px 6px;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Inter, system-ui, sans-serif; background: var(--surface-canvas); color: var(--ink-primary); padding: 24px; min-height: 100vh; }
.layout { max-width: 880px; margin: 0 auto; }
.eyebrow { font: 11px 'JetBrains Mono', ui-monospace; color: var(--accent-terracotta); letter-spacing: 0.12em; }
.h1 { font-family: 'Instrument Serif', Georgia, serif; font-size: 32px; line-height: 1.1; margin: 8px 0 24px; }
.tabs { display: flex; gap: 0; border-bottom: 1px solid rgba(42,39,36,0.10); margin-bottom: 24px; }
.tab { padding: 14px 18px; font: 500 13px Inter; color: var(--ink-tertiary); cursor: pointer; border-bottom: 2px solid transparent; display: flex; align-items: center; gap: 8px; min-height: 44px; }
.tab.active { color: var(--accent-terracotta); border-bottom-color: var(--accent-terracotta); }
.tab-icon { font-size: 14px; }
.privacy-pill { font: 9px 'JetBrains Mono', ui-monospace; padding: 2px 8px; border-radius: 999px; letter-spacing: 0.08em; }
.privacy-pill.public { background: rgba(0,74,173,0.10); color: #004AAD; }
.privacy-pill.private { background: rgba(178,59,46,0.10); color: #B23B2E; }
.panel { background: var(--surface-elevated); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 16px; }
.panel-banner { font: 12px Inter; color: var(--ink-secondary); padding: 10px 14px; background: var(--surface-recessed); border-radius: var(--radius-md); margin-bottom: 16px; border-left: 3px solid var(--accent-terracotta); }
.field { margin-bottom: 16px; }
.label { font: 600 12px Inter; color: var(--ink-primary); display: block; margin-bottom: 6px; letter-spacing: 0.02em; }
.label-meta { font: 10px 'JetBrains Mono', ui-monospace; color: var(--ink-tertiary); margin-left: 8px; letter-spacing: 0.08em; }
.input, .textarea { width: 100%; background: var(--surface-recessed); border: 1px solid rgba(42,39,36,0.10); border-radius: var(--radius-md); padding: 12px 14px; font: 14px Inter; color: var(--ink-primary); min-height: 44px; }
.textarea { min-height: 100px; resize: vertical; }
.modes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.mode-chip { padding: 12px; background: var(--surface-recessed); border: 1px solid rgba(42,39,36,0.10); border-radius: var(--radius-md); font-size: 13px; cursor: pointer; min-height: 44px; display: flex; align-items: center; gap: 8px; }
.mode-chip.selected { border-color: var(--accent-terracotta); background: rgba(210,105,30,0.06); color: var(--accent-terracotta); }
.actions { display: flex; gap: 12px; margin-top: 24px; }
.btn { font: 500 13px Inter; padding: 12px 20px; border-radius: var(--radius-md); border: 1px solid rgba(42,39,36,0.12); background: transparent; color: var(--ink-primary); cursor: pointer; min-height: 44px; }
.btn-primary { background: var(--accent-terracotta); color: #FFFCF7; border: none; border-radius: var(--radius-asym-a); font-weight: 600; }
</style>
</head>
<body>
<div class="layout">
  <div class="eyebrow">PROJETO · CRIAR / EDITAR</div>
  <h1 class="h1">Vamos contar o teu projeto da forma certa.</h1>

  <div class="tabs">
    <div class="tab active" data-element-id="tab-pitch">
      <span class="tab-icon">🌐</span> Pitch Público <span class="privacy-pill public">VISÍVEL</span>
    </div>
    <div class="tab" data-element-id="tab-core">
      <span class="tab-icon">🔒</span> Core Privado <span class="privacy-pill private">ACL</span>
    </div>
    <div class="tab" data-element-id="tab-pedidos">
      <span class="tab-icon">📨</span> Pedidos de Acesso <span class="privacy-pill private">3</span>
    </div>
  </div>

  <div class="panel">
    <div class="panel-banner">Esta camada é vista por todos. Não inclui código, dados sensíveis ou metodologia detalhada — só o que precisas para te apresentares ao mundo.</div>

    <div class="field">
      <label class="label">Título do projeto <span class="label-meta">PÚBLICO</span></label>
      <input class="input" data-element-id="abstract-titulo" placeholder="App de Gestão de Resíduos para Luanda">
    </div>
    <div class="field">
      <label class="label">Que problema resolve? <span class="label-meta">PÚBLICO</span></label>
      <textarea class="textarea" data-element-id="abstract-problema" placeholder="Em Luanda há 7 mil pontos críticos de acumulação..."></textarea>
    </div>
    <div class="field">
      <label class="label">Modos do projeto <span class="label-meta">ESCOLHE 1 OU MAIS</span></label>
      <div class="modes">
        <div class="mode-chip selected" data-element-id="mode-exposicao">🎨 Exposição</div>
        <div class="mode-chip selected" data-element-id="mode-colaboracao">🤝 Colaboração</div>
        <div class="mode-chip" data-element-id="mode-mentoria">🎓 Mentoria</div>
        <div class="mode-chip" data-element-id="mode-financiamento">💰 Financiamento</div>
        <div class="mode-chip" data-element-id="mode-feedback">💬 Feedback Comunitário</div>
      </div>
    </div>

    <div class="actions">
      <button class="btn" data-element-id="save-draft">Guardar rascunho</button>
      <button class="btn btn-primary" data-element-id="publish">Publicar Pitch</button>
    </div>
  </div>
</div>
</body>
</html>
```

## Dependências

- Depende de E1 (15 áreas).
- Bloqueia E4.