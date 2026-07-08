import path from "node:path";
import type { DoctorOutput } from "@context-palace/shared";
import { configPath } from "../config/palace-config";
import { exists, readIndex } from "./read-palace";

export async function doctorPalace(root: string): Promise<DoctorOutput> {
  const issues: DoctorOutput["issues"] = [];
  if (!(await exists(configPath(root)))) {
    issues.push({ severity: "error", message: ".palace/palace.yml is missing.", fix: "Run palace init." });
    return { ok: false, issues };
  }

  const required = [
    ".palace/indexes/nodes.json",
    ".palace/indexes/edges.json",
    ".palace/indexes/rooms.json",
    ".palace/indexes/directory-tree.json",
    ".palace/indexes/symbols.json",
    ".palace/indexes/file-hashes.json"
  ];
  for (const file of required) {
    if (!(await exists(path.join(root, file)))) {
      issues.push({ severity: "warning", message: `${file} is missing.`, fix: "Run palace index." });
    }
  }

  const index = await readIndex(root);
  if (!index.nodes.length) {
    issues.push({ severity: "warning", message: "No nodes are indexed.", fix: "Run palace index." });
  }
  if (index.nodes.some((node) => node.sourcePath.includes(".env"))) {
    issues.push({ severity: "error", message: "Sensitive .env path appeared in nodes.", fix: "Remove the node and re-run palace index." });
  }

  return { ok: !issues.some((issue) => issue.severity === "error"), issues: issues.length ? issues : [{ severity: "info", message: "Context Palace looks healthy." }] };
}
