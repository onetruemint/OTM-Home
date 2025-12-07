# Quick Start: Raspberry Pi Deployment

This is a quick reference guide for deploying the portal and mongo-express on a Raspberry Pi.

## Prerequisites

- Docker and Docker Compose installed on Raspberry Pi
- Backend server running with MongoDB and Kafka accessible
- Both servers on the same LAN

## Quick Setup

### 1. On Backend Server

```bash
# Ensure MongoDB port is exposed in docker-compose.backend.yml
# The default configuration already exposes port 27017

# Start backend services
cd /path/to/otm-home/.devcontainer
docker-compose -f docker-compose.backend.yml up -d

# Find your backend server's IP
hostname -I
# Example output: 192.168.1.100
```

### 2. On Raspberry Pi

```bash
# Clone repository
git clone <your-repo> otm-home
cd otm-home/.devcontainer

# Configure backend server IP
cp .env.raspi.example .env.raspi
nano .env.raspi  # Update BACKEND_SERVER_IP with your backend's IP

# Start services (using the helper script)
./start-raspi.sh

# Or manually:
docker-compose -f docker-compose.raspi.yml --env-file .env.raspi up -d
```

### 3. Access Services

- **Portal**: http://RASPI_IP:9000
- **Mongo Express**: http://RASPI_IP:8082 (user: mint, password: pass)

Replace `RASPI_IP` with your Raspberry Pi's IP address.

## Common Commands

```bash
# View logs
docker-compose -f docker-compose.raspi.yml logs -f

# Stop services
docker-compose -f docker-compose.raspi.yml down

# Rebuild and restart
docker-compose -f docker-compose.raspi.yml build
docker-compose -f docker-compose.raspi.yml up -d

# Check service status
docker-compose -f docker-compose.raspi.yml ps
```

## Troubleshooting

### Build error: "addgroup failed with exit code 255"

This has been fixed in the latest `Dockerfile.monorepo`. If you still see this:

```bash
# Pull latest changes
git pull

# Rebuild without cache
docker-compose -f docker-compose.raspi.yml build --no-cache otm-home-portal
```

See `RASPBERRY-PI-TROUBLESHOOTING.md` for detailed fix.

### Cannot connect to MongoDB

```bash
# Test from Raspberry Pi
nc -zv BACKEND_IP 27017

# If fails, check firewall on backend server
# On backend server (Ubuntu/Debian):
sudo ufw allow from RASPI_IP to any port 27017 proto tcp
sudo ufw allow from RASPI_IP to any port 9092 proto tcp
```

### Portal not loading

```bash
# Check logs
docker logs otm-home-portal

# Common issues:
# 1. MONGO_URL is incorrect in .env.raspi
# 2. Backend server IP is not reachable
# 3. Ports are not accessible (firewall)
```

### Platform mismatch error

```bash
# Set the correct platform in .env.raspi
DOCKER_PLATFORM=linux/arm64  # For 64-bit Raspberry Pi OS
```

See `PLATFORM-FIX-QUICK-REF.md` for details.

## Configuration Files

- `docker-compose.raspi.yml` - Docker Compose configuration for Raspberry Pi
- `.env.raspi` - Environment variables (backend server IPs, credentials)
- `.env.raspi.example` - Template for .env.raspi

## Next Steps

For detailed information:
- See `README.raspi.md` for comprehensive deployment guide
- See `README.backend-lan.md` for backend LAN configuration
- See project README for general documentation
