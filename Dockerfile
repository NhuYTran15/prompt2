FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
USER node
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run seed && node src/server.js"]
