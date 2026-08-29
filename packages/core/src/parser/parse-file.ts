import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ParsedFile } from "@vertex-palace/shared";
import { parseFallback } from "./parse-fallback";
import { parseJson } from "./parse-json";
import { parseMarkdown } from "./parse-markdown";
import { parsePython } from "./parse-python";
import { parseTsJs } from "./parse-ts-js";
import { attachObjectMetadata } from "./attach-object-metadata";
import { binarySummary, isBinaryLikePath } from "../utils/binary-files";

export type ParseFileOptions = {
  roomInventory?: boolean;
};

export async function parseFile(
  root: string,
  sourcePath: string,
  language: string,
  size?: number,
  options: ParseFileOptions = {}
): Promise<ParsedFile> {
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
    let parsed: ParsedFile;
    if (language === "typescript" || language === "javascript") {
      parsed = parseTsJs(sourcePath, content, language);
    } else if (language === "markdown") {
      parsed = parseMarkdown(sourcePath, content);
    } else if (language === "json") {
      parsed = parseJson(sourcePath, content);
    } else if (language === "py" || language === "python") {
      parsed = parsePython(sourcePath, content);
    } else {
      parsed = parseFallback(sourcePath, language, content);
    }
    return options.roomInventory ? attachObjectMetadata(parsed, content) : parsed;
  } catch {
    const parsed = parseFallback(sourcePath, language, content);
    return options.roomInventory ? attachObjectMetadata(parsed, content) : parsed;
  }
}
