# PDC v2 — Project State

> Memória persistente do projecto entre sessões. Lê este ficheiro PRIMEIRO.

## Current Status
Estamos na **Wave 3 (Design System de Autoridade)**. As ondas de fundação e motor foram concluídas, mas o polimento estético e a acessibilidade são os bloqueios atuais.

```
Wave 0 — Fundação & Estabilidade [x] COMPLETA
Wave 1 — Auth & Pipeline         [x] COMPLETA
Wave 2 — Motor Vocacional & LTI  [x] COMPLETA
Wave 3 — Design System           [~] EM PROGRESSO (Purga de cores, Primitivos)
Wave 4 — Dashboards & Hubs       [ ] NÃO INICIADA (Bento Grids)
Wave 5 — Gamificação & Produção  [ ] NÃO INICIADA
```

## Realizações Recentes
- **Saneamento de Tipagem (Wave 3):** Redução massiva de erros de ESLint (700+ -> ~40 reais).
- **SSOT de Domínio:** Consolidação de esquemas compartilhados para Vínculos, Landing, Mensagens e Perfis no `@pdc/shared`.
- **Socket Realtime Tipado:** Refatoração do `useSocket` com suporte a genéricos.
- **Ecosystem Hooks (G15):** Auditoria concluída. O sistema já implementa 6 hooks (Ranking, Feed, Match, Achievement, Behavior, Notify) com idempotência Redis.

## Bloqueios Atuais
- **Dívida de Tipagem (Remanescente):** Pequenos erros de `restrict-template-expressions` e `unnecessary-condition` em arquivos periféricos.
- **Drift de Identidade:** Telemetria estava a ser tratada como anónima, violando o requisito pedagógico.
- **Ficheiros Obesos:** Várias rotas e serviços ultrapassam a "Rule of 300".

## Architecture Snapshot
```
pdc-v2/
├── .planning/           ← GSD Files (Truth Source)
├── apps/
│   ├── web/             ← React 18 + Vite + Tailwind v4 (Vercel)
│   ├── api/             ← Hono BFF + Node 24 (Railway)
│   └── edge/            ← Cloudflare Worker (Ingestor L1)
├── packages/
│   └── shared/          ← SSOT (Schemas Zod + Heurísticas)
├── infra/
│   └── strapi/          ← Strapi v5 + PostgreSQL (Railway)
└── specs/               ← Specs detalhadas (IMPORTANTE)
```

## Decisions Log (Recentes)
| Data | Decisão | Racional |
| --- | --- | --- |
| 21 Abr 26 | Identidade Total | Anonimato banido. Telemetria identificada para fins pedagógicos. |
| 21 Abr 26 | ADR-005: Edge Economy | Workers como ingestor isolado para poupar custos no Railway. |
| 21 Abr 26 | G15 Ratificação | Hooks ecossistémicos são o critério de aceitação E2E. |

## Environment
- **OS:** Linux (Fedora 43 / Debian agnostic)
- **Node:** 24.13.0 LTS
- **Docker:** Nativo (Strapi + Postgres + Redis)
- **Editor:** Cursor / VS Code

---
*Regra de Ouro: Se não está documentado aqui, não aconteceu.*