FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY dist ./dist
COPY package*.json ./

EXPOSE 3004

CMD ["node", "dist/main.js"]