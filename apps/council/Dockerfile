# syntax=docker/dockerfile:1

ARG NODE_VERSION=25.0.0

# Build stage
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /build

# Copy workspace configuration
COPY package.json package-lock.json tsconfig.json ./

# Copy platform dependencies
COPY platform ./platform

# Copy council app
COPY apps/council ./apps/council

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Build TypeScript
RUN npm run build

# Production stage
FROM node:${NODE_VERSION}-bookworm

ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy workspace configuration
COPY package.json package-lock.json ./

# Copy built platform dependencies
COPY --from=builder /build/platform ./platform
COPY --from=builder /build/dist/platform ./dist/platform

# Copy built council app
COPY --from=builder /build/apps/council/package.json ./apps/council/
COPY --from=builder /build/apps/council/src/members.json ./apps/council/src/
COPY --from=builder /build/dist/apps/council ./dist/apps/council

# Install only production dependencies
RUN npm ci --omit=dev --workspace=apps/council

# Run as non-root user
USER node

# Expose the port
EXPOSE 3001

# Start the application
CMD ["node", "dist/apps/council/src/server.js"]
