# syntax=docker/dockerfile:1.7

# ───── Stage 1: Build ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npx prisma generate
RUN npm run build

# ───── Stage 2: Runtime ───────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# OpenSSL is required by the Prisma engines on Alpine.
RUN apk add --no-cache openssl wget

# Copy the full node_modules tree to keep NestJS reflect-metadata happy.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma

# Uploads directory; in production it should be mounted as a persistent volume.
RUN mkdir -p public/uploads

# Drop privileges. The `node` user ships with the official image (uid 1000).
RUN chown -R node:node /app
USER node

EXPOSE 3001

# Container-level health probe. Uses an HTTP request rather than a TCP open
# so it also fails if Nest is alive but unable to serve requests.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3001}/api/v1/auth/me" \
      --header "Accept: application/json" >/dev/null 2>&1 || exit 1

# Apply pending migrations, then boot the API.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/main"]
