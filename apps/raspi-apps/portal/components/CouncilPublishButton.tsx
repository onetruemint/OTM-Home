import { useState } from "react";
import { createLogger } from "../lib/logger";

const logger = createLogger({ serviceName: "council-publish-button" });

interface CouncilPublishButtonProps {
  prompt: string;
  discussionTimeMs?: number;
  onPublishSuccess?: () => void;
  onPublishError?: (error: Error) => void;
}

export function CouncilPublishButton({
  prompt,
  discussionTimeMs,
  onPublishSuccess,
  onPublishError
}: CouncilPublishButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePublish = async () => {
    if (!prompt.trim()) {
      return;
    }

    setLoading(true);
    try {
      const payload: { prompt: string; discussionTimeMs?: number } = {
        prompt: prompt,
      };

      if (discussionTimeMs !== undefined && discussionTimeMs > 0) {
        payload.discussionTimeMs = discussionTimeMs;
      }

      const response = await fetch("/api/kafka", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        logger.info("Message published successfully");
        onPublishSuccess?.();
      } else {
        const error = new Error("Failed to publish message");
        logger.error("Failed to publish message", error);
        onPublishError?.(error);
      }
    } catch (error) {
      logger.error("Failed to publish", error as Error);
      onPublishError?.(error as Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handlePublish} disabled={loading || !prompt.trim()}>
      {loading ? "Publishing..." : "Publish Prompt"}
    </button>
  );
}
