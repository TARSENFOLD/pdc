# Documentação do PDC v2 — Índice Canónico

> **Aviso de Sincronização:** Esta diretoria está em processo de saneamento para alinhar com a visão **Soul & Elite** (Wave 3+). Consulte sempre as Epics Canónicas em `specs/IMPORTANTE/` para a verdade absoluta.

---

## 🏛️ Hierarquia de Autoridade (Governação)

Se encontrar informações contraditórias, a ordem de precedência é:
1. **Epics Canónicas (spec:IMPORTANTE/01–05)** — A Constituição Soberana.
2. **Diretoria `.planning/`** — Estado real, requisitos e roadmap atualizado.
3. **Diretoria `docs/decisoes/`** — Registos de Arquitetura (ADRs).
4. **Diretoria `docs/`** — Guias e manuais (esta diretoria).

---

## 🏥 Matriz de Saúde da Documentação

| Documento | Estado | Ticket de Saneamento | Última Auditoria |
|-----------|--------|----------------------|------------------|
| `decisoes/adr-*` | ✅ Canónico | N/A | 2026-04-20 |
| `vocacional/modelo.md` | ✅ Canónico | N/A | 2026-04-20 |
| `guia-tecnico/setup-local.md` | 🟡 Em saneamento | B2-T1 | 2026-04-21 |
| `api/auth.md` | 🟡 Em saneamento | B3-T1 | 2026-04-21 |
| `guia-utilizador/estudante.md` | 🟡 Em saneamento | B4-T1 | 2026-04-21 |
| `guia-tecnico/arquitectura.md` | ⚠️ Legacy | B2-T2 | 2026-04-15 |

---

## 🧭 Índice por Persona

### 🚀 Desenvolvedores (Onboarding em <30min)
1. [💻 Configuração Local](guia-tecnico/setup-local.md) — Prepara o teu ambiente.
2. [🏗️ Arquitetura](guia-tecnico/arquitectura.md) — Entende as 4 camadas (L1-L4).
3. [🚀 Guia de Contribuição](guia-tecnico/contribuir.md) — Padrões de código e PRs.
4. [🔐 Segurança e Auth](api/auth.md) — Como funciona o JWS RS256 e cookies.

### 🎨 Design & UI (Soul & Elite)
1. [🎨 Design System](https://github.com/cj/pdc-v2/blob/main/specs/IMPORTANTE/05_—_Design_System_Soul_&_Elite_(Tokens,_Primitivos_e_Wireframes).md) — A Bíblia visual.
2. [📱 Mobile-First](guia-tecnico/setup-local.md) — Como testar em dispositivos reais.

### 📈 Produto & QA
1. [⌬ Motor de Heurísticas](vocacional/modelo.md) — A lógica do Oráculo.
2. [📊 Telemetria](telemetria/pipeline.md) — Como medimos o sucesso.
3. [🧪 Testes de Carga](https://github.com/cj/pdc-v2/blob/main/package.json#L24) — Scripts k6 disponíveis.

---

## 📖 Catálogo de Documentos

### Utilizador Final
- [🎓 Guia do Estudante](guia-utilizador/estudante.md) (antigo aluno.md)
- [👨‍🏫 Guia do Mentor](guia-utilizador/mentor.md)
- [🏛️ Guia da Instituição](guia-utilizador/instituicao.md)
- [🛡️ Guia do Moderador](guia-utilizador/moderador.md)

### Técnico & DevOps
- [🌍 Deploy Cloudflare](guia-tecnico/deploy.md)
- [⚓️ Hooks do Ecossistema](guia-tecnico/ecosystem-hooks.md)
- [🧪 Skip OTP em Dev](guia-tecnico/dev-skip-otp.md)

---
*Última auditoria de governação: 21 de Abril de 2026.*
