import path from "node:path";
import { readFile } from "node:fs/promises";
import type { PalaceConfig } from "@vertex-palace/shared";
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
  const defaults = createDefaultConfig(projectName, createdAt);
  return {
    ...defaults,
    updated_at: updatedAt,
    source_root: readYamlScalar(text, "source_root") ?? defaults.source_root,
    palace_root: readYamlScalar(text, "palace_root") ?? defaults.palace_root,
    ignore: readYamlList(text, "ignore") ?? defaults.ignore,
    floors: (readYamlList(text, "floors") as PalaceConfig["floors"] | undefined) ?? defaults.floors
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

function readYamlList(text: string, key: string): string[] | undefined {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `${key}:`);
  if (start < 0) return undefined;

  const values: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!/^\s+/.test(line)) break;
    const match = line.match(/^\s*-\s+(.+)\s*$/);
    if (!match) continue;
    const raw = match[1];
    try {
      values.push(JSON.parse(raw));
    } catch {
      values.push(raw);
    }
  }
  return values.length ? values : undefined;
}
