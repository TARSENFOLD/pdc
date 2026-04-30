# Verificação de Tickets — 34 Não Implementados

> **Origem:** `/fv/Notes/verification verifique.txt` (491 linhas)
> **Status:** REFERÊNCIA — diagnóstico histórico do estado de implementação
> **Data:** Abril 2026

---

## 1. Resumo

Uma auditoria exaustiva concluiu que **34 tickets não estavam totalmente implementados**, apesar de documentação sugerir o contrário.

---

## 2. Milestones com Tickets Pendentes

| Milestone | Tickets Pendentes | Prioridade |
|-----------|-------------------|-----------|
| **M0** | T7 (refactor auth.ts), T8 (modularizar LandingPage) | Alta |
| **M1** | T6 (entity_score), T7 (LikeButton), T8 (BookmarkButton), T9 (RatingStars + integração) | Média |
| **M2** | Feed inteiro + Algoritmo de Ranking | Alta |
| **M3** | T7 (fluxo 2FA frontend) | Baixa (OTP descartado) |
| **M4** | Programas completos, Sim Tipo 3, Conquistas automáticas | Alta |
| **M5** | Páginas Públicas, SEO, Performance | Média |
| **M6** | Telemetria pipeline completo, idempotência, batch | Alta |
| **M7** | Sentry, /health, pino, axe-core, mensagens realtime | Média |

---

## 3. Ondas com Tickets Pendentes

| Onda | Estado | Prioridade |
|------|--------|-----------|
| Onda 1 (Micro Desafio Vocacional) | `[~]` Parcial | Alta |
| Onda 2A (Catálogos Públicos) | `[~]` Parcial | Alta |
| Onda 2B (Zona Estudante completa) | `[ ]` Todo | Alta |
| Onda 3A (Notif/Feed/Search/Vínculos/Msg) | `[ ]` Todo | Média |
| Onda 3B (Zonas Mentor/Instituição/Moderador) | `[ ]` Todo | Média |
| Onda 4 (Polish + Deploy prod) | `[ ]` Todo | Após ondas anteriores |

---

## 4. Features Missing por Área

### Motor Vocacional
- Pesos por tipo de evento (11 pesos da spec)
- Nível de certeza (BAIXA/MEDIA/ALTA)
- Recomendações cross-content
- Schema expandido com hesitação, certeza, totalEventos

### Feed & Social
- Algoritmo de ranking para feed
- Feed de conquistas/provas (não texto livre)
- Notificações FOMO
- Streaks de consistência

### Perfil
- Separação perfil público ↔ dashboard privado
- Field-level visibility
- Perfil público partilhável (showcase)

### Programas & Projectos
- Frontend para ShadowAPro e EduVisita
- UI de discriminação por modo de projecto
- ACL de acesso ao core do projecto

### Telemetria
- Pipeline completo com idempotência e batch
- 30+ eventos (vs 8 implementados)

### Infraestrutura
- Sentry integration
- /health endpoint
- pino structured logging
- axe-core acessibilidade

---

## 5. Acções Correctivas Recomendadas

A auditoria recomendou priorização por ondas:
1. **Primeiro:** Motor vocacional (core do produto).
2. **Segundo:** Perfil/Privacy (H1) — engagement.
3. **Terceiro:** Feed + Social — efeitos de rede.
4. **Quarto:** UI premium — primeira impressão.

---

*Referência: `.planning/roadmap.md` (estado actual honesto), `docs/ROADMAP_PRODUTO_DISRUPTIVO.md` (plano de execução).*
