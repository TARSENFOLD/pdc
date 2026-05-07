# Dívida Técnica Conhecida — PDC v2

> Inventário honesto de problemas técnicos identificados, classificados e documentados.
> **Nenhum destes foi "varrido para debaixo do tapete"** — todos são decisões conscientes com justificação.
>
> Última actualização: 30 de Abril de 2026

---

## 🔴 Requer Strapi a Correr Para Corrigir

### DT-01 — InscricaoSchema com tipos incorrectos para Strapi v5

**Ficheiro:** `packages/shared/src/cursos.ts` (linhas 120-136)

**Problema:**
```ts
export const InscricaoSchema = z.object({
  id: z.string(),        // ← Strapi retorna number
  cursoId: z.string(),   // ← Não existe como top-level; é relação { data: { id } }
  estudanteId: z.string(), // ← Idem
  ...
});
```

O schema Zod define `id`, `cursoId` e `estudanteId` como `z.string()`, mas o Strapi v5 retorna IDs numéricos e relações como objectos nested (`{ data: { id: number } }`).

**Porquê não foi corrigido:** O FE usa `InscricaoComCurso` apenas como type hint (compile-time), sem `.parse()` runtime. Funciona por acidente. Corrigir exige auditar o schema Strapi real de `inscricoes`, actualizar o Zod, e verificar todos os consumidores.

**Risco:** Se alguém adicionar validação Zod runtime (`.parse()`), explode. Sem `.parse()`, é transparente.

**Para corrigir:**
1. Levantar Strapi (`docker compose up`)
2. Inspeccionar `GET /api/inscricoes?populate=*` no Strapi
3. Actualizar `InscricaoSchema` e `InscricaoComCursoSchema` com a shape real
4. Verificar consumidores no FE

---

### DT-02 — Nomes de campos Strapi não verificados nas queries BFF

**Ficheiros:**
- `apps/api/src/routes/estudante.ts` → `'filters[estudante][id][$eq]'`
- `apps/api/src/routes/estudante.ts` → `'filters[concluido][$eq]'`

**Problema:** As queries Strapi assumem nomes de relações (`estudante`, `curso`) e campos (`concluido`, `dataConclusao`) que podem não corresponder ao content-type real configurado no Strapi. Se o campo se chamar `aluno` em vez de `estudante`, a query retorna array vazio sem erro.

**Porquê não foi corrigido:** Sem Strapi a correr, é impossível verificar. As queries seguem convenções razoáveis mas não confirmadas.

**Risco:** Médio. Certificados e ranking podem retornar vazios silenciosamente.

**Para corrigir:**
1. Levantar Strapi
2. Verificar nomes reais em `/api/content-type-builder/content-types`
3. Actualizar queries se necessário

---

## 🟡 Dados Hardcoded / Mentira UI

### DT-03 — `pulseVariacao: 12` hardcoded no dashboard do estudante

**Ficheiro:** `apps/api/src/routes/estudante.ts` (linha ~131)

```ts
stats: {
  ...
  pulseVariacao: 12,  // ← Sempre 12%, independente da actividade real
}
```

**Problema:** O estudante vê sempre "+12%" de variação de actividade. O valor deveria ser calculado a partir de telemetria real (comparação actividade semana actual vs anterior).

**Porquê não foi corrigido:** Pré-existente. Corrigir exige pipeline de telemetria funcional + query temporal sobre eventos do utilizador.

**Risco:** Mentira UI. O utilizador vê dados falsos de "progresso".

**Para corrigir:**
1. Implementar query de telemetria: contar eventos por utilizador nos últimos 7 vs 14 dias
2. Calcular variação percentual real
3. Substituir o `12` pelo valor calculado

---

## 🟠 Performance

### DT-04 — Feed pipeline faz N+1 queries (getItemStats por candidato)

**Ficheiro:** `apps/api/src/routes/feed.ts` → `buildFeed()` → `mapConcurrent()`

```ts
const items = await mapConcurrent(candidates, async (cand) => {
  const stats = await getItemStats(cand.tipo, String(cand.id));
  // ...
}, HYDRATION_CONCURRENCY);
```

**Problema:** Para cada candidato no feed, faz uma chamada individual a `getItemStats` (que vai ao Strapi ou Redis). Com 100 candidatos = 100 requests. `HYDRATION_CONCURRENCY` limita a concorrência mas não elimina o volume.

**Porquê não foi corrigido:** Pré-existente. A função `buildFeed` e `getItemStats` já existiam antes das novas rotas. Refactoring para batch query exige redesenhar o data layer.

**Risco:** Latência degradada em feeds grandes. Mitigado pelo `HYDRATION_CONCURRENCY` limit e cache Redis nos stats.

**Para corrigir (Wave 4+):**
1. Batch `getItemStats` — aceitar array de IDs, retornar map
2. Single Strapi query com filtros `[$in]` em vez de N queries individuais
3. Pré-computar stats em background worker

---

## ✅ Resolvidos Nesta Sessão

| ID | Problema | Resolução |
|----|----------|-----------|
| ~~DT-05~~ | `home.ts` BFF servia dados mock hardcoded | **Removido** — mount eliminado do `index.ts` (dead code) |
| ~~DT-06~~ | ConquistaManualComposer não enviava `mediaUrls` | **Corrigido** — campo de URLs com validação adicionado ao formulário |
| ~~DT-07~~ | Feed `/` e `/geral` eram duplicatas sem explicação | **Documentado** — comment inline + lógica reduzida a `buildFeed()` call |
| ~~DT-08~~ | Ranking RBAC mismatch (FE 4 roles, BFF só estudante) | **Corrigido** — extraído para `ranking.ts` com `verifyJwt` sem role restriction |
| ~~DT-09~~ | Upload response `sizeBytes` vs schema `size` | **Corrigido** — alinhado BFF com `UploadResultSchema` |
| ~~DT-10~~ | Feed weights PUT sem validação Zod | **Corrigido** — `UpdateFeedWeightsPayloadSchema` aplicado |
| ~~DT-11~~ | Feed weights GET/PUT sem try/catch | **Corrigido** — try/catch com erro semântico 502 |
| ~~DT-12~~ | `checkRole(['estudante', 'estudante'])` duplicado | **Corrigido** — `['estudante']` |

---

## Notas

- Os warnings de `@theme` / `@apply` no `index.css` são **Tailwind v4 syntax** — falso positivo do IDE CSS linter, não são bugs.
- O ficheiro `apps/api/src/routes/home.ts` continua no disco mas **não está montado** no `index.ts`. Pode ser eliminado fisicamente quando conveniente.
- Os 4 items pendentes (DT-01 a DT-04) estão classificados por **dependência** (Strapi a correr) e não por preguiça.

---

*Regra de Ouro: Se não está documentado aqui, não existe como dívida técnica consciente.*
