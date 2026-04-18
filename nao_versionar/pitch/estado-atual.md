# Estado Atual do Projeto — Abril 2026

⚠️ **Este documento é um Manifesto de Visão / Pitch.** Para a fonte de verdade técnica e estado real do projeto, consulte o **[.planning/PROJECT.md](../../.planning/PROJECT.md)** e o **[.planning/STATE.md](../../.planning/STATE.md)**.

## 1. Sumário Executivo
O PDC v2 concluiu a fase de "Saneamento Técnico". Estabilizamos o monorepo, a autenticação base e o ecossistema de dados inicial (Seed) para provar o motor de algoritmos.

---

## 2. O Que Foi Consolidado (Abril 17, 2026)

### ✅ Autenticação e Acesso
- **Identidade Estabilizada:** O login local foi corrigido e sincronizado com o BFF e Strapi v5.
- **Bypass de OTP:** Sistema de skip-otp funcional em ambiente de desenvolvimento para acelerar a iteração da equipa.
- **Segurança (ADR-003):** Cookies `httpOnly` configurados com suporte cross-origin e SameSite=Strict para o domínio principal.

### ✅ O Gênese (Seed para Testes)
- **Ecossistema Vivo:** Injetados dados iniciais de Instituições e Mentores para popular a interface.
- **9.000 Eventos de Telemetria:** Base de dados populada com eventos simulados de 100 personas de estudantes, permitindo a validação do Motor de Heurísticas em condições de stress.
- **Idempotência:** Scripts de injeção desenhados com UUIDs para garantir a integridade dos dados e evitar duplicidade.

### ✅ Infraestrutura
- **BFF (Hono):** Estabilizado em Node.js 24 (LTS), com Docker multi-stage pronto para deploy em Railway.
- **Strapi v5:** Operando com PostgreSQL local, com esquemas sincronizados para Vagas e Modalidades.
- **Edge Strategy (ADR-005):** Definida a fronteira entre Railway (Core) e Cloudflare Workers (Telemetry Ingestor).

---

## 3. Próxima Fronteira: Wave 2 (O Cérebro)
O foco imediato é a implementação do **Motor de Heurísticas** que transformará os dados brutos nos índices matemáticos de Fluidez ($\phi$) e Resiliência ($R$) visíveis no Relatório Vocacional.

---
**Status:** Saudável | **Versão:** 4.1.0-alpha
