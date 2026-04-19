# Stage 1: Build
FROM node:24-slim AS builder

WORKDIR /app

# Copy root config and package files
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

# Install dependencies for the whole workspace
RUN npm ci

# Copy source code
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

# Build shared first, then api
RUN npm run build -w @pdc/shared
RUN npm run build -w @pdc/api

# Stage 2: Runtime
FROM node:24-slim

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy root config and package files for production install
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

# Install only production dependencies
# We need to install for the whole workspace to resolve @pdc/shared correctly
RUN npm ci --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Expose port (Railway defaults to 3001 in our config, but it will use PORT env var)
EXPOSE 3001

# Command to run the application
# Use the compiled output
CMD ["node", "apps/api/dist/index.js"]
