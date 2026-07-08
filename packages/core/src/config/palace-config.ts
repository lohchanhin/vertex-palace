import path from "node:path";
import { readFile } from "node:fs/promises";
import type { PalaceConfig } from "@context-palace/shared";
import { createDefaultConfig } from "./defaults";

export function configPath(root: string): string {
  return path.join(root, ".palace", "palace.yml");
}

export function writeConfigYaml(config: PalaceConfig): string {
  const ignore = config.ignore.map((item) => `  - ${JSON.stringify(item)}`).join("\n");
  const floors = config.floors.map((item) => `  - ${item}`).join("\n");
  return [
    `schema_version: ${config.schema_version}`,
    `project_name: ${JSON.stringify(config.project_name)}`,
    `created_at: ${JSON.stringify(config.created_at)}`,
    `updated_at: ${JSON.stringify(config.updated_at)}`,
    "",
    `source_root: ${JSON.stringify(config.source_root)}`,
    `palace_root: ${JSON.stringify(config.palace_root)}`,
    "",
    "ignore:",
    ignore,
    "",
    "language:",
    `  primary: ${JSON.stringify(config.language.primary)}`,
    "  parsers:",
    `    typescript: ${config.language.parsers.typescript}`,
    `    javascript: ${config.language.parsers.javascript}`,
    `    markdown: ${config.language.parsers.markdown}`,
    `    json: ${config.language.parsers.json}`,
    `    fallback: ${config.language.parsers.fallback}`,
    "",
    "floors:",
    floors,
    ""
  ].join("\n");
}

export async function readPalaceConfig(root: string): Promise<PalaceConfig> {
  const text = await readFile(configPath(root), "utf8");
  const projectName = readYamlScalar(text, "project_name") ?? path.basename(root);
  const createdAt = readYamlScalar(text, "created_at") ?? new Date().toISOString();
  const updatedAt = readYamlScalar(text, "updated_at") ?? createdAt;
  return {
    ...createDefaultConfig(projectName, createdAt),
    updated_at: updatedAt
  };
}

function readYamlScalar(text: string, key: string): string | undefined {
  const line = text.split(/\r?\n/).find((candidate) => candidate.startsWith(`${key}:`));
  if (!line) return undefined;
  const raw = line.slice(key.length + 1).trim();
  try {
    return JSON.parse(raw);
  } catch {
    return raw || undefined;
  }
}
