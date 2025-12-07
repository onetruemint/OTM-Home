# Platform Error - Quick Fix

## The Error
```
failed to solve: no match for platform in manifest: not found
```

## Why It Happens
You're trying to run an image built for a different CPU architecture (e.g., x86_64 image on ARM64 Raspberry Pi).

## Quick Fix Options

### Option A: Set the Platform in .env.raspi (Easiest)

```bash
cd .devcontainer

# Copy and edit environment file
cp .env.raspi.example .env.raspi
nano .env.raspi

# Add this line based on your system:
DOCKER_PLATFORM=linux/arm64    # For Raspberry Pi 3/4/5 (64-bit OS)
# or
DOCKER_PLATFORM=linux/arm/v7   # For Raspberry Pi (32-bit OS)
# or
DOCKER_PLATFORM=linux/amd64    # For testing on x86_64

# Save and run
docker-compose -f docker-compose.raspi.yml --env-file .env.raspi up -d
```

### Option B: Build with Platform Flag

```bash
export DOCKER_PLATFORM=linux/arm64  # Set for your architecture

docker-compose -f .devcontainer/docker-compose.raspi.yml \
  --env-file .env.raspi \
  up -d --build
```

### Option C: Use the Build Script (For Cross-Compilation)

```bash
# Build on x86_64 for Raspberry Pi (ARM64)
cd .devcontainer
./build-raspi.sh linux/arm64

# Transfer image to Raspberry Pi
docker save otm-home-portal:latest | gzip > otm-portal.tar.gz
scp otm-portal.tar.gz pi@raspberrypi:~/

# On Raspberry Pi, load and run
docker load < otm-portal.tar.gz
cd otm-home/.devcontainer
docker-compose -f docker-compose.raspi.yml up -d
```

## Which Platform Do I Need?

Run this on your target machine (Raspberry Pi):

```bash
uname -m
```

Results:
- `aarch64` or `arm64` → Use `linux/arm64`
- `armv7l` → Use `linux/arm/v7`
- `x86_64` → Use `linux/amd64`

## Verify Platform After Build

```bash
# Check what platform the image was built for
docker image inspect otm-home-portal:latest | grep Architecture

# Should match your system
uname -m
```

## Common Scenarios

### Scenario 1: Testing Locally on x86_64
```bash
# .env.raspi
DOCKER_PLATFORM=linux/amd64
```

### Scenario 2: Deploying to Raspberry Pi 4 (64-bit OS)
```bash
# .env.raspi
DOCKER_PLATFORM=linux/arm64
```

### Scenario 3: Deploying to Raspberry Pi 3 (32-bit OS)
```bash
# .env.raspi
DOCKER_PLATFORM=linux/arm/v7
```

## Still Having Issues?

See `CROSS-PLATFORM-DEPLOYMENT.md` for detailed troubleshooting and advanced options.
