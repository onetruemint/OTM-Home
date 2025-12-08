#!/bin/bash

# Build script for Raspberry Pi deployment
# This script builds multi-platform images for deployment on Raspberry Pi

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.raspi"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building OTM Home for Raspberry Pi${NC}"
echo "======================================="
echo ""

# Check if buildx is available
if ! docker buildx version &> /dev/null; then
    echo -e "${RED}Error: Docker buildx is not available${NC}"
    echo "Please install Docker Desktop or enable buildx"
    echo "See: https://docs.docker.com/buildx/working-with-buildx/"
    exit 1
fi

# Detect target platform
PLATFORM=${1:-linux/arm64}

echo -e "${BLUE}Target platform: ${PLATFORM}${NC}"
echo ""

# Check for .env.raspi
if [ -f "$ENV_FILE" ]; then
    echo "Loading configuration from .env.raspi..."
    source "$ENV_FILE"
else
    echo -e "${YELLOW}Warning: .env.raspi not found${NC}"
    echo "Using default configuration"
fi

# Create builder instance if it doesn't exist
if ! docker buildx ls | grep -q "otm-raspi-builder"; then
    echo "Creating buildx builder instance..."
    docker buildx create --name otm-raspi-builder --use
    echo -e "${GREEN}Builder created${NC}"
else
    echo "Using existing buildx builder..."
    docker buildx use otm-raspi-builder
fi

echo ""
echo -e "${BLUE}Building portal for ${PLATFORM}...${NC}"
echo ""

# Build the portal image
docker buildx build \
    --platform "$PLATFORM" \
    --file "${SCRIPT_DIR}/../apps/raspi-apps/portal/Dockerfile.monorepo" \
    --tag otm-home-portal:latest \
    --load \
    "${SCRIPT_DIR}/.."

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}Build completed successfully!${NC}"
    echo ""
    echo "Image: otm-home-portal:latest"
    echo "Platform: $PLATFORM"
    echo ""
    echo "Next steps:"
    echo "1. If building on Raspberry Pi, you can now run:"
    echo "   docker-compose -f ${SCRIPT_DIR}/docker-compose.raspi.yml up -d"
    echo ""
    echo "2. If building on another machine, save and transfer the image:"
    echo "   docker save otm-home-portal:latest | gzip > otm-portal.tar.gz"
    echo "   # Transfer to Raspberry Pi, then:"
    echo "   docker load < otm-portal.tar.gz"
    echo ""
else
    echo -e "${RED}Build failed${NC}"
    exit 1
fi
