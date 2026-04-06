---
phase: onda-2b-zona-instituicao
verified: 2026-04-05T16:00:00Z
status: passed
score: 8/8 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 7/8
  gaps_closed:
    - "Build TypeScript passa sem erros introduzidos"
  gaps_remaining: []
  regressions: []
---

# Onda 2B: Zona Instituição — Relatório de Verificação (Re-verificação)

**Goal da Onda:** Zona Instituição completa: endpoints BFF + 8 páginas frontend + roteamento com RoleGuard  
**Verificado:** 2026-04-05T16:00:00Z  
**Status:** passed  
**Re-verificação:** Sim — após closure do gap em RelatoriosInstituicaoPage.tsx

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidência |
|---|-------|--------|-----------|
| 1 | BFF: GET /experiencias/minhas filtra por autorId e retorna estado + inscrições | ✓ VERIFIED | `experiencias.ts:72` — `checkRole(['instituicao', 'super_admin'])`, filtra por `instituicaoId` |
| 2 | BFF: POST/PUT /experiencias impõe preco=0 e verifica autorId | ✓ VERIFIED | `experiencias.ts:115` — `preco: 0`; linha 142 — `strapiPut` com `preco: 0` |
| 3 | BFF: GET /perfis/estudantes-vinculados retorna estudantes conectados | ✓ VERIFIED | `perfis.ts:86-87` — endpoint com `checkRole(['instituicao', 'super_admin'])` |
| 4 | BFF: programas.ts com 4 endpoints (list, meus, criar, editar) | ✓ VERIFIED | `programas.ts` — strapiGet/strapiPost/strapiPut presentes em 4 rotas |
| 5 | BFF: propostas.ts com 3 endpoints (list, criar, responder) + cria vínculo | ✓ VERIFIED | `propostas.ts` — cria vínculo via strapiPost('/vinculos') na linha 50 |
| 6 | 8 páginas frontend criadas e wired com useQuery/useMutation | ✓ VERIFIED | Todas as páginas existem, useQuery para listagem, useMutation para formulários |
| 7 | 8 rotas em router.tsx com RoleGuard(['instituicao', 'super_admin']) | ✓ VERIFIED | `router.tsx` — 9 rotas com RoleGuard (8 páginas + editar-experiencia) |
| 8 | Build TypeScript passa sem erros introduzidos | ✓ VERIFIED | `tsc --noEmit -p apps/web`: EXIT=0; `npm run build -w apps/web`: EXIT=0; `npm run build -w apps/api`: EXIT=0 |

**Score: 8/8 truths verified**

---

## Gap Closure Details

### Gap anterior: RelatoriosInstituicaoPage.tsx — campos inexistentes em InstituicaoStats

**Resolução:** Dupla correcção aplicada:
1. `RelatoriosInstituicaoPage.tsx` reescrito — usa apenas `experienciasPublicadas`, `inscricoesTotais`, `programasActivos` (campos que existem no tipo)
2. `InstituicaoStatsSchema` expandido com `taxaPresenca`, `avaliacaoMedia`, `estudantesVinculados` (todos opcionais)

**Verificação:** grep por campos problemáticos retorna 0 resultados; tsc EXIT=0

### Pré-existentes resolvidos (bónus)

| Issue anterior | Resolução |
|----------------|-----------|
| `@/lib/api/config` não existe (ConectarButton, mensagens, moderação, vinculos) | Import removido; 0 ocorrências em codebase |
| `Column` importado de `@pdc/shared` (EstudantesVinculadosPage, InstituicaoProgramasPage) | Corrigido para `@/components/ui` |
| `toast` importado de `@/components/ui` (BrandingPage, CriarProgramaPage, EstudantesVinculadosPage) | Corrigido para `@/hooks/useToast` |
| `VinculoTipo`/`VinculoStatus` não exportados de shared | Agora exportados (linhas 1094-1119) |
| Modal props incorrectas (EstudantesVinculadosPage) | Modal importado e usado correctamente |

---

## Required Artifacts

| Artefacto | Status | Detalhes |
|-----------|--------|----------|
| `apps/api/src/routes/experiencias.ts` | ✓ VERIFIED | GET /minhas, GET /stats, POST, PUT, PATCH /estado |
| `apps/api/src/routes/perfis.ts` | ✓ VERIFIED | GET /estudantes-vinculados |
| `apps/api/src/routes/programas.ts` | ✓ VERIFIED | 4 endpoints CRUD com strapi calls |
| `apps/api/src/routes/propostas.ts` | ✓ VERIFIED | 3 endpoints + criação de vínculo |
| `apps/web/src/features/instituicao/*.tsx` (8 páginas) | ✓ VERIFIED | Todas existem, substantivas, wired |
| `apps/web/src/router.tsx` | ✓ VERIFIED | 9 rotas instituicao com RoleGuard |
| `packages/shared/src/index.ts` | ✓ VERIFIED | InstituicaoStats, VinculoTipo/Status exportados |

---

## Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| InstituicaoExperienciasPage | GET /experiencias/minhas | experienciasApi.getMinhas() | ✓ WIRED |
| CriarExperienciaPage | POST /experiencias | experienciasApi.criar() | ✓ WIRED |
| InstituicaoProgramasPage | GET /programas/meus | programasApi.getMeus() | ✓ WIRED |
| CriarProgramaPage | POST /programas | programasApi.criar() | ✓ WIRED |
| EstudantesVinculadosPage | GET /perfis/estudantes-vinculados | estudantesVinculadosApi.list() | ✓ WIRED |
| PropostasPage | GET /propostas + POST /propostas | propostasApi.list/criar() | ✓ WIRED |
| RelatoriosInstituicaoPage | GET /experiencias/stats | experienciasApi.getStats() | ✓ WIRED |
| BrandingPage | GET /perfis/me + PUT /perfis/me | perfisApi.getMe/update() | ✓ WIRED |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Web build produces output | `ls apps/web/dist/*.html` | 3 files (html + js + css) | ✓ PASS |
| API build produces output | `ls apps/api/dist/` | index.js + lib/ present | ✓ PASS |
| Shared build clean | `npm run build -w packages/shared` | EXIT=0 | ✓ PASS |
| Web tsc zero errors | `tsc --noEmit -p apps/web` | EXIT=0, 0 errors | ✓ PASS |
| API tsc zero errors | `tsc --noEmit -p apps/api` | EXIT=0, 0 errors | ✓ PASS |
| Web vite build | `npm run build -w apps/web` | EXIT=0, built in 4.54s | ✓ PASS |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | Nenhum anti-pattern encontrado nas páginas de instituição | — | — |

---

## Human Verification Required

### 1. Fluxo ShadowApro e EduVisit

**Teste:** Autenticar como `instituicao`, navegar a `/app/instituicao/criar-programa`, seleccionar tipo ShadowApro  
**Esperado:** Campos condicionais aparecem; campos EduVisit não aparecem  
**Porquê humano:** Comportamento condicional de formulário

### 2. RoleGuard em rotas de instituição

**Teste:** Autenticar como `aluno`, tentar aceder a `/app/instituicao/experiencias`  
**Esperado:** Redirecionamento para `/app`  
**Porquê humano:** Comportamento de runtime do RoleGuard

---

_Verificado: 2026-04-05T16:00:00Z_  
_Verificador: GitHub Copilot (gsd-verifier)_
