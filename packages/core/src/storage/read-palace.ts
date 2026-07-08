import { access, readFile } from "node:fs/promises";
import path from "node:path";
import type { PalaceEdge, PalaceIndex, PalaceNode, PalaceRoom, PalaceRoute } from "@vertex-palace/shared";

export async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson<T>(root: string, relativePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(root, relativePath), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function readIndex(root: string): Promise<PalaceIndex> {
  const nodes = await readJson<PalaceNode[]>(root, ".palace/indexes/nodes.json", []);
  const edges = await readJson<PalaceEdge[]>(root, ".palace/indexes/edges.json", []);
  const rooms = await readJson<PalaceRoom[]>(root, ".palace/indexes/rooms.json", []);
  const symbols = await readJson<PalaceNode[]>(root, ".palace/indexes/symbols.json", []);
  const directoryTree = await readJson(root, ".palace/indexes/directory-tree.json", { name: ".", path: ".", type: "directory" as const, children: [] });
  const fileHashes = await readJson<Record<string, string>>(root, ".palace/indexes/file-hashes.json", {});
  const routes = await readJson<PalaceRoute[]>(root, ".palace/indexes/routes.json", []);
  return { nodes, edges, rooms, symbols, directoryTree, fileHashes, routes };
}
