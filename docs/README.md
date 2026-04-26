# Documentação do PDC v2 — Índice Canónico

> **Aviso de Sincronização:** Esta diretoria está em processo de saneamento para alinhar com a visão **Soul & Elite** (Wave 3+). Consulte sempre as Epics Canónicas em `specs/IMPORTANTE/` para a verdade absoluta.

---

## 🏛️ Hierarquia de Autoridade (Governação)

Se encontrar informações contraditórias, a ordem de precedência é:
1. **Epics Canónicas ([spec:IMPORTANTE/01–05](../specs/IMPORTANTE/))** — A Constituição Soberana.
2. **[Manual de Prosperidade](../.planning/PROSPERITY.md)** — Governação de integridade técnica e documental.
3. **Diretoria `.planning/`** — Estado real, requisitos e roadmap atualizado.
4. **Diretoria `docs/decisoes/`** — Registos de Arquitetura (ADRs).
5. **Diretoria `docs/`** — Guias e manuais secundários (esta diretoria).

---

## 🏥 Matriz de Saúde da Documentação

| Documento | Estado | Ticket de Saneamento | Última Auditoria |
|-----------|--------|----------------------|------------------|
| `decisoes/adr-*` | ✅ Canónico | N/A | 2026-04-20 |
| `telemetria/pipeline.md` | ✅ Canónico | B4 | 2026-04-21 |
| `guia-tecnico/deploy.md` | ✅ Canónico | B3 | 2026-04-21 |
| `vocacional/modelo.md` | ✅ Canónico | B7 | 2026-04-20 |
| `guia-tecnico/setup-local.md` | 🟡 Em saneamento | B2-T1 | 2026-04-21 |
| `api/auth.md` | ✅ Canónico | B6 | 2026-04-22 |
| `guia-utilizador/estudante.md` | 🟡 Em saneamento | E1 | 2026-04-21 |
| `guia-tecnico/arquitectura.md` | ✅ Canónico | B2 | 2026-04-22 |
| `guia-tecnico/contribuir.md` | ✅ Canónico | B1 | 2026-04-22 |
| `guia-tecnico/mobile-install.md` | 🚧 Planeado | D2 | 2026-04-22 |
| `api/og.md` | 🚧 Planeado | F1 | 2026-04-22 |

---

## 🧭 Índice por Persona

### 🚀 Desenvolvedores (Onboarding em <30min)
1. [💻 Configuração Local](guia-tecnico/setup-local.md) — Prepara o teu ambiente.
2. [🏗️ Arquitetura](guia-tecnico/arquitectura.md) — Entende as 4 camadas (L1-L4).
3. [🚀 Guia de Contribuição](guia-tecnico/contribuir.md) — Padrões de código e PRs.
4. [🔐 Segurança e Auth](api/auth.md) — Como funciona o JWS RS256 e cookies.

### 📐 Gestores de Produto (PM)
1. [⌬ Motor de Heurísticas](vocacional/modelo.md) — A lógica do Oráculo e áreas vocacionais.
2. [📑 Requisitos Expandidos](../.planning/REQUIREMENTS.md) — A visão de produto detalhada.
3. [🗺️ Roadmap Estratégico](../.planning/roadmap.md) — Ondas de execução e marcos.

### 🧪 Quality Assurance (QA)
1. [🧪 Testes de Carga](../README.md#4-qualidade-e-testes-k6-scripts-em-testsk6) — Catálogo de scripts k6.
2. [📱 Manual de Teste Mobile](guia-tecnico/setup-local.md#9-arrancar-o-frontend) — Validação de 44px e performance.
3. [🤖 E2E Playwright](../README.md#4-qualidade-e-testes-k6-scripts-em-testsk6) — Testes de fumo e fluxos críticos.

### ⚙️ Operações & Infra (Ops)
1. [🌍 Guia de Deploy](guia-tecnico/deploy.md) — Cloudflare, Railway e Neon.
2. [📊 Pipeline de Telemetria](telemetria/pipeline.md) — Ingestão Edge e mérito.
3. [📱 Mobile Native Release](guia-tecnico/deploy.md#2-android-twa-pwabuilder) — Capacitor e TWA pipeline.

### 🤝 Contribuidores Externos
1. [📜 Código de Conduta](../CONTRIBUTING.md) — Valores e governação.
2. [🎨 Design System Soul & Elite](https://github.com/pordentrodo-coder/pdc/blob/main/specs/IMPORTANTE/05_%E2%80%94_Design_System_Soul_&_Elite_(Tokens,_Primitivos_e_Wireframes).md) — Bíblia visual.

---

## 📖 Catálogo de Documentos

### Utilizador Final
- [🎓 Guia do Estudante](guia-utilizador/estudante.md) (Antigo Aluno / SSOT)
- [👨‍🏫 Guia do Mentor](guia-utilizador/mentor.md)
- [🏛️ Guia da Instituição](guia-utilizador/instituicao.md)
- [🛡️ Guia do Moderador](guia-utilizador/moderador.md)

### Técnico & DevOps
- [🌍 Deploy Cloudflare](guia-tecnico/deploy.md)
- [⚓️ Hooks do Ecossistema](guia-tecnico/ecosystem-hooks.md)
- [🧪 Skip OTP em Dev](guia-tecnico/dev-skip-otp.md)
- [📱 Estratégia Mobile](guia-tecnico/deploy.md#2-android-twa-pwabuilder)

---
*Última auditoria de governação: 22 de Abril de 2026. (B1 Implementation)*

