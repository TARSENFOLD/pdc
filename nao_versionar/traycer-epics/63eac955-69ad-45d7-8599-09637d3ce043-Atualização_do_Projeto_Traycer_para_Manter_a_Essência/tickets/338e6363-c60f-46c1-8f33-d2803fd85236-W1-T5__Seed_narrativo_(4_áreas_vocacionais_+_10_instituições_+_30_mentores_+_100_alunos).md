---
id: "338e6363-c60f-46c1-8f33-d2803fd85236"
title: "W1-T5: Seed narrativo (4 áreas vocacionais + 10 instituições + 30 mentores + 100 alunos)"
assignee: ""
status: 0
createdAt: "2026-04-18T02:53:25.885Z"
updatedAt: "2026-04-18T02:53:44.713Z"
type: ticket
---

# W1-T5: Seed narrativo (4 áreas vocacionais + 10 instituições + 30 mentores + 100 alunos)

## Scope & Objective

Criar/expandir `infra/strapi/scripts/seed-narrativo.ts` para popular o ecossistema completo: 4 áreas vocacionais (Engenharia, Saúde, Gestão, Artes), 10 instituições (mix UAN/ISPTEC/UCAN reais + 7 fictícias), 30 mentores (1 elite por área + 2-3 gerais), 100 alunos com 3 perfis-arquétipo contrastantes + telemetria matematicamente coerente em `behavior_patterns`.

**In scope**: script idempotente (corre 2x sem duplicar), fixtures importadas das 10 personas de W0-T5, criação de behavior_patterns coerentes para cada persona.
**Out of scope**: criar conteúdo (cursos/simulações/experiências reais — pode ficar mínimo apenas para destravar UI); Strapi i18n localized (W3-T3).

## References

- Atlas §6.5 (testes contam com 100 personas), §7.1 (trackers nomeados) — atlas spec
- Approach §1.1 W1, §3.4 (behavior_patterns schema) — approach spec

## Guardrails

- Script é idempotente: usa `documentId` ou `slug` único como chave; UPSERT em vez de INSERT.
- Fixtures de personas REUSAM as criadas em W0-T5 (importadas de `apps/api/src/modules/vocacional/__fixtures__/personas.ts`); seed e testes falam a mesma linguagem.
- Coerência matemática: `behavior_patterns.phi` corresponde ao tempo entre acções dos eventos, não números aleatórios.
- Contas de teste com password forte mas conhecida (`PdcSeed2026!`); documentação clara de "uso só em dev/preview".
- Constitution v2.x zero mocks em produção: este script só corre em ambientes não-prod (env guard).

## Acceptance Criteria

- `infra/strapi/scripts/seed-narrativo.ts` cria/UPSERTs: 4 áreas (enum existente), 10 instituições, 30 mentores, 100 alunos.
- `behavior_patterns` populado com ≥1 row por (aluno × domínio relevante) — ~300 rows.
- 3 personas-arquétipo correctamente representadas em ≥10 alunos cada (Cirurgião / Hacker Hesitante / Gestor Impulsivo).
- Script tem env guard: rejeita execução se `NODE_ENV === 'production'` sem flag `--force-seed`.
- README `docs/seed/README.md` actualizado com instruções e contas de teste.
- `npm run seed:narrativo` (script novo no `infra/strapi/package.json`) executa o script.

## Verification Steps

- `docker compose up -d` + `npm run seed:narrativo` → executa sem erros.
- Login com qualquer das 100 contas de teste → dashboard renderiza dados (não vazio).
- SQL: `SELECT COUNT(*) FROM perfis WHERE tipo='aluno'` ≥ 100.
- SQL: `SELECT COUNT(DISTINCT user_id) FROM behavior_patterns` ≥ 90 (alguns alunos podem não ter telemetria por design).
- Re-run: `npm run seed:narrativo` 2ª vez → contas count permanece 100, sem duplicates.
- `npm test -w apps/api -- vocacional` (W0-T5) continua verde com fixtures partilhadas.
