# Perfis V2 — Separação Perfil/Dashboard + Privacidade Field-Level

> **Origem:** `/fv/Notes/Plan Perfis V2 com Privacidade.md` (71 linhas, 24 steps)
> **Status:** OURO — plano sério não absorvido noutro spec até à criação de H1
> **Spec implementação:** `docs/a_implementar/H1_—_Privacy_Field_Visibility_Perfil_Dashboard_Separation.md`
> **Última revisão:** Abril 2026

---

## 1. Princípio Fundamental

Fronteira **rígida** entre:
- **Perfil** = identidade pública (como os outros me vêem)
- **Dashboard** = progresso privado (métricas, telemetria, simulações em curso)

---

## 2. Fases de Execução (24 Steps)

### Fase 0 — Congelamento de Contrato
1. Definir matriz de campos por role com 3 estados: **obrigatório / opcional / público-privado**.
2. Catalogar componentes que hoje misturam identidade e métricas.

### Fase 1 — Backend de Privacidade
3. Evoluir schema de perfil: `website`, `socialLinks`, `language`, `notificationPreferences`, `visibilitySettings`, `miniFeedSettings`, `branding` (instituição), `headline`, `capa`.
4. Corrigir schema de vínculo: `tipo`, `visibleOnProfile`, regra `status=aprovado`.
5. Implementar **serialização pública field-level** no backend (filtering por viewer + role).
6. Endpoints de preferências/privacidade com defaults seguros por role.

### Fase 2 — Frontend
7. Refactoring `PerfilDetalhado`: apenas identidade pública, mini-feed, vínculos aprovados, conquistas públicas.
8. Refactoring `EditarPerfil`: identidade, contacto, idioma, privacidade, notificações, branding institucional.
9. Camada de dados separada: `profileIdentityApi` vs `dashboardProgressApi`.
10. Renderização **role-aware** para os 6 tipos de conta.

### Fase 3 — Iconografia Profissional
11. `iconMap` centralizado (SVG/Lucide), substituir emojis hardcoded.
12. Guideline: sem emojis em títulos críticos, contraste AA, `aria-label`.

### Fase 4 — Rotas e Permissões
13. Manter rotas PT (`/perfil/:id`, `/editar-perfil`).
14. Guards por role/ownership.
15. Dashboard não reexibe identidade editável (apenas nome/avatar de contexto).

### Fase 5 — Verificação
16. Testes: payload público não retorna campos privados por role e por estado de vínculo.
17. Regressão visual + acessibilidade após migração de ícones.
18. Rollout com checklist por role.

---

## 3. Matriz de Campos por Role

| Dado | Público | Mentor Vinculado | Instituição | Admin |
|------|---------|-----------------|-------------|-------|
| Nome/Avatar | ✅ | ✅ | ✅ | ✅ |
| Headline | ✅ | ✅ | ✅ | ✅ |
| Score Global | ✅ (se certeza ALTA) | ✅ | ✅ | ✅ |
| Hesitação/Vulnerabilidade | ❌ | ✅ | ❌ | ✅ |
| Telemetria bruta | ❌ | ❌ | ❌ | ✅ |
| Conquistas | ✅ | ✅ | ✅ | ✅ |
| Contacto | ❌ (default) | ✅ (se partilhado) | ❌ | ✅ |
| Mini-feed | ✅ (se habilitado) | ✅ | ✅ | ✅ |
| Vínculos | ✅ (se `visibleOnProfile + aprovado`) | ✅ | ✅ | ✅ |

---

## 4. Decisões

- **Backend como fonte de verdade** — enforcement no backend, frontend como camada de UX.
- **Feature flag:** `PROFILE_V2_PUBLIC` para rollout gradual.
- **Super admin/moderador:** perfil público mínimo (nome/função) vs perfil interno completo.
- **PRs:** PR-A (backend privacidade + schemas) → PR-B (frontend refactor + iconografia).

---

*Referência: Spec H1 em `docs/a_implementar/` contém a versão formal completa.*
