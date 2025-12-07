# Raspberry Pi Deployment Troubleshooting

Common issues and solutions when deploying to Raspberry Pi.

## Error: addgroup failed with exit code 255

### Full Error Message
```
failed to solve: process "/bin/sh -c addgroup --system --gid 1001 nodejs" did not complete successfully: exit code: 255
```

### Cause
Alpine Linux's `addgroup` and `adduser` commands have different syntax and behavior on ARM architectures compared to x86_64. The `--system` flag combined with `--gid` is not compatible across all platforms.

### Solution
The issue has been fixed in `Dockerfile.monorepo` by using POSIX-compatible flags:

**Old (incompatible):**
```dockerfile
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
```

**New (compatible):**
```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nextjs
```

### Flag Meanings
- `-g 1001` : Set group ID
- `-S` : Create a system user/group
- `-u 1001` : Set user ID
- `-G nodejs` : Add user to group

This syntax works on both x86_64 and ARM architectures.

### If You Still See This Error

1. **Rebuild the image** to get the latest Dockerfile:
   ```bash
   docker-compose -f .devcontainer/docker-compose.raspi.yml build --no-cache otm-home-portal
   ```

2. **Verify you're using the correct Dockerfile**:
   ```bash
   grep -A2 "addgroup" apps/portal/Dockerfile.monorepo
   # Should show: addgroup -g 1001 -S nodejs
   ```

3. **Check Alpine version** (should be compatible):
   ```bash
   docker run --rm node:24-alpine cat /etc/alpine-release
   # Should show: 3.19.x or newer
   ```

## Error: no match for platform in manifest

See `PLATFORM-FIX-QUICK-REF.md` for the quick fix.

**TL;DR**: Set `DOCKER_PLATFORM=linux/arm64` in `.env.raspi`

## Error: exec format error

### Cause
Trying to run an image built for the wrong architecture.

### Solution
```bash
# Check what platform your image is
docker image inspect otm-home-portal:latest | grep Architecture

# Check your system architecture
uname -m

# They should match:
# aarch64/arm64 → Architecture: arm64
# armv7l → Architecture: arm
# x86_64 → Architecture: amd64

# Rebuild for correct platform
export DOCKER_PLATFORM=linux/arm64
docker-compose -f .devcontainer/docker-compose.raspi.yml build --no-cache
```

## Error: Cannot connect to MongoDB/Kafka

### Symptoms
```
Portal logs show: ECONNREFUSED 192.168.1.100:27017
```

### Solutions

1. **Verify backend services are running**:
   ```bash
   # On backend server
   docker ps | grep -E "mongo|kafka"
   ```

2. **Test connectivity from Raspberry Pi**:
   ```bash
   # On Raspberry Pi
   nc -zv BACKEND_IP 27017  # MongoDB
   nc -zv BACKEND_IP 9092   # Kafka
   ```

3. **Check firewall on backend server**:
   ```bash
   # On backend server
   sudo ufw status

   # Add rules if needed
   sudo ufw allow from RASPI_IP to any port 27017 proto tcp
   sudo ufw allow from RASPI_IP to any port 9092 proto tcp
   ```

4. **Verify environment variables**:
   ```bash
   # Check .env.raspi
   cat .devcontainer/.env.raspi

   # Should have correct backend IP
   BACKEND_SERVER_IP=192.168.1.100
   BACKEND_MONGO_URL=mongodb://otm-home-user:otm-home-password@192.168.1.100:27017
   ```

## Build is Very Slow on Raspberry Pi

### Symptoms
Build takes 5-10 minutes or more.

### Solutions

**Option 1: Cross-compile on a faster machine**
```bash
# On x86_64 machine
cd .devcontainer
./build-raspi.sh linux/arm64

# Transfer image
docker save otm-home-portal:latest | gzip > otm-portal.tar.gz
scp otm-portal.tar.gz pi@raspberrypi:~/

# On Raspberry Pi
docker load < otm-portal.tar.gz
```

**Option 2: Use pre-built images from registry**
```bash
# Build and push from x86_64
docker buildx build \
  --platform linux/arm64 \
  --push \
  -t YOUR_USERNAME/otm-portal:latest \
  -f apps/portal/Dockerfile.monorepo \
  .

# Pull on Raspberry Pi
docker pull YOUR_USERNAME/otm-portal:latest
```

**Option 3: Build once, reuse**
After the first build, use `--no-build`:
```bash
docker-compose -f docker-compose.raspi.yml up -d --no-build
```

## Out of Memory During Build

### Symptoms
```
killed
signal: killed
exit code: 137
```

### Solutions

1. **Increase swap space**:
   ```bash
   # On Raspberry Pi
   sudo dphys-swapfile swapoff
   sudo nano /etc/dphys-swapfile
   # Set: CONF_SWAPSIZE=2048
   sudo dphys-swapfile setup
   sudo dphys-swapfile swapon
   ```

2. **Build on another machine** (recommended for Pi with < 4GB RAM)

3. **Close other applications** during build

## Container Starts but Portal Not Accessible

### Check container logs
```bash
docker logs otm-home-portal
```

### Common issues

1. **Port conflict**:
   ```bash
   # Check if port 9000 is in use
   sudo netstat -tlnp | grep 9000

   # Change port in docker-compose.raspi.yml if needed
   ports:
     - "9001:9000"  # Use different external port
   ```

2. **Container is restarting**:
   ```bash
   docker ps -a
   # If status shows "Restarting", check logs for errors
   ```

3. **Network configuration**:
   ```bash
   # Verify container is on the correct network
   docker network inspect otm-home-raspi
   ```

## Mongo Express Not Loading

### Check authentication
Default credentials in `.env.raspi`:
```
MONGO_EXPRESS_USER=mint
MONGO_EXPRESS_PASSWORD=pass
```

### Check MongoDB connection
```bash
# View mongo-express logs
docker logs otm-home-mongo-express

# Common error: "Could not connect to MongoDB"
# Fix: Verify BACKEND_MONGO_URL in .env.raspi
```

### Access directly
```bash
# Try accessing without authentication
# Edit docker-compose.raspi.yml:
ME_CONFIG_BASICAUTH_ENABLED: false
```

## Performance Issues

### Portal is slow/unresponsive

1. **Check resource usage**:
   ```bash
   docker stats
   ```

2. **Increase memory limit** (if available):
   ```bash
   # In docker-compose.raspi.yml, add:
   services:
     otm-home-portal:
       deploy:
         resources:
           limits:
             memory: 512M
   ```

3. **Use Pi 4 with 4GB+ RAM** (recommended)

4. **Consider using Pi 5** for best performance

## Kernel/OS Issues

### Check Raspberry Pi OS version
```bash
cat /etc/os-release
```

**Recommended**: Raspberry Pi OS (64-bit) based on Debian Bookworm

### Update system
```bash
sudo apt update && sudo apt upgrade -y
```

### Docker version
```bash
docker --version
# Recommended: 20.10.0 or newer
```

## Getting More Help

1. **Check full logs**:
   ```bash
   # All services
   docker-compose -f docker-compose.raspi.yml logs

   # Specific service
   docker logs otm-home-portal --tail 100
   ```

2. **Inspect container**:
   ```bash
   docker inspect otm-home-portal
   ```

3. **Test inside container**:
   ```bash
   docker exec -it otm-home-portal /bin/sh
   # Inside container:
   node -v
   ls -la /app
   ```

4. **Check system resources**:
   ```bash
   free -h        # Memory
   df -h          # Disk
   top            # CPU usage
   ```

5. **Report issue** with these details:
   - Raspberry Pi model
   - OS version (`cat /etc/os-release`)
   - Docker version (`docker --version`)
   - Architecture (`uname -m`)
   - Full error logs
