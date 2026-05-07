# CLAUDE.md — PDC v2 · Mandato Operacional para Agentes Anthropic

> Espelho operacional do `GEMINI.md` para agentes Anthropic (Claude).
> **Este documento é Lei.** Em conflito com qualquer instrução ad-hoc, este documento prevalece.
> Ver também: `GEMINI.md` (mandato Google) · `AGENTS.md` (Orquestração) · `.planning/CONSTITUTION.md` (leis inegociáveis) · `specs/IMPORTANTE/`

---

## § 1 — Doutrina da Análise Diferencial (Caixas A / B / C / D)

Antes de tocar qualquer ficheiro, classifica-o numa das 4 caixas. A ação canónica está pré-definida — **não improvises**.

| Caixa | Diagnóstico | Ação Canónica | Autorização |
|-------|-------------|---------------|-------------|
| **A** | Código viola lei fundamental (cast cego, fallback que mascara bug, log destruído, `as any`, drift RBAC) | **Refazer o código** alinhado com a Spec | Não requer ADR (é correção de bug) |
| **B** | Código mais maduro que doc, sem violar leis (ex: D6/BUG-01 já resolvidos no Edge, schemas reais não documentados) | **Evoluir o doc** (`STATE.md`, `REQUIREMENTS.md`, ADR) | ADR opcional se houver decisão arquitetural relevante |
| **C** | Ambos divergentes e incompletos (ex: `Conquista` em 2 lados, `aluno` vs `estudante`, `Post` vs `FeedPost`) | **Síntese** — extrai o melhor de ambos e atualiza ambos | ADR **obrigatório** |
| **D** | Atalho recente sem base em doc nem em pensamento profundo (lixo da raiz, fallbacks inventados, casts desnecessários) | **Reverter + refazer** | Nota mínima em `STATE.md § Lições Aprendidas` |

### Regras de Aplicação

- Classifica ANTES de abrir o editor. Só muda de caixa com evidência explícita.
- Caixa A: corrige sem ADR, mas o commit deve descrever a lei violada.
- Caixa B: a prioridade é atualizar o doc, NÃO reescrever o código.
- Caixa C: exige ADR em `docs/decisoes/` **antes** do commit de código.
- Caixa D: reverter é a ação padrão; só refaz se houver Spec que o justifique.

---

## § 2 — Lei E2E das 5 Camadas

Uma funcionalidade só é considerada **Done** quando atravessa as 5 camadas sem quebras:

1. **UI Premium** — rota canónica + página dedicada + Design System respeitado (não modais improvisados)
2. **Contrato Partilhado** — schema Zod em `@pdc/shared`, validação client + server, zero `any`
3. **BFF** — RBAC enforced, lógica de negócio completa, erros semânticos
4. **Persistência** — texto em PostgreSQL via Strapi, ficheiros em Cloudflare R2, estado de moderação correto
5. **Ecossistema** — os 6 hooks (Ranking, Feed, Match, Achievement, Behavior, Notify) correram ou estão no outbox

### Proibições Explícitas

- ❌ Marcar Done com UI funcional mas sem lógica no BFF
- ❌ Marcar Done com lógica BFF mas sem impacto ecossistémico (G15)
- ❌ Marcar Done com testes a passar mas sem verificação dos 5 camadas
- ❌ Implementar funcionalidade nova sem schema Zod em `@pdc/shared` primeiro
- ❌ Devolver dados do BFF sem RBAC enforced no handler

### Gate de cada Wave / Ticket

```
[ ] npm run typecheck  ← verde em TODOS os workspaces
[ ] npm run lint       ← sem novos eslint-disable
[ ] npm run test       ← todos workspaces (Vitest)
[ ] npx playwright test --project=chromium ← happy paths
[ ] git diff main --stat ← review do delta
[ ] ADR escrito (se caixa C ou remoção de export)
[ ] STATE.md atualizado
[ ] Commit atómico com mensagem descritiva
```

---

## § 3 — Lista Negra de Anti-Padrões Nominais

Os seguintes atalhos foram observados em `chat:42d59fed-e792-4f55-8def-1f803a51ea24` e estão **banidos nominalmente**. Se o vires, trata como bug de governação.

### AP-01 — Apagar export para silenciar typecheck

```ts
// ❌ BANIDO
// (remover linha de index.ts para que o erro desapareça)
export * from './conquistas.js'  // APAGADO porque quebrava typecheck
```

**Por quê é perigoso:** cria divergência silenciosa entre o que o Shared expõe e o que os consumidores esperam. Gerou cascata de erros na Wave anterior.

**Ação correta:** corrige o tipo na origem; usa caixa A ou B.

---

### AP-02 — Criar stubs sem cruzar Spec

```ts
// ❌ BANIDO
// Stub inventado sem verificar Strapi content-type
export const ConquistaSchema = z.object({
  id: z.number(),
  titulo: z.string(),
  // ... inventado, não mapeia os 14 atributos do Strapi
})
```

**Por quê é perigoso:** o agente anterior criou 5 stubs que não correspondiam ao que existia no disco.

**Ação correta:** lê o `schema.json` do Strapi correspondente, depois cria/expande o schema Zod.

---

### AP-03 — Casts cegos

```ts
// ❌ BANIDO
const result = value as unknown as PosErrorPayload
const title = event.title as string  // mascara undefined
```

**Por quê é perigoso:** mascara erros de tipo em runtime. Viola `§ 2 da Constituição (Zero Any)`.

**Ação correta:** usa type-guards (`if ('titulo' in value) {...}`), narrowing explícito, ou schema Zod com `.parse()`.

---

### AP-04 — Fallbacks que mascaram bugs

```ts
// ❌ BANIDO
const config = TIPO_CONFIG[bookmark.targetType] || { label: '?', icon: null }
// O || {} esconde que targetType pode ser inválido
```

**Por quê é perigoso:** `GuardadosPage.tsx` usava este padrão. O bug só se manifesta em runtime com dados reais.

**Ação correta:** valida o `targetType` com o enum canónico (`TargetTypeSchema`); lança erro explícito se inválido.

---

### AP-05 — Logs estruturados destruídos para template strings

```ts
// ❌ BANIDO
strapi.log.warn(`Programa ${id} não encontrou publicador`)
// Template string destrói a estrutura JSON que o Sentry/observabilidade precisa
```

**Por quê é perigoso:** perde contexto JSON em Sentry/Grafana. Lifecycles do Strapi foram afetados.

**Ação correta:**
```ts
strapi.log.warn({ programaId: id }, 'Programa não encontrou publicador')
```

---

### AP-06 — Scripts `fix_*.js` ou ficheiros de debug na raiz

```
// ❌ BANIDO na raiz do repo:
fix_command_palette.js
fix_palette_motion.js
fix_final_v2.js
cookies.txt
debug_api.ts
test_heartbeat.ts
```

**Por quê é perigoso:** polui o repositório, indica processo descontrolado, pode conter segredos acidentalmente.

**Ação correta:** scripts de fix vão em `scripts/` com nome descritivo e propósito documentado; ficheiros de debug são eliminados após uso.

---

### AP-07 — Commits sem ADR para remoções

```
// ❌ BANIDO
git commit -m "remove infra.ts (not needed)"
// Sem ADR, sem registo da decisão, sem cross-link
```

**Por quê é perigoso:** remoções de exports públicos do `@pdc/shared` cascateiam para 4 workspaces. Sem ADR, não há rastreabilidade.

**Ação correta:** cria ADR em `docs/decisoes/adr-0XX-NOME.md` ANTES do commit de remoção; o commit referencia o ADR.

---

## § 4 — Sealed Envelope para Delegações

Toda query a um execution agent (incluindo outras instâncias Claude/Gemini) **deve** incluir o seguinte bloco literal:

```
[SEALED ENVELOPE — Doutrina da Análise Diferencial]

Spec governante: spec:42d59fed-e792-4f55-8def-1f803a51ea24/<id-da-spec>
Wave: <N> (<NOME>)
Subdomínio: <DOMAIN>
Caixas autorizadas: <A | B | C | D>

Scope IN (ficheiros que podem ser tocados):
- file:path/to/file1.ts
- file:path/to/file2.ts

Scope OUT (proibido tocar):
- Tudo o resto

Lista negra (proibições absolutas):
1. Apagar export sem ADR (AP-01)
2. Criar stub sem cruzar Spec (AP-02)
3. Casts cegos: `as any`, `as unknown as X`, `as string` para mascarar undefined (AP-03)
4. Fallbacks que escondem bugs (AP-04)
5. Logs estruturados → template strings (AP-05)
6. Scripts fix_*.js ou debug files na raiz (AP-06)
7. Commits sem ADR para remoções (AP-07)

Critério Done (Spec 06 + Constituição):
- typecheck verde em todos os workspaces
- lint verde sem novos eslint-disable
- Vitest verde
- (se UI) Spec 05 tokens + 5 primitivos + 44px + spring(220,28)
- (se Shared) contract test passa

Entregar como commit único: audit(wave<N>-<DOMAIN>): <descrição>
```

### Os 6 Itens Obrigatórios do Sealed Envelope

1. **Referência ao spec/ticket canónico** com ID
2. **Lista negra de anti-padrões nominais** (AP-01 a AP-07)
3. **Caixas de classificação aplicáveis** (A/B/C/D) e ação esperada
4. **Critério Done explícito** (checklist Spec 06)
5. **Boundary scope** (ficheiros IN, ficheiros OUT)
6. **Proibição expressa** de criar scripts ad-hoc, apagar exports, casts cegos ou stubs sem cruzar Spec

> Delegação é **permitida**, mas o resultado deve ser revisto por humano contra a spec antes de merge.

---

## § 5 — Tag-don't-drop + Identidade Total

### Telemetria — Tag-don't-drop

Eventos de telemetria nunca são eliminados silenciosamente. Se um evento falha validação:

```ts
// ✅ CORRETO — tag e passa adiante
metadata: { edgeInvalidated: true, edgeReason: sanity.reason }
payload: identifiedEvent.payload  // payload original preservado
```

```ts
// ❌ BANIDO — drop silencioso
if (!valid) continue  // perde o evento para sempre
```

```ts
// ❌ BANIDO — sobreescrever payload (bug linha 161 do Edge)
metadata: { ...identifiedEvent.payload, edgeInvalidated: true }
// payload original destruído, metadata sobreescrito
```

### Identidade Total — Anonimato é Proibido

- Toda telemetria carrega `perfilId` (Constituição §0)
- Score de simulações é derivado no BFF — o cliente **nunca** declara o score (anti-fraude D20-D22)
- JWT em httpOnly cookies — nunca localStorage
- Field-level filtering server-side — o frontend é UX, não autoridade de acesso

### RBAC — RoleSchema canónico

Os 7 roles canónicos vivem **exclusivamente** em `packages/shared/src/user.ts`:

```ts
// ✅ CORRETO
import { Role } from '@pdc/shared'

// ❌ BANIDO
import { ROLES } from '@/config/roles'  // drift garantido
```

---

## § 6 — Soul & Elite (Resumo Operacional)

### Tokens CSS Canónicos

```css
/* ✅ Usar sempre */
var(--surface-*)   /* fundos */
var(--ink-*)       /* textos */
var(--accent-*)    /* destaques */
var(--radius-sm)   var(--radius-md)   var(--radius-lg)   var(--radius-xl)   var(--radius-full)

/* ❌ Banido em dashboards e app */
#000000  #FFFFFF  (hex literais hardcoded)

/* ⚠️ bg-amber-* — permitido APENAS em landing pages (identidade visual PDC Angola) */
/* Banido em dashboards e componentes app — usar tokens canónicos */
```

### 5 Primitivos Obrigatórios

| Primitivo | Quando usar |
|-----------|-------------|
| `BentoGrid` | Layout de cards multi-coluna |
| `GlassCard` | Card com efeito glass/blur |
| `AsymmetricButton` | CTA principal com hierarquia visual |
| `HUDPanel` | Painel de dados em tempo real |
| `AspirationalEmpty` | Estado vazio (nunca erros genéricos) |

### 8 Princípios de Animação

1. `motion/react` com `spring(stiffness: 220, damping: 28)`
2. `prefers-reduced-motion` sempre respeitado
3. Touch targets ≥ 44×44px em mobile
4. Mobile-first — valida em viewport ≤ 414px
5. Performance Lighthouse mobile ≥ 90
6. Nunca `#000000` puro (smear OLED) nem `#FFFFFF` puro
7. Transições de rota com `AnimatePresence`
8. `LayoutGroup` para animações de lista

### Glow Policy (Canvas) — 2026-05-03

- ❌ `ctx.shadowBlur = currentSize * N` — multiplicador de tamanho é **banido**
- ✅ Accent stars landing: `ctx.shadowBlur = 2` (fixo), `shadowColor` com alpha ≤ 0.12
- ✅ Cool stars e todos os componentes app: `ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'`
- ❌ Cross flares e double-pass bright core em `NeuralConstellation` da landing — eliminados
- Referência: `DESIGN.md § 10.2`, `ADR-026`

### `--card-border` Token — 2026-05-03

```css
/* Definido em apps/web/src/styles/tokens.css */

/* Light mode (:root) */
--card-border: #000000;

/* Dark mode (.dark selector) */
.dark {
  --card-border: rgba(255, 255, 255, 0.08);
}
```

- ❌ Nunca `borderColor: '#000000'` hardcoded — usar sempre `var(--card-border)`
- Referência: `DESIGN.md § 10.3`, `ADR-026`

### NeuralConstellation Dual — 2026-05-03

- `src/features/landing/NeuralConstellation.tsx` — landing pública, adapta ao tema, `ChoreographyState`
- `src/components/auth/NeuralConstellation.tsx` — auth, fundo preto fixo, `NeuralState` reactivo a `onFocus`/`onBlur`
- ❌ Nunca fundir nem cross-importar
- Referência: `DESIGN.md § 10.1`, `ADR-025`

### Copy sem Jargão — 2026-05-03

- ❌ "Oráculo" em copy visível ao utilizador → usar "PDC" ou "sistema"
- ❌ Emojis em badges/pills de produto → texto uppercase `tracking-wider` apenas

### Rotas Canónicas (Implementação Actual)

```
/app/home                      # Hub de navegação rápida (todos os roles)
/app/dashboard/estudante       # Dashboard analítico — estudante
/app/dashboard/mentor          # Dashboard analítico — mentor
/app/dashboard/instituicao     # Dashboard analítico — instituição
/app/dashboard/moderador       # Dashboard analítico — moderador
/app/dashboard/admin           # Dashboard analítico — super_admin
/app/dashboard/patrocinador    # Dashboard analítico — patrocinador
/app/comite                    # Dashboard — comité científico
```

Todas as rotas de dashboard têm `RoleGuard` — só o role correcto + super_admin acede.

---

## § 7 — Audit Status (2026-05-03)

**Saúde global: Typecheck verde nos 3 workspaces · Testes shared 68/71 (3 falhas pré-existentes simulacoes.spec)**

Relatório completo: `docs/audit/MASTER--audit-report.md`
Dívida técnica dashboards: `docs/audit/divida-tecnica-dashboards-home.md`
Constituição actualizada: `specs/IMPORTANTE/01-05` (DC-01..DC-03 documentados)
Zero `as any` em todo o monorepo.
7 dashboards com RBAC guards. BFF `/experiencias/stats` criado. Home ≠ Dashboard (Opção B).

### Sessão 2026-05-03 — Visual & Auth Polish

- `NeuralConstellation` landing: glow eliminado, partículas ≤ 1.8px, zero cross flares
- `--card-border` token criado em `tokens.css` — dark mode branco-creme, light mode preto
- `DESIGN.md § 10` adicionado com 7 padrões canónicos desta sessão
- Auth pages: `neuralState` por campo em `RegistoEstudantePage`, `RegistoMentorPage`, `RegistoInstituicaoPage`
- Banner mobile neural `sticky top-0` em `AuthSplitLayout`
- `PasswordInput` component reutilizável criado e exportado
- Copy: "Oráculo" removido de copy visível; emojis removidos de badges de produto
- ADR-025 (NeuralConstellation dual) e ADR-026 (glow policy + card-border) criados em 2026-05-03

---

*Este documento é parte da Wave 0 (Meta-Governação) do PDC v2 Integrity Hardening.*
*Última atualização: 2026-05-03 · Evidência: sessão visual/auth polish + `DESIGN.md § 10`*
