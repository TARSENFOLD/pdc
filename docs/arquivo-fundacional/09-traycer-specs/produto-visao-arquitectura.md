# Specs Traycer — Produto, Visão e Arquitectura de Reconstrução

> **Origem:** `/Documentos/Traycer/` — 3 specs fundadoras (~34KB total)
> **IDs Traycer:** `868a324b` (Plano Mestre), `d34f63b8` (Visão), `631b796e` (Arquitectura)
> **Data original:** 3 Abril 2026 · **Status:** OURO — informação mais detalhada que specs/IMPORTANTE/01

---

## 1. Frase Central (Identidade do Produto)

> "O PDC não é uma plataforma de ensino. É uma infraestrutura de decisão educacional — transforma a incerteza vocacional em escolhas de carreira precisas, antes que as decisões erradas custem dinheiro."

### O PDC É vs Não É

| O PDC É | O PDC NÃO É |
|---------|-------------|
| Infraestrutura de decisão vocacional | Repositório passivo de conteúdo |
| Sistema que mede comportamento real | Teste de personalidade genérico |
| Plataforma de marketing institucional | Cópia do Canvas/Moodle |
| Ecossistema onde todos ganham | Ferramenta só para estudantes |

---

## 2. O Problema (Angola)

- Até 60% de evasão no primeiro ano em algumas instituições
- Famílias perdem dinheiro em cursos abandonados
- Instituições perdem receita e reputação
- O país perde talentos que poderiam impulsionar o desenvolvimento

**Solução:** Dar ao estudante a experiência real do curso antes de se comprometer.

---

## 3. Jornada do Estudante (Fluxo Core)

```
Entra na plataforma
  → Faz diagnóstico inicial
  → Explora áreas de interesse
    → Vive Experiências de instituições
    → Faz Simulações práticas
    → Segue Programas
  → Constrói Perfil Vocacional com evidências reais
  → Recebe recomendações personalizadas
  → Toma decisão informada
```

**Fluxo mínimo viável:** `Simulação → Score → Perfil Vocacional → Recomendação`

---

## 4. Diagnóstico do Projecto Original (Pré-v2)

### Problemas Críticos de Segurança

| Problema | Risco |
|----------|-------|
| Auth via `sessionStorage` (texto claro) | 🔴 Qualquer script rouba sessão |
| Sem JWT real, sem refresh tokens | 🔴 Sessão nunca expira |
| Rate limiting em `Map` em memória | 🔴 Não funciona com múltiplas instâncias |
| Denúncias em `localStorage` | 🔴 Moderadores nunca vêem |
| `actorId` lido de headers `x-perfil-id` | 🔴 Falsificável pelo cliente |
| RBAC com fallback `allow by default` | 🔴 Recursos não mapeados ficam abertos |

### Problemas de Arquitectura

| Problema | Impacto |
|----------|---------|
| `strapiApi.js` com 1887 linhas | Impossível manter ou testar |
| Redux + Context + SWR + React Query (4 sistemas) | Inconsistências garantidas |
| Mocks activos em dev | Dados falsos aparecem sem aviso |
| `process.env.REACT_APP_*` em código Vite | Variáveis quebradas em produção |
| Componentes duplicados (Button em 3 locais) | Inconsistência visual |
| LTI acoplado ao frontend | Impossível escalar independentemente |

### Problemas de Custo

| Problema | Impacto |
|----------|---------|
| Strapi faz CMS + lógica de negócio + DB | Caro quando escala |
| Upload de imagens sem CDN | Tráfego e custos elevados |
| Sem cache Redis | Queries repetitivas ao PostgreSQL |

---

## 5. Arquitectura Proposta (PDC v2)

### 5 Princípios Fundamentais

1. **Uma única fonte de verdade por responsabilidade** — auth num lugar, dados noutro, UI noutro
2. **Segurança por defeito** — httpOnly cookies, JWT com expiração, RBAC no servidor
3. **Sem mocks em produção** — dados reais ou erro explícito
4. **Custo controlado** — Strapi apenas como CMS, lógica no BFF
5. **LTI como serviço próprio** — integrável em qualquer LMS

### Stack Proposto

```
Browser/React → Vercel CDN → Frontend React 18 + Vite
                                    ↓
                              BFF API (Hono + Node.js) — Railway
                                    ↓
                    ┌───────────────┼───────────────┐
                    ↓               ↓               ↓
              Strapi v5        Redis (Upstash)   Cloudflare R2
              (Railway)        Rate limit,       Uploads,
              PostgreSQL       Cache, Sessions   Media
                    ↓
              Cloudflare Workers — Edge Telemetry
```

### Fases de Reconstrução

| Fase | Foco | Prioridade |
|------|------|------------|
| **0** | Fundação — monorepo, tooling, CI/CD | 🔴 |
| **1** | Auth Segura — JWT httpOnly, RBAC, 2FA | 🔴 |
| **2** | Design System — Soul & Elite, tokens | 🔴 |
| **3** | API Layer — BFF completo, schemas Zod | 🔴 |
| **4** | Core do Produto — Cursos, Simulações, etc | 🔴 |
| **5** | LTI 1.3 — Grade passback, NRPS | 🟠 |
| **6** | Moderação/Admin — filas, audit trail | 🟠 |
| **7** | IA e Realtime — Tina, RAG, Socket.IO | 🟡 |

---

## 6. Trio GSD Original (Snapshot)

Os 3 ficheiros `PROJECT.md`, `REQUIREMENTS.md`, `STATE.md` no Traycer são as versões originais do GSD que foram depois evoluídas no `.planning/` do repo.

**Estado no snapshot Traycer:**
- Fase 0-3: Completas
- Fase 4: Em progresso (4A + 4B concluídos, 4C em curso)
- Fases 5-7: Não iniciadas

**Requirements trackeados:** 11 por fase (REQ-0-001 a REQ-0-011 para Fase 0, etc.), totalizando ~80 requirements com critérios de verificação específicos.

---

*Destilado de 3 specs Traycer + 3 ficheiros GSD · IDs: 868a324b, d34f63b8, 631b796e, c2ffe500, c4b09e93, c61e3175*
