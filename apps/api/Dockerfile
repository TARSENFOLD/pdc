# ── Build Stage ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

# Instalar dependências de build se necessário (ex: python3 para node-gyp)
RUN apk add --no-cache libc6-compat

# Copiar ficheiros de definição do monorepo
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Instalar dependências (focado apenas nos pacotes necessários)
RUN npm ci --include=dev --workspace=@pdc/shared --workspace=@pdc/api --ignore-scripts

# Copiar código fonte
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Compilar Shared primeiro (dependência crítica)
RUN npm run build --workspace=@pdc/shared

# Compilar API
RUN npm run build --workspace=@pdc/api

# ── Runtime Stage ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Criar utilizador não-root para segurança soberana
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

# Copiar dependências de runtime e ficheiros compilados
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/package.json ./package.json

USER hono

EXPOSE 3001

# Comando de arranque soberano
CMD ["node", "apps/api/dist/index.js"]
