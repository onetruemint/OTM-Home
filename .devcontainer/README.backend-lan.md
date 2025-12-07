# Backend LAN Configuration Guide

This guide explains how to configure the backend services to be accessible from other devices on your local network (LAN).

## Overview

By default, Docker services are only accessible from the host machine. To allow the Raspberry Pi (or other devices) to connect to backend services like MongoDB and Kafka, you need to:

1. Ensure services bind to `0.0.0.0` (all interfaces)
2. Configure Kafka to advertise the LAN IP address
3. Configure firewall rules
4. Update MongoDB to accept remote connections

## 1. Update Kafka Configuration

Kafka needs to advertise its LAN IP address so clients can connect from other machines.

### Find your backend server's LAN IP:

```bash
# Linux
ip addr show | grep "inet " | grep -v 127.0.0.1

# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Or simply
hostname -I
```

### Update docker-compose.backend.yml

Edit `.devcontainer/docker-compose.backend.yml` and update the Kafka service:

```yaml
  otm-home-kafka:
    image: ${KAFKA_IMAGE}
    container_name: otm-home-kafka
    ports:
      - 9092:9092
      - 9093:9093  # Add this for external access
    volumes:
      - otm-home-kafka_data:/var/lib/kafka/data
    networks:
      - otm-home
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      # Update listeners to include external listener
      KAFKA_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093,EXTERNAL://:9094
      # Advertise both internal and external addresses
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://otm-home-kafka:9092,EXTERNAL://YOUR_BACKEND_IP:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,EXTERNAL:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@localhost:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_NUM_PARTITIONS: 3
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: true
    restart: always
```

Replace `YOUR_BACKEND_IP` with your actual LAN IP address (e.g., `192.168.1.100`).

## 2. Update MongoDB Configuration

MongoDB in Docker is already configured to accept connections from any host, but ensure it's binding to all interfaces:

```yaml
  otm-home-mongodb:
    image: ${MONGO_IMAGE}
    container_name: otm-home-mongo
    networks:
      - otm-home
    ports:
      - "27017:27017"  # Make sure this is exposed
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: otm-home-user
      MONGO_INITDB_ROOT_PASSWORD: otm-home-password
```

The port mapping `27017:27017` ensures MongoDB is accessible on the LAN.

## 3. Configure Firewall

### UFW (Ubuntu/Debian)

```bash
# Allow MongoDB from specific IP (recommended)
sudo ufw allow from 192.168.1.150 to any port 27017 proto tcp

# Allow Kafka from specific IP (recommended)
sudo ufw allow from 192.168.1.150 to any port 9092 proto tcp

# Or allow from entire subnet (less secure)
sudo ufw allow from 192.168.1.0/24 to any port 27017 proto tcp
sudo ufw allow from 192.168.1.0/24 to any port 9092 proto tcp

# Reload firewall
sudo ufw reload
```

Replace `192.168.1.150` with your Raspberry Pi's IP address.

### Firewalld (RHEL/CentOS/Fedora)

```bash
# Add rich rules for specific IP
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.150" port protocol="tcp" port="27017" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.150" port protocol="tcp" port="9092" accept'

# Or add ports for entire zone
sudo firewall-cmd --permanent --zone=public --add-port=27017/tcp
sudo firewall-cmd --permanent --zone=public --add-port=9092/tcp

# Reload firewall
sudo firewall-cmd --reload
```

### No Firewall

If your server doesn't have a firewall enabled, the services should be accessible by default. However, this is not recommended for security reasons.

## 4. Test Connectivity

From the Raspberry Pi, test connectivity to the backend services:

```bash
# Test MongoDB
nc -zv BACKEND_IP 27017
# or
telnet BACKEND_IP 27017

# Test Kafka
nc -zv BACKEND_IP 9092
# or
telnet BACKEND_IP 9092
```

If connections are successful, you should see "succeeded" or "Connected".

## 5. Restart Backend Services

After making changes to the docker-compose file:

```bash
cd /path/to/otm-home/.devcontainer
docker-compose -f docker-compose.backend.yml down
docker-compose -f docker-compose.backend.yml up -d
```

## Security Considerations

1. **Firewall**: Always use a firewall and restrict access to specific IP addresses
2. **VPN**: Consider using a VPN for remote access instead of exposing services to the internet
3. **Authentication**: Ensure strong passwords for MongoDB and other services
4. **Network Segmentation**: Consider using VLANs to isolate IoT devices and services
5. **SSL/TLS**: For production, configure SSL/TLS encryption for MongoDB and Kafka

## Troubleshooting

### MongoDB Connection Refused

1. Check if MongoDB is running: `docker ps | grep mongo`
2. Check if port is exposed: `docker port otm-home-mongo`
3. Check firewall rules: `sudo ufw status` or `sudo firewall-cmd --list-all`
4. Check if MongoDB is binding to 0.0.0.0: `docker logs otm-home-mongo | grep "Listening"`

### Kafka Connection Issues

1. Verify `KAFKA_ADVERTISED_LISTENERS` includes your LAN IP
2. Check Kafka logs: `docker logs otm-home-kafka`
3. Verify port 9092 is accessible from Raspberry Pi
4. Test with kafka console tools from Raspberry Pi

### DNS Resolution

If using hostnames instead of IP addresses:

1. Ensure DNS is properly configured on both servers
2. Consider adding entries to `/etc/hosts` on both machines:
   ```
   192.168.1.100  backend-server
   192.168.1.150  raspi-server
   ```

## Environment Variables

Create `.env` file in `.devcontainer/` directory:

```bash
# Backend server LAN IP
BACKEND_SERVER_IP=192.168.1.100

# Images
KAFKA_IMAGE=apache/kafka:latest
MONGO_IMAGE=mongo:latest
```

Then reference in docker-compose:

```yaml
environment:
  KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://otm-home-kafka:9092,EXTERNAL://${BACKEND_SERVER_IP}:9092
```
