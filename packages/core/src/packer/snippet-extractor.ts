import { readFile } from "node:fs/promises";
import path from "node:path";
import type { LoadLevel, PalaceNode } from "@vertex-palace/shared";

export async function extractNodeContent(root: string, node: PalaceNode, loadLevel: LoadLevel): Promise<string> {
  if (loadLevel === "defer") return "";
  if (loadLevel === "summary") return node.summary;
  if (loadLevel === "signature") return node.lod.level4 ?? node.summary;

  const absolute = path.join(root, node.sourcePath);
  const content = await readFile(absolute, "utf8");
  if (loadLevel === "full_file" || !node.startLine) return content;

  const lines = content.split(/\r?\n/);
  const context = loadLevel === "snippet" ? 4 : 0;
  const start = Math.max(1, (node.startLine ?? 1) - context);
  const end = Math.min(lines.length, (node.endLine ?? node.startLine ?? lines.length) + context);
  return lines.slice(start - 1, end).join("\n");
}

export function languageFence(node: PalaceNode): string {
  switch (node.language) {
    case "typescript":
      return node.sourcePath.endsWith(".tsx") ? "tsx" : "ts";
    case "javascript":
      return node.sourcePath.endsWith(".jsx") ? "jsx" : "js";
    case "markdown":
      return "md";
    case "json":
      return "json";
    default:
      return "";
  }
}
