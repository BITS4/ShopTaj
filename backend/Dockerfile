FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies (including dev for nest CLI)
COPY package*.json ./
RUN npm install --include=dev

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source and build
COPY . .
RUN ./node_modules/.bin/nest build

# Expose port
EXPOSE 3001

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
