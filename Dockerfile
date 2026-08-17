# --- STAGE 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies INSIDE the container
COPY package*.json ./

# 1. Install build dependencies needed for argon2 C++ compilation
RUN apk add --no-cache python3 make g++

# Installs ALL dependencies (including typescript)
RUN npm ci

COPY src ./src
COPY .nvmrc ./.nvmrc
COPY drizzle.config.ts ./drizzle.config.ts
COPY tsconfig.json ./tsconfig.json

# Compiles TS to JS using local typescript package
RUN npx tsc

# Remove build tools afterward to keep container size small
RUN apk del python3 make g++


# --- STAGE 2: Runner ---
FROM node:20-alpine AS runner
WORKDIR /app

# Set production ENV here, AFTER the build phase
ENV NODE_ENV=production

COPY package*.json ./

# 1. Install build dependencies needed for argon2 C++ compilation
RUN apk add --no-cache python3 make g++

# 2. Install dependencies
RUN npm ci --omit=dev

# Copy compiled JavaScript from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db/migrations ./src/db/migrations
COPY Caddyfile ./Caddyfile

# Remove build tools afterward to keep container size small
RUN apk del python3 make g++

CMD ["sh", "-c", "npm run migrate-shared && npm run setup acme"]
#CMD ["npm", "run", "server"]
