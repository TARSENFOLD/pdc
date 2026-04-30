# Dívida Técnica — Dashboards & Home (Auditoria 2026-04-30)

> Detectada durante a auditoria Home vs Dashboard.
> Classificação: 🔴 Crítico · 🟡 Médio · 🟢 Baixo

---

## 🔴 Crítico

### DT-01: Testes `simulacoes.spec.js` falhados (3/3)

- **Ficheiro:** `packages/shared/dist/simulacoes.spec.js`
- **Sintoma:** Os 3 testes de `CriarSimulacaoPayloadSchema` falham — validação de soma de pesos (100%) não funciona.
- **Causa provável:** Schema Zod em `simulacoes.ts` tem refinement de soma de pesos partido ou o build `dist/` está dessincronizado com `src/`.
- **Impacto:** Simulações podem aceitar payloads com pesos inválidos.
- **Acção:** Investigar o refinement `.refine()` no schema e re-buildar.

### DT-02: `ConquistaManualComposer.tsx` — 7 erros de void expression

- **Ficheiro:** `apps/web/src/features/conquistas/ConquistaManualComposer.tsx`
- **Linhas:** 118, 131, 146, 163, 178, 194, 208
- **Regra:** `@typescript-eslint/no-confusing-void-expression`
- **Sintoma:** Arrow functions retornam void implicitamente (e.g. `onChange={v => setValue(v)}`).
- **Fix:** Adicionar braces: `onChange={v => { setValue(v); }}` — pode ser auto-fixado com `eslint --fix`.

### DT-03: `HomePage.tsx` — 3 erros lint

- **Ficheiro:** `apps/web/src/features/home/HomePage.tsx`
- **Erros:**
  - L83: `??` desnecessário (valor nunca é null/undefined)
  - L84: `??` desnecessário (idem)
  - L93: Template literal com tipo `string | undefined` sem guard
- **Acção:** Limpar nullish coalescing desnecessários e adicionar guard ao template literal.

---

## 🟡 Médio

### DT-04: `feed.ts` (API) — condição always-false

- **Ficheiro:** `apps/api/src/routes/feed.ts`
- **Linhas:** 76, 91
- **Regra:** `@typescript-eslint/no-unnecessary-condition`
- **Sintoma:** Comparação `"trending" !== "trending"` é sempre false — dead code.
- **Impacto:** Lógica de feed com branch morta, possivelmente de refactoring incompleto.
- **Acção:** Remover branch ou corrigir a lógica de sorting do feed.

### DT-05: Comité Científico dashboard inconsistente com o padrão

- **Rota actual:** `/app/comite` (fora da convenção `/app/dashboard/comite`)
- **Componente:** `apps/web/src/features/comite/ComiteDashboard.tsx`
- **Impacto:** Inconsistência de naming. O sidebar `DASHBOARD_BY_ROLE` aponta para `/app/comite` como excepção.
- **Acção futura:** Migrar para `/app/dashboard/comite` para uniformizar, ou manter e documentar a excepção.

### DT-06: `MentorDashboard` usa endpoint genérico, não BFF dedicado

- **Componente:** `apps/web/src/pages/dashboard/MentorDashboard.tsx`
- **Endpoint actual:** `GET /telemetria/patterns` (genérico, sem filtro por mentor)
- **Ideal:** Criar `GET /dashboard/mentor` com dados agregados (mentorados, padrões, KPIs de mentoria).
- **Impacto:** O mentor vê padrões genéricos em vez de dados filtrados pelos seus mentorados.

### DT-07: `ModeradorDashboard` usa `denunciasApi.list()` directo

- **Componente:** `apps/web/src/pages/dashboard/ModeradorDashboard.tsx`
- **Endpoint actual:** `GET /denuncias?estado=pendente&pageSize=5`
- **Ideal:** Criar `GET /dashboard/moderador` com KPIs agregados (total pendentes, resolvidas hoje, taxa de resolução).
- **Impacto:** Dashboard mostra apenas lista, sem KPIs reais de moderação.

### DT-08: `AdminDashboard` usa `adminApi.getStats()` — verificar completude

- **Componente:** `apps/web/src/pages/dashboard/AdminDashboard.tsx`
- **Endpoint:** `GET /admin/stats`
- **Status:** Funcional, mas o endpoint já retorna `totalUtilizadores`, `totalSimulacoes`, `totalCursos`, `denunciasPendentes`. Pode faltar telemetria real-time e métricas de sistema (uptime, cache hit rate, etc.).

---

## 🟢 Baixo

### DT-09: Fast Refresh warnings em contextos React

- **Ficheiros:** `AuthContext.tsx`, `BootstrapContext.tsx`, `ThemeContext.tsx`, `router.tsx`
- **Regra:** `react-refresh/only-export-components`
- **Impacto:** HMR pode fazer full reload em vez de fast refresh quando estes ficheiros mudam.
- **Acção:** Mover contextos para ficheiros separados dos componentes que os usam. Baixa prioridade.

### DT-10: Lints CSS falsos positivos (`@theme`, `@apply`)

- **Ficheiro:** `apps/web/src/index.css` (L4, L70, L79)
- **Causa:** IDE CSS linter não reconhece directivas Tailwind v4.
- **Impacto:** Zero — apenas ruído no IDE.
- **Acção:** Configurar `.vscode/settings.json` com `"css.lint.unknownAtRules": "ignore"` ou usar extensão Tailwind CSS IntelliSense.

### DT-11: `tsconfig.node.json` warning `allowImportingTsExtensions`

- **Ficheiro:** `apps/web/tsconfig.node.json`
- **Causa:** Flag requer `noEmit` ou `emitDeclarationOnly`, mas `composite: true` impede `noEmit`.
- **Impacto:** Warning no IDE, build funciona. Mitigado com `skipLibCheck`.
- **Acção:** Pode ser resolvido com `"emitDeclarationOnly": true` se o project references o permitir.

---

## Resolvido nesta sessão

| Item | Descrição | Estado |
|---|---|---|
| RoleGuard em dashboards | Qualquer user acedia qualquer dashboard | ✅ Corrigido |
| Sidebar sem link para dashboard | Não havia "Meu Dashboard" no sidebar | ✅ Corrigido |
| CTAs com links broken | 16 links sem `/app` prefix em 3 dashboards | ✅ Corrigido |
| BFF `GET /experiencias/stats` em falta | InstituicaoDashboard retornava 404 | ✅ Criado |
| Dashboard Patrocinador em falta | Role sem dashboard dedicado | ✅ Criado |
| `dashboardRoutes` não montadas no BFF | Rota existia mas não registada (sessão anterior) | ✅ Montada |

---

*Gerado: 2026-04-30 · Contexto: Auditoria Home vs Dashboard (Opção B)*
