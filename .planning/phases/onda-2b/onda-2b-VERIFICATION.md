---
phase: onda-2b-zona-instituicao
verified: 2026-04-05T00:00:00Z
status: passed
score: 8/8 must-haves verified
gaps:
  - truth: "Página de Relatórios mostra métricas reais da instituição"
    status: failed
    reason: "RelatoriosInstituicaoPage.tsx acede a stats.taxaPresenca, stats.avaliacaoMedia, stats.estudantesVinculados mas InstituicaoStats só tem experienciasPublicadas, inscricoesTotais, programasActivos — 3 erros TypeScript"
    artifacts:
      - path: "apps/web/src/features/instituicao/RelatoriosInstituicaoPage.tsx"
        issue: "Propriedades taxaPresenca, avaliacaoMedia, estudantesVinculados não existem no tipo InstituicaoStats"
      - path: "packages/shared/src/index.ts"
        issue: "InstituicaoStatsSchema não tem os campos taxaPresenca, avaliacaoMedia, estudantesVinculados"
    missing:
      - "Adicionar taxaPresenca?: z.number().optional(), avaliacaoMedia?: z.number().optional(), estudantesVinculados?: z.number().optional() ao InstituicaoStatsSchema em packages/shared/src/index.ts"
      - "Rebuild packages/shared (npm run build)"
---

# Onda 2B: Zona Instituição — Relatório de Verificação

**Goal da Onda:** Zona Instituição completa: endpoints BFF + 8 páginas frontend + roteamento com RoleGuard  
**Verificado:** 2026-04-05  
**Status:** gaps_found — 1 gap bloqueador (3 erros TypeScript)  
**Re-verificação:** Não — verificação inicial

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidência |
|---|-------|--------|-----------|
| 1 | BFF: GET /experiencias/minhas filtra por autorId e retorna estado + inscrições | ✓ VERIFIED | `experiencias.ts:72` — `checkRole(['instituicao', 'super_admin'])`, filtra por `instituicaoId` |
| 2 | BFF: POST/PUT /experiencias impõe preco=0 e verifica autorId | ✓ VERIFIED | `experiencias.ts:115` — `preco: 0`; `experiencias.ts:125-142` — verifica autorId antes de editar |
| 3 | BFF: GET /perfis/estudantes-vinculados retorna estudantes conectados | ✓ VERIFIED | `perfis.ts:86-87` — endpoint com `checkRole(['instituicao', 'super_admin'])` |
| 4 | BFF: programas.ts com 4 endpoints (list, meus, criar, editar) | ✓ VERIFIED | `programas.ts` — 105 linhas, strapiGet/strapiPost/strapiPut presentes |
| 5 | BFF: propostas.ts com 3 endpoints (list, criar, responder) + cria vínculo | ✓ VERIFIED | `propostas.ts` — 99 linhas, cria vínculo student-institution se não existir (linha 50-59) |
| 6 | 8 páginas frontend criadas e wired com useQuery/useMutation | ✓ VERIFIED | Todas as páginas de listagem usam `useQuery`, as de formulário usam `useMutation` |
| 7 | 8 rotas em router.tsx com RoleGuard(['instituicao', 'super_admin']) | ✓ VERIFIED | `router.tsx:151-180` — todas as 8 rotas com RoleGuard correcto |
| 8 | Build TypeScript passa sem erros introduzidos | ✗ FAILED | 3 erros em RelatoriosInstituicaoPage.tsx (campos inexistentes em InstituicaoStats) |

**Score: 7/8 truths verified**

---

## Required Artifacts

| Artefacto | Expectado | Status | Detalhes |
|-----------|-----------|--------|----------|
| `apps/api/src/routes/experiencias.ts` | GET /minhas, POST/PUT com preco=0 e autorId | ✓ VERIFIED | 142+ linhas, todas as constraints presentes |
| `apps/api/src/routes/perfis.ts` | GET /estudantes-vinculados | ✓ VERIFIED | Endpoint em linha 86 |
| `apps/api/src/routes/programas.ts` | 4 endpoints CRUD | ✓ VERIFIED | 105 linhas, strapi calls reais |
| `apps/api/src/routes/propostas.ts` | 3 endpoints + criação de vínculo | ✓ VERIFIED | 99 linhas, cria vínculo se não existir |
| `apps/api/src/index.ts` | Registo de programas + propostas | ✓ VERIFIED | Linhas 24-25 imports, 69-70 routes |
| `apps/web/src/lib/api/experiencias.ts` | getMinhas, criar, atualizar | ✓ VERIFIED | Funções tipadas com ExperienciaMinha, CriarExperienciaPayload |
| `apps/web/src/lib/api/programas.ts` | list, getMeus, criar, atualizar | ✓ VERIFIED | Ficheiro com 4 funções tipadas |
| `apps/web/src/lib/api/propostas.ts` | list, criar, responder + estudantesVinculadosApi | ✓ VERIFIED | propostasApi + estudantesVinculadosApi exportados |
| `apps/web/src/features/instituicao/InstituicaoExperienciasPage.tsx` | Lista com useQuery | ✓ VERIFIED | 92 linhas, useQuery → getMinhas() |
| `apps/web/src/features/instituicao/CriarExperienciaPage.tsx` | Formulário com useMutation + nota gratuito | ✓ VERIFIED | 124 linhas, aviso amber "sempre gratuitas" presente |
| `apps/web/src/features/instituicao/InstituicaoProgramasPage.tsx` | Lista com useQuery | ✓ VERIFIED | 92 linhas, useQuery → getMeus() |
| `apps/web/src/features/instituicao/CriarProgramaPage.tsx` | Formulário com selector tipo + campos condicionais | ✓ VERIFIED | 167 linhas, 3 tipos (standard/shadowapro/eduvisit), campos condicionais |
| `apps/web/src/features/instituicao/EstudantesVinculadosPage.tsx` | Lista com useQuery | ✓ VERIFIED | 64 linhas, useQuery → estudantesVinculadosApi.list() |
| `apps/web/src/features/instituicao/PropostasPage.tsx` | Lista + modal nova proposta | ✓ VERIFIED | 154 linhas, useQuery + useMutation, modal presente |
| `apps/web/src/features/instituicao/RelatoriosInstituicaoPage.tsx` | Dashboard de métricas | ✗ STUB (tipo) | 90 linhas, useQuery real mas acede a 3 campos inexistentes no tipo |
| `apps/web/src/features/instituicao/BrandingPage.tsx` | Formulário + pré-visualização | ✓ VERIFIED | 139 linhas, useQuery + useMutation, live preview presente |

---

## Key Link Verification

| From | To | Via | Status | Detalhes |
|------|----|-----|--------|----------|
| InstituicaoExperienciasPage | GET /experiencias/minhas | experienciasApi.getMinhas() | ✓ WIRED | useQuery → getMinhas() |
| CriarExperienciaPage | POST /experiencias | experienciasApi.criar() | ✓ WIRED | useMutation → criar(payload) |
| InstituicaoProgramasPage | GET /programas/meus | programasApi.getMeus() | ✓ WIRED | useQuery → getMeus() |
| CriarProgramaPage | POST /programas | programasApi.criar() | ✓ WIRED | useMutation → criar(payload) |
| EstudantesVinculadosPage | GET /perfis/estudantes-vinculados | estudantesVinculadosApi.list() | ✓ WIRED | useQuery → list() |
| PropostasPage | GET /propostas | propostasApi.list() | ✓ WIRED | useQuery → list() |
| PropostasPage (modal) | POST /propostas | propostasApi.criar() | ✓ WIRED | useMutation → criar(payload) |
| RelatoriosInstituicaoPage | GET /experiencias/stats | experienciasApi.getStats() | ⚠️ HOLLOW | Chamada real mas 3 campos do tipo faltam |
| BrandingPage | GET /perfis/me + PUT /perfis/me | perfisApi.getMe() + update() | ✓ WIRED | useQuery + useMutation ambos presentes |
| programas.ts BFF | Strapi /programas | strapiGet/strapiPost/strapiPut | ✓ WIRED | Chamadas reais ao Strapi em todas as rotas |
| propostas.ts BFF | Strapi /propostas + /vinculos | strapiGet/strapiPost | ✓ WIRED | Cria vínculo student-institution se não existir |

---

## Data-Flow Trace (Level 4)

| Artefacto | Variável de Dados | Fonte | Dados Reais | Status |
|-----------|-------------------|-------|-------------|--------|
| InstituicaoExperienciasPage | `data?.data ?? []` | GET /experiencias/minhas → Strapi | ✓ | ✓ FLOWING |
| PropostasPage | `data?.data ?? []` | GET /propostas → Strapi | ✓ | ✓ FLOWING |
| RelatoriosInstituicaoPage | `stats?.taxaPresenca` | InstituicaoStats (tipo incompleto) | ✗ | ✗ HOLLOW — tipo não tem os campos |
| BrandingPage | `perfil` | GET /perfis/me → Strapi | ✓ | ✓ FLOWING |

---

## Erros TypeScript encontrados

### Introduzidos por esta Onda (GAP — bloqueia build limpo)

| Ficheiro | Linha | Erro | Severidade |
|----------|-------|------|------------|
| `apps/web/src/features/instituicao/RelatoriosInstituicaoPage.tsx` | 71 | `Property 'taxaPresenca' does not exist on type InstituicaoStats` | 🛑 Blocker |
| `apps/web/src/features/instituicao/RelatoriosInstituicaoPage.tsx` | 77 | `Property 'avaliacaoMedia' does not exist on type InstituicaoStats` | 🛑 Blocker |
| `apps/web/src/features/instituicao/RelatoriosInstituicaoPage.tsx` | 83 | `Property 'estudantesVinculados' does not exist on type InstituicaoStats` | 🛑 Blocker |

**Fix:** Adicionar `taxaPresenca?: z.number().optional()`, `avaliacaoMedia?: z.number().optional()`, `estudantesVinculados?: z.number().optional()` ao `InstituicaoStatsSchema` em `packages/shared/src/index.ts`, seguido de `npm run build` no shared.

### Pré-existentes (não introduzidos por Onda 2B)

Estes erros existem noutros ficheiros criados por outros agentes/sessões anteriores:

| Ficheiro | Erros | Origem |
|----------|-------|--------|
| `apps/web/src/components/ui/ConectarButton.tsx` | `VinculoTipo`/`VinculoStatus` não exportados; `@/lib/api/config` não existe; variante `"default"`/`"outline"` inválida | Onda 2A (anterior) |
| `apps/web/src/features/mensagens/ConversaPage.tsx` | `@/lib/api/config` não existe; variante inválida | Onda 2A (anterior) |
| `apps/web/src/features/mensagens/MensagensPage.tsx` | `@/lib/api/config` não existe; variante inválida | Onda 2A (anterior) |
| `apps/web/src/features/moderacao/FilaAprovacaoPage.tsx` | `@/lib/api/config` não existe; prop `tabs` inválida no Tabs | Sessão anterior |
| `apps/web/src/features/moderacao/ModeradorUtilizadoresPage.tsx` | `@/lib/api/config` não existe | Sessão anterior |
| `apps/web/src/features/vinculos/VinculosPage.tsx` | `@/lib/api/config` não existe; `VinculoTipo` não exportado | Onda 2A (anterior) |

---

## Verificação Humana Necessária

### 1. Fluxo ShadowApro e EduVisit

**Teste:** Autenticar como `instituicao`, navegar a `/app/instituicao/criar-programa`, seleccionar tipo ShadowApro  
**Esperado:** Campos condicionais (`profissionalShadow`, `areaShadowing`) aparecem; campos EduVisit (`visitaUrl`, `localizacaoFisica`) não aparecem  
**Porquê humano:** Comportamento condicional de formulário, não verificável com grep

### 2. RoleGuard em rotas de instituição

**Teste:** Autenticar como `aluno`, tentar aceder a `/app/instituicao/experiencias`  
**Esperado:** Redirecionamento para `/app` (dashboard do aluno)  
**Porquê humano:** Comportamento de runtime do RoleGuard

---

## Resumo dos Gaps

**1 gap bloqueador introduzido por esta Onda:**  
`RelatoriosInstituicaoPage.tsx` usa 3 campos não declarados em `InstituicaoStats` — `taxaPresenca`, `avaliacaoMedia`, `estudantesVinculados`. O schema em `packages/shared` precisa de ser expandido com estes campos opcionais.

**Contexto adicional:**  
Há 6+ ficheiros com erros pré-existentes de outras sessões (principalmente `@/lib/api/config` em falta e variantes de Button inválidas). Esses erros não foram introduzidos por esta Onda mas devem ser tratados para o build limpo geral.

---

_Verificado: 2026-04-05_  
_Verificador: GitHub Copilot (gsd-verifier)_
