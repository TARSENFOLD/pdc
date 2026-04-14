# Build stage
FROM node:24-alpine AS build

WORKDIR /app

# Copiar ficheiros de configuração do monorepo
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Instalar dependências de todo o monorepo (mais eficiente para cache)
RUN npm ci

# Copiar código necessário
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared primeiro (dependência do api)
RUN npm run build -w @pdc/shared

# Build api
RUN npm run build -w @pdc/api

# Runtime stage
FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copiar ficheiros de configuração para instalar apenas dependências de produção
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Instalar apenas dependências de produção
RUN npm ci --omit=dev --ignore-scripts

# Copiar builds do estágio anterior
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

# O comando de start no apps/api/package.json é "node dist/index.js"
# Mas precisamos estar no diretório do workspace ou referenciar corretamente
WORKDIR /app/apps/api
CMD ["npm", "run", "start"]
