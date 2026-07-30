FROM node:24-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

RUN npm ci --ignore-scripts

COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

RUN npm run build -w @pdc/shared
RUN npm run build -w @pdc/api
RUN npx sentry-cli sourcemaps inject packages/shared/dist apps/api/dist

FROM node:24-slim

ARG RELEASE_SHA
WORKDIR /app

RUN test -n "$RELEASE_SHA"

ENV NODE_ENV=production
ENV RELEASE_SHA=$RELEASE_SHA

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

CMD ["node", "--import", "/app/apps/api/dist/src/instrument.js", "apps/api/dist/src/index.js"]
