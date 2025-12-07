# Docker Build Fix for Portal

## Problem

The original `Dockerfile` was designed for a standalone Next.js app, but the portal is part of a monorepo. When building from the monorepo root context, the build failed because:

1. The Dockerfile copied the entire monorepo (`COPY . .`)
2. `yarn build` triggered Turbo to build ALL packages
3. Only portal's dependencies were installed, not the full monorepo dependencies
4. Build failed with missing tools (`tsc`, `next`) and missing packages (`@otm/typescript-config`)

## Solution

Created `Dockerfile.monorepo` that:

1. **Properly handles workspace dependencies**: Copies only the required package.json files during the deps stage
2. **Installs all necessary dependencies**: Including typescript-config, kafka, and logger packages
3. **Builds only the portal**: Sets WORKDIR to `/app/apps/portal` before building
4. **Uses standalone output**: Leverages Next.js standalone output for minimal production image

## Files Changed

### New Files
- `apps/portal/Dockerfile.monorepo` - New monorepo-aware Dockerfile

### Updated Files
- `.devcontainer/docker-compose.raspi.yml` - Updated to use `Dockerfile.monorepo`
- `.devcontainer/.env.raspi.example` - Added `BACKEND_MONGO_URL` and Mongo Express config
- `.devcontainer/start-raspi.sh` - Added MongoDB connectivity test and Mongo Express info

## What's Included

The Raspberry Pi deployment now includes:

1. **Portal** (port 9000) - Next.js frontend application
2. **Mongo Express** (port 8082) - MongoDB admin interface

Both services connect to the backend server for:
- MongoDB (port 27017)
- Kafka (port 9092)

## Build Time

The portal Docker build takes approximately **70 seconds** on a modern system:
- 40s to install dependencies
- 15s to compile TypeScript and Next.js
- 15s to finalize and export image

## Usage

```bash
# On Raspberry Pi
cd .devcontainer

# Configure backend server IP
cp .env.raspi.example .env.raspi
nano .env.raspi  # Update BACKEND_SERVER_IP

# Build and start
./start-raspi.sh

# Or manually
docker-compose -f docker-compose.raspi.yml --env-file .env.raspi up -d --build
```

## Verification

After starting, verify the services:

```bash
# Check running containers
docker ps

# Check portal logs
docker logs otm-home-portal

# Check mongo-express logs
docker logs otm-home-mongo-express

# Access services
curl http://localhost:9000  # Portal
curl http://localhost:8082  # Mongo Express
```

## Dependencies Included

The portal build includes these workspace packages:
- `@otm/kafka` - Kafka client for messaging
- `@otm/logger` - Structured logging (browser-compatible version)
- `@otm/typescript-config` - Shared TypeScript configuration

## Production Considerations

### Image Size
The final portal image is relatively small due to:
- Multi-stage build (only runtime files in final image)
- Next.js standalone output (minimal dependencies)
- Alpine Linux base image

### ARM Architecture
The Dockerfile works on ARM architecture (Raspberry Pi) because:
- Uses official Node.js Alpine images that support ARM
- All dependencies are JavaScript (no native bindings)
- Build process is architecture-agnostic

### Memory Usage
Portal requires approximately:
- **Build**: 1-2GB RAM (temporary, during docker build)
- **Runtime**: 256-512MB RAM (running container)

Ensure your Raspberry Pi has at least 2GB RAM (4GB recommended).

## Troubleshooting

### Build fails with "File not found"
Make sure you're running the build from the project root:
```bash
# Correct
cd /path/to/otm-home
docker-compose -f .devcontainer/docker-compose.raspi.yml build

# Incorrect
cd /path/to/otm-home/.devcontainer
docker-compose -f docker-compose.raspi.yml build  # Wrong context!
```

### Build is very slow on Raspberry Pi
Consider cross-compiling on a faster machine:
```bash
# On powerful machine (x86)
docker buildx build --platform linux/arm64 \
  -f apps/portal/Dockerfile.monorepo \
  -t YOUR_REGISTRY/otm-portal:latest \
  --push .

# On Raspberry Pi
docker pull YOUR_REGISTRY/otm-portal:latest
```

### Runtime errors about missing modules
Ensure all workspace dependencies are copied in the Dockerfile:
- Check `tsconfig.json` for extends
- Check `package.json` for workspace dependencies
- Add any missing packages to the COPY commands in Dockerfile.monorepo
