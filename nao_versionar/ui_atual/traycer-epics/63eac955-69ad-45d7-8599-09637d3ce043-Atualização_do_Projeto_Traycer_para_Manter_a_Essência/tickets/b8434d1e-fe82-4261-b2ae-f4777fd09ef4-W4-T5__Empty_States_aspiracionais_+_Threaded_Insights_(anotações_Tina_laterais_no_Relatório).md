---
id: "b8434d1e-fe82-4261-b2ae-f4777fd09ef4"
title: "W4-T5: Empty States aspiracionais + Threaded Insights (anotações Tina laterais no Relatório)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:58:17.520Z"
updatedAt: "2026-04-18T02:58:30.802Z"
type: ticket
---

# W4-T5: Empty States aspiracionais + Threaded Insights (anotações Tina laterais no Relatório)

## Scope & Objective

Substituir TODOS os empty states "texto cinza no meio do nada" (Mensagens, Conquistas, Vínculos, Feed quando filtro vazio, Ranking) por empty states aspiracionais: skeletons de medalhas com cadeado, ilustrações wireframe minimalistas, CTAs contextuais. Implementar "Threaded Insights" — anotações laterais da Tina no Relatório Vocacional (segunda capacidade, mesma infra `<TinaChat />`).

**In scope**: refactor de ≥6 empty states + componente reutilizável `<AspirationalEmpty>` + integração Tina no Relatório.
**Out of scope**: Tina como assistente global (já é `<TinaChat />` global em AppLayout — não regredir); ChatBot inline em outras páginas (futuro).

## References

- Atlas §6.6 (empty states pobres), §6.4 (Tina dual papel) — atlas spec
- Approach §1.1 W4, decisão Tina dual coexiste — approach spec

## Guardrails

- Tina global `<TinaChat />` em `AppLayout` permanece; Threaded Insights é adicional, não substituto.
- Empty states aspiracionais usam ilustrações SVG inline (não bitmap; preserve a11y com `aria-label`).
- CTAs contextuais: "Ainda não tens conquistas → Faz a tua primeira simulação" (link directo).

## Acceptance Criteria

- `apps/web/src/components/ui/AspirationalEmpty.tsx`: componente reutilizável com props `illustration`, `title`, `description`, `cta`.
- ≥6 empty states substituídos: Mensagens inbox, Conquistas página, Vínculos pendentes, Feed (todas as 4 tabs quando vazias), Ranking (quando filtro retorna 0).
- `RelatorioVocacional.tsx` ganha sidebar com Threaded Insights da Tina (anotações em pontos de dados).
- Threaded Insights consome `tina.service` BFF para gerar comentários sobre métricas específicas.
- Strings em `pt.json`.
- Wireframe documentado.

## Verification Steps

- Empty state das Conquistas mostra skeletons com cadeados subtis + CTA "Faz a tua primeira simulação".
- Relatório Vocacional: passar mouse sobre uma métrica → tooltip Tina explica contexto.
- E2E suite continua verde (empty states devem ser non-breaking).
