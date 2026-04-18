---
id: "2ba90905-23c1-4d0d-bc14-c0c318b79a8b"
title: "W5-T4: Production polish (Lighthouse ≥90 mobile + a11y full audit + cleanup deprecated endpoints)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:59:10.427Z"
updatedAt: "2026-04-18T02:59:24.502Z"
type: ticket
---

# W5-T4: Production polish (Lighthouse ≥90 mobile + a11y full audit + cleanup deprecated endpoints)

## Scope & Objective

Polish final para produção: Lighthouse Performance ≥90 mobile (image opt, code splitting agressivo, bundle audit, lazy loading), a11y full audit (corrigir warnings restantes do W3-T4), cleanup deprecated endpoints `/auth/me` + `/feature-flags/effective` (mantidos durante W1-W4 para rollback; agora podem ser removidos com aviso de deprecation gracioso).

**In scope**: optimizações performance, a11y polish final, deprecation graceful (não breaking).
**Out of scope**: novas features; redesign de páginas; refactor estrutural.

## References

- Atlas §3.5 REQ-NF-001+002 (Lighthouse + latency targets), §6.6 a11y — atlas spec
- Approach §2.3 verificable, §4.3 performance invariants, §1.4 (deprecate em W5) — approach spec

## Guardrails

- Endpoints deprecated retornam 200 com header `Deprecation: <date>` + `Link: <new-endpoint>; rel=successor-version`; remover em release seguinte.
- Performance optimizations não introduzem regressões funcionais (E2E suite verde).
- Image optimization: use `<img loading="lazy">` + WebP/AVIF onde possível; R2 serve dimensões adequadas.
- Bundle: code splitting por rota (já parcial via React.lazy); analisar com `vite-bundle-visualizer`.

## Acceptance Criteria

- Lighthouse Performance ≥90 mobile em landing + dashboard + relatório vocacional.
- Lighthouse a11y ≥95 nas mesmas 3 páginas.
- Lighthouse Best Practices ≥90.
- `/auth/me` e `/feature-flags/effective` retornam header `Deprecation`.
- `apps/web/src/lib/api/auth.ts` migrado para usar `/bootstrap` (W1-T3).
- Bundle main < 300KB gzip; cada chunk lazy < 100KB gzip.
- axe-core full audit: zero erros críticos + zero serious.
- ADR (NOVO) `docs/decisoes/adr-007-deprecation-policy.md` documenta policy de deprecation.

## Verification Steps

- `npm run build -w apps/web` + `npx vite-bundle-visualizer` → main < 300KB.
- Lighthouse mobile: ≥90/95/90 (perf/a11y/best-pract) nas 3 páginas chave.
- `curl <bff>/auth/me` → header `Deprecation` presente.
- E2E full suite verde.
- k6 load test confirma p99 dentro de targets ADR-005.
