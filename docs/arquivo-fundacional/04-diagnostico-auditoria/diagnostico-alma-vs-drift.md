# Diagnóstico — Alma Original vs Estado Actual (Drift Map)

> **Origem:** `/fv/Notes/Diagnóstico Onde está.txt` (1182 linhas)
> **Status:** OURO — auditoria profunda que identificou toda a deriva documental
> **Data da auditoria:** Abril 2026
> **Nota:** Este diagnóstico já foi parcialmente remediado pelos doc fixes de d11 (ADR-005, NF1, PROJECT.md, H1)

---

## 1. Resumo Executivo

A "alma" do PDC v2 está preservada nos **13 specs UUID** e nos **4 ADRs**. O drift é principalmente **documental** (PROJECT.md, STATE.md, CONSTITUTION.md) e não no código de aplicação.

| Categoria | Veredicto |
|-----------|-----------|
| 🔴 **Drift Crítico** | PROJECT.md (perdeu 67%), STATE.md (perdeu 56%), eventos.md (8 vs 30+ eventos), estado-atual.md (falsas claims de completude) |
| 🟠 **Drift Médio** | CONSTITUTION.md (improvements + decisões não-ratificadas), docs/projeto/* (narrativa paralela), modelo vocacional (pesos substituídos por narrativa) |
| 🟢 **Sem Drift** | 13 specs UUID, ADRs 001-004, roadmap.md, plano mestre ondas, guias técnicos |
| 🟠 **Não Absorvido** | Plan Perfis V2, detalhe de Programas/Projectos (edu-visita), funcionalidades de viralização |

---

## 2. PROJECT.md — De 196 → 65 linhas (perda ~67%)

### O que foi perdido
- **Out of Scope** (8 itens): Gateway pagamento, Turborepo/Nx, Redux/SWR, Mocks, Upload vídeos grandes, Watermarking, Antifraude, Domínio pdc.ao
- **Context** (7 itens): Mercado Angola, evasão, B2B+B2C, referência 1-PDC, ambiente dev, repos externos, Epic Traycer
- **Tech Stack tables** completas (Frontend 9 linhas, Backend 8, CMS, Serviços Externos 7, Infraestrutura)
- **Key Decisions** (10 linhas → 4)
- **Requirements por fase** (substituído por tabela "tudo Validated ✅")

### O que foi adicionado (problemático)
- Fases 0-7 todas marcadas "Validated ✅" — **contradiz roadmap.md** que mostra dezenas de milestones `[ ] Todo`.
- Limite 300 linhas (original: 200 em REQ-NF-007).

### Status actual
✅ **Parcialmente remediado** — Contexto Angola, Efeitos de Rede, Repos e Out of Scope expandido foram restaurados.

---

## 3. STATE.md — De 163 → 71 linhas (perda ~56%)

### O que foi perdido
- Decisions Log completo (11 linhas → 3)
- Blockers (estrutura formal)
- Architecture Snapshot (32 → 8 linhas)
- Environment (OS, Node, Docker, Filesystem)
- Key Files Reference
- Specs de Produto (referência ao Epic 332ffcdb)
- **"Regra de ouro: Se não está documentado aqui, não aconteceu."**

### O que foi adicionado (problemático)
- "Fase 0–7 todas COMPLETA" com adornos falsos.
- Conflito directo com roadmap.md que mostra M0-M7 + Ondas quase todas `[ ] Todo`.

---

## 4. CONSTITUTION.md — Improvements + Decisões Não-Ratificadas

### ✅ Preservar (Improvements legítimos)
- I. Total Type Integrity (Zero any)
- II. Stateless Security (JWT httpOnly + Telemetria Resiliente)
- III. Data-Driven Authority (Skeletons Aspiracionais, Empty States Contextuais)
- TanStack Query 5 config
- Single Source of Truth em @pdc/shared

### ❌ Marcar como Exploração (Não-ratificadas)
- "Hono 4 (BFF) no Cloudflare Workers" → conflita com ADR-003 (cookies SameSite=Strict)
- "Three.js / @react-three/fiber" → não está em nenhuma spec
- "PostgreSQL (Neon)" → alma diz Railway PostgreSQL
- Limite 300 linhas → alma diz 200 (REQ-NF-007)

### Status actual
✅ **Parcialmente remediado** — ADR-005 criado para Edge Telemetry com fronteiras claras.

---

## 5. Telemetria — Drift por Redução

`docs/telemetria/eventos.md` lista 8 eventos. A spec 1a81656f define **30+ eventos** em 6 categorias:
- Navegação, Simulação, Cursos, Experiências, Decisão, Interação Social

Eventos perdidos incluem: `pagina_visitada`, `tempo_na_pagina`, `scroll_depth`, `simulacao_pausada/retomada/abandonada`, `curso_visualizado/inscrito/concluido`, `experiencia_bookmarkada`, `vinculo_solicitado`, `like_dado`, `comentario_feito`, `conquista_partilhada`, `projeto_criado`, entre outros.

---

## 6. Modelo Vocacional — Pesos Substituídos por Narrativa

O `docs/vocacional/modelo.md` substituiu o algoritmo da spec (11 pesos por evento + fórmula + certeza) por:
- Motor W1: Aptidão 40%, Consistência 20%, Dedicação 20%, Diversidade 20%
- Motor W2: narrativa de Cognitive Fluidity, Focus Stability, etc.

A spec canónica com pesos exactos está documentada no ROADMAP_PRODUTO_DISRUPTIVO.md §1.

---

## 7. Lessons Learned (Padrão Anti-Drift)

1. **"Conselho de influencer" travestido de arquitectura** — narrativas grandiosas substituíram trabalho validado.
2. **STATE.md é sagrado** — nunca marcar como completo o que não está. "Se não está documentado aqui, não aconteceu."
3. **Narrativa de pitch ≠ fonte de verdade** — docs/projeto/* são bom material de marketing mas competem com a alma quando vivem em docs/.
4. **Drift documental é mais perigoso que bugs** — futuras IAs/devs lêem docs para tomar decisões.
5. **Manter separação clara:** Specs (autoridade) → ADRs (decisões) → Guias (derivados) → Pitch (marketing).

---

*Este diagnóstico serve como referência histórica. As remediações estão em curso.*
