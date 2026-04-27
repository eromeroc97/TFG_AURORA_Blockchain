FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN npx prisma generate --schema=./prisma/schema.prisma

COPY --from=build /app/dist ./dist

USER node

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node prisma/seed.ts && node dist/src/main"]
