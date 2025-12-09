/**
 * Memory monitoring utilities for tracking and reporting memory usage
 */

import { createLogger } from "@otm/logger";

const logger = createLogger({ serviceName: "memory-monitor" });

export interface MemoryStats {
  rss: number; // Resident Set Size - total memory allocated
  heapTotal: number; // Total size of the allocated heap
  heapUsed: number; // Actual memory used
  external: number; // Memory used by C++ objects bound to JavaScript
  arrayBuffers: number; // Memory used by ArrayBuffers and SharedArrayBuffers
  timestamp: Date;
}

export interface MemoryThresholds {
  heapUsedWarning: number; // Warning threshold in MB
  heapUsedCritical: number; // Critical threshold in MB
  rssWarning: number; // RSS warning threshold in MB
  rssCritical: number; // RSS critical threshold in MB
}

export enum MEMORY_LIMITS {
  IN_BOUNDS,
  OUT_OF_BOUNDS,
}

const DEFAULT_THRESHOLDS: MemoryThresholds = {
  heapUsedWarning: 400, // 400 MB
  heapUsedCritical: 700, // 700 MB
  rssWarning: 500, // 500 MB
  rssCritical: 900, // 900 MB
};

/**
 * Get current memory usage statistics
 */
export function getMemoryStats(): MemoryStats {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers,
    timestamp: new Date(),
  };
}

/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Convert bytes to megabytes
 */
export function bytesToMB(bytes: number): number {
  return bytes / 1024 / 1024;
}

/**
 * Log current memory usage
 */
export function logMemoryUsage(prefix = ""): void {
  const stats = getMemoryStats();

  logger.info(prefix || "Memory Usage", {
    rss_bytes: stats.rss,
    rss_mb: parseFloat(bytesToMB(stats.rss).toFixed(2)),
    heapTotal_bytes: stats.heapTotal,
    heapTotal_mb: parseFloat(bytesToMB(stats.heapTotal).toFixed(2)),
    heapUsed_bytes: stats.heapUsed,
    heapUsed_mb: parseFloat(bytesToMB(stats.heapUsed).toFixed(2)),
    external_bytes: stats.external,
    arrayBuffers_bytes: stats.arrayBuffers,
  });
}

/**
 * Check memory thresholds and log warnings
 */
export function checkMemoryThresholds(
  thresholds: MemoryThresholds = DEFAULT_THRESHOLDS,
): { withinLimits: boolean; warnings: string[] } {
  const stats = getMemoryStats();
  const warnings: string[] = [];
  let withinLimits = true;

  const heapUsedMB = bytesToMB(stats.heapUsed);
  const rssMB = bytesToMB(stats.rss);

  // Check heap used
  if (heapUsedMB >= thresholds.heapUsedCritical) {
    const message = "CRITICAL: Heap usage exceeds critical threshold";
    warnings.push(message);
    logger.error(message, {
      heapUsed_mb: parseFloat(heapUsedMB.toFixed(2)),
      critical_threshold_mb: thresholds.heapUsedCritical,
    });
    withinLimits = false;
  } else if (heapUsedMB >= thresholds.heapUsedWarning) {
    const message = "WARNING: Heap usage exceeds warning threshold";
    warnings.push(message);
    logger.warn(message, {
      heapUsed_mb: parseFloat(heapUsedMB.toFixed(2)),
      warning_threshold_mb: thresholds.heapUsedWarning,
    });
  }

  // Check RSS
  if (rssMB >= thresholds.rssCritical) {
    const message = "CRITICAL: RSS exceeds critical threshold";
    warnings.push(message);
    logger.error(message, {
      rss_mb: parseFloat(rssMB.toFixed(2)),
      critical_threshold_mb: thresholds.rssCritical,
    });
    withinLimits = false;
  } else if (rssMB >= thresholds.rssWarning) {
    const message = "WARNING: RSS exceeds warning threshold";
    warnings.push(message);
    logger.warn(message, {
      rss_mb: parseFloat(rssMB.toFixed(2)),
      warning_threshold_mb: thresholds.rssWarning,
    });
  }

  return { withinLimits, warnings };
}

/**
 * Start periodic memory monitoring
 */
export function startMemoryMonitoring(
  intervalMs = 60000, // 1 minute default
  thresholds: MemoryThresholds = DEFAULT_THRESHOLDS,
): NodeJS.Timeout {
  logger.info("Starting memory monitoring", { interval_ms: intervalMs });

  const interval = setInterval(() => {
    checkMemoryThresholds(thresholds);
  }, intervalMs);

  // Don't prevent process from exiting
  interval.unref();

  return interval;
}

/**
 * Force garbage collection if available (requires --expose-gc flag)
 */
export function triggerGC(): boolean {
  if (global.gc) {
    logger.info("Triggering garbage collection");
    global.gc();
    return true;
  } else {
    logger.warn("Garbage collection not available", {
      note: "Run node with --expose-gc flag",
    });
    return false;
  }
}
