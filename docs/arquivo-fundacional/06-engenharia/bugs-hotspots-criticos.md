# Bugs e Hotspots Críticos — Auditoria de Engenharia

> **Origem:** `traycer-epics/specs/` — Análises de refactoring + Auditoria W0→W2 (Abril 2026)
>
> **Propósito:** Catalogar todos os bugs, hotspots e lacunas de cobertura identificados durante a auditoria profunda do codebase, para que nenhuma descoberta se perca.

---

## Hotspots Críticos (🔴)

### 1. Pipeline de Telemetria (multi-camada, multi-storage)
- Toca 4 sistemas: hook `useTelemetry`, route `/telemetria`, Redis queue, Strapi persistence
- Score Tipo 2 **hardcoded `=8.5`** no frontend — BFF aceita sem calcular
- `tentativaNum` nunca preenchido
- `dwellTime` é `setInterval` básico, não métrica real
- Score Tipo 1 é slider auto-avaliado (não calculado)
- Tipo 3 é placeholder (`<Wrench>` icon)
- **Sem sanity validator** para rejeitar eventos impossíveis (anti-cheat)
- **Remediação:** W2-T1 (sanity), W2-T4 (Tipo 2 real), W2-T5 (Tipo 3)

### 2. LTI Grade Passback é Fachada
- `events/lti.handler.ts` chama **stub** `lti.ags.service.ts` (apenas `log.info`)
- Stub tem assinatura `(perfilId, tentativaId, score)` — diferente do real `(lineitemUrl, score, accessToken)`
- **Resultado:** Apesar do código existir, nenhum score é enviado ao LMS externo
- `lti_context` do perfil não é lido pelo handler
- **Remediação:** W2-T3 (event bus completo + adapter real)

### 3. Double-Fire de Conquistas
- Handler `conquistas.handler.ts` chama `conquistaEngine.processar(perfilId)` — **método inexistente** (o exportado é `verificarConquistas`)
- Em paralelo, `routes/telemetria.ts` L67 chama `verificarConquistas` directamente
- **Resultado:** TypeError em runtime no handler OU duplicação se corrigido para o método certo
- **Remediação:** D2 — conquistas only-handler, remover chamada directa

### 4. Outbox Pattern Falso
- `event-bus.ts publishWithOutbox()` marca `processed=true` **antes** dos handlers terminarem
- EventEmitter nativo é síncrono no despacho mas handlers async sem `await`
- **Resultado:** Se handler falhar, evento marcado como processado — replay nunca apanha falhas reais
- **Remediação:** D1 — outbox real com handler registry + `Promise.allSettled`

---

## Hotspots Médio-Altos (🟠)

### 5. Reputação: Semântica Errada + Drift de Rota
- `routes/reputation.ts` GET `/me` **sempre retorna breakdown** (não verifica flag `REPUTATION_VISIBLE`)
- Flag gate `REPUTATION_VISIBLE` retorna `0` quando off — "esconde por valor zero" é frágil
- **Drift contratual:** client web usa `/reputacao/*`, BFF monta em `/reputation/*`
- Sem `ReputacaoBreakdownSchema` no Shared — tipo livre no service
- **Remediação:** C5, D8 — endpoint separado, 404-when-flag-off, alias temporário

### 6. Heuristics Paralelo (Shared vs BFF)
- `packages/shared/src/heuristics.ts` exporta funções puras (`analyzeFluidity(phi)`)
- BFF `heuristics.engine.ts` continua a existir com APIs diferentes (toma listas de eventos)
- Risco de divergência entre fórmulas
- **Remediação:** W2-T1 — mover fórmulas para shared, engine = orquestrador

### 7. Auth Próprio (jose + httpOnly + RBAC + OAuth + OTP)
- 6 roles personalizadas, 3 ficheiros de rota, 5 ficheiros de módulo
- Usa `node:crypto` directamente — **incompatível com Cloudflare Workers**
- Se Capacitor entrar (W6), cookies em WebViews nativas têm restrições
- **Decisão:** Auth fica em Railway; endpoints em Workers validam JWT independentemente

### 8. Tina: Dupla Identidade
- Spec original define Tina como **assistente completa global** (FAB, chat, RAG, guardrails)
- Conversa reposicionou como **camada de tradução** opcional sobre algoritmo determinístico
- Ambos papéis devem coexistir (decisão fechada) — mas sem separação clara em código
- `tinaService.indexarKnowledge()` no boot — se falhar, chat sem knowledge base

---

## Naming Mismatches (T-FIX-3)

12 regras de conquistas que **nunca disparam** porque o nome do evento no `conquistas.engine.ts` não corresponde ao nome emitido pela telemetria:

| Regra espera | Telemetria emite | Resultado |
|--------------|-----------------|-----------|
| (detalhado em ticket T-FIX-3) | (nomes divergentes) | Conquistas nunca desbloqueiam |

**Remediação:** T-FIX-3 — reconciliar naming com `TelemetryEventNameSchema` do shared

---

## Schema Divergences (T-FIX-4)

| Domínio | Divergência |
|---------|------------|
| D20 — Tentativa schema | Strapi tem 12 campos ricos; BFF só escreve 4 (`score`, `metadata`, `dataInicio`, `dataFim`) |
| D21 — Telemetria mapping | BFF envia `payload`/`timestamp`/`user`; Strapi espera `dados`/`clientTimestamp`/`perfil` |
| D22 — Experiências data loss | Frontend envia `vagas`/`dataInicio`/`dataFim`/`localizacao`/`modalidade`; Strapi ignora silenciosamente |

---

## Documentação vs Código (Drifts)

| Doc diz | Código real | Impacto |
|---------|------------|---------|
| STATE.md: "Fase 5 LTI COMPLETA" | `sendScore()` funcional mas **nunca disparado automaticamente** | Falsa completude |
| STATE.md: "Fase 7 IA COMPLETA" | Tina components existem mas relegada pela conversa | Sub-validado |
| roadmap.md: "Sem Top Bar" | `TopBar.tsx` existe e é usado | Doc mente |
| roadmap.md: "M5-T7 SEO meta tags: [ ]" | Vercel Edge OG rendering + `SEOHead.tsx` existem | Doc mente |
| roadmap.md: "M7-T1 Sentry: [ ]" | `@sentry/node` instalado e configurado | Doc mente |
| roadmap.md: "M4-T6 motor conquistas: [ ]" | `conquistas.engine.ts` existe com flag | Doc mente |
| CONSTITUTION.md: file limit 200 | `shared/index.ts` tem 815 linhas | Violação aceite |

---

## Lacunas de Cobertura de Testes

### Críticas (🔴)
- **Sem teste** de `lti.handler.ts` nem `conquistas.handler.ts` — têm bugs activos
- **Sem teste de integração** "publica `TENTATIVA_CONCLUIDA` → ambos handlers disparam"
- **Sem teste e2e** para Outbox replay funcionar

### Médias (🟠)
- Sem teste do endpoint `routes/reputation.ts` GET `/me` (semântica 404-flag-off)
- Sem teste characterization do consumer Upstash (pipeline edge→queue→consumer)

### Baixas (🟡)
- Sem teste do `RelatorioVocacional.tsx` (consome endpoint possivelmente inexistente)
- Sem teste do `FeedPage.tsx` (usa `any` em 4 sítios — violação Constitution)
- Sem teste do `MensagensPage.tsx`

### Testes Existentes (Spec Files)
| Área | Ficheiro | Status |
|------|----------|--------|
| Telemetry hook | `useTelemetry.spec.tsx` + `telemetry-stub.ts` | ✅ Existe |
| Heuristics BFF | `heuristics.engine.spec.ts` | ✅ Existe |
| Vocacional service | `vocacional.service.spec.ts` + `personas.ts` fixtures | ✅ Existe |
| Reputation service | `reputation.service.spec.ts` | ✅ Existe |
| Conquistas engine | `conquistas.engine.spec.ts` | ✅ Existe |
| LTI AGS | `lti.ags.spec.ts` | ✅ Existe |
| Bootstrap (BFF+shared) | `bootstrap.spec.ts` (ambos) | ✅ Existe |
| TelemetryToken | `telemetry-token.spec.ts` (shared+api) | ✅ Existe |
| JWS verify (edge) | `jws-verify.spec.ts` | ✅ Existe |
| Heuristics shared | `heuristics.spec.ts` | ✅ Existe |
| Sanity validators | `sanity.spec.ts` | ✅ Existe |
| Event bus | `event-bus.spec.ts` | ✅ Existe |

---

## Inventário Técnico do Codebase (Snapshot)

| Camada | Contagem |
|--------|----------|
| Rotas BFF (`apps/api/src/routes/`) | 43 ficheiros |
| Módulos BFF (`apps/api/src/modules/`) | 17 módulos |
| Middlewares BFF | 5 |
| Features frontend (`apps/web/src/features/`) | 23 |
| UI components (`apps/web/src/components/`) | 27 |
| Schemas Zod (`packages/shared/`) | ~70 |
| Content-types Strapi | 33 |
| Feature flags activas | 4 (`DISCUSSIONS_ENABLED`, `PROFILE_V2_PUBLIC`, `REPUTATION_VISIBLE`, `AUTO_ACHIEVEMENTS`) |

---

*Destilado de auditorias em `/fv/traycer-epics/specs/` e `/fv/traycer-epics/executions/` · Abril 2026*
