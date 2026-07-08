import path from "node:path";
import type { PalaceStatus } from "@vertex-palace/shared";
import { configPath } from "../config/palace-config";
import { scanRepo } from "../scanner/scan-repo";
import { exists, readIndex, readJson } from "./read-palace";

export async function getPalaceStatus(root: string): Promise<PalaceStatus> {
  const palaceRoot = path.join(root, ".palace");
  const initialized = await exists(configPath(root));
  const index = initialized ? await readIndex(root) : undefined;
  const indexed = !!index?.nodes.length;
  let stale = initialized && !indexed;

  if (initialized && indexed && index) {
    const scan = await scanRepo({ root, includeHidden: true });
    const nextHashes = Object.fromEntries(scan.files.map((file) => [file.path, file.hash]));
    stale =
      Object.keys(nextHashes).length !== Object.keys(index.fileHashes).length ||
      Object.entries(nextHashes).some(([filePath, hash]) => index.fileHashes[filePath] !== hash);
  }

  const lastIndex = await readJson<{ indexedAt?: string }>(root, ".palace/cache/last-index.json", {});
  return {
    root,
    palaceRoot,
    initialized,
    indexed,
    stale,
    nodeCount: index?.nodes.length ?? 0,
    edgeCount: index?.edges.length ?? 0,
    roomCount: index?.rooms.length ?? 0,
    lastIndexedAt: lastIndex.indexedAt,
    configPath: initialized ? configPath(root) : undefined
  };
}
