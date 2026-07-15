import { stat } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { ScanRepoInput, ScanRepoOutput } from "@vertex-palace/shared";
import { hashFile } from "./file-hash";
import { createIgnoreMatcher, defaultIgnorePatterns } from "./ignore-rules";
import { normalizeRelativePath, resolveRoot } from "../utils/path-utils";
import { readPalaceConfig } from "../config/palace-config";

export async function scanRepo(input: ScanRepoInput): Promise<ScanRepoOutput> {
  const root = resolveRoot(input.root);
  const config = await readConfigIfPresent(root);
  const palaceRoot = input.palaceRoot ?? config?.palace_root ?? ".palace";
  const configuredIgnore = [...defaultIgnorePatterns(), ...(config?.ignore ?? []), palaceRoot, `${palaceRoot}/**`];
  const isIgnored = await createIgnoreMatcher(root, configuredIgnore);
  const discoveryIgnore = expandGlobIgnorePatterns(configuredIgnore.filter((pattern) => !isGitMarkerPattern(pattern)));
  const nestedRepoMarkers = await fg(["**/.git"], {
    cwd: root,
    dot: true,
    onlyFiles: false,
    followSymbolicLinks: false,
    unique: true,
    suppressErrors: true,
    ignore: discoveryIgnore
  });
  const nestedRepoRoots = findNestedRepoRoots(nestedRepoMarkers.map(normalizeRelativePath));
  const globIgnore = expandGlobIgnorePatterns(configuredIgnore);
  const entries = await fg(["**/*"], {
    cwd: root,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    unique: true,
    suppressErrors: true,
    ignore: [...globIgnore, ...nestedRepoRoots.flatMap((repoRoot) => [repoRoot, `${repoRoot}/**`])]
  });

  const normalizedEntries = entries.map(normalizeRelativePath).sort();
  const files: ScanRepoOutput["files"] = [];
  const ignored: ScanRepoOutput["ignored"] = nestedRepoRoots.map((repoRoot) => ({ path: repoRoot, reason: `nested repository: ${repoRoot}` }));

  for (const entry of normalizedEntries) {
    if (!input.includeHidden && entry.split("/").some((part) => part.startsWith(".") && part !== ".")) {
      if (isSensitiveOrBuildPath(entry)) ignored.push({ path: entry, reason: "hidden or default ignored path" });
      continue;
    }

    if (isIgnored(entry) || isSensitiveOrBuildPath(entry)) {
      ignored.push({ path: entry, reason: "matched ignore rules" });
      continue;
    }

    const absolute = path.join(root, entry);
    const info = await stat(absolute);
    files.push({
      path: entry,
      size: info.size,
      hash: await hashFile(absolute),
      language: detectLanguage(entry)
    });
  }

  return { root, files, ignored };
}

async function readConfigIfPresent(root: string) {
  try {
    return await readPalaceConfig(root);
  } catch {
    return undefined;
  }
}

function findNestedRepoRoots(entries: string[]): string[] {
  const roots = new Set<string>();
  for (const entry of entries) {
    const parts = entry.split("/");
    const gitIndex = parts.indexOf(".git");
    if (gitIndex > 0) roots.add(parts.slice(0, gitIndex).join("/"));
  }
  return [...roots].sort((a, b) => a.length - b.length || a.localeCompare(b));
}

function expandGlobIgnorePatterns(patterns: string[]): string[] {
  return [
    ...new Set(
      patterns
        .filter((pattern) => pattern && !pattern.startsWith("!"))
        .flatMap((pattern) => {
          const normalized = normalizeRelativePath(pattern).replace(/^\//, "");
          return normalized.startsWith("**/") ? [normalized] : [normalized, `**/${normalized}`];
        })
    )
  ];
}

function isGitMarkerPattern(pattern: string): boolean {
  const normalized = normalizeRelativePath(pattern).replace(/^\*\*\//, "");
  return normalized === ".git" || normalized.startsWith(".git/");
}

export function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".ts" || ext === ".tsx") return "typescript";
  if (ext === ".js" || ext === ".jsx" || ext === ".mjs" || ext === ".cjs") return "javascript";
  if (ext === ".md" || ext === ".mdx") return "markdown";
  if (ext === ".json") return "json";
  if (ext === ".yml" || ext === ".yaml") return "yaml";
  return ext.replace(/^\./, "") || "text";
}

function isSensitiveOrBuildPath(filePath: string): boolean {
  const normalized = normalizeRelativePath(filePath);
  const parts = normalized.split("/");
  const base = parts.at(-1) ?? normalized;
  return (
    parts.includes(".git") ||
    parts.includes("node_modules") ||
    parts.includes(".palace") ||
    parts.includes("dist") ||
    parts.includes("build") ||
    parts.includes("coverage") ||
    parts.includes(".next") ||
    parts.includes(".turbo") ||
    parts.includes(".cache") ||
    base === ".env" ||
    base.startsWith(".env.") ||
    /\.(pem|key|cert|p12|pfx|log|sqlite|db)$/i.test(base) ||
    base === "id_rsa" ||
    base === "id_ed25519"
  );
}
