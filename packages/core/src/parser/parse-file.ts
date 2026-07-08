import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ParsedFile } from "@vertex-palace/shared";
import { parseFallback } from "./parse-fallback";
import { parseJson } from "./parse-json";
import { parseMarkdown } from "./parse-markdown";
import { parseTsJs } from "./parse-ts-js";

export async function parseFile(root: string, sourcePath: string, language: string): Promise<ParsedFile> {
  const absolute = path.join(root, sourcePath);
  const content = await readFile(absolute, "utf8");

  try {
    if (language === "typescript" || language === "javascript") {
      return parseTsJs(sourcePath, content, language);
    }
    if (language === "markdown") {
      return parseMarkdown(sourcePath, content);
    }
    if (language === "json") {
      return parseJson(sourcePath, content);
    }
    return parseFallback(sourcePath, language, content);
  } catch {
    return parseFallback(sourcePath, language, content);
  }
}
