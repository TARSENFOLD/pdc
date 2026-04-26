# Build stage
FROM node:20-alpine AS build
WORKDIR /opt/app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Runtime stage
FROM node:20-alpine
RUN apk add --no-cache curl
WORKDIR /opt/app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /opt/app/dist ./dist
COPY --from=build /opt/app/config ./config
COPY --from=build /opt/app/database ./database
COPY --from=build /opt/app/public ./public
COPY --from=build /opt/app/src ./src
COPY --from=build /opt/app/favicon.png ./favicon.png
EXPOSE 1337
CMD ["npm", "run", "start"]
