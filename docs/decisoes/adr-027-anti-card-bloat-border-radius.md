# ADR-027 — Anti-Card-Bloat & Border-Radius Canónico no Interior da App

**Data:** 2026-05-12
**Status:** Aceite
**Contexto:** feature/visual-refresh

---

## Contexto

A interface do PDC apresentava excesso de "card bloat" — cada fragmento de informação estava encapsulado num `Card` com `rounded-2xl` e bordo visível, criando um aspecto de painel administrativo denso e pouco respirável. Isto viola o princípio "Calm Authority" do Design System (§1 do DESIGN.md) e contradiz o ideal Soul & Elite de sofisticação por contenção.

Observações específicas:
- Feed de actividades da `HomePage` usava cards individuais com `border` + `rounded-2xl` para cada item
- Cada actividade recente era encaixotada num box, em vez de fluir como uma lista natural
- O `border-radius` de `rounded-2xl` (16px) era aplicado indiscriminadamente a cards de conteúdo

---

## Decisão

### 1. Regra Anti-Card

Não encaixotar em cards:
- Listas de feed e actividades recentes → usar `py-4 border-b border-border` como separador
- Secções de conteúdo dentro de uma página → usar `<section>` com espaçamento
- Estatísticas simples (número + label) → stack vertical puro
- Quick actions → botões/links isolados sem wrapper de card

Usar cards apenas para:
- Preview de conteúdo com thumbnail (curso, simulação, experiência)
- Widgets laterais de alto valor (stats, next action)
- Modais e drawers (elementos flutuantes)

### 2. Border-Radius Canónico (app interior `/app/*`)

```
rounded-lg  (8px)  — inputs, badges, pills, chips, thumbnails
rounded-xl  (12px) — cards de conteúdo, widgets laterais
rounded-2xl (16px) — modais, drawers, elementos flutuantes sobre canvas
```

**Proibido no interior da app:** `rounded-3xl`, `rounded-full` em cards de conteúdo.

### 3. Espaço como Separador

Preferir espaçamento (`gap-*`, `space-y-*`, `py-*`) e linhas subtis (`border-b border-border`) como separadores visuais em vez de boxes.

---

## Consequências

- **HomePage.tsx** refactorizada: actividades recentes usam `border-b` em vez de cards
- **DESIGN.md §11** adicionado com regras detalhadas e exemplos
- Cards de conteúdo (TrendingCard, CourseCard) migrados para `rounded-xl`
- FeedCard já estava correcto (`py-5 border-b`) — sem alterações necessárias

---

## Alternativas Rejeitadas

- **Manter `rounded-2xl` em tudo** — inconsistente, cria peso visual excessivo
- **Remover todos os bordos** — perde hierarquia visual necessária para distinguir widgets

---

*Aprovado na sessão feature/visual-refresh · 2026-05-12*
