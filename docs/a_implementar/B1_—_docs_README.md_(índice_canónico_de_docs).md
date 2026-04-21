# B1 — docs/README.md (índice canónico de docs)

## Status

Draft · Coordena com A1 e C-frente.

## Estado actual

file:docs/README.md (linhas 1–34) declara hierarquia de autoridade correta, mas:

- Aponta para guias antigos (`guia-utilizador/aluno.md` que usa termo `aluno`).
- Lista "🏗️ Arquitetura", "💻 Configuração Local", "🚀 Guia de Contribuição" sem indicar quais foram refactored para Soul & Elite.
- Não distingue **docs vivos** vs **docs em saneamento** vs **docs arquivados**.

## Estado canónico

- Hierarquia: `IMPORTANTE/01–05` > `.planning/` > `docs/decisoes/` > `docs/` (mantém-se).
- Cada link deve indicar **estado de sincronização** (✅ canónico / 🟡 em saneamento / ⚠️ legacy).

## Tickets

### B1-T1 — Adicionar matriz de saúde dos documentos

Tabela que lista cada doc, seu estado de sincronização com `IMPORTANTE/01–05`, ticket de B-frente correspondente, última auditoria.

- **DoD E2E**: leitor sabe imediatamente quais docs confiar e quais ignorar.

### B1-T2 — Atualizar links após renomeações

- `aluno.md` → `estudante.md` (depende de `spec:E1`).
- Adicionar links para novos guias (Mobile install, OG dinâmico, deploy Cloudflare).
- **DoD E2E**: zero links partidos (validar com link checker).

### B1-T3 — Adicionar índice por persona

Quick-links para Devs, PM, QA, Operações, Contributors externos. Cada persona vê o caminho recomendado de leitura.

- **DoD E2E**: novo dev em onboarding chega a "primeiro PR" em <30min seguindo o índice.

## Dependências

- Depende de B2–B8 (links).
- Coordena com A1 (consistência de hierarquia).

</TRAYCER_SPEC>