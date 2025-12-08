# syntax=docker/dockerfile:1
ARG NODE_VERSION=24.11.1


# FROM node:${NODE_VERSION} AS base
# RUN apk update
# RUN apk add --no-cache libc6-compat

# WORKDIR /app

# FROM base AS prepare

# RUN yarn global add turbo@^2
# COPY . .

# RUN turbo prune @otm-home/council --docker

# FROM base AS builder

# COPY --from=prepare /app/out/json/ .
# RUN yarn install

# COPY --from=prepare /app/out/full/ .

# RUN yarn turbo build

################################################################################
# Stage 1: Prune the monorepo to only include council app and its dependencies
################################################################################
FROM node:${NODE_VERSION}-alpine AS base

RUN apk update
RUN apk add --no-cache libc6-compat openssl ca-certificates

FROM base as pruner

WORKDIR /app

ENV NODE_OPTIONS --use-openssl-ca

# Install turbo globally
RUN yarn global add turbo@^2

# Copy the entire monorepo
COPY . .

# Generate a pruned monorepo for the council app
RUN turbo prune @otm-home/council --docker

################################################################################
# Stage 2: Install dependencies (using pruned lockfile for better caching)
################################################################################
FROM base AS installer

WORKDIR /app

# Copy pruned lockfile and package.json files
COPY --from=pruner /app/out/json/ .

# Install dependencies (includes dev dependencies needed for build)
RUN yarn install --frozen-lockfile

# Copy pruned source code
COPY --from=pruner /app/out/full/ .

# Build the application using turbo
RUN yarn turbo run build

################################################################################
# Stage 3: Production runtime image (minimal, optimized)
################################################################################
FROM base AS runner

ENV NODE_ENV=production

WORKDIR /app

# # Copy pruned workspace structure (package.json files)
COPY --from=pruner /app/out/json/ .

# Copy built application from installer stage
# Note: tsc outputs the entire workspace structure under apps/council/dist/
COPY --from=installer /app/apps/council/dist .
COPY --from=installer /app/apps/council/src/council/members.json ./apps/council/src/council/members.json
# COPY --from=installer /app/apps/council/src/members.json .apps/council/src/members.json

# # Copy compiled workspace packages to packages directory
# # This ensures yarn's workspace resolution finds the compiled JS instead of TS source
COPY --from=installer /app/apps/council/dist/packages ./packages

# # Install production dependencies (this will create symlinks to compiled packages)
RUN yarn install --frozen-lockfile --production
RUN yarn run certs

# Run as non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs && \
    chown -R nodejs:nodejs /app

ENV SELF_SIGNED_CERTS "/usr/local/share/ca-certificates/mint"
COPY .devcontainer/certs ${SELF_SIGNED_CERTS}
RUN update-ca-certificates --verbose
RUN chmod 777 -R ${SELF_SIGNED_CERTS}

USER nodejs


# Expose the port
EXPOSE 9001

# Start the application (path includes nested apps/council due to tsc output structure)
CMD ["node", "apps/council/src/server.js"]
