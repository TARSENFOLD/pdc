# Strapi — PDC v2 (Self-Hosted)

Headless CMS for the PDC v2 platform. Runs exclusively self-hosted via Docker.

## Quick Start (Docker)

```bash
# From the project root
docker compose up strapi
```

Strapi will be available at `http://localhost:1337`.

## Development (local)

```bash
cd infra/strapi
npm install
npm run develop
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run develop` | Start with autoReload enabled |
| `npm run start` | Start with autoReload disabled (production) |
| `npm run build` | Build the admin panel |
| `npm run typecheck` | Run TypeScript type-checking |

## Deployment

This project is deployed exclusively via Docker (self-hosted infrastructure).
See the root `docker-compose.yml` for the full service configuration including
PostgreSQL, Redis, and Strapi.

## Learn More

- [Strapi documentation](https://docs.strapi.io)
- [Strapi CLI reference](https://docs.strapi.io/dev-docs/cli)
