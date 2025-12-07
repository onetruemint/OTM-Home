import { promises as fs } from "fs";

/**
 * Memory optimization: Using async file operations to prevent blocking event loop
 */

export async function appendFileSync(file: string, data: string): Promise<void> {
  await fs.appendFile(file, data + "\n", "utf8");
}

export async function createDirectoriesSync(path: string): Promise<void> {
  await fs.mkdir(path, { recursive: true });
}

export async function readFileSync(file: string): Promise<string> {
  return await fs.readFile(file, "utf8");
}
