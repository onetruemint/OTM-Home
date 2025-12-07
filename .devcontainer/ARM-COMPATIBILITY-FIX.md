# ARM Compatibility Fix Summary

## Issue Fixed
**Error**: `failed to solve: process "/bin/sh -c addgroup --system --gid 1001 nodejs" did not complete successfully: exit code: 255`

## Root Cause
Alpine Linux's `addgroup` and `adduser` commands use different flag syntax on ARM architectures (Raspberry Pi) compared to x86_64 (standard PCs). The `--system` long-form flag combined with `--gid` is not compatible across all platforms.

## The Fix
Changed from GNU-style long flags to POSIX-style short flags that work on both architectures.

### Before (Broken on ARM)
```dockerfile
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
```

### After (Works on Both)
```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nextjs
```

## Flag Explanation

| Flag | Meaning | Compatible |
|------|---------|------------|
| `-g 1001` | Set GID to 1001 | ✅ x86 & ARM |
| `-S` | Create system group/user | ✅ x86 & ARM |
| `-u 1001` | Set UID to 1001 | ✅ x86 & ARM |
| `-G nodejs` | Add user to nodejs group | ✅ x86 & ARM |
| `--system` | Create system group/user | ❌ ARM issues |
| `--gid` | Set GID | ❌ ARM issues |

## Why This Matters
Docker images built with the old syntax would:
- ✅ Build successfully on x86_64 (Intel/AMD PCs)
- ❌ Fail on ARM64 (Raspberry Pi 3/4/5 with 64-bit OS)
- ❌ Fail on ARM/v7 (Raspberry Pi with 32-bit OS)

This prevented deployment to Raspberry Pi even with correct platform settings.

## Files Changed
- `apps/portal/Dockerfile.monorepo` (line 52-54)

## Testing
The fix has been tested and confirmed working on:
- ✅ x86_64 (AMD64) - Local development machines
- ✅ ARM64 (AARCH64) - Raspberry Pi 4 with 64-bit OS
- ✅ Docker buildx cross-compilation

## Verification
After pulling the latest code, verify the fix is applied:

```bash
grep -A1 "addgroup" apps/portal/Dockerfile.monorepo
```

Expected output:
```
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nextjs
```

## Impact
This fix enables:
1. ✅ Building directly on Raspberry Pi
2. ✅ Cross-compiling from x86_64 for ARM64
3. ✅ Multi-platform Docker builds
4. ✅ Deployment to any ARM-based device running Alpine Linux

## Related Documentation
- `RASPBERRY-PI-TROUBLESHOOTING.md` - Full troubleshooting guide
- `CROSS-PLATFORM-DEPLOYMENT.md` - Multi-platform build guide
- `DOCKER-BUILD-FIX.md` - Original monorepo build fix

## Additional Notes
This issue affects any Alpine Linux-based Docker image that:
- Creates users/groups during build
- Targets multiple architectures (x86 + ARM)
- Uses GNU-style long flags (--system, --gid, etc.)

**Best Practice**: Always use POSIX-style short flags (`-S`, `-g`, `-u`) in Alpine Linux Dockerfiles for maximum compatibility.
