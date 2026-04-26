# A1 — Reescrita do README raiz (Front Door canónico)

## Status

Draft · Bloqueia: nada · Bloqueia-by: nenhum

## Estado actual

file:README.md é desactualizado e enganoso:

- Lista **"Fase 0–7"** todas como "⏳ em progresso" (linha 81–93) — modelo errado.
- Estrutura mostra apenas `apps/web`, `apps/api`, `packages/shared`, `infra/strapi` (linha 17–25). **Omite ****`apps/edge`**, que é canónico.
- Stack table não menciona Cloudflare Workers, Upstash Redis, Cloudflare R2, Motion, Socket.IO, Jose.
- **Nenhuma menção a PWA-First, Mobile-First, ou 44px touch mínimo** — princípio canónico de spec:IMPORTANTE/05 §2.
- Nenhuma referência à hierarquia de autoridade (spec:IMPORTANTE/01–05).

## Estado canónico (Lei)

- **Modelo Waves W0–W5** (file:.planning/roadmap.md, spec:IMPORTANTE/02 §10) — não Fases.
- **4 camadas L1–L4** com Edge na L1 (spec:IMPORTANTE/01 §5).
- **Mobile-First / PWA-First** (spec:IMPORTANTE/01 §10, spec:IMPORTANTE/05 §2 princípio 8).
- **Hierarquia de autoridade**: `IMPORTANTE/01–05` > `.planning/` > `docs/decisoes/` > `docs/`.

## Tickets

### A1-T1 — Reescrever secção "Stack" e "Estrutura"

- Adicionar `apps/edge` na árvore + tooling Wrangler.
- Tabela de stack com **todas** as tecnologias canónicas (incluindo Cloudflare Workers, Upstash, R2, Motion, Socket.IO, Jose, Sentry, Resend, DeepSeek).
- **DoD E2E**: UI N/A · Contrato N/A · BFF N/A · Persistência N/A · Impacto: novos colaboradores compreendem stack completa em <2min.

### A1-T2 — Substituir "Fases 0–7" por Waves W0–W5 + W6 (Mobile)

- Tabela com estado real das Waves (W0–W2 ✅, W3 com primitivos+tokens já feitos, W4 com UI ~70% feita, W5/W6 pendentes).
- Apontar para file:.planning/STATE.md como source of truth do estado operacional.
- **DoD E2E**: leitor não vê "tudo em progresso" quando 60% está feito.

### A1-T3 — Adicionar banner Mobile-First / PWA + hierarquia de autoridade

- Banner topo: *"Plataforma visual, Mobile-First (PWA + Apps nativas via Capacitor/TWA). Toque mínimo 44px. Performance Lighthouse ≥90 mobile."*
- Bloco "🏛️ Hierarquia de Autoridade" copiado de file:docs/README.md.
- Frase "Doc is Law" como cabeçalho de orientação.
- **DoD E2E**: leitor casual sabe nas primeiras 30 linhas que é mobile-first e onde está a Lei.

### A1-T4 — Comandos de dev/build/deploy actualizados

- Adicionar `npm run dev -w apps/edge` (Wrangler).
- Adicionar `npm run start:consumer -w apps/api` e `replay-outbox`.
- Documentar `tests/k6/*` scripts disponíveis.
- **DoD E2E**: comando copiado do README funciona out-of-the-box após `npm install`.

## Dependências

- Bloqueia A2 (não há A2; serve como entrada para B1–B8).
- Coordena com C3 (roadmap) e C4 (CONSTITUTION).

</TRAYCER_SPEC>