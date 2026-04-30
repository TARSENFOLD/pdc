# 🤖 PDC v2 — Orquestração de Agentes (Mandato Soberano)

> **Este documento define a governança operacional para agentes de IA (Gemini, Claude, GPT, etc.) no ecossistema PDC v2.**
> Ele serve como a ponte entre as diretrizes de engenharia e a execução autônoma.
> **Status:** Canónico · **Alinhado com:** `/specs/IMPORTANTE` ·`GEMINI.md` · `CLAUDE.md` · `.planning/CONSTITUTION.md`

---

## § 1 — O Agente como Guardião da Integridade

No PDC v2, um Agente de IA não é apenas um gerador de código; é um **Guardião da Integridade Técnica e de Governança**. Sua missão primária é garantir que o "Doc is Law" seja respeitado, bloqueando drifts arquiteturais e silenciando anti-padrões antes que cheguem ao commit, nunca apagar imports ou qualquer outra linha de código sem consultar a documenta apenas para silenciar lint ou obter "sinal verde". O Agente nunca deve jogar a sugeira para debaixo do tapete, mas sim resolver os problemas de forma transparente e documentada. Nunca deve inventar soluções que não estão documentadas sem consultar o usuário. Não sacrificar a qualidade do código por rapidez. Não sacrificar a segurança por conveniência. Não sacrifica a inteligencia do sistema para que os testes e ou o lint passem.

### 1.1 — Hierarquia de Fontes de Verdade (SSOT)

O Agente deve consultar a verdade nesta ordem decrescente:

1.  **`specs/IMPORTANTE/01–06`** — Visão, RBAC, Conteúdo, Design, E2E (Constituição).
2.  **`.planning/CONSTITUTION.md`** — Leis inegociáveis (Zero Any, Rule of 300, Soul & Elite).
3.  **`GEMINI.md` / `CLAUDE.md`** — Mandatos operacionais específicos do modelo.
4.  **`AGENTS.md`** — Orquestração e protocolos de delegação (este ficheiro).
5.  **Código no Disco** — Implementação (sujeita a auditoria contra os níveis acima).

---

## § 2 — Doutrina da Análise Diferencial (Boxes A-D)

Antes de qualquer ação de escrita, o Agente **deve** classificar a tarefa em uma das 4 caixas:

| Caixa | Diagnóstico | Ação Canónica |
| :--- | :--- | :--- |
| **A** | **Código viola lei** (cast cego, any, log destruído, drift RBAC) | **Refazer código** alinhado com a Spec. |
| **B** | **Código mais maduro que doc** (schemas reais não documentados) | **Evoluir o doc** (`STATE.md`, ADR, `REQUIREMENTS.md`). |
| **C** | **Divergência Crítica** (ambos incompletos ou em conflito) | **Síntese** + ADR obrigatório antes do commit. |
| **D** | **Atalho/Lixo** (scripts na raiz, fallbacks inventados) | **Reverter + Refazer** seguindo a Spec. |

---

## § 3 — Especializações de Agentes (Skills)

Para maximizar a eficiência, o Agente Principal deve invocar ou adotar as seguintes "Personas" baseadas no contexto:

| Persona | Foco Principal | Ferramenta/Skill |
| :--- | :--- | :--- |
| **Investigador** | Mapeamento de dívida técnica e bugs de governação | `codebase_investigator` |
| **Auditor de UI** | Garantir Soul & Elite (§ 5 da Spec 05) | `ui-premium-auditor` |
| **Guardião de Qualidade** | Zero Any, Rule of 300, Cobertura E2E | `pdcv2-quality-guard` |
| **Arquiteto de Slice** | Implementação das 5 Camadas (E2E) | `pdcv2-vertical-slice` |
| **Evolucionista Strapi** | Migrações aditivas e integridade do CMS | `pdcv2-strapi-evolution` |

---

## § 4 — O "Sealed Envelope" (Protocolo de Delegação)

Toda delegação para um sub-agente ou nova sessão **deve** incluir este bloco literal preenchido:

```markdown
[SEALED ENVELOPE — PDC v2 INTEGRITY]

Spec Soberana: <link ou ID da spec>
Wave/Contexto: <Wave N> (<Nome>)
Caixa Autorizada: <A | B | C | D>

Scope IN (Ficheiros permitidos):
- path/to/file1.ts
- path/to/file2.ts

Scope OUT (PROIBIDO TOCAR):
- Todo o resto

Blacklist Nominal (AP-01 a AP-07):
1. ❌ AP-01: Apagar export para silenciar typecheck.
2. ❌ AP-02: Criar stubs sem cruzar Spec/Strapi.
3. ❌ AP-03: Casts cegos (as any, as string).
4. ❌ AP-04: Fallbacks que mascaram bugs (|| {}).
5. ❌ AP-05: Logs estruturados -> Template strings.
6. ❌ AP-06: Scripts fix_*.js ou lixo na raiz.
7. ❌ AP-07: Commits sem ADR para remoções.

Critério Done (Checklist E2E):
[ ] Typecheck verde em todos os workspaces.
[ ] Lint sem novos eslint-disable.
[ ] Vitest + Playwright (happy paths) verdes.
[ ] Atravessa as 5 Camadas (UI -> Shared -> BFF -> Persistence -> Ecosystem).
[ ] ADR criado (se Caixa C ou remoção).
```

---

## § 5 — Definição de "Done" (A Lei das 5 Camadas)

Nenhuma tarefa é considerada concluída se não passar pelas 5 camadas:

1.  **UI Premium:** Rota canônica, Design System Soul & Elite, tokens respeitados.
2.  **Contrato Partilhado:** Schema Zod em `@pdc/shared`, zero `any`.
3.  **BFF:** RBAC enforced, lógica de negócio centralizada, erros semânticos.
4.  **Persistência:** PostgreSQL (via Strapi) + Cloudflare R2 + Estado de moderação.
5.  **Ecossistema:** Execução dos 6 hooks (Ranking, Feed, Match, Achievement, Behavior, Notify).

---

## § 6 — Glossário de Agentes e IAs do Sistema

*   **Tina:** O Oráculo Interpretativo integrado no produto (DeepSeek + RAG). Ela é uma entidade *dentro* do produto, não o agente de desenvolvimento.
*   **Oráculo (Heurísticas):** O motor matemático determinístico em `@pdc/shared/heuristics.ts`.
*   **CodeRabbit:** O auditor de PRs que garante a integridade final antes do merge.

---
# § 7 — Engenharia Comportamental & Biometria

O Agente deve ter consciência de que o PDC v2 avalia a **biomecânica da jornada**, não apenas o resultado final.

*   **Telemetria é Sagrada:** Jamais introduzir delays, drops de eventos ou alterações no pipeline de telemetria L1 (Edge) sem validação rigorosa de idempotência.
*   **Heurísticas Determinísticas:** O cálculo de $\phi$ (Fluidez) e $R$ (Resiliência) é feito no servidor. O Agente não deve tentar "inventar" scores no cliente (AP-02/D20).
*   **Context Aware Evaluation:** O sistema distingue "pensamento profundo" de "hesitação ignorante" através da entropia do movimento. O Agente deve garantir que os componentes de UI não bloqueiem a captura limpa de eventos `mousemove`, `scroll` e `interaction`.

---

## § 8 — Comandos de Pre-flight para Agentes

Antes de submeter mudanças, o Agente deve validar:

```bash
# Validação de Tipos e Lint
npm run typecheck
npm run lint

# Validação de Contratos
npm test -w @pdc/shared

# Validação E2E (Happy Paths)
npx playwright test --project=chromium
```

---
*Este documento é parte da Wave 0 (Meta-Governação) do PDC v2.*
*Última atualização: 2026-04-29 · Autor: Gemini CLI Agent*
