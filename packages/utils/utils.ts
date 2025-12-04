import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: `${__dirname}/../../.env` });

/**
 * Fetches a Node environment variable
 * @param variable The variable to look for
 * @param defaultValue A default value if the variable is not set
 * @returns The variable if it exists
 */
export function fetchEnvVar<T extends string, D extends T = T>(
  variable: string,
  defaultValue: D | null = null,
): T {
  if (!process.env[variable]) {
    if (defaultValue) {
      return defaultValue;
    }
    throw new Error(`Environment Variable not set: ${variable}`);
  }
  return process.env[variable] as T;
}

export function getDirname(urlPath: string): string {
  const filename = fileURLToPath(urlPath);
  return path.dirname(filename);
}

export function stripMarkdownArtifacts(input: string): string {
  if (typeof input !== "string") return input;

  return (
    input
      // Remove code blocks ```...```
      .replace(/```[\s\S]*?```/g, "")
      // Remove inline code `...`
      .replace(/`([^`]*)`/g, "$1")
      // Remove bold/italic markers (**text**, *text*, __text__, _text_)
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(\*|_)(.*?)\1/g, "$2")
      // Remove markdown links [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove images ![alt](url)
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      // Remove headers (##, ###, etc.)
      .replace(/(^|\n)#+\s*(.*)/g, "$2")
      // Remove blockquotes >
      .replace(/(^|\n)>\s*/g, "")
      // Remove lists (-, *, +, or numbers)
      .replace(/(^|\n)(\s*[-*+]\s+)/g, "\n")
      .replace(/(^|\n)\s*\d+\.\s+/g, "\n")
      // Remove horizontal rules (---, ***, ___)
      .replace(/(^|\n)(---|\*\*\*|___)\s*(\n|$)/g, "\n")
      // Normalize whitespace and remove newlines
      .replace(/\n+/g, " ")
      .replace(/\r/g, "")
      // Remove smart quotes and other odd punctuation
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      // Collapse multiple spaces
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}
