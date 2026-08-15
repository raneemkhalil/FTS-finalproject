# Use an official Node.js image (Node and NPM are already inside)
FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies INSIDE the container
COPY package*.json ./

# 1. Install build dependencies needed for argon2 C++ compilation
RUN apk add --no-cache python3 make g++

# 2. Install dependencies
RUN npm ci --omit=dev

COPY src ./src
COPY .nvmrc ./.nvmrc
COPY drizzle.config.ts ./drizzle.config.ts
COPY tsconfig.json ./tsconfig.json

# Remove build tools afterward to keep container size small
RUN apk del python3 make g++

CMD ["npm", "run", "migrate-shared", "&&", "npm", "run", "migrate-schemas"]

# CMP ["npm", "run", "server"]
