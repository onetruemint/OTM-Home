# Cross-Platform Deployment Guide

This guide explains how to deploy OTM Home portal on Raspberry Pi when building from a different architecture (e.g., x86_64 to ARM64).

## Understanding the Platform Issue

The error "no match for platform in manifest: not found" occurs when:
- You build a Docker image on one architecture (e.g., x86_64)
- Try to run it on a different architecture (e.g., ARM64 on Raspberry Pi)
- The image doesn't have the required platform variant

## Solution Options

### Option 1: Build Directly on Raspberry Pi (Simplest)

If you have Git and Docker on the Raspberry Pi, build there directly:

```bash
# On Raspberry Pi
git clone <your-repo> otm-home
cd otm-home/.devcontainer

# Configure
cp .env.raspi.example .env.raspi
nano .env.raspi  # Set BACKEND_SERVER_IP and DOCKER_PLATFORM=linux/arm64

# Build and run (this will take longer on Pi)
docker-compose -f docker-compose.raspi.yml --env-file .env.raspi up -d --build
```

**Pros**: Simple, no cross-compilation needed
**Cons**: Slower build on Raspberry Pi (may take 5-10 minutes)

### Option 2: Cross-Compile with Docker Buildx (Recommended)

Build on a powerful x86_64 machine for ARM64 target:

```bash
# On your development machine (x86_64)
cd .devcontainer

# Build for ARM64
./build-raspi.sh linux/arm64

# Save the image
docker save otm-home-portal:latest | gzip > otm-portal-arm64.tar.gz

# Transfer to Raspberry Pi (choose one method):
# Method 1: SCP
scp otm-portal-arm64.tar.gz pi@raspberrypi.local:~/

# Method 2: USB drive
# Copy otm-portal-arm64.tar.gz to USB drive

# On Raspberry Pi
docker load < otm-portal-arm64.tar.gz

# Update docker-compose to use local image
cd otm-home/.devcontainer
cp .env.raspi.example .env.raspi
nano .env.raspi  # Set BACKEND_SERVER_IP and DOCKER_PLATFORM=linux/arm64

# Run (no build needed, using loaded image)
docker-compose -f docker-compose.raspi.yml --env-file .env.raspi up -d
```

**Pros**: Fast builds on powerful machine, quick deployment on Pi
**Cons**: Extra step to transfer image

### Option 3: Push to Docker Registry (Best for CI/CD)

Build and push to Docker Hub or private registry:

```bash
# On your development machine
cd .devcontainer

# Login to Docker Hub
docker login

# Build and push for ARM64
docker buildx build \
  --platform linux/arm64 \
  --file ../apps/portal/Dockerfile.monorepo \
  --tag YOUR_USERNAME/otm-portal:latest \
  --push \
  ..

# On Raspberry Pi
# Update docker-compose.raspi.yml to use the registry image
docker-compose -f docker-compose.raspi.yml pull
docker-compose -f docker-compose.raspi.yml up -d
```

**Pros**: Automated, reusable, good for updates
**Cons**: Requires Docker registry account, image is public (unless private registry)

### Option 4: Multi-Platform Build and Push

Build for both platforms at once:

```bash
# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --file apps/portal/Dockerfile.monorepo \
  --tag YOUR_USERNAME/otm-portal:latest \
  --push \
  .

# Now the image will work on both x86_64 and ARM64
# On Raspberry Pi, just pull and run
docker pull YOUR_USERNAME/otm-portal:latest
```

## Platform Detection

Your Raspberry Pi's platform depends on the OS:

### Check Platform on Raspberry Pi

```bash
# Check architecture
uname -m

# Expected outputs:
# aarch64 or arm64    → Use linux/arm64
# armv7l              → Use linux/arm/v7
# x86_64              → Use linux/amd64 (not typical for Pi)
```

### Raspberry Pi Models

| Model | 32-bit OS | 64-bit OS |
|-------|-----------|-----------|
| Pi 5 | linux/arm/v7 | linux/arm64 |
| Pi 4 | linux/arm/v7 | linux/arm64 |
| Pi 3 | linux/arm/v7 | linux/arm64 |
| Pi Zero 2 W | linux/arm/v7 | linux/arm64 |
| Pi 2 | linux/arm/v7 | N/A |
| Pi Zero W | linux/arm/v6 | N/A |

**Recommendation**: Use 64-bit OS (linux/arm64) on Pi 3/4/5 for better performance.

## Mongo Express Platform Compatibility

The `mongo-express` image supports multiple platforms:
- linux/amd64
- linux/arm64
- linux/arm/v7

Set the correct platform in `.env.raspi`:

```bash
DOCKER_PLATFORM=linux/arm64  # For 64-bit Pi OS
# or
DOCKER_PLATFORM=linux/arm/v7  # For 32-bit Pi OS
```

## Troubleshooting

### Error: "requested access to the resource is denied"

You're not logged into Docker Hub:
```bash
docker login
```

### Error: "multiple platforms feature is currently not supported"

Docker buildx is not enabled:
```bash
# Enable experimental features
export DOCKER_CLI_EXPERIMENTAL=enabled

# Or install Docker Desktop which includes buildx
```

### Build is extremely slow on Raspberry Pi

Use cross-compilation (Option 2 or 3) instead of building on Pi.

### Error: "exec format error" when running container

You're trying to run the wrong architecture:
```bash
# Check image platform
docker image inspect otm-home-portal:latest | grep Architecture

# Should match your Pi's architecture
uname -m
```

## Performance Considerations

### Build Times

| Method | Machine | Platform | Time |
|--------|---------|----------|------|
| Native | x86_64 | linux/amd64 | ~70s |
| Native | Raspberry Pi 4 | linux/arm64 | ~5-8min |
| Cross-compile | x86_64 → ARM64 | linux/arm64 | ~90s |
| Buildx multi-platform | x86_64 | both | ~150s |

### Runtime Performance

Portal runtime performance on Raspberry Pi:
- **Pi 5**: Excellent (comparable to x86_64)
- **Pi 4 (4GB+)**: Good (smooth operation)
- **Pi 4 (2GB)**: Acceptable (may swap under load)
- **Pi 3**: Slow (not recommended for production)

## Recommended Workflow

For development and deployment:

```bash
# 1. Develop locally (x86_64)
docker-compose -f .devcontainer/docker-compose.raspi.yml up -d
# Set DOCKER_PLATFORM=linux/amd64 in .env.raspi

# 2. Build for Raspberry Pi
./build-raspi.sh linux/arm64

# 3. Save and transfer
docker save otm-home-portal:latest | gzip > otm-portal.tar.gz
scp otm-portal.tar.gz pi@raspberrypi.local:~/

# 4. On Raspberry Pi, load and run
ssh pi@raspberrypi.local
docker load < otm-portal.tar.gz
cd otm-home/.devcontainer
docker-compose -f docker-compose.raspi.yml up -d
```

## Environment Variables Summary

Add to `.env.raspi`:

```bash
# Platform (REQUIRED for cross-platform deployment)
DOCKER_PLATFORM=linux/arm64

# Backend connection
BACKEND_SERVER_IP=192.168.1.100
BACKEND_MONGO_URL=mongodb://otm-home-user:otm-home-password@192.168.1.100:27017
BACKEND_KAFKA_BROKERS=192.168.1.100:9092

# Mongo Express
MONGO_EXPRESS_IMAGE=mongo-express:latest
MONGO_EXPRESS_USER=mint
MONGO_EXPRESS_PASSWORD=pass
```
