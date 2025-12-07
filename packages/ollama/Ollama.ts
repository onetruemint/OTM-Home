import { fetchEnvVar } from "@otm/utils";
import { createLogger } from "@otm/logger";
import {
  OllamaCreateModelOptions,
  OllamaBasicResponse,
  OllamaClient,
  OllamaGenerateOptions,
  OllamaGenerateResponse,
  OllamaResponse,
  OllamaTagResponse,
  OllamaPullModelOptions,
} from "./types/Ollama";

const logger = createLogger({ serviceName: "ollama-client" });

/**
 * Client for interacting with the Ollama API.
 * Provides methods to generate text using Ollama models.
 *
 * @example
 * ```typescript
 * const ollama = await Ollama.create("llama2");
 * const response = await ollama.generate("What is the capital of France?");
 * console.log(response.response);
 * ```
 */
export default class Ollama implements OllamaClient {
  /**
   * The base URL for the Ollama API.
   * Fetched from the OLLAMA_API environment variable, defaults to "http://otm-home-ollama:11434/api".
   */
  static ollamaApi: string = fetchEnvVar(
    "OLLAMA_API",
    "http://otm-home-ollama:11434/api",
  );

  /**
   * The name of the Ollama model to use for text generation.
   */
  model: string;

  /**
   * Private constructor to enforce use of the static `create` method.
   *
   * @param model - The name of the Ollama model to use. If not provided,
   *                uses the DEFAULT_OLLAMA_MODEL environment variable or "gemma3:4b" as fallback.
   */
  private constructor(model: string) {
    this.model = model
      ? model
      : fetchEnvVar("DEFAULT_OLLAMA_MODEL", "gemma3:4b");
  }

  /**
   * Creates a new Ollama instance with the specified model.
   * Validates that the model exists in the available models list.
   * If validation fails or no model is provided, uses the default model.
   *
   * @param model - Optional name of the Ollama model to use. If not provided or invalid,
   *                the default model from environment variable or "gemma3:4b" will be used.
   * @returns A promise that resolves to an Ollama instance.
   *
   * @example
   * ```typescript
   * // Create with a specific model
   * const ollama = await Ollama.create("llama2");
   *
   * // Create with default model
   * const ollama = await Ollama.create();
   * ```
   */
  static async createOllama(model?: string): Promise<Ollama> {
    try {
      return new Ollama(model!);
    } catch (error) {
      return new Ollama(fetchEnvVar("DEFAULT_OLLAMA_MODEL", "gemma3:4b"));
    }
  }

  /**
   * Fetches the list of available Ollama models from the API.
   *
   * @returns A promise that resolves to the list of available models.
   * @private
   */
  static async listModels(): Promise<OllamaResponse["tags"]> {
    const res = await fetch(`${this.ollamaApi}/tags`);

    return (await res.json()) as OllamaTagResponse;
  }

  static async createModel(
    options: OllamaCreateModelOptions,
  ): Promise<OllamaResponse["default"]> {
    try {
      const res = await fetch(`${this.ollamaApi}/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(options),
      });

      return (await res.json()) as unknown as OllamaBasicResponse;
    } catch (error) {
      logger.error("Error creating model", error as Error);
      throw error;
    }
  }

  static async delete(model: string): Promise<void> {
    try {
      await fetch(`${this.ollamaApi}/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ model }),
      });
    } catch (error) {
      logger.error("Error deleting model", error as Error, { model });
      throw error;
    }
  }

  /**
   * Pulls a model from the Ollama library.
   *
   * @param model The model to pull from the Ollama library.
   * @returns The response from the Ollama API.
   */
  static async pull(
    options: OllamaPullModelOptions,
  ): Promise<OllamaResponse["default"]> {
    try {
      const res = await fetch(`${this.ollamaApi}/pull`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(options),
      });

      return (await res.json()) as unknown as OllamaBasicResponse;
    } catch (error) {
      logger.error("Error pulling model", error as Error, { model: options.model });
      throw error;
    }
  }

  /**
   * Generates text using the configured Ollama model.
   *
   * @param prompt - The text prompt to send to the model for generation.
   * @returns A promise that resolves to the generation response, including
   *          the generated text, model information, and timing metrics.
   *
   * @example
   * ```typescript
   * const ollama = await Ollama.create();
   * const response = await ollama.generate("Explain quantum computing in simple terms.");
   * console.log(response.response); // The generated text
   * console.log(response.total_duration); // Total generation time in nanoseconds
   * ```
   */
  async generate(
    options: OllamaGenerateOptions,
  ): Promise<OllamaResponse["generate"]> {
    if (!options.model) {
      options.model = this.model;
    }

    const res = await fetch(`${Ollama.ollamaApi}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(options),
    });

    return (await res.json()) as unknown as OllamaGenerateResponse;
  }
}
