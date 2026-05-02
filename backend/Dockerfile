# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN ./node_modules/.bin/nest build

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-slim AS runner
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

# Copy built output from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy prisma schema for migrate deploy
COPY prisma ./prisma/

EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
