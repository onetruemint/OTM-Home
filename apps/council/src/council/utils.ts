import { type Logger } from "@otm/logger";
import { checkMemoryThresholds, MEMORY_LIMITS } from "@otm/utils";

export async function checkMemory(logger: Logger): Promise<MEMORY_LIMITS> {
  const memCheck = checkMemoryThresholds();
  if (!memCheck.withinLimits) {
    logger.warn("Memory limits exceeded, pausing to allow GC", {
      pauseDuration_ms: 30000,
    });
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Force GC if available
    if (global.gc) {
      logger.info("Running garbage collection");
      global.gc();
    }
    return MEMORY_LIMITS.OUT_OF_BOUNDS;
  }
  return MEMORY_LIMITS.IN_BOUNDS;
}
