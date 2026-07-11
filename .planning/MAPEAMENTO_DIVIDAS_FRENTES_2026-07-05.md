# Mapeamento de Dívidas Técnicas e Frentes de Execução — PDC v2

> **Data:** 5 de Julho de 2026
> **Branch:** `feat/migrate-bff-cms-to-hetzner`
> **Autor:** Agente Investigador (Cline)
> **Base de Verdade:** `specs/IMPORTANTE/01–05`, `.planning/CONSTITUTION.md`, `.planning/REQUIREMENTS.md`, `.planning/DIVIDA_TECNICA_CONHECIDA.md`, `.planning/STATE.md`, `.planning/roadmap.md`
> **Método:** Análise diferencial (Caixas A-D) + inspeção de código + validação de CI.

---

## 1. Resumo Executivo

O codebase encontra-se num estado **estável de build e testes**, mas com **dívida técnica estratégica e funcionalidade inacabada** que impede o lançamento comercial.

| Métrica | Valor | Observação |
|--------|-------|------------|
| `typecheck` shared/web/api/edge | ✅ verde | Sem erros de tipo nos workspaces principais |
| `lint` | ✅ verde | Sem erros de lint |
| Vitest shared | ✅ 125 tests | 17 ficheiros passados |
| Vitest api | ✅ 433 tests | 66 ficheiros passados |
| Vitest web | ✅ 141 tests | 26 ficheiros passados (com warnings de `act()`) |
| Vitest edge | ✅ 14 tests | 3 ficheiros passados |
| Ficheiros > 300 linhas | ⚠️ 28+ | Rule of 300 violada em vários ficheiros de produção |
| `any` explícito | ✅ ~0 | Zero `as any` / `: any` em produção |
| `as unknown as` | ⚠️ 13 restantes | Quase todos em testes/infra; 1 em mock Redis |
| Branch atual | `feat/migrate-bff-cms-to-hetzner` | Infra de deploy Hetzner está implementada; falta validação E2E no VPS real |

**Conclusão:** O projeto não está quebrado, mas está **incompleto em funcionalidades de negócio críticas** (feed 4 sources, match terminal, hooks ecossistémicos, privacidade perfil/dashboard, mobile release) e contém **dívidas técnicas documentadas** que exigem execução estruturada.

---

## 2. Dívidas Técnicas Conhecidas (Inventário Consolidado)

### 2.1 🔴 Caixa A — Código viola lei fundamental (refazer obrigatório)

| ID | Problema | Ficheiro(s) | Lei Violada | Risco | Próximo Passo |
|----|----------|-------------|-------------|-------|---------------|
| **DT-A1** | `apps/web/public/sw.js` usava `const { type, payload } = event.data || {}` | `apps/web/public/sw.js` | Constituição §2.2 — fallback silencioso (`|| {}`) | ✅ **Resolvido** — mensagens SW agora são validadas estruturalmente e falhas de telemetria são logadas sem descartar fila | Manter teste/check anti-regressão em CI |
| **DT-A2** | `infra/strapi/src/api/projeto/controllers/projeto.ts` usava `projeto.acessoCoreACL || []` | `infra/strapi/src/api/projeto/controllers/projeto.ts`; BFF projetos | Constituição §2.2 — fallback silencioso (`|| []`) | ✅ **Resolvido** — Strapi/BFF recusam mutação se ACL não está inicializada; migração `migrate-projeto-acesso-pedidos.ts` inicializa legado | Rodar migração antes do deploy em dados reais |
| **DT-A3** | `apps/api/src/modules/conquistas/conquistas.engine.ts` tinha `condition: () => Promise.resolve(false)` para regra viral | `apps/api/src/modules/conquistas/conquistas.engine.ts`; `achievement.hook.ts` | AP-02 — stub sem cruzar Spec + TODO não resolvido | ✅ **Resolvido** — `viral-likes` consulta Strapi real para posts/projetos com ≥100 likes e premia o dono do conteúdo curtido | Monitorar custo de queries e evoluir para contador materializado quando F3-T4 feed-entry amadurecer |
| **DT-A4** | `apps/api/src/routes/lti.ts` estava desativado com TODO e código morto comentado | `apps/api/src/routes/lti.ts`; `docs/decisoes/adr-049-lti-route-boundary.md` | LTI 1.3 OIDC launch incompleto não podia ser simulado | ✅ **Resolvido por fronteira explícita** — JWKS/AGS/NRPS reais expostos; login/launch retornam `501 LTI_LAUNCH_NOT_IMPLEMENTED`; ADR-049 documenta o escopo | Implementar OIDC launch completo em ticket dedicado com nonce/JWT IMS/provisionamento seguro |
| **DT-A5** | `apps/api/src/modules/push/web-push.service.ts` simulava sucesso e mantinha TODO Web Push | `apps/api/src/modules/push/web-push.service.ts`; `notify.hook.ts`; `device-token` Strapi | G14 Notifications fanout sem canal web-push real | ✅ **Resolvido para Web Push** — integração `web-push` + VAPID, subscriptions em `/device-tokens`, limpeza de endpoints 404/410, notifyHook faz fanout best-effort | Gerar VAPID keys e preencher `WEB_PUSH_*`; UI opt-in ainda pendente em G14-T1 |

### 2.2 🟡 Caixa B — Código mais maduro que doc (evoluir doc)

| ID | Problema | Ficheiro(s) | Risco | Próximo Passo |
|----|----------|-------------|-------|---------------|
| **DT-B1** | `apps/web/src/lib/api/http.ts` fazia `as unknown` seguido de `as T` sem parser | `apps/web/src/lib/api/http.ts`; `http.spec.ts` | Respostas da API sem contrato runtime na fronteira genérica | 🟡 **Mitigado** — `requestUnknown` valida JSON como `unknown`, `getParsed/postParsed/...` aceitam Zod; cast legado centralizado para compatibilidade | Migrar wrappers API de alto risco para `*Parsed` com schemas compartilhados |
| **DT-B2** | `telemetria.service.ts` e `useUpload.ts` usavam `JSON.parse(text) as unknown` | `apps/web/src/lib/telemetria/telemetria.service.ts`; `apps/web/src/hooks/useUpload.ts` | Mesmo padrão; parsing não validado | ✅ **Resolvido** — parsing passa por `z.unknown().parse`; `UploadResultSchema` segue validando resposta | Manter grep anti-regressão em CI |
| **DT-B3** | `apps/api/src/lib/redis.ts` mock usava `as unknown as T` no `eval` | `apps/api/src/lib/redis.ts` | Mock dev simulava retorno tipado impossível | ✅ **Resolvido** — `eval` do mock agora rejeita com erro semântico; sem falso sucesso | Em dev sem Redis, fluxos que dependem de Lua devem falhar explicitamente |
| **DT-B4** | `EditorialStateBadge` era referido como `state: string` em auditoria antiga | `apps/web/src/components/ui/EditorialStateBadge.tsx` | Type looseness; spec já correta | ✅ **Resolvido no disco** — componente já usa `EstadoEditorial | ProjetoEstado` de `@pdc/shared` |

### 2.3 🟠 Caixa C — Divergência crítica (síntese + ADR obrigatório)

| ID | Problema | Ficheiro(s) | Descrição | Próximo Passo |
|----|----------|-------------|-----------|---------------|
| **DT-C1** | Drift de áreas: 15 vs 10 | `packages/shared/src/schemas/enums.ts`; schemas Strapi | `AGRONOMIA` vs `CIENCIAS_AGRARIAS`, `OUTRO` vs `OUTRA` | ✅ **Resolvido no código** — 15 áreas canónicas + contract test; pendente rodar migração em DB real |
| **DT-C2** | Drift de roles: `aluno` vs `estudante` | `packages/shared/src/user.ts`, Strapi perfil | 6 valores com `aluno` em vez de 7 canónicos com `estudante` | ✅ **Resolvido no código** — normalização/contratos atualizados; pendente rodar migração em DB real |
| **DT-C3** | `InscricaoSchema` tipos incorrectos para Strapi v5 | `packages/shared/src/cursos.ts:120-136` | `id` string vs number; `cursoId`/`estudanteId` top-level vs nested | Levantar Strapi; inspecionar shape real; corrigir Zod |
| **DT-C4** | Nomes de campos Strapi não verificados nas queries BFF | `apps/api/src/routes/estudante.ts` | `filters[estudante][id][$eq]`, `filters[concluido][$eq]` podem não corresponder ao schema real | Verificar contra Strapi content-type-builder; corrigir queries |
| **DT-C5** | Schema `Programa` incompleto vs spec 04 §3.4 | `infra/strapi/src/api/programa/content-types/programa/schema.json` | Faltavam `proposito`, `metodologia`, `cronograma`, `responsavel`, `regrasMatricula`, `precoPolicy`, `criadorTipo` e relações | ✅ **Resolvido no schema**; validar UI/BFF completa em próxima iteração de Programas |
| **DT-C6** | Schema `Projeto` sem "Pitch Seguro" | `infra/strapi/src/api/projeto/content-types/projeto/schema.json`; BFF/UI projeto | Faltavam `abstract`/`core`, `modos`, `pedidosAcesso`, `selo` | ✅ **Resolvido E2E** — collection `projeto-acesso-pedido`, BFF canónico `/pedidos-acesso`, UI de gestão e eventos G15 |
| **DT-C7** | `EcosystemHook<T>` parcialmente implementado | `apps/api/src/modules/events/` | `feedHandler` não idempotente; ranking/match/notify/feed hooks não centralizados; outros 40 routes não disparam eventos | Implementar G15; substituir `feedHandler`; registar hooks em todos os routes de escrita |

### 2.4 🔵 Caixa D — Atalho/Lixo (reverter + refazer)

| ID | Problema | Ficheiro(s) | Próximo Passo |
|----|----------|-------------|---------------|
| **DT-D1** | Ficheiro `apps/api/src/routes/home.ts` existe mas não está montado | `apps/api/src/routes/home.ts` | Eliminar fisicamente ou documentar propósito |
| **DT-D2** | `assets/` não monitorizado no git | `/home/cj/pdc-v2/assets/` | Decidir se entra no git ou `.gitignore`; evitar lixo de processo |
| **DT-D3** | Ficheiros de build `.strapi/dist-*` históricos já removidos, mas `.gitignore` precisa de manutenção | `infra/strapi/.gitignore` | Confirmar que `.strapi/dist-*` e `exports/` estão ignorados |
| **DT-D4** | `secrets.txt` na raiz (contém segredos?) | `/home/cj/pdc-v2/secrets.txt` | Verificar se contém valores reais; se sim, rotacionar e remover; se for fixture, documentar |

---

## 3. Frentes de Execução (Roadmap de Ação)

### 3.1 Frente 1 — Infraestrutura Hetzner (Branch Atual)

| ID | Tarefa | Estado | Bloqueios | Critério Done |
|----|--------|--------|-----------|---------------|
| **F1-T1** | Validar deploy no VPS Hetzner | ⏳ | Acesso SSH/secrets; DNS apontado para VPS | `curl https://api.usepdc.com/health` e `https://cms.usepdc.com/` OK |
| **F1-T2** | Validar `docker-compose.prod.yml` — Strapi depende de `traefik` mas healthcheck usa `curl` não instalado por defeito na imagem slim | ⏳ | Imagem Strapi pode não ter `curl` | Healthcheck passa; container sobe sem restart loop |
| **F1-T3** | Configurar secrets no VPS (`/opt/pdc/.env`) | ⏳ | Tokens reais de Strapi, Redis, R2, DeepSeek, etc. | Nenhum valor placeholder em produção |
| **F1-T4** | Testar CI/CD `deploy-vps.yml` end-to-end | ⏳ | Requer push em `main`/`develop` ou `workflow_dispatch` | Deploy automático com health checks verdes |
| **F1-T5** | Documentar runbook de rollback no VPS | ⏳ | — | ADR/runbook criado |

### 3.2 Frente 2 — Sync Constitucional (E1–E3)

| ID | Tarefa | Estado | Bloqueios | Critério Done |
|----|--------|--------|-----------|---------------|
| **F2-T1** | E1 — 15 áreas + slug `estudante` | ✅ código / 🟡 dados | Migração Postgres ainda deve rodar no ambiente real | Contract test `area-enum.contract.spec.ts` verde; 15 áreas em todos os enums |
| **F2-T2** | E2 — Edge hardening (`validEvents` bug, SET NX EX, JWKS cache) | ✅ código | Validar em ambiente Edge real | Edge worker sem `ReferenceError`; idempotência 7 dias; health endpoint |
| **F2-T3** | E3 — Schemas canónicos Programa + Projeto | ✅ projeto / 🟡 programa UI | Programas ainda pedem validação UI/BFF completa | Projeto atravessa UI → Shared → BFF → Strapi → G15; tests passam |
| **F2-T4** | E4 — Wave 2 closeout (D1 heuristics consolidação, OTP Twilio, Tina, Rating) | ⏳ | Parcialmente resolvido em PROD-E; re-auditar | `REQUIREMENTS.md` e `DIVIDA_TECNICA_CONHECIDA.md` reconciliados |
| **F2-T5** | E5 — Migração frontend Vercel → Cloudflare Pages | ⏳ | Branch atual foca Hetzner BFF/CMS; Pages separado | Deploy em `usepdc.com` via Cloudflare Pages |

### 3.3 Frente 3 — Ecossistema de Hooks (G15)

| ID | Tarefa | Estado | Bloqueios | Critério Done |
|----|--------|--------|-----------|---------------|
| **F3-T1** | Substituir `feedHandler` por implementação idempotente | 🟢 | Remover ficheiro legado quando não houver consumidores externos | `feedHandler` legado virou ponte para `feed-entry`, não cria `/posts`, dedupe por `eventId`; replay do outbox não duplica feed |
| **F3-T2** | Implementar `rankingHook` | 🟢 | Worker batch/cron da fila Redis ainda pendente para recalcular assíncrono | `TENTATIVA_CONCLUIDA`, `CURSO_PUBLICADO` e sinais de mérito marcam perfil para recálculo e invalidam cache `reputation:*` |
| **F3-T3** | Implementar `matchHook` | 🟢 base pronta | UI Match Terminal e ações aceite/rejeitada/interesse ainda precisam E2E completo | Novo conteúdo gera sugestões para perfis afins, aplica tier/DNA biomecânico, dedupe por `eventId+estudante` |
| **F3-T4** | Implementar `feedHook` + collection `feed-entry` | 🟢 base pronta | UI realtime “novo conteúdo disponível” ainda pendente | `feedHook` cria `feed-entry`, normaliza `post.published`, invalida caches; `/feed/*` lê `feed-entries` com fallback legado; 4 sources disponíveis |
| **F3-T5** | Implementar `achievementHook` | 🟡 avançado | Falta expandir todas as 25+ regras de G15, mas stubs críticos removidos | Regras existentes testadas; `viral-likes` real por Strapi e owner correto de likes |
| **F3-T6** | Implementar `notifyHook` fanout (in-app/email/web-push/APNs/FCM) | 🟡 web push E2E web pronto | D2 mobile; FCM/APNs tokens; email digest | In-app + Web Push backend + UI opt-in + SW push/click testados; faltam APNs/FCM/email digest/settings |
| **F3-T7** | Registar `eventBus.publishWithOutbox` em todos os routes/services de escrita | 🟡 parcial | Ainda restam rotas sem eventos: AI/data-rights/feature-flags/LTI/notificações/telemetria/Tina | Conteúdo principal + interações + curso service + moderação/governação + instituições + identidade/auth base já emitem eventos; nesta fase adicionados Comité/Denúncias, Instituições/Auth testados e LOGIN/LOGOUT pós-OTP/logout |
| **F3-T8** | Isolar replay do outbox fora do BFF (D5/G15-T9) | 🟢 | Garantir processo separado no deploy/Procfile/Railway/Hetzner | `index.ts` não importa worker por side-effect; `outbox-worker` inicia só via CLI/script e usa lock distribuído testado |

### 3.4 Frente 4 — Features Transversais E2E (G1–G14)

| ID | Tarefa | Estado | Bloqueios | Critério Done |
|----|--------|--------|-----------|---------------|
| **F4-T1** | G11 — Feed 4 sources | ⏳ | F3-T4 | UI com 4 tabs; cache 5min; invalidação por evento |
| **F4-T2** | G12 — Match Terminal (hub estudante + propostas) | ⏳ | F3-T3; E1 | Estudante vê oportunidades; instituição vê analytics |
| **F4-T3** | G13 — Mensagens realtime | 🟡 | UI existe; sockets funcionam; testes E2E limitados | Testes E2E passam; push funciona |
| **F4-T4** | G14 — Notifications fanout | 🟡 web push web pronto | APNs/FCM mobile; email digest; preferências granulares | Browser opt-in registra subscription e SW exibe/clica notificações; completar canais mobile/email |
| **F4-T5** | G10 — Privacy field visibility | ⏳ | H1 | Backend filtra campos por viewer; frontend nunca confia |
| **F4-T6** | G6 — Post/Conquista lifecycle completo | 🟡 | PostComposer funcional; conquista manual stub resolvido | Moderação + fanout + impact panel funcionando |
| **F4-T7** | G8 — Upload de mídia 50MB | ⏳ | DT-20; CSP `frame-src` | Limites bumpados; presigned URLs para ficheiros grandes |
| **F4-T8** | G7 — Onboarding por role | 🟡 | OnboardingVideo seed com placeholder; 7 vídeos reais | Seed com URLs reais de R2; vídeos por role |

### 3.5 Frente 5 — Qualidade e Governança

| ID | Tarefa | Estado | Bloqueios | Critério Done |
|----|--------|--------|-----------|---------------|
| **F5-T1** | Rule of 300 — modularizar ficheiros > 300 linhas | 🟡 | 28+ ficheiros; decisão explícita de não tocar em H2-T4 | Planear refactoring temático; não criar novos |
| **F5-T2** | Eliminar `as unknown as` restantes em produção | 🟢 produção limpa no grep direcionado | Restam casts apenas em specs (`home`, `perfis`, `projetos`, `sim-2-3`, `glossary`) | Trocar helpers de teste por factories tipadas quando mexer nesses specs |
| **F5-T3** | Resolver warnings de `act()` nos tests React | 🟡 | Não bloqueia | Tests React sem warnings |
| **F5-T4** | Playwright E2E happy paths verdes | ⏳ | Requer ambiente com Strapi + BFF a correr | `npx playwright test --project=chromium` passa |
| **F5-T5** | Lighthouse mobile ≥ 90 | 🟡 | `lighthouserc.json` existe; CI job existe; falta validação manual | LHCI passa consistentemente |
| **F5-T6** | Documentação sync: `REQUIREMENTS.md`, `STATE.md`, `DIVIDA_TECNICA_CONHECIDA.md`, `roadmap.md` | 🟡 | Algumas entradas desatualizadas após PROD-E | Todos os docs refletem código real |

### 3.6 Frente 6 — Mobile Release (Pós-MVP)

| ID | Tarefa | Estado | Bloqueios | Critério Done |
|----|--------|--------|-----------|---------------|
| **F6-T1** | PWA production-grade (manifest, SW, offline) | 🟡 | SW existe; offline handling básico | Lighthouse offline passa; service worker robusto |
| **F6-T2** | Capacitor iOS + TWA Android | ⏳ | — | Apps nas stores (testflight/play internal) |
| **F6-T3** | Registo de tokens push nativos | ⏳ | F6-T2 | FCM/APNs tokens ligados a perfis |
| **F6-T4** | Safe-area, viewport, touch targets | 🟡 | Parcialmente implementado | Auditado via axe-core; 44px em todo o UI |

---

## 4. Priorização Recomendada

### Bloco 0 — Immediato (esta semana)
1. **F1-T1..T4:** Validar Hetzner deploy (branch atual).
2. **DT-A1, DT-A2:** Corrigir fallbacks silenciosos no SW e Strapi controller.
3. **DT-C1, DT-C2:** Iniciar E1 (15 áreas + estudante) — bloqueia muita coisa.

### Bloco 1 — Crítico (próximas 2 semanas)
4. **F2-T2:** Edge hardening — sem isto telemetria parte em produção.
5. **F3-T1, F3-T4:** Hooks de feed idempotentes + collection `feed-entry`.
6. **F4-T5:** Privacy field visibility — requisito legal/ético.

### Bloco 2 — Alto (próximas 4 semanas)
7. **F2-T3:** Schemas Programa + Projeto canónicos.
8. **F3-T2, F3-T3:** Ranking e Match hooks.
9. **F4-T1, F4-T2:** Feed 4 sources + Match Terminal UI.
10. **F4-T7:** Upload 50MB + CSP.

### Bloco 3 — Médio (próximas 8 semanas)
11. **F3-T6, F4-T4:** Notifications fanout completo.
12. **F5-T4, F5-T5:** Playwright + Lighthouse CI verdes.
13. **F5-T1, F5-T2:** Rule of 300 + casts restantes.
14. **F6-T1..T4:** Mobile release.

---

## 5. Riscos Transversais

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Strapi v5 schema difere do esperado (DT-C3, DT-C4) | Quebra de queries silenciosamente | Levantar Strapi com dados reais; contract tests; migrações aditivas |
| Telemetria perdida no Edge (E2) | Perda de dados comportamentais — core value | Corrigir `validEvents`; implementar SET NX EX; health checks |
| Hooks ecossistémicos não centralizados (G15) | Funcionalidade social/partilha quebrada | Implementar contrato G15; adicionar eventos em todos os routes de escrita |
| Divergência documental (doc ≠ código) | Futuras decisões erradas | Manter `REQUIREMENTS.md`, `STATE.md`, `DIVIDA_TECNICA_CONHECIDA.md` sincronizados |
| Deploy Hetzner sem validação | Downtime em produção | Testar em staging primeiro; runbook de rollback; health checks |

---

## 6. Checklist de Validação Contínua

Antes de marcar qualquer tarefa como Done:

- [ ] `npm run typecheck` verde em todos os workspaces.
- [ ] `npm run lint` verde sem novos `eslint-disable`.
- [ ] `npm test -w @pdc/shared && npm test -w @pdc/api && npm test -w @pdc/web && npm test -w @pdc/edge` verdes.
- [ ] Atravessa as 5 camadas (UI → Shared → BFF → Persistence → Ecossistema).
- [ ] ADR criado para Caixas C/D e remoções.
- [ ] Documentação atualizada (`REQUIREMENTS.md`, `STATE.md`, `DIVIDA_TECNICA_CONHECIDA.md`).

---

*Regra de Ouro: Se não está documentado aqui ou na dívida técnica conhecida, não existe como dívida consciente.*

---

## 7. Rodada CodeRabbit resolvida em 2026-07-05

- ✅ Deploy VPS/CI: host key pinning mantido, timeout de job adicionado, variável morta removida, bootstrap `.env` documentado sem hop redundante, health checks locais/externos com retry e falha explícita.
- ✅ LTI: AGS/NRPS retornam `502` estruturado em falha LMS; `LtiScoreSchema` usa vocabulário IMS e aceita timestamps ISO com offset.
- ✅ Projetos Core ACL: pedidos já respondidos são bloqueados; ACL inexistente é validada antes de mutação; `remover` sincroniza pedido canónico; listagem honra `page/pageSize`; criação de pedido ganhou rate limit.
- ✅ Push/HTTP/SW: VAPID subject validado, public-key 503 testado, Web Push pagina device tokens, `client.navigate` no service worker tolera rejeição, GET/DELETE não forçam `Content-Type`, refresh+retry coberto.
- ✅ Feed/Tina/Strapi: cache institucional isolado por instituição, invalidation institucional testada, Tina valida JSON/perguntas com schemas reais, migração de `projeto-acesso-pedido` continua após ACL malformada e reporta erros.
