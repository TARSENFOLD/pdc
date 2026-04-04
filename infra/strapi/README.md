# Strapi v5 — infra/strapi

Este workspace contém o CMS Strapi v5 que serve como camada de dados para o PDC.

## Responsabilidade

- Gerir conteúdo e dados (cursos, perfis, simulações, etc.)
- **Não** implementar lógica de negócio (isso fica no BFF `apps/api`)
- Expor API REST/GraphQL consumida exclusivamente pelo BFF

## Setup

```bash
cp .env.example .env
# Preencher variáveis no .env

# Iniciar via Docker Compose (recomendado para dev)
docker compose -f ../../docker-compose.yml up -d strapi postgres

# Ou instalar e executar localmente (requer PostgreSQL)
npm install
npm run develop
```

## Content-Types

Os content-types serão criados na Fase 0 conforme a spec de Modelo de Dados.

Ver spec: `36c60fa0-6874-4517-9be9-df9b093e4924` (PDC — Modelo de Dados Completo)
