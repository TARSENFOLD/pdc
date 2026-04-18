---
id: "2f20243c-333d-4ba1-ba0d-d2c9d92709b0"
title: "W4-T3: Dashboard Bento Grid + Top Bar Glass Header (Command+K) + Sidebar slim audit"
assignee: ""
status: 0
createdAt: "2026-04-18T02:57:25.041Z"
updatedAt: "2026-04-18T02:58:02.816Z"
type: ticket
---

# W4-T3: Dashboard Bento Grid + Top Bar Glass Header (Command+K) + Sidebar slim audit

## Scope & Objective

Reescrever `AlunoDashboard` (e templates dos outros 4 dashboards) com Bento Grid + "Next Best Action" como hero (substituindo as 86 linhas + 3 StatCards `—`). Criar `<TopBar>` premium ("Glass Header" com backdrop-blur, busca global Command+K, notificações com badge, indicador Tina activa, role switcher). Auditar Sidebar para garantir "slim" (já está em hubs por correcção do atlas).

**In scope**: 5 dashboards refactor (Aluno + Mentor + Instituicao + Moderador + Admin) com Bento; nova TopBar substituindo header existente; Command Palette (Cmd+K).
**Out of scope**: Reputação Bento (W4-T4); Hub de Oportunidades (W4-T4).

## References

- Atlas §6.1 correções (Sidebar já em hubs, Tina já global), §6.2 hotspots dashboard minimalista — atlas spec
- Approach §1.1 W4, design primitives W3-T2 — approach spec
- Ficheiros: file:apps/web/src/pages/dashboard/, file:apps/web/src/components/layout/TopBar.tsx (existe — refactor), file:apps/web/src/components/layout/Sidebar.tsx

## Guardrails

- W3-T2 (BentoGrid, GlassCard) é dependência blocker.
- W2-T6 (RelatorioVocacional usa /reputacao/me) é dependência (Dashboard precisa "Next Best Action" baseado em score).
- TopBar existente é REFACTOR (não delete); preserva acessibilidade Radix existente.
- Command+K usa `cmdk` library (instalar) ou implementação custom Radix.
- Sidebar mantém hubs actuais (já correcto); só fix de import Brain+Zap (W0-T1).

## Acceptance Criteria

- 5 dashboards refactorizados com Bento Grid: hero card "Next Best Action" + 5-7 cells contextuais (telemetria, próximas acções, conquistas recentes, etc.).
- `<TopBar>` premium: logo esquerda, breadcrumb subtil, busca global centro (placeholder), Tina indicator + notificações + role switcher direita.
- Cmd+K command palette funcional: ≥10 acções base (ir para X, criar Y, procurar Z).
- E2E `tests/e2e/dashboard/bento-aluno.spec.ts` (NOVO) + `command-palette.spec.ts` (NOVO).
- Wireframe documentado.

```wireframe

<html><head><style>
body{font-family:Inter,system-ui;margin:0;background:#F8F9FA;color:#09090b}
.app{display:flex;height:100vh}
.sidebar{width:220px;background:#fff;border-right:1px solid rgba(0,0,0,0.05);padding:16px;flex-shrink:0}
.main{flex:1;display:flex;flex-direction:column}
.topbar{height:56px;padding:0 24px;display:flex;align-items:center;gap:16px;background:rgba(255,255,255,0.8);backdrop-filter:blur(20px);border-bottom:1px solid rgba(0,0,0,0.05)}
.logo{font-weight:700}
.breadcrumb{color:#71717a;font-size:13px}
.search-wrap{flex:1;display:flex;justify-content:center}
.search{padding:8px 16px;border:1px solid rgba(0,0,0,0.05);border-radius:8px;background:#f1f1f1;width:420px;font-size:13px;color:#71717a;display:flex;align-items:center;justify-content:space-between}
.kbd{font-family:'JetBrains Mono',monospace;font-size:11px;background:#fff;padding:2px 6px;border-radius:4px;border:1px solid rgba(0,0,0,0.05)}
.actions{display:flex;align-items:center;gap:12px}
.icon{width:32px;height:32px;border-radius:8px;background:#f1f1f1;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;position:relative}
.dot{position:absolute;top:6px;right:6px;width:6px;height:6px;background:#FFB800;border-radius:50%}
.tina{padding:6px 12px;border-radius:8px;background:#004AAD;color:#fff;font-size:12px;display:flex;gap:6px;align-items:center}
.tina-pulse{width:8px;height:8px;background:#fff;border-radius:50%;opacity:0.8}
.avatar{width:32px;height:32px;border-radius:50%;background:#FFB800;font-weight:600;font-size:13px;display:flex;align-items:center;justify-content:center;cursor:pointer}
.content{flex:1;padding:32px;overflow-y:auto}
.hero{background:linear-gradient(135deg,#fff 0%,#f8f9fa 100%);border:1px solid rgba(0,0,0,0.05);border-radius:20px;padding:32px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center}
.hero h1{font-family:'Instrument Serif',serif;margin:0 0 8px;font-size:28px}
.hero p{margin:0;color:#71717a}
.cta{padding:12px 24px;background:#004AAD;color:#fff;border-radius:12px;font-weight:600;font-size:14px}
.bento{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:160px;gap:16px}
.cell{background:#fff;border:1px solid rgba(0,0,0,0.05);border-radius:14px;padding:20px;display:flex;flex-direction:column;justify-content:space-between}
.cell.large{grid-column:span 2}
.cell.tall{grid-row:span 2}
.label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#71717a}
.metric{font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:700;color:#09090b;margin-top:8px}
.metric small{font-size:14px;color:#71717a}
.bar{height:4px;background:#f1f1f1;border-radius:2px;margin-top:8px;overflow:hidden}
.bar-fill{height:100%;background:#004AAD;width:67%}
</style></head><body>
<div class="app">
<aside class="sidebar"><div style="font-weight:700">PDC v2</div><div style="font-size:11px;color:#FFB800;font-weight:700;margin-top:2px">Sovereign Engine</div></aside>
<div class="main">
<div class="topbar">
<div class="logo">PDC</div><div class="breadcrumb">/ Dashboard</div>
<div class="search-wrap"><div class="search">Procurar carreiras, mentores, simulações... <span class="kbd">⌘K</span></div></div>
<div class="actions">
<div class="tina"><div class="tina-pulse"></div>Tina</div>
<div class="icon">🔔<div class="dot"></div></div>
<div class="avatar">CJ</div>
</div>
</div>
<div class="content">
<div class="hero">
<div><div class="label">Próxima Acção</div><h1>Estás a 3 simulações de desbloqueares o teu Perfil de Engenharia</h1><p>Match Vocacional actual: <strong>67%</strong> · 14 simulações concluídas · 220 minutos de telemetria</p></div>
<div class="cta">Iniciar Simulação →</div>
</div>
<div class="bento">
<div class="cell large"><div><div class="label">Match Vocacional</div><div class="metric">67<small>/100</small></div></div><div class="bar"><div class="bar-fill"></div></div></div>
<div class="cell tall"><div><div class="label">Reputação</div><div class="metric">82</div></div><div style="font-size:12px;color:#71717a">Tier <strong style="color:#FFB800">Prata</strong></div></div>
<div class="cell"><div class="label">Conquistas</div><div class="metric">12</div></div>
<div class="cell"><div class="label">Persistência R</div><div class="metric">0.91</div></div>
<div class="cell"><div class="label">Foco</div><div class="metric">87<small>%</small></div></div>
<div class="cell large"><div class="label">Trajectórias Sugeridas</div><div style="margin-top:auto;display:flex;gap:8px"><span style="background:#f1f1f1;padding:4px 10px;border-radius:12px;font-size:12px">Eng. Civil 89%</span><span style="background:#f1f1f1;padding:4px 10px;border-radius:12px;font-size:12px">Arquitectura 78%</span></div></div>
</div>
</div>
</div></div>
</body></html>
```

## Verification Steps

- Cada role login → vê dashboard Bento contextual.
- Cmd+K abre command palette; filtra acções por keyword.
- TopBar mostra notificação dot quando há unread; click vai para `/app/notificacoes`.
- E2E `bento-aluno.spec.ts` + `command-palette.spec.ts` verdes.
- axe a11y verde.
