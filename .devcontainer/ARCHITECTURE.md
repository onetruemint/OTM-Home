# Multi-Server Architecture

This document describes the distributed architecture for running OTM Home across multiple servers.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Local Area Network                       │
│                          (192.168.1.0/24)                        │
│                                                                   │
│  ┌──────────────────────────┐      ┌─────────────────────────┐ │
│  │   Backend Server         │      │   Raspberry Pi          │ │
│  │   (192.168.1.100)        │◄────►│   (192.168.1.150)       │ │
│  │                          │      │                         │ │
│  │  ┌────────────────────┐  │      │  ┌──────────────────┐  │ │
│  │  │ MongoDB (27017)    │  │      │  │ Portal (9000)    │  │ │
│  │  │ - Council DB       │  │      │  │ - Next.js App    │  │ │
│  │  │ - Responses        │◄─┼──────┼──┤ - Frontend       │  │ │
│  │  └────────────────────┘  │      │  └──────────────────┘  │ │
│  │                          │      │                         │ │
│  │  ┌────────────────────┐  │      │  ┌──────────────────┐  │ │
│  │  │ Kafka (9092)       │  │      │  │ Mongo Express    │  │ │
│  │  │ - Council Queue    │◄─┼──────┼──┤ (8082)           │  │ │
│  │  │ - Event Streaming  │  │      │  │ - DB Admin UI    │  │ │
│  │  └────────────────────┘  │      │  └──────────────────┘  │ │
│  │                          │      │                         │ │
│  │  ┌────────────────────┐  │      └─────────────────────────┘ │
│  │  │ Ollama (11434)     │  │                                   │
│  │  │ - AI Models        │  │      ┌─────────────────────────┐ │
│  │  │ - GPU Acceleration │  │      │   Client Devices        │ │
│  │  └────────────────────┘  │      │                         │ │
│  │                          │      │  Browser → 9000 (Portal)│ │
│  │  ┌────────────────────┐  │      │  Browser → 8082 (Mongo) │ │
│  │  │ Keycloak (8080)    │  │      └─────────────────────────┘ │
│  │  │ - Authentication   │  │                                   │
│  │  └────────────────────┘  │                                   │
│  │                          │                                   │
│  │  ┌────────────────────┐  │                                   │
│  │  │ ELK Stack          │  │                                   │
│  │  │ - Logs & Metrics   │  │                                   │
│  │  └────────────────────┘  │                                   │
│  └──────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Server Responsibilities

### Backend Server (Main Server)
- **Purpose**: Heavy computation, data storage, AI processing
- **Services**:
  - MongoDB: Data persistence
  - Kafka: Message broker
  - Ollama: AI model inference (requires GPU)
  - Keycloak: Authentication
  - ELK Stack: Logging and monitoring
  - Council App: AI consensus service

### Raspberry Pi (Edge Server)
- **Purpose**: Web interface, lightweight services
- **Services**:
  - Portal: Next.js frontend application
  - Mongo Express: Database admin interface

## Network Communication

### From Raspberry Pi to Backend

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| MongoDB | 27017 | TCP | Database queries |
| Kafka | 9092 | TCP | Event streaming, message publishing |

### External Access

| Service | Port | Server | Access |
|---------|------|--------|--------|
| Portal | 9000 | Raspberry Pi | Web browser |
| Mongo Express | 8082 | Raspberry Pi | Web browser |
| Keycloak | 8080 | Backend | Web browser |

## Data Flow

### User Submits a Prompt

```
User Browser → Portal (9000) → Kafka (9092) → Council App → Ollama
                                    ↓
                                MongoDB (27017)
                                    ↓
                Portal ← SSE Notifications ← Council App
```

1. User accesses Portal on Raspberry Pi (port 9000)
2. Portal publishes prompt to Kafka on backend server
3. Council app consumes from Kafka queue
4. Council app uses Ollama for AI processing
5. Results saved to MongoDB
6. Portal receives real-time updates via SSE
7. User views response in Portal

### Viewing Database

```
User Browser → Mongo Express (8082) → MongoDB (27017)
```

Mongo Express on Raspberry Pi connects to MongoDB on backend server.

## Configuration

### Environment Variables

#### Backend Server (.env)
```bash
# Not needed - services use default network names
```

#### Raspberry Pi (.env.raspi)
```bash
BACKEND_SERVER_IP=192.168.1.100
BACKEND_MONGO_URL=mongodb://otm-home-user:otm-home-password@192.168.1.100:27017
BACKEND_KAFKA_BROKERS=192.168.1.100:9092
```

## Network Security

### Firewall Rules (Backend Server)

```bash
# Allow from Raspberry Pi only
sudo ufw allow from 192.168.1.150 to any port 27017 proto tcp  # MongoDB
sudo ufw allow from 192.168.1.150 to any port 9092 proto tcp   # Kafka

# Or allow from subnet
sudo ufw allow from 192.168.1.0/24 to any port 27017 proto tcp
sudo ufw allow from 192.168.1.0/24 to any port 9092 proto tcp
```

### Network Isolation

- Backend services use `otm-home` Docker network (internal)
- Raspberry Pi services use `otm-home-raspi` Docker network (internal)
- Cross-server communication happens via exposed ports on LAN
- No external internet access required (except for initial setup)

## Scaling Considerations

### Vertical Scaling (Same Architecture)
- Upgrade backend server RAM/CPU for more AI models
- Upgrade backend server GPU for faster inference
- Raspberry Pi resources are adequate for portal (can use Pi 3B+ or newer)

### Horizontal Scaling (Multiple Nodes)
- Add more Raspberry Pis running portal for load balancing
- Use Nginx reverse proxy for load distribution
- Kafka naturally supports multiple consumers
- MongoDB can be clustered (replica sets)

## Performance Considerations

### Backend Server
- **GPU**: Required for Ollama (NVIDIA/AMD)
- **RAM**: 16GB+ recommended (AI models + services)
- **CPU**: 4+ cores recommended
- **Storage**: SSD recommended for MongoDB and Kafka

### Raspberry Pi
- **Model**: Pi 3B+ or newer recommended
- **RAM**: 2GB+ (4GB preferred for Portal)
- **Storage**: 16GB+ SD card (32GB recommended)
- **Network**: Wired Ethernet preferred over WiFi

## Monitoring

### Health Checks

```bash
# From Raspberry Pi
curl http://BACKEND_IP:27017  # Should respond (MongoDB)
nc -zv BACKEND_IP 9092         # Should succeed (Kafka)

# From Backend Server
docker ps                      # All containers should be Up
docker logs otm-home-kafka     # Check for errors
docker logs otm-home-mongo     # Check for errors
```

### Resource Monitoring

```bash
# On either server
docker stats                   # Resource usage per container

# On Raspberry Pi
free -h                        # Memory usage
df -h                          # Disk usage
```

## Disaster Recovery

### Backup Strategy

```bash
# MongoDB backup (on backend server)
docker exec otm-home-mongo mongodump --out /backup

# Kafka data is in named volume
docker volume ls | grep kafka

# Portal - no state, can rebuild from source
```

### Recovery

```bash
# Restore MongoDB
docker exec -i otm-home-mongo mongorestore /backup

# Rebuild portal
docker-compose -f docker-compose.raspi.yml build portal
docker-compose -f docker-compose.raspi.yml up -d
```
