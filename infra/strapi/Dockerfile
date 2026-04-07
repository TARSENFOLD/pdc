FROM node:20-alpine
RUN apk add --no-cache libc6-compat
WORKDIR /opt/app
COPY package.json ./
EXPOSE 1337
CMD ["sh", "-c", "npm install && npm run develop"]
