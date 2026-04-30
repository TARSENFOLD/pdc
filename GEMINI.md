# GEMINI.md — PDC v2 · Mandato Operacional para Agentes Google

> Documento de governação para agentes Google (Gemini). Para agentes Anthropic, ver `CLAUDE.md`.
> **Este documento é Lei.** Em conflito com qualquer instrução ad-hoc, este documento prevalece.

---

## § 1 — Doc is Law vs. Código Avançado

A hierarquia de verdade no PDC v2 é a seguinte:

1. **`specs/IMPORTANTE/01–06`** — Visão, Arquitectura, RBAC, Conteúdo, Design, E2E (nível constitucional)
2. **`.planning/CONSTITUTION.md`** — Leis inegociáveis de engenharia (derivadas das Specs)
3. **`GEMINI.md` + `CLAUDE.md`** — Mandatos operacionais para agentes (este ficheiro)
4. **Código no disco** — Implementação sujeita a auditoria contra os níveis acima

### Doc is Law (regra base)

Se o código contradiz o markdown das Specs/Constituição, **o código é o defeituoso**. O documento justifica o código, nunca o contrário.

### Exceção: Código Avançado (Caixa B)

Se o código implementou corretamente algo que o documento ainda não documenta, **o código é mais maduro que o doc** — a ação correta é evoluir o documento (não reverter o código). Esta é a Caixa B da Doutrina da Análise Diferencial.

### Doutrina da Análise Diferencial

Antes de tocar qualquer ficheiro, classifica-o:

| Caixa | Diagnóstico | Ação |
|-------|-------------|------|
| **A** | Código viola lei fundamental | Refazer código |
| **B** | Código mais maduro que doc | Evoluir doc |
| **C** | Ambos divergentes e incompletos | Síntese + ADR obrigatório |
| **D** | Atalho recente sem base em doc | Reverter + refazer |

Para definição completa com exemplos e critérios de aplicação, ver `CLAUDE.md § 1`.

---

## § 2 — Lista Negra Nominal

Os seguintes anti-padrões foram observados e documentados em `chat:42d59fed-e792-4f55-8def-1f803a51ea24` como evidência forense. Estão **banidos nominalmente** — qualquer ocorrência é um bug de governação.

### AP-01 — Apagar export para silenciar typecheck

Remover uma linha de `packages/shared/src/index.ts` ou de qualquer ficheiro de barrel para que um erro de typecheck desapareça é **proibido**. Gerou cascata de erros na auditoria anterior.

### AP-02 — Criar stubs sem cruzar Spec

Criar schemas Zod ou tipos TypeScript inventados sem verificar o `schema.json` do Strapi correspondente ou a Spec 04 é **proibido**. O agente anterior criou 5 stubs (`HomeHero`, `InfraStatus`, `Post` com `conteudo`) que não correspondiam ao disco.

### AP-03 — Casts cegos (`as unknown as X`, `as string`)

```ts
// ❌ BANIDO
const result = value as unknown as PosErrorPayload
const title = event.title as string  // mascara undefined
```

Viola a Constituição §2 (Zero Any). Usa type-guards ou narrowing explícito.

### AP-04 — Fallbacks que mascaram bugs

```ts
// ❌ BANIDO
const config = TIPO_CONFIG[bookmark.targetType] || { label: '?', icon: null }
```

O `|| {}` esconde que `targetType` pode ser inválido. Valida com o enum canónico; lança erro explícito se inválido.

### AP-05 — Logs estruturados destruídos para template strings

```ts
// ❌ BANIDO
strapi.log.warn(`Programa ${id} publicado`)  // perde contexto JSON
// ✅ CORRETO
strapi.log.warn({ programaId: id }, 'Programa publicado')
```

### AP-06 — Scripts `fix_*.js` ou ficheiros de debug na raiz

Ficheiros como `fix_command_palette.js`, `cookies.txt`, `debug_api.ts`, `.continue-here.md` são **proibidos na raiz** do repositório. Scripts de fix vão em `scripts/` com nome descritivo.

### AP-07 — Commits sem ADR para remoções

Qualquer remoção de export público do `@pdc/shared` ou remoção de ficheiro Strapi requer ADR em `docs/decisoes/` **antes** do commit. Sem ADR, não há rastreabilidade.

---

## § 3 — Sealed Envelope para Delegações

Cada query a um agente de execução **deve** conter os 6 itens obrigatórios:

1. **Referência ao spec/ticket canónico** com ID
2. **Lista negra de anti-padrões nominais** (AP-01 a AP-07, ver § 2 acima)
3. **Caixas de classificação aplicáveis** (A/B/C/D) e ação esperada
4. **Critério Done explícito** (checklist Spec 06: typecheck + lint + Vitest + Playwright)
5. **Boundary scope** (ficheiros IN, ficheiros OUT — proibido tocar o resto)
6. **Proibição expressa** de criar scripts ad-hoc, apagar exports, casts cegos ou stubs sem cruzar Spec

Para o template completo do Sealed Envelope, ver `CLAUDE.md § 4`.

> Delegação é **permitida**, mas o resultado deve ser revisto por humano contra a spec antes de merge.

---

## § 4 — Referências Cruzadas

| Documento | Propósito |
|-----------|-----------|
| `CLAUDE.md` | Espelho operacional completo para agentes Anthropic (Claude). Contém definição detalhada das caixas A/B/C/D, cada anti-padrão com exemplo de código, template do Sealed Envelope, e Soul & Elite. |
| `.planning/CONSTITUTION.md` | Leis inegociáveis: Zero Any, Rule of 300, Lei E2E, Tag-don't-drop, Soul & Elite, Telemetria Resiliente. |
| `specs/IMPORTANTE/06` | Lei E2E das 5 Camadas — checklist canónico de Done. |
| `specs/IMPORTANTE/05` | Design System Soul & Elite — tokens, primitivos, animações. |
| `specs/IMPORTANTE/03` | RBAC — os 7 roles canónicos e hierarquia de acesso. |
| `docs/decisoes/` | ADRs — decisões arquiteturais com rastreabilidade. |
| `AGENTS.md` | Orquestração de Agentes — protocolos de delegação, sub-agentes e Sealed Envelope. |

---

## § 5 — Audit Status (2026-04-30)

**Saúde global: Typecheck verde nos 3 workspaces · Testes shared 68/71 (3 falhas pré-existentes simulacoes.spec)**

- Relatório completo: `docs/audit/MASTER--audit-report.md`
- Dívida técnica dashboards: `docs/audit/divida-tecnica-dashboards-home.md`
- Constituição actualizada: `specs/IMPORTANTE/01-05` (DC-01..DC-03 documentados)
- Zero `as any` em todo o monorepo
- 7 dashboards com RBAC guards. Home ≠ Dashboard (Opção B)
- `bg-amber-*` é **permitido em landing pages** (identidade visual PDC Angola) — banido em dashboards/app

---

*Este documento é parte da Wave 0 (Meta-Governação) do PDC v2 Integrity Hardening.*
*Última atualização: 2026-04-30 · Evidência: auditoria Home vs Dashboard*
