# Build stage
FROM node:20-alpine AS build
WORKDIR /opt/app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage
FROM node:20-alpine
RUN apk add --no-cache curl
WORKDIR /opt/app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /opt/app/dist ./dist
COPY --from=build /opt/app/dist/src ./src
COPY --from=build /opt/app/dist/build ./build
COPY --from=build /opt/app/dist/config ./config
COPY --from=build /opt/app/database ./database
COPY --from=build /opt/app/public ./public
COPY --from=build /opt/app/favicon.png ./favicon.png
RUN mkdir -p ./public/uploads
EXPOSE 1337
CMD ["node", "--max-old-space-size=384", "./node_modules/.bin/strapi", "start"]
