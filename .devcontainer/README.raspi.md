# Raspberry Pi Deployment Guide

This guide explains how to deploy the portal service on a Raspberry Pi (or any separate server) while keeping the backend services (Kafka, etc.) on your main server.

## Architecture

- **Backend Server**: Runs Kafka, Ollama, Keycloak, and other backend services
- **Raspberry Pi**: Runs Portal (Next.js frontend)

## Prerequisites

1. Docker and Docker Compose installed on both servers
2. Both servers on the same local network (LAN)
3. Backend server's IP address or hostname

## Setup Instructions

### 1. Backend Server Setup

On your main server, ensure the backend services are running and accessible:

```bash
# Navigate to the project directory
cd /path/to/otm-home

# Start backend services
docker-compose -f .devcontainer/docker-compose.backend.yml up -d
```

**Important**: Ensure these ports are accessible from the Raspberry Pi:

- Kafka: `9092`

You may need to configure your firewall to allow access from the Raspberry Pi's IP address.

### 2. Raspberry Pi Setup

#### Step 1: Clone the repository or copy necessary files

```bash
# On Raspberry Pi
git clone <your-repo-url> otm-home
cd otm-home
```

#### Step 2: Configure environment variables

```bash
# Copy the example environment file
cd .devcontainer
cp .env.raspi.example .env.raspi

# Edit the file with your backend server's IP
nano .env.raspi
```

Update `BACKEND_SERVER_IP` with your backend server's IP address (e.g., `192.168.1.100`).

#### Step 3: Build and start the services

```bash
# Build and start portal and mongo-express
docker-compose -f docker-compose.raspi.yml --env-file .env.raspi up -d
```

## Accessing the Services

After both servers are running:

- **Portal**: http://RASPI_IP:9000

Replace `RASPI_IP` with your Raspberry Pi's IP address (e.g., `192.168.1.150`).

## Network Configuration

### Backend Server Firewall Rules

If you're using a firewall on the backend server, you'll need to allow traffic from the Raspberry Pi:

```bash
# Example using ufw (Ubuntu/Debian)
sudo ufw allow from RASPI_IP to any port 9092 proto tcp   # Kafka
```

### Port Forwarding (Optional)

If you want to access the services from outside your local network:

1. Configure port forwarding on your router:
   - Forward port 9000 to Raspberry Pi's port 9000 (Portal)

## Troubleshooting

### Portal cannot connect to Kafka

1. Verify Kafka broker address in `.env.raspi`
2. Check if Kafka port 9092 is accessible:
   ```bash
   # From Raspberry Pi
   nc -zv BACKEND_SERVER_IP 9092
   ```
3. Update Kafka's `KAFKA_ADVERTISED_LISTENERS` to include the backend server's LAN IP

### Updating Services

To rebuild the portal after code changes:

```bash
# On Raspberry Pi
cd .devcontainer
docker-compose -f docker-compose.raspi.yml --env-file .env.raspi build portal
docker-compose -f docker-compose.raspi.yml --env-file .env.raspi up -d
```

## Performance Considerations

For Raspberry Pi (especially older models):

1. **Memory**: Portal (Next.js) can be memory-intensive. Monitor with `docker stats`
2. **Build Time**: Building the portal on Raspberry Pi may take longer. Consider building on a more powerful machine and pushing the image to a registry
3. **ARM Architecture**: Ensure all Docker images support ARM architecture (most official images do)

## Stopping Services

```bash
# Stop services
docker-compose -f docker-compose.raspi.yml down

# Stop and remove volumes
docker-compose -f docker-compose.raspi.yml down -v
```
