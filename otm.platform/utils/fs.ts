import * as fs from "fs";

export async function appendFileSync(file: string, data: string) {
  fs.appendFileSync(file, data + "\n");
}

export async function createDirectoriesSync(path: string): Promise<void> {
  fs.mkdirSync(path, { recursive: true });
}

export async function readFileSync(file: string) {
  return fs.readFileSync(file, "utf8");
}
