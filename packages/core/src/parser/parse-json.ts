import type { ParsedFile } from "@vertex-palace/shared";

export function parseJson(sourcePath: string, content: string): ParsedFile {
  try {
    const parsed = JSON.parse(content) as unknown;
    const keys = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.keys(parsed) : [];
    const packageMetadata = packageMetadataFor(sourcePath, parsed);
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
      ...(packageMetadata ? { packageMetadata } : {}),
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

function packageMetadataFor(sourcePath: string, value: unknown): ParsedFile["packageMetadata"] {
  if (!/(^|\/)package\.json$/i.test(sourcePath) || !isRecord(value) || typeof value.name !== "string") {
    return undefined;
  }
  const entryPoints = [value.source, value.module, value.main, ...collectExportTargets(value.exports)]
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.replace(/^\.\//, ""));
  return {
    name: value.name,
    entryPoints: [...new Set(entryPoints)]
  };
}

function collectExportTargets(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectExportTargets);
  if (!isRecord(value)) return [];
  return Object.values(value).flatMap(collectExportTargets);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function findJsonKeyLine(content: string, key: string): number | undefined {
  const pattern = new RegExp(`"${escapeRegExp(key)}"\\s*:`);
  const index = content.split(/\r?\n/).findIndex((line) => pattern.test(line));
  return index >= 0 ? index + 1 : undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
