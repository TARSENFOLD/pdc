# Roadmap — Produto Disruptivo de Classe Mundial

> **Propósito:** Este roadmap detalha as melhorias essenciais (documentação + código) que transformam o PDC de "MVP funcional" em "infraestrutura de decisão vocacional imbatível". Cada item está classificado por impacto no problema central: **evasão**.
>
> **Origem:** Deep dive de 54 ficheiros em `/fv/` + cross-reference com o codebase real + 5 specs soberanas em `specs/IMPORTANTE/`.
>
> **Data:** 30 de Abril de 2026

---

## Princípio de Filtragem

Cada item é avaliado por: **"Isto ajuda o estudante a tomar uma decisão de carreira melhor?"** Se não, fica de fora.

---

## Tier 1 — Motor Vocacional (O Core que Ninguém Tem)

> **Impacto:** Directo na precisão do fluxo `Simulação → Score → Perfil Vocacional → Recomendação → Decisão Informada`

| # | Melhoria | Tipo | O que falta | Onde | Ficheiros envolvidos |
|---|----------|------|-------------|------|---------------------|
| **1.1** | **Pesos por tipo de evento** | Code | O `vocacional.service.ts` faz média simples de behavior_patterns. A spec 1a81656f define 11 pesos: `simulacao.concluida 40pts`, `simulacao.abandonada -5pts`, `curso.concluido 30pts`, etc. | `apps/api/src/modules/vocacional/` | `vocacional.service.ts` |
| **1.2** | **Nível de certeza** (BAIXA/MEDIA/ALTA) | Code+Shared | O score sai sem indicação de confiança. Se tem 3 eventos, a certeza é baixa. Se tem 200+, é alta. O frontend precisa saber isto para mostrar "Complete mais simulações para desbloquear o seu Score". | `packages/shared/src/core.ts` + `vocacional.service.ts` | Schema `PerfilVocacionalSchema` + service |
| **1.3** | **Recomendações cross-content** | Code | `gerarRecomendacoes()` só retorna cursos. Deve recomendar experiências + simulações + mentores + programas. | `vocacional.service.ts` | + `vocacional.types.ts` → mover para `@pdc/shared` |
| **1.4** | **Schema PerfilVocacional expandido** | Shared | Falta `hesitacao` na dimensão, `certeza`, `totalEventos`, `areasExploradas`. | `packages/shared/src/core.ts` | `PerfilVocacionalSchema` |
| **1.5** | **Rota premium enriquecida** | Code | `/vocacional/perfil-premium` não retorna dimensões completas nem certeza. | `apps/api/src/routes/vocacional.ts` | |

### Pesos Canónicos (Spec 1a81656f)

```
simulacao.concluida     40pts × (score/100)
simulacao.abandonada    -5pts
curso.concluido         30pts
curso.inscricao          5pts
experiencia.visualizada  3pts
questao.respondida       8pts × (acerto ? 1.5 : 0.5)
projeto.criado          15pts
projeto.publicado       20pts
mentoria.aceite         10pts
conquista.partilhada     5pts
rating.criado            2pts
```

### Limiares de Certeza

| Nível | Condição | O que o frontend mostra |
|-------|----------|------------------------|
| BAIXA | < 15 eventos OU 0 patterns | "Complete mais simulações para desbloquear o seu Score Vocacional" |
| MEDIA | ≥ 15 eventos OU ≥ 1 pattern | Score visível com nota "Precisão em construção" |
| ALTA | ≥ 50 eventos E ≥ 3 patterns | Score completo + comparação com benchmark da área |

---

## Tier 2 — Perfil como Capital Social (Engagement + Growth Viral)

> **Impacto:** Transforma o esforço do estudante em "moeda social" → retenção + viralização orgânica

| # | Melhoria | Tipo | O que falta | Onde | Spec/Ticket |
|---|----------|------|-------------|------|-------------|
| **2.1** | **Separação Perfil (público) ↔ Dashboard (privado)** | Code+Doc | Não existe separação. O perfil é só configuração. | API + Frontend | H1 (já criado em `docs/a_implementar/`) |
| **2.2** | **Field-level visibility por role** | Code | Backend deve filtrar campos antes de retornar — métricas de vulnerabilidade (hesitação, erros) nunca são públicas. | `apps/api/src/routes/perfis.ts` | H1 / G10 |
| **2.3** | **Perfil Público Showcase** (LinkedIn vocacional) | Code | Rota `GET /perfil/:slug/public` — link partilhável com conquistas + projectos + tier reputação. | `routes/perfis.ts` + Frontend | H1 |
| **2.4** | **Mini-feed público no perfil** | Code | Últimas conquistas + projectos publicados pelo estudante, visíveis no perfil público. | Frontend + BFF | G6 + H1 |
| **2.5** | **Fallback para certeza BAIXA** | Frontend | Radar chart em marca d'água + CTA "Complete simulações para desbloquear". | Frontend | H1 |

### Matriz de Campos por Role

Documentada integralmente em `docs/a_implementar/H1_—_Privacy_Field_Visibility_Perfil_Dashboard_Separation.md`. Resumo:

| Dado | Público | Mentor Vinculado | Instituição | Admin |
|------|---------|-----------------|-------------|-------|
| Score Global | ✅ (se certeza ALTA) | ✅ | ✅ | ✅ |
| Hesitação | ❌ | ✅ | ❌ | ✅ |
| Telemetria bruta | ❌ | ❌ | ❌ | ✅ |
| Conquistas | ✅ | ✅ | ✅ | ✅ |

---

## Tier 3 — Efeitos de Rede (O Flywheel Imbatível)

> **Impacto:** O que torna o PDC impossível de replicar. Já documentado em PROJECT.md §13.

| # | Melhoria | Tipo | Estado actual | Próximo passo |
|---|----------|------|--------------|---------------|
| **3.1** | **Feed Dinâmico Personalizado** | Code | Feed existe mas com 4 tipos básicos (G11 spec existe) | Implementar algoritmo de ranking vocacional (pesos por área de interesse) |
| **3.2** | **Notificações FOMO** | Code | `notify.hook.ts` existe (4.4KB) | Implementar triggers: "3 instituições viram o teu perfil", "Novo mentor na tua área" |
| **3.3** | **Conquistas partilháveis** | Code | Schema de conquista existe | Adicionar OG image dinâmica (F1 spec existe) + botão "Partilhar no LinkedIn" |
| **3.4** | **Streaks de consistência** | Code+CMS | Não existe | Criar content-type em Strapi + lógica de streak no BFF |
| **3.5** | **Padrões comparativos** ("O teu padrão é 90% idêntico ao dos que desistem") | Code | Heurísticas são puramente individuais | Requer aggregate queries por área + população (Fase 2 pós-MVP) |

### O Flywheel (documentado em PROJECT.md §13)

```
Mais Conteúdo (Mentores) → Mais Dados (Telemetria)
→ Melhores Recomendações (Motor φ/R + IA)
→ Mais Estudantes
→ Mais Instituições que não querem perder candidatos
→ Mais Conteúdo...
```

---

## Tier 4 — UI Premium "Soul & Elite" (Primeira Impressão)

> **Impacto:** Um estudante abandona em 3 segundos se a UI parecer amadora. Soul & Elite elimina isto.

| # | Melhoria | Tipo | Origem (Notes) | Ticket existente |
|---|----------|------|----------------|-----------------|
| **4.1** | **Morte ao preto puro** — usar `#0A0A0A` / `#121212` | Frontend | Notes/Estou preocupada | T-REM-4 (parcial) |
| **4.2** | **Sidebar agrupada** (Explorar / Progresso / Conta) | Frontend | Notes/Estou preocupada | — |
| **4.3** | **Empty States com CTA** (skeleton + radar em marca d'água) | Frontend | Notes/Estou preocupada | T-REM-4 |
| **4.4** | **Glassmorphism nos cards** (backdrop-blur + bordas 1px 5% white) | Frontend | Notes/Estou preocupada | ADR-006/ADR-017 |
| **4.5** | **Tina widget redesign** (arredondado + backdrop-blur + laranja só em CTA) | Frontend | Notes/Estou preocupada | — |
| **4.6** | **Tipografia hierárquica** (Inter UI + Instrument Serif títulos + JetBrains Mono dados) | Frontend | CONSOLIDATED_KNOWLEDGE §1 | tokens.css existente |

---

## Tier 5 — Programas & Projectos (Diferenciação Competitiva)

> **Estado:** Os schemas no `@pdc/shared` já estão maduros. O gap é na documentação e no frontend.

| # | Item | Estado Code | Estado Doc | O que falta |
|---|------|-------------|-----------|-------------|
| **5.1** | **ProgramaTipoSchema** (standard/shadowapro/eduvisit) | ✅ Existe | ✅ G4 existe | Frontend para ShadowAPro e EduVisita |
| **5.2** | **ProjetoModoSchema** (5 modos: exposição/colaboração/mentoria/financiamento/feedbackComunitário) | ✅ Existe | ✅ G5 existe | Frontend para discriminação por modo |
| **5.3** | **ShadowAProCandidatura** + **EduVisitaAgendamento** | ✅ Schemas existem | ✅ G4 | Rotas BFF + UI de agendamento |
| **5.4** | **ACL de acesso ao Core do projecto** | ✅ Schema existe | ✅ G5 | Implementação backend + UI de aprovação |
| **5.5** | **Votos e Endorsements** | ✅ Schema existe | ✅ G5 | BFF routes + UI |

---

## Tier 6 — Documentação que Protege a Alma

> **Impacto:** Sem docs correctos, qualquer agente ou dev novo introduz drift. "Doc is Law" é inegociável.

| # | Acção | Estado | Detalhe |
|---|-------|--------|---------|
| **6.1** | ~~ADR-005 duplicado~~ | ✅ Feito | Unificado em `docs/decisoes/adr-005-edge-telemetry.md` |
| **6.2** | ~~NF1 contradiction~~ | ✅ Feito | `REQUIREMENTS.md` corrigido para `[x]` — zero `any` confirmado |
| **6.3** | ~~PROJECT.md incompleto~~ | ✅ Feito | Contexto Angola + Efeitos de Rede + Repos + Out of Scope expandido |
| **6.4** | ~~H1 spec (Privacy)~~ | ✅ Feito | `docs/a_implementar/H1_—_Privacy_Field_Visibility_Perfil_Dashboard_Separation.md` |
| **6.5** | CONSOLIDATED_KNOWLEDGE.md | 🟡 Parcial | Falta §3 expandido (privacy matrix) e §5 com drifts actualizados |
| **6.6** | Seed narrativo documentado | 🟡 Existe | `docs/seed/README.md` — verificar se 100 personas estão alinhadas com 15 áreas |

---

## Ordem de Execução Recomendada

```
┌─────────────────────────────────────────┐
│ Fase 1: DOCUMENTAÇÃO (esta sessão)      │
│                                         │
│ 6.1 ✅  ADR-005 unificado               │
│ 6.2 ✅  NF1 corrigido                   │
│ 6.3 ✅  PROJECT.md enriquecido          │
│ 6.4 ✅  H1 spec criada                  │
│ 6.5 ⏳  CONSOLIDATED_KNOWLEDGE update   │
│ Este roadmap ✅                          │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│ Fase 2: SHARED SCHEMAS (Code Tier 1)    │
│                                         │
│ 1.4  PerfilVocacionalSchema expandido   │
│ 1.3  RecomendacaoSchema em @pdc/shared  │
│ 1.2  NivelCertezaSchema                 │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│ Fase 3: BFF MOTOR (Code Tier 1)         │
│                                         │
│ 1.1  Pesos por evento em vocacional svc │
│ 1.5  Rota premium enriquecida           │
│ 2.2  Field-level visibility middleware   │
│ 2.3  Rota /perfil/:slug/public          │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│ Fase 4: FRONTEND (UI Tier 2+4)          │
│                                         │
│ 2.1  Separação perfil/dashboard         │
│ 2.5  Fallback certeza BAIXA             │
│ 4.1-4.6  Soul & Elite purge             │
│ 3.1-3.4  Feed + Notificações + Streaks  │
└─────────────────────────────────────────┘
```

---

## Relação com Tickets Existentes

| Item deste roadmap | Ticket/Spec existente | Acção |
|---|---|---|
| 1.1-1.5 (Motor Vocacional) | W2.5-E4 (Wave 2 Debt Closeout) | **Expandir** E4 para incluir pesos + certeza |
| 2.1-2.5 (Perfil/Privacy) | G10, H1, `PROFILE_V2_PUBLIC` flag | **Novo epic** — H1 criado |
| 3.1-3.4 (Flywheel) | G6, G11, G14, Gamificação (Parte IV roadmap) | **Integrar** no roadmap existente |
| 4.1-4.6 (Soul & Elite) | T-REM-4, ADR-006/017 | **Expandir** T-REM-4 |
| 5.1-5.5 (Programas/Projectos) | G4, G5, W2.5-E3 | **Já especificados** — falta implementação |

---

## Métricas de Sucesso (Quando saberemos que é "classe mundial")

| Métrica | Target | Como medir |
|---------|--------|-----------|
| **Precisão do score vocacional** | Nível de certeza ALTA para 60%+ dos estudantes activos | `SELECT certeza, COUNT(*) FROM perfis_vocacionais GROUP BY certeza` |
| **Retenção D7** | ≥ 40% dos estudantes voltam no 7.º dia | Telemetria `session.started` por userId |
| **Recomendações consumidas** | ≥ 30% das recomendações geram clique | Telemetria `experiencia.visualizada` / `curso.inscricao` correlacionadas |
| **Perfil público partilhado** | ≥ 10% dos estudantes partilham o perfil | Telemetria `conquista.partilhada` + referrer externo |
| **B2B conversion** | ≥ 3 instituições piloto em 6 meses | CRM / manual |
| **Lighthouse Mobile** | ≥ 90 | `lighthouserc` em CI (NF7) |

---
*Criado: 30 de Abril de 2026 · Fonte: Deep dive `/fv/` + codebase cross-reference.*
*Alinhado com: `specs/IMPORTANTE/01-05` · `.planning/roadmap.md` · `CONSOLIDATED_KNOWLEDGE.md`*
