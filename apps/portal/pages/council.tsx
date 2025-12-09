import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import { CouncilPublishButton } from "../components/CouncilPublishButton";
import styles from "../styles/Council.module.css";
import { createLogger } from "../lib/logger";

const logger = createLogger({ serviceName: "council-page" });

enum PromptStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  CACHED = "CACHED",
}

interface CouncilPrompt {
  _id: string;
  prompt: string;
  answer: string;
  status: PromptStatus;
  createdAt: Date;
  updatedAt: Date;
  processingTimeMs?: number;
  discussionTimeMs?: number;
  votes?: number;
}

interface PromptsResponse {
  prompts: CouncilPrompt[];
  limit: number;
  offset: number;
}

export default function Council() {
  const [prompt, setPrompt] = useState("");
  const [prompts, setPrompts] = useState<CouncilPrompt[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [discussionTimeMinutes, setDiscussionTimeMinutes] = useState<number>(7);

  // Use ref to avoid stale closure in EventSource handler
  const fetchPromptsRef = useRef<() => Promise<void>>(undefined);

  const fetchPrompts = useCallback(async () => {
    logger.debug("fetchPrompts called");
    setLoading(true);
    try {
      const response = await fetch(`/api/council/prompts?limit=50`);

      if (response.ok) {
        const data: PromptsResponse = await response.json();
        logger.debug("Fetched prompts", { count: data.prompts.length });
        setPrompts(data.prompts);
      } else {
        logger.error("Failed to fetch prompts", { status: response.status });
      }
    } catch (error) {
      logger.error("Error fetching prompts", error as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromptsRef.current = fetchPrompts;
  }, [fetchPrompts]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  useEffect(() => {
    // Set up EventSource for real-time notifications
    logger.info("Setting up EventSource for notifications");
    const eventSource = new EventSource("/api/council/notifications");

    eventSource.onopen = () => {
      setIsConnected(true);
      logger.info("Connected to council notifications");
    };

    eventSource.onmessage = (event) => {
      logger.debug("SSE event received", { data: event.data });

      try {
        const notification = JSON.parse(event.data);
        logger.debug("Parsed notification", { type: notification.type });

        if (notification.type === "statusChanged") {
          // Update the prompt status in real-time
          const statusData = notification.data;
          logger.debug("Status changed", { id: statusData.id, status: statusData.status });

          setPrompts((prevPrompts) => {
            // Check if prompt exists
            const existingIndex = prevPrompts.findIndex(
              (p) => p._id === statusData.id
            );

            if (existingIndex >= 0) {
              // Update existing prompt
              const updatedPrompts = [...prevPrompts];
              const prevPrompt = updatedPrompts[existingIndex] as CouncilPrompt;
              updatedPrompts[existingIndex] = {
                ...prevPrompt,
                _id: prevPrompt?._id || '0',
                discussionTimeMs: prevPrompt?.discussionTimeMs || 0,
                votes: prevPrompt?.votes || 0,
                status: statusData.status,
                answer: statusData.answer || updatedPrompts[existingIndex]?.answer || '',
                processingTimeMs: statusData.processingTimeMs,
                updatedAt: statusData.updatedAt,
              };
              return updatedPrompts;
            } else {
              // New prompt, add it to the beginning
              return [
                {
                  _id: statusData.id,
                  prompt: statusData.prompt,
                  answer: statusData.answer || "",
                  status: statusData.status,
                  createdAt: statusData.createdAt,
                  updatedAt: statusData.updatedAt,
                  processingTimeMs: statusData.processingTimeMs,
                },
                ...prevPrompts,
              ];
            }
          });
        } else if (notification.type === "saved") {
          // Refresh all prompts when a response is saved
          logger.info("Response saved, refreshing prompts");
          fetchPromptsRef.current?.();
        }
      } catch (error) {
        logger.error("Error parsing notification", error as Error, { data: event.data });
      }
    };

    eventSource.onerror = (error) => {
      setIsConnected(false);
      logger.error("EventSource error", { readyState: eventSource.readyState });
    };

    return () => {
      logger.debug("Closing EventSource");
      eventSource.close();
    };
  }, []);

  const handlePublishSuccess = () => {
    logger.info("Prompt published successfully");
    setPrompt("");
  };

  const handlePublishError = (error: Error) => {
    logger.error("Error publishing prompt", error);
    alert("Failed to publish prompt. Please try again.");
  };

  const getStatusBadgeClass = (status: PromptStatus) => {
    switch (status) {
      case PromptStatus.PENDING:
        return styles.statusPending;
      case PromptStatus.PROCESSING:
        return styles.statusProcessing;
      case PromptStatus.COMPLETED:
        return styles.statusCompleted;
      case PromptStatus.CACHED:
        return styles.statusCached;
      default:
        return "";
    }
  };

  const getStatusLabel = (status: PromptStatus) => {
    switch (status) {
      case PromptStatus.PENDING:
        return "⏳ Pending";
      case PromptStatus.PROCESSING:
        return "⚙️ Processing";
      case PromptStatus.COMPLETED:
        return "✅ Completed";
      case PromptStatus.CACHED:
        return "💾 Cached";
      default:
        return status;
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Council - OTM Portal</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Council Prompt Interface</h1>

        <div className={styles.statusBar}>
          <span
            className={isConnected ? styles.connected : styles.disconnected}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className={styles.inputSection}>
          <label htmlFor="prompt" className={styles.label}>
            Enter your prompt:
          </label>
          <textarea
            id="prompt"
            className={styles.textarea}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your prompt here..."
            rows={5}
          />
          <div className={styles.discussionTimeSection}>
            <label htmlFor="discussionTime" className={styles.label}>
              Discussion Time (minutes):
            </label>
            <input
              id="discussionTime"
              type="number"
              className={styles.numberInput}
              value={discussionTimeMinutes}
              onChange={(e) => setDiscussionTimeMinutes(Number(e.target.value))}
              min={1}
              max={60}
            />
            <span className={styles.hint}>Default: 7 minutes</span>
          </div>
          <CouncilPublishButton
            prompt={prompt}
            discussionTimeMs={discussionTimeMinutes * 60 * 1000}
            onPublishSuccess={handlePublishSuccess}
            onPublishError={handlePublishError}
          />
        </div>

        <div className={styles.responsesSection}>
          <div className={styles.responsesHeader}>
            <h2 className={styles.subtitle}>Prompts ({prompts.length} total)</h2>
            {loading && (
              <span className={styles.loadingIndicator}>Loading...</span>
            )}
          </div>

          {prompts.length === 0 ? (
            <p className={styles.noResponses}>
              {loading
                ? "Loading prompts..."
                : "No prompts yet. Publish a prompt to get started."}
            </p>
          ) : (
            <div className={styles.responsesList}>
              {prompts.map((promptItem) => (
                <div
                  key={promptItem._id}
                  className={`${styles.responseCard} ${
                    promptItem.status === PromptStatus.PROCESSING
                      ? styles.processing
                      : ""
                  }`}
                >
                  <div className={styles.responseHeader}>
                    <span
                      className={`${styles.statusBadge} ${getStatusBadgeClass(promptItem.status)}`}
                    >
                      {getStatusLabel(promptItem.status)}
                    </span>
                    <span className={styles.timestamp}>
                      {new Date(promptItem.createdAt).toLocaleString()}
                    </span>
                    {promptItem.processingTimeMs !== undefined &&
                      promptItem.processingTimeMs > 0 && (
                        <span className={styles.processingTime}>
                          {(promptItem.processingTimeMs / 1000).toFixed(2)}s
                        </span>
                      )}
                  </div>
                  <div className={styles.promptSection}>
                    <strong>Prompt:</strong> {promptItem.prompt}
                  </div>
                  {promptItem.answer && (
                    <div className={styles.answerSection}>
                      <strong>Answer:</strong>
                      <pre className={styles.responseContent}>
                        {promptItem.answer}
                      </pre>
                    </div>
                  )}
                  {promptItem.status === PromptStatus.PENDING && (
                    <div className={styles.waitingMessage}>
                      Waiting in queue...
                    </div>
                  )}
                  {promptItem.status === PromptStatus.PROCESSING && (
                    <div className={styles.processingMessage}>
                      <span className={styles.spinner}></span>
                      Council is deliberating...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
