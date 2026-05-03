# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN ./node_modules/.bin/nest build && ls -la dist/
# Compile seed script so it can run in production without ts-node
RUN node_modules/.bin/tsc prisma/seed.ts --outDir dist --esModuleInterop --module commonjs --target ES2021 --skipLibCheck --resolveJsonModule 2>/dev/null || true

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-slim AS runner
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

# Copy built output from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma/seed.ts ./prisma/seed.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy prisma schema for migrate deploy
COPY prisma ./prisma/

EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/seed.js && node dist/main"]
