---
id: "34054cc0-47ba-43cb-bdac-31376eb36246"
title: "W4-T1: MensagensPage build-from-scratch (inbox + busca + filtros role + realtime)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:56:36.457Z"
updatedAt: "2026-04-18T02:57:06.432Z"
type: ticket
---

# W4-T1: MensagensPage build-from-scratch (inbox + busca + filtros role + realtime)

## Scope & Objective

Construir do zero a `MensagensPage` (inbox de conversas) conforme spec v2 reverter cedência destrutiva (decisão C1). Lista de conversas + busca + filtros por role do interlocutor + integração realtime com `socket.service` existente. Threaded layout para suporte a "Threaded Insights" futuro.

**In scope**: novo `MensagensPage.tsx`, integração com `routes/mensagens.ts` (BFF existe), descomentar router, premium UI consumindo design primitives W3-T2.
**Out of scope**: Threaded Insights laterais no Relatório (W4-T5); composer rich text (futuro); attachments (futuro).

## References

- Atlas §6.2 F1 (Mensagens fachada total), §6.3 REQ-7-005 false [x] — atlas spec
- Approach §1.3 Mapping & Gaps "MensagensPage", decisão C1 — approach spec
- Ficheiros: file:apps/web/src/router.tsx (descomentar), file:apps/web/src/features/mensagens/, file:apps/api/src/routes/mensagens.ts (existente)

## Guardrails

- W3-T2 (BentoGrid, GlassCard) é dependência (UI primitives).
- W3-T3 (i18n) é dependência (strings em `pt.json`).
- W3-T4 (a11y) é dependência (touch targets + focus).
- `routes/mensagens.ts` BFF existe e funciona; zero alteração nessa camada.
- Realtime usa `useSocket()` hook existente; mensagens chegam via Socket.IO.
- Empty state aspiracional (não texto cinza vazio) — aplicar pattern W4-T5 quando disponível.

## Acceptance Criteria

- `apps/web/src/features/mensagens/MensagensPage.tsx` criado.
- Router L59 descomentado: `const MensagensPage = React.lazy(...)`.
- Rota `/app/mensagens` adicionada ao router.tsx (Sidebar L87 já aponta).
- UI: lista de conversas (avatar + last message + timestamp + unread badge) + busca + filtros (todos/aluno/mentor/instituicao/moderador).
- Realtime: nova mensagem em conversa actualiza unread count instantaneamente.
- Wireframe documentado em ticket (HTML).
- E2E Playwright `tests/e2e/mensagens/inbox.spec.ts` (NOVO).
- Strings em `pt.json` (i18n).

```wireframe

<html><head><style>
body{font-family:Inter,system-ui;margin:0;background:#F8F9FA;color:#09090b}
.app{display:flex;height:100vh}
.sidebar{width:220px;background:#fff;border-right:1px solid rgba(0,0,0,0.05);padding:16px}
.main{flex:1;display:flex;flex-direction:column}
.topbar{padding:16px 24px;border-bottom:1px solid rgba(0,0,0,0.05);display:flex;gap:12px;align-items:center}
.search{flex:1;padding:8px 12px;border:1px solid rgba(0,0,0,0.05);border-radius:8px;background:#f1f1f1}
.filters{display:flex;gap:8px}
.filter{padding:6px 12px;border-radius:20px;background:#f1f1f1;font-size:13px;cursor:pointer}
.filter.active{background:#004AAD;color:#fff}
.body{flex:1;display:flex}
.list{width:380px;border-right:1px solid rgba(0,0,0,0.05);overflow-y:auto}
.conv{padding:16px 20px;border-bottom:1px solid rgba(0,0,0,0.05);display:flex;gap:12px;cursor:pointer}
.conv:hover{background:#f1f1f1}
.conv.active{background:#fff;border-left:3px solid #004AAD}
.avatar{width:40px;height:40px;border-radius:50%;background:#FFB800;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px}
.info{flex:1;min-width:0}
.name{font-weight:600;font-size:14px;display:flex;justify-content:space-between}
.time{font-size:11px;color:#71717a;font-weight:400}
.snippet{font-size:13px;color:#71717a;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.unread{background:#004AAD;color:#fff;font-size:10px;padding:2px 6px;border-radius:10px;margin-left:6px}
.detail{flex:1;display:flex;flex-direction:column;padding:24px;background:#f8f9fa}
.empty{margin:auto;text-align:center;color:#71717a;max-width:360px}
.empty h2{font-family:'Instrument Serif',serif;font-size:24px;color:#09090b;margin:0 0 8px}
</style></head><body>
<div class="app">
<aside class="sidebar"><div style="font-weight:600">PDC v2</div><div style="font-size:12px;color:#71717a;margin-top:4px">Sovereign Engine</div></aside>
<div class="main">
<div class="topbar"><div style="font-weight:600">Mensagens</div><input class="search" placeholder="Procurar conversas..." data-element-id="search-input"/><div class="filters"><span class="filter active" data-element-id="filter-all">Todas</span><span class="filter" data-element-id="filter-mentor">Mentores</span><span class="filter" data-element-id="filter-instituicao">Instituições</span></div></div>
<div class="body">
<div class="list">
<div class="conv active" data-element-id="conv-1"><div class="avatar">MC</div><div class="info"><div class="name">Maria Cardoso<span class="time">há 5min</span></div><div class="snippet">Vi os teus dados de Engenharia... <span class="unread">2</span></div></div></div>
<div class="conv" data-element-id="conv-2"><div class="avatar" style="background:#004AAD;color:#fff">UA</div><div class="info"><div class="name">UAN Saúde<span class="time">14:32</span></div><div class="snippet">Convite para visita ao hospital escolar</div></div></div>
<div class="conv" data-element-id="conv-3"><div class="avatar">JS</div><div class="info"><div class="name">João Silva<span class="time">ontem</span></div><div class="snippet">Obrigado pelo feedback na simulação</div></div></div>
</div>
<div class="detail"><div class="empty"><h2>Selecciona uma conversa</h2><p>As tuas mensagens com mentores e instituições aparecem aqui.</p></div></div>
</div></div></div>
</body></html>
```

## Verification Steps

- Navegar `/app/mensagens` → renderiza inbox com conversas seed.
- Clicar conversa → abre `ConversaPage` (rota existente `/app/mensagens/:conversaId`).
- Enviar mensagem em ConversaPage → unread count actualiza na inbox via Socket.IO.
- E2E `inbox.spec.ts` verde.
- axe-core a11y verde nesta página.
