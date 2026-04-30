# H1 — Privacy & Field Visibility: Perfil ↔ Dashboard Separation

**Prioridade:** Alta  
**Wave:** Pós-Remediação (Tier 2)  
**Origem:** `/fv/Notes/Plan Perfis V2 com Privacidade.md` (24 steps) + `specs/IMPORTANTE/03`  
**Feature Flag:** `PROFILE_V2_PUBLIC` (já registada em `registry/features.ts` como ROLLOUT)

---

## Problema

O perfil actual é uma área de configuração. Não existe separação entre **identidade pública** (o que os outros vêem) e **progresso privado** (dashboard). Métricas de vulnerabilidade (hesitação, erros) são expostas sem controlo.

## Princípio Soberano

> Métricas de vulnerabilidade nunca são públicas. O backend é a autoridade — field-level filtering acontece no servidor antes de devolver dados.

---

## Arquitectura: 2 Vistas, 1 Fonte

```
┌─────────────────────────┐     ┌─────────────────────────┐
│   Perfil Público        │     │   Dashboard Privado     │
│   (/perfil/:slug)       │     │   (/dashboard)          │
│                         │     │                         │
│ • Nome + Headline       │     │ • Métricas φ/R/Foco     │
│ • Bio + Avatar          │     │ • Telemetria bruta       │
│ • Conquistas Públicas   │     │ • Simuladores em curso   │
│ • Projectos Publicados  │     │ • Recomendações IA       │
│ • Vínculos Aprovados    │     │ • Reputação detalhada    │
│ • Mini-feed público     │     │ • Perfil Vocacional full │
│ • Score (se ALTA certeza)│    │ • Hesitação + Erros      │
│ • Reputação Tier        │     │ • Insights Tina          │
└─────────────────────────┘     └─────────────────────────┘
```

---

## Matriz de Campos por Role (Field-Level Visibility)

| Campo | Próprio | Mentor Vinculado | Instituição Vinculada | Público | Admin |
|-------|---------|------------------|-----------------------|---------|-------|
| Nome, Bio, Avatar | ✅ | ✅ | ✅ | ✅ | ✅ |
| Headline | ✅ | ✅ | ✅ | ✅ | ✅ |
| Email | ✅ | ❌ | ❌ | ❌ | ✅ |
| Conquistas | ✅ | ✅ | ✅ | ✅ (públicas) | ✅ |
| Score Global | ✅ | ✅ | ✅ | ✅ (se certeza ALTA) | ✅ |
| Dimensões φ/R/Foco | ✅ | ✅ | ✅ (agregado) | ❌ | ✅ |
| Hesitação | ✅ | ✅ | ❌ | ❌ | ✅ |
| Progresso cursos | ✅ | ✅ | ✅ (se vinculado) | ❌ | ✅ |
| Telemetria bruta | ✅ | ❌ | ❌ | ❌ | ✅ |
| Insights Tina | ✅ | ✅ | ❌ | ❌ | ✅ |
| Vínculos | ✅ | ✅ | ✅ | ✅ (aprovados) | ✅ |
| Projectos | ✅ | ✅ | ✅ | ✅ (publicados) | ✅ |

---

## Implementação (12 Steps)

### Backend (BFF)

1. **Criar middleware `fieldVisibility`** em `apps/api/src/middleware/` que aceita role + vinculoStatus e filtra campos antes de `c.json()`.
2. **Nova rota `GET /perfil/:slug/public`** — retorna apenas campos permitidos para o viewer (determinado pelo JWT ou anónimo).
3. **Evoluir `GET /perfil/me`** — retorna tudo (é o próprio utilizador).
4. **Serializer `serializePerfilPublico(perfil, viewerRole, vinculoStatus)`** — aplica a matriz de campos acima.

### Shared

5. **Schema `PerfilPublicoSerializado`** em `@pdc/shared` com campos opcionais (os que podem ser filtrados são `.optional()`).
6. **Schema `FieldVisibilityMatrix`** — configuração estática que o serializer usa.

### Frontend

7. **Rota `/perfil/:slug`** — página pública com layout tipo "LinkedIn vocacional".
8. **Componente `PublicProfileCard`** — nome, headline, avatar, conquistas, projectos, mini-feed, tier reputação.
9. **Componente `ScoreGauge`** — mostra score global com indicador de certeza ("Score baseado em X simulações").
10. **Fallback para certeza BAIXA** — em vez de score, mostra: "Complete mais simulações para desbloquear o seu Score Vocacional".

### Feature Flag Gate

11. **`PROFILE_V2_PUBLIC` flag** — já registada como ROLLOUT. Gate no BFF: se OFF, `/perfil/:slug/public` retorna 404.
12. **Migration path** — quando flag passa a STABLE, remover gate e tornar perfil público por defeito.

---

## Regras Inegociáveis

- **Backend-only filtering** — o frontend recebe apenas os campos que o viewer tem permissão de ver. Nunca confiar no client para esconder dados.
- **Vínculos determinam acesso** — um mentor só vê métricas detalhadas do estudante se tiver vínculo `aprovado`.
- **Conquistas públicas** — todas as conquistas são públicas por defeito (são instrumento de prova social).
- **Hesitação e erros são sempre privados** — visíveis apenas para o próprio, mentores vinculados e admin.

---

## Ficheiros Envolvidos

### Scope IN
- `apps/api/src/routes/perfis.ts`
- `apps/api/src/middleware/` (novo ficheiro)
- `packages/shared/src/user.ts`
- `packages/shared/src/core.ts`
- `apps/web/src/features/perfil/`

### Scope OUT
- `apps/edge/` — não afectado
- `infra/strapi/` — não requer migração (campos já existem no CMS)

---
*Absorvido de: `/fv/Notes/Plan Perfis V2 com Privacidade.md` (24 steps) — 30 de Abril de 2026.*
