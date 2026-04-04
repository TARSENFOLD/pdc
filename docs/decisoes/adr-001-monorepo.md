# ADR-001 — Estrutura Monorepo com npm Workspaces

**Estado:** Aceite  
**Data:** 2025-11-01  
**Contexto:** Fase 0 — Fundação

---

## Contexto

O PDC v2 necessita de partilhar tipos TypeScript entre o frontend (`apps/web`) e o BFF (`apps/api`). As opções consideradas foram:

1. **Repositórios separados** — cada app no seu próprio repositório
2. **Monorepo com Turborepo/Nx** — ferramentas de build especializadas
3. **Monorepo com npm workspaces** — solução nativa do npm

---

## Decisão

Adoptar **monorepo com npm workspaces**, sem ferramentas de build adicionais (Turborepo, Nx).

Estrutura:
```
pdc-v2/
├── apps/web/          # package.json com name: "@pdc/web"
├── apps/api/          # package.json com name: "@pdc/api"
├── packages/shared/   # package.json com name: "@pdc/shared"
└── package.json       # root — workspaces: ["apps/*", "packages/*"]
```

---

## Justificação

**Contra repositórios separados:**
- Sincronização de tipos entre repos exige publicação no npm ou Git submodules
- Overhead operacional elevado para equipa pequena
- CI/CD mais complexo (múltiplos pipelines para um único produto)

**Contra Turborepo/Nx:**
- Curva de aprendizagem adicional desnecessária em fase inicial
- Cache de build remoto (feature central do Turborepo) só tem valor com pipelines de múltiplos minutos
- Builds actuais (`tsc`, `vite build`) completam em < 30s — cache não justifica complexidade
- Pode ser adicionado no futuro sem reestruturar o monorepo

**A favor de npm workspaces:**
- Nativo — sem dependências adicionais
- `import type { Curso } from '@pdc/shared'` funciona out-of-the-box após `npm install`
- Scripts por workspace: `npm run dev --workspace=apps/api`
- Suficiente para equipa de 1–5 pessoas com menos de 10 pacotes

---

## Consequências

- **Positivo:** Tipos partilhados sem overhead de publicação
- **Positivo:** Um único `npm install` instala tudo
- **Positivo:** CI/CD simples com um único pipeline
- **Negativo:** Sem cache de build incremental (aceitável em fase inicial)
- **Negativo:** Se o monorepo crescer para 20+ pacotes, será necessário reavaliar Turborepo

---

## Reavaliação

Reavaliar esta decisão se:
- O CI demorar mais de 10 minutos em builds completos
- A equipa crescer para 10+ pessoas com múltiplos pacotes activos
