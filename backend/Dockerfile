FROM node:20-slim
WORKDIR /app

# Prisma's query engine needs OpenSSL; slim images don't ship it by default.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build
EXPOSE 3000

# wait for Postgres, create schema, seed (idempotent), then start
CMD ["sh", "-c", "until npx prisma db push --skip-generate; do echo 'DB/engine not ready, retrying in 2s...'; sleep 2; done && npx ts-node --transpile-only prisma/seed.ts && node dist/main.js"]
