FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app

RUN chown -R node:node /app
USER node

ENV NODE_ENV=production

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node --from=build /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/main"]
