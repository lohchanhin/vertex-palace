import type { ParsedFile } from "@context-palace/shared";

export function parseJson(sourcePath: string, content: string): ParsedFile {
  try {
    const parsed = JSON.parse(content) as unknown;
    const keys = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.keys(parsed) : [];
    return {
      sourcePath,
      language: "json",
      imports: [],
      exports: [],
      symbols: keys.slice(0, 80).map((key, index) => ({
        name: key,
        kind: "const",
        startLine: findJsonKeyLine(content, key) ?? index + 1,
        endLine: findJsonKeyLine(content, key) ?? index + 1,
        signature: `"${key}"`
      })),
      summarySeed: keys.length ? `JSON keys: ${keys.slice(0, 24).join(", ")}` : "JSON document"
    };
  } catch {
    return {
      sourcePath,
      language: "json",
      imports: [],
      exports: [],
      symbols: [],
      summarySeed: "Invalid JSON parsed as fallback text."
    };
  }
}

function findJsonKeyLine(content: string, key: string): number | undefined {
  const pattern = new RegExp(`"${escapeRegExp(key)}"\\s*:`);
  const index = content.split(/\r?\n/).findIndex((line) => pattern.test(line));
  return index >= 0 ? index + 1 : undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
