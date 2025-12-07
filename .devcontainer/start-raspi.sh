#!/bin/bash

# Start script for Raspberry Pi deployment
# This script starts the portal services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.raspi"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting OTM Home Raspberry Pi Services${NC}"
echo "========================================="

# Check if .env.raspi exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Warning: .env.raspi not found${NC}"
    echo "Creating from .env.raspi.example..."

    if [ -f "${SCRIPT_DIR}/.env.raspi.example" ]; then
        cp "${SCRIPT_DIR}/.env.raspi.example" "$ENV_FILE"
        echo -e "${RED}Please edit $ENV_FILE with your backend server's IP address${NC}"
        echo "Then run this script again."
        exit 1
    else
        echo -e "${RED}Error: .env.raspi.example not found${NC}"
        exit 1
    fi
fi

# Source the environment file to check configuration
source "$ENV_FILE"

# Check if BACKEND_SERVER_IP is set
if [ -z "$BACKEND_SERVER_IP" ] || [ "$BACKEND_SERVER_IP" = "192.168.1.100" ]; then
    echo -e "${YELLOW}Warning: BACKEND_SERVER_IP may not be configured${NC}"
    echo "Current value: $BACKEND_SERVER_IP"
    read -p "Do you want to continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please update BACKEND_SERVER_IP in $ENV_FILE"
        exit 1
    fi
fi

echo ""
echo "Configuration:"
echo "  Backend Server: $BACKEND_SERVER_IP"
echo "  Kafka Brokers: $BACKEND_KAFKA_BROKERS"
echo ""

# Test connectivity to backend services
echo "Testing connectivity to backend services..."

# Test Kafka
echo -n "  Kafka (9092)... "
if nc -z -w2 "$BACKEND_SERVER_IP" 9092 2>/dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo -e "${YELLOW}Warning: Cannot connect to Kafka. Services may not work properly.${NC}"
fi

echo ""

# Start services
echo "Starting services..."
docker-compose -f "${SCRIPT_DIR}/docker-compose.raspi.yml" --env-file "$ENV_FILE" up -d

# Check if services started successfully
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}Services started successfully!${NC}"
    echo ""
    echo "Access the services at:"
    echo "  Portal:        http://$(hostname -I | awk '{print $1}'):9000"
    echo ""
    echo "View logs with:"
    echo "  docker-compose -f ${SCRIPT_DIR}/docker-compose.raspi.yml logs -f"
else
    echo -e "${RED}Failed to start services${NC}"
    exit 1
fi
