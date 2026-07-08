import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export async function hashFile(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}
