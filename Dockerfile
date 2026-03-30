# ───── Stage 1: Build ─────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npx prisma generate
RUN npm run build

# ───── Stage 2: Production ─────
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY prisma ./prisma

# Uploads directory (will be mounted as volume)
RUN mkdir -p public/uploads

EXPOSE 3001

# Run migrations then start
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main"]
