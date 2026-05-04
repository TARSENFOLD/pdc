# PDC v2 — Constituição Inegociável

Este documento define as leis fundamentais de engenharia, ética de dados e estética do Por Dentro do Curso (PDC). Qualquer violação destas regras é um bug de governação.

> **Alinhado com:** `specs/IMPORTANTE/01 — Visão do Produto (Canónica)` · secção 11 "Constituição Inegociável"

## 0. Identidade Total (A Lei Pedagógica)
O anonimato é proibido. Todos os dados, telemetria e interações são **identificados e atribuídos** a um Perfil. A ocultação da identidade é uma falha que impede a intervenção personalizada e a avaliação formativa.

## 1. Hierarquia de Acesso (Privacidade via RBAC — 7 Roles)
A privacidade é garantida por Controlo de Acesso estrito (RBAC), nunca pela anonimização.
Os 7 roles canónicos (ver `specs/IMPORTANTE/03`): `estudante`, `mentor`, `instituicao`, `comite_cientifico`, `moderador`, `super_admin`, `patrocinador` (futuro).
- **Instituições:** Acesso identificado aos estudantes a elas vinculados.
- **Super Admin:** Acesso identificado a todos os estudantes da plataforma.
- **Isolamento:** Dados de um estudante nunca são acessíveis por terceiros, empresas de marketing ou outros estudantes sem consentimento explícito.
- **Compatibilidade legacy:** `tipo === 'admin'` é normalizado para `super_admin` via `normalizeTipo`. Não criar novos registos com `'admin'`.

## 2. Integridade Técnica (Zero Any)
A tipagem estrita é inegociável. O uso de `any` em novos códigos é proibido. Casos legados devem ser saneados durante a refatoração temática. O `@pdc/shared` é a única fonte de verdade para contratos.

## 3. Rule of 300
Nenhum ficheiro fonte deve ultrapassar **300 linhas**. Ficheiros que excedam este limite devem ser modularizados imediatamente.

## 4. Telemetria Resiliente (Edge-First)
A telemetria é o coração do Oráculo. Perda de dados comportamentais é inaceitável. Outbox + idempotência (UUID + Redis) são obrigatórios. O browser é tratado como ambiente hostil; cálculos críticos são feitos no servidor. Eventos inválidos **não são descartados** — são arquivados em Cloudflare R2 (NDJSON) via cold storage (`apps/api/src/lib/r2.ts`). O consumer de telemetria corre como **worker isolado** (`apps/api/src/workers/telemetry-worker.ts`) separado do BFF.

## 5. Doc is Law
Se o código contradiz o markdown (Epics Canónicas), o código é defeituoso. O documento justifica o código, nunca o contrário.

## 6. Estética "Soul & Elite" (ADR-017)
- **Referência:** [spec:IMPORTANTE/05](../specs/IMPORTANTE/05_%E2%80%94_Design_System_Soul_&_Elite_%28Tokens%2C_Primitivos_e_Wireframes%29.md) e [ADR-017](../docs/decisoes/adr-017-design-heranca-invisivel.md).
- **Herança Invisível:** Sofisticação global com raízes culturais subliminares.
- **Não aos Extremos:** Nunca usar `#000000` (evitar smear OLED) nem `#FFFFFF` puro.
- **Física Apple:** Animações via Motion com springs (`stiffness: 220, damping: 28`).
- **Glow Policy (ADR-026):** `ctx.shadowBlur` com multiplicador de tamanho é **banido**. Ver `DESIGN.md §10.2` para valores canónicos.
- **`--card-border` Token (ADR-026):** Usar sempre `var(--card-border)` para bordas de cards. Nunca hardcodar hex. Ver `DESIGN.md §10.3`.
- **Identidade visual:** `bg-amber-*` é permitido **exclusivamente** em landing pages (identidade PDC Angola). Banido em dashboards e componentes app.
- **Padrões de Copy:** "Oráculo" e jargão técnico banidos de copy visível ao utilizador. Emojis banidos em badges/pills de produto.

## 7. Ecosystem Hooks (Lei G15)
Nenhuma escrita de domínio é considerada completa enquanto os hooks ecossistémicos canónicos (Ranking, Feed, Match, Achievement, Behavior, Notify) não correrem com sucesso ou forem marcados para retry no outbox.

## 8. Mobile-First / PWA-First
Toda funcionalidade nasce mobile-first. Touch targets ≥ 44×44px. Performance Lighthouse mobile ≥ 90. Validação em viewport ≤ 414px obrigatória antes de qualquer PR ser aprovado.

## 9. Lei E2E — End-to-End Completo (ver `specs/IMPORTANTE/06`)

Uma funcionalidade só é considerada **Done** quando atravessa as 5 camadas sem quebras:

1. **UI Premium** — rota canónica + página dedicada + Design System respeitado (não modais improvisados).
2. **Contrato Partilhado** — schema Zod em `@pdc/shared`, validação client + server, zero `any`.
3. **BFF** — RBAC enforced, lógica de negócio completa, erros semânticos.
4. **Persistência** — texto em PostgreSQL via Strapi, ficheiros em Cloudflare R2, estado de moderação correto.
5. **Ecossistema** — os 6 hooks (Ranking, Feed, Match, Achievement, Behavior, Notify) correram ou estão no outbox.

> ❌ Proibido: marcar Done com UI funcional mas sem lógica no BFF, ou com lógica mas sem impacto ecossistémico.

## 10. Conteúdo (Regras Inegociáveis — ver spec 04)
- **Experiências são SEMPRE gratuitas** — qualquer alteração requer aprovação do Super Admin + ADR formal.
- **Projetos são SEMPRE gratuitos** — o ROI vem indiretamente (mentoria, parceiros, patrocínio).
- **Score derivado no BFF** — o cliente NUNCA declara o score; é calculado a partir de telemetria bruta (anti-fraude D20–D22).
- **Field-level filtering server-side** — a visibilidade é aplicada pelo backend antes de devolver dados. Frontend é UX, não autoridade.

---

## 🔒 Política Operacional de Segredos & .env

### 1. .env.example-as-fixture
O ficheiro `.env.example` é uma **fixture intencional**. Contém credenciais de teste (sandbox) para garantir paridade dev↔prod imediata. É a única excepção permitida no Git.

### 2. Bloqueio Rígido de Segredos
- Qualquer outro ficheiro `.env*` é **proibido em commits** e bloqueado via pre-commit (Husky + Gitleaks).
- Segredos de produção vivem exclusivamente nos secret stores dos providers (Cloudflare, Railway, Upstash, Neon).
- O commit acidental de segredos exige a rotação imediata da chave.

### 3. Rule of 300 Enforcement
O limite de 300 linhas é verificado em CI. Ficheiros que excedam o limite impedem o merge, excepto na whitelist explícita (ex: `packages/shared/src/index.ts`).

---
*Última validação: 2026-05-04 · Fonte de verdade: `specs/IMPORTANTE/01–06`.*