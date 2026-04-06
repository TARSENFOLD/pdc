FROM node:20-alpine
RUN apk add --no-cache libc6-compat
WORKDIR /opt/app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 1337
CMD ["npm", "run", "develop"]
