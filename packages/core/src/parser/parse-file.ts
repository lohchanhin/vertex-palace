import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ParsedFile } from "@vertex-palace/shared";
import { parseFallback } from "./parse-fallback";
import { parseJson } from "./parse-json";
import { parseMarkdown } from "./parse-markdown";
import { parsePython } from "./parse-python";
import { parseTsJs } from "./parse-ts-js";
import { binarySummary, isBinaryLikePath } from "../utils/binary-files";

export async function parseFile(root: string, sourcePath: string, language: string, size?: number): Promise<ParsedFile> {
  if (isBinaryLikePath(sourcePath, language)) {
    return {
      sourcePath,
      language,
      imports: [],
      exports: [],
      symbols: [],
      summarySeed: binarySummary(sourcePath, language, size)
    };
  }

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
    if (language === "py" || language === "python") {
      return parsePython(sourcePath, content);
    }
    return parseFallback(sourcePath, language, content);
  } catch {
    return parseFallback(sourcePath, language, content);
  }
}
