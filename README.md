# Por Dentro do Curso (PDC v2)

Infraestrutura de decisão educacional angolana que transforma a incerteza vocacional em escolhas de carreira precisas.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18, Vite 5+, TailwindCSS v4, Radix UI, Motion v11+, React Query v5 |
| BFF | Hono v4+, Node.js 24 LTS, Jose v5+, Socket.IO v4, Zod v3+ |
| CMS | Strapi v5, PostgreSQL 16 |
| Tipagem | TypeScript v5+ estrito (sem `any`) |

## Estrutura

```
pdc-v2/
├── apps/
│   ├── web/        # Frontend React + Vite
│   └── api/        # BFF Hono
├── packages/
│   └── shared/     # Tipos e utilitários partilhados
├── infra/
│   └── strapi/     # CMS Strapi v5
└── .planning/      # GSD (PROJECT.md, REQUIREMENTS.md, STATE.md)
```

## Setup em 5 minutos

### Pré-requisitos

- Node.js 24 LTS (`nvm use`)
- Docker

### Instalar

```bash
nvm use                    # Usa Node 24.13.0 (.nvmrc)
npm install                # Instala dependências de todos os workspaces
```

### Desenvolvimento local

```bash
# Iniciar serviços de infra (Strapi + PostgreSQL + Redis)
docker compose up -d

# Frontend (porta 5173)
npm run dev -w apps/web

# BFF (porta 3001)
npm run dev -w apps/api
```

### Build

```bash
npm run build              # Build de todos os workspaces
npm run build -w apps/web  # Build só do frontend
npm run build -w apps/api  # Build só do BFF
```

### Linting e verificação de tipos

```bash
npm run lint               # ESLint em todos os workspaces
npm run typecheck          # tsc --noEmit em todos os workspaces
```

## Variáveis de ambiente

Copiar `.env.example` para `.env` e preencher os valores:

```bash
cp .env.example .env
```

Ver comentários em `.env.example` para descrição de cada variável.

## Fases de desenvolvimento

| Fase | Conteúdo | Estado |
|------|----------|--------|
| 0 | Fundação — monorepo, tooling, CI/CD | 🔄 Em progresso |
| 1 | Autenticação segura (JWT httpOnly, 2FA, Google OAuth) | ⏳ |
| 2 | Design system e frontend base | ⏳ |
| 3 | API layer modular (módulos por domínio) | ⏳ |
| 4 | Core do produto (simulações, perfil vocacional) | ⏳ |
| 5 | LTI 1.3 Provider | ⏳ |
| 6 | Moderação, admin e segurança | ⏳ |
| 7 | IA e realtime (DeepSeek, RAG, WebSocket) | ⏳ |

Ver `.planning/STATE.md` para estado actual e próximos passos.
