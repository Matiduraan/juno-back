# ---------- Stage 1: Build ----------
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Install OS dependencies required for Prisma
RUN apt-get update && apt-get install -y openssl

# Copy dependencies files
COPY package.json package-lock.json ./

# Install Node dependencies
RUN npm ci

# Copy rest of the code
COPY . .

# Generate Prisma client and run migrations
RUN npx prisma generate

# Compile TypeScript
RUN npm run build

# ---------- Stage 2: Runtime ----------
FROM node:20-slim AS runner

WORKDIR /app

# Only copy necessary files from build stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Ensure Prisma client can find the schema
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/@prisma/engines/libquery_engine-debian-openssl-3.0.x.so.node

# Set environment variables
ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
