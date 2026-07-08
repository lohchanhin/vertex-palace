import { stat } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { ScanRepoInput, ScanRepoOutput } from "@context-palace/shared";
import { hashFile } from "./file-hash";
import { createIgnoreMatcher } from "./ignore-rules";
import { normalizeRelativePath, resolveRoot } from "../utils/path-utils";

export async function scanRepo(input: ScanRepoInput): Promise<ScanRepoOutput> {
  const root = resolveRoot(input.root);
  const palaceRoot = input.palaceRoot ?? ".palace";
  const isIgnored = await createIgnoreMatcher(root, [palaceRoot, `${palaceRoot}/**`]);
  const entries = await fg(["**/*"], {
    cwd: root,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    unique: true,
    suppressErrors: true,
    ignore: [".git/**", "node_modules/**", `${palaceRoot}/**`]
  });

  const files: ScanRepoOutput["files"] = [];
  const ignored: ScanRepoOutput["ignored"] = [];

  for (const entry of entries.map(normalizeRelativePath).sort()) {
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
