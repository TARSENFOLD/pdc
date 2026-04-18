# PDC v2 — Project State

> Memória persistente do projecto entre sessões. Lê este ficheiro PRIMEIRO antes de qualquer trabalho. Actualiza após cada sessão de trabalho.

## Project Reference

Ver: `.planning/PROJECT.md` (Restaurado: Abril 2026)
Fonte de verdade para specs: `epic:63eac955-69ad-45d7-8599-09637d3ce043`

**Core value:** O estudante faz uma escolha de carreira baseada em evidência real — não em suposições.

## Current Status (Auditoria Real - Abril 2026)

```
Fase 0 — Fundação          [~] EM PROGRESSO (Saneamento e Tooling parcial)
Fase 1 — Auth Segura       [ ] TODO (Resete de Auth e Edge Rascunho)
Fase 2 — Design System     [ ] TODO (Padrão Tech-Terracota e Registry em falta)
Fase 3 — API Layer         [ ] TODO (Contratos Quebrados)
Fase 4 — Core do Produto   [ ] TODO (Simulações Tipo 3 e Event Bus pendentes)
Fase 5 — LTI 1.3           [ ] TODO (AGS Grade Passback com falhas)
Fase 6 — Moderação/Admin   [ ] TODO (Audit trail e Sentry ativos)
Fase 7 — IA e Realtime     [ ] TODO (DeepSeek e Socket.IO soberanos)
```

**Repositório:** `pdc-v2/`
**Branch activa:** main
**Último Commit:** Documentation governance reset (W0-T2).

### Lacunas Estruturais Críticas (Honesty Pass W0-T2)
A auditoria real revelou que a base de código NÃO corresponde à documentação do approach:
- **Shared/SSOT Ausente:** Faltam ficheiros nucleares em `@pdc/shared`: `bootstrap.ts`, `registry/features.ts`, `telemetry-token.ts`, `heuristics.ts`.
- **Edge Rascunho:** O workspace `apps/edge` ainda está em "commonjs" (não module), expõe `TELEMETRY_SECRET = "change-me-in-production"` e não tem verificação real JWS (`jws-verify.ts` ausente). `apps/api/src/modules/telemetria/consumer.ts` não existe.
- **Contratos Quebrados (Reputação):** O frontend chama `/reputacao/me`, mas o backend ainda monta a rota `/reputation` e o código em `reputation.service.ts` continua em inglês.
- **Fundações em Falta:** `Tipo3Player.tsx`, `i18n/index.ts` e `events/event-bus.ts` não existem. W1-W5 continuam como trabalho pendente.

## O que foi feito recentemente (Wave 0 — Fundação Soberana)

- [x] **Characterization Tests:** useTelemetry, heuristics.engine, vocacional.service e lti.ags blindados.
- [x] **Zero Type Errors:** Typecheck 100% verde em todo o monorepo.
- [x] **Tooling:** Axe-core integrado, Husky pre-commit com testes otimizados (--changed).
- [x] **Governança:** Roadmap de 5 Waves ratificado e Constituição v2.1 em vigor.

## Próximos passos imediatos

1. **Seed Monumental (W1-T5):** Injeção das 100 personas e 9k eventos para povoar o Oráculo.
2. **Auth v2 Reset (W1-T2):** Implementação de JWT httpOnly e Role SSOT.
3. **Refactor Design System (W3-T2):** Iniciar Component Registry com Glassmorphism.

## Decisions Log (Consolidado)

| Data | Decisão | Racional |
| --- | --- | --- |
| Abr 2026 | Arquitectura Híbrida | Ingestão no Edge (Cloudflare) + Lógica no Core (Railway). |
| Abr 2026 | Rejeição de Clerk | Preservar a soberania da Auth v2 e o ecossistema de 6 roles. |
| Abr 2026 | Tipagem Pragmática | Uso de Record<string, any> em metadados para agilidade de integração. |
| Abr 2026 | Fail-Safe Flags | Flags ausentes resultam em FALSE por omissão (Segurança). |

---

## Documentação de Referência (Válida)

- [CONSTITUTION.md](.planning/CONSTITUTION.md) — Leis fundamentais.
- [REQUIREMENTS.md](.planning/REQUIREMENTS.md) — Catálogo de requisitos e honest pass.
- [roadmap.md](.planning/roadmap.md) — Mapeamento de 5 Waves.

---
*Regra de ouro: Se não está documentado aqui, não aconteceu.*
