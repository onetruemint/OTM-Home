# syntax=docker.io/docker/dockerfile:1
ARG NODE_VERSION=22.21.1

FROM node:${NODE_VERSION}-slim AS base

USER root

# Install ca-certificates in base stage
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Configure Node to use the custom certificate - this will be inherited by all stages
ENV NODE_EXTRA_CA_CERTS="${SELF_SIGNED_CERTS}/mint.crt"
ENV NODE_OPTIONS="--use-openssl-ca"

# Install dependencies for the entire monorepo
FROM base AS deps
WORKDIR /app

# Copy workspace files
COPY scripts/gen-certs.sh ./scripts/gen-certs.sh
COPY package.json yarn.lock turbo.json ./
COPY apps/raspi-apps/portal/package.json ./apps/raspi-apps/portal/package.json
COPY packages/kafka/package.json ./packages/kafka/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json

# Setup SSL certificates in base stage so all stages inherit them
RUN yarn certs
ENV SELF_SIGNED_CERTS="/usr/local/share/ca-certificates/mint"
COPY .devcontainer/certs/server.crt ${SELF_SIGNED_CERTS}/mint.crt
RUN update-ca-certificates --verbose && \
    chmod 644 ${SELF_SIGNED_CERTS}/mint.crt

# Install all dependencies (including dev dependencies for build)
RUN yarn install --frozen-lockfile --network-timeout 1000000

# Build stage - only build what's needed for portal
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/raspi-apps/portal/node_modules ./apps/raspi-apps/portal/node_modules

# Copy workspace configuration
COPY package.json yarn.lock turbo.json ./

# Copy portal source code
COPY apps/raspi-apps/portal ./apps/raspi-apps/portal

# Copy dependencies that portal needs
COPY packages/kafka ./packages/kafka
COPY packages/logger ./packages/logger
COPY packages/typescript-config ./packages/typescript-config

# Build only the portal
WORKDIR /app/apps/raspi-apps/portal
RUN yarn build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs

# Copy public assets
COPY --from=builder /app/apps/raspi-apps/portal/public ./public

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/apps/raspi-apps/portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/raspi-apps/portal/.next/static ./apps/raspi-apps/portal/.next/static

USER nextjs

EXPOSE 9000
ENV PORT=9000
ENV HOSTNAME="0.0.0.0"

# The standalone server is located in the apps/raspi-apps/portal directory
CMD ["node", "apps/raspi-apps/portal/server.js"]
