import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PalaceIndex, PalaceRoute } from "@vertex-palace/shared";
import { stableJson } from "../utils/stable-json";

export async function writeJson(root: string, relativePath: string, value: unknown): Promise<string> {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, stableJson(value), "utf8");
  return target;
}

export async function writeIndex(root: string, index: PalaceIndex): Promise<void> {
  await writeJson(root, ".palace/indexes/directory-tree.json", index.directoryTree);
  await writeJson(root, ".palace/indexes/nodes.json", index.nodes);
  await writeJson(root, ".palace/indexes/edges.json", index.edges);
  await writeJson(root, ".palace/indexes/rooms.json", index.rooms);
  await writeJson(root, ".palace/indexes/symbols.json", index.symbols);
  await writeJson(root, ".palace/indexes/routes.json", index.routes);
  await writeJson(root, ".palace/indexes/file-hashes.json", index.fileHashes);
  await writeJson(root, ".palace/cache/last-index.json", {
    indexedAt: new Date().toISOString(),
    nodeCount: index.nodes.length,
    edgeCount: index.edges.length,
    roomCount: index.rooms.length
  });
}

export async function appendRoute(root: string, routes: PalaceRoute[], route: PalaceRoute): Promise<void> {
  const next = [route, ...routes.filter((item) => item.id !== route.id)].slice(0, 100);
  await writeJson(root, ".palace/indexes/routes.json", next);
  await writeJson(root, `.palace/routes/${route.id}.json`, route);
  await writeJson(root, ".palace/routes/latest-route.json", route);
  await writeFile(path.join(root, ".palace", "routes", "latest-route.md"), renderRouteMarkdown(route), "utf8");
  await writeFile(path.join(root, ".palace", "routes", "optimized-route.txt"), renderOptimizedRoute(route), "utf8");
  await appendFile(path.join(root, ".palace", "routes", "route-log.md"), renderRouteLogEntry(route), "utf8");
}

function renderRouteMarkdown(route: PalaceRoute): string {
  const lines = [
    `# Latest Route`,
    "",
    `Task: ${route.task}`,
    `Type: ${route.taskType}`,
    `Confidence: ${route.confidence}`,
    `Created: ${route.createdAt}`,
    `Entry: ${route.entry.floor}/${route.entry.wing ?? "unknown"}/${route.entry.room ?? "general"}`,
    `Entrance pitfall board: .palace/00-entrance/pitfall-board.md`,
    "",
    "## Read First",
    ...route.route.map((step, index) => `${index + 1}. ${step.sourcePath}\n   Reason: ${step.reason}\n   Load: ${step.loadLevel}`),
    "",
    "## Excluded",
    ...(route.excluded.length ? route.excluded.map((item) => `- ${item.sourcePath}: ${item.reason}`) : ["- None"]),
    ""
  ];
  return lines.join("\n");
}

function renderOptimizedRoute(route: PalaceRoute): string {
  return [
    `Task: ${route.task}`,
    `Task type: ${route.taskType}`,
    `Confidence: ${route.confidence}`,
    `Entry: ${route.entry.floor}/${route.entry.wing ?? "unknown"}/${route.entry.room ?? "general"}`,
    `Entrance pitfall board: .palace/00-entrance/pitfall-board.md`,
    "",
    ...route.route.map((step, index) => `${index + 1}. ${step.sourcePath} [${step.loadLevel}] - ${step.reason}`),
    ""
  ].join("\n");
}

function renderRouteLogEntry(route: PalaceRoute): string {
  return [`## ${route.createdAt} - ${route.taskType}`, "", `Task: ${route.task}`, `Route: ${route.id}`, `Confidence: ${route.confidence}`, ""].join("\n");
}
