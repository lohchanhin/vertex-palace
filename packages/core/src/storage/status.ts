import path from "node:path";
import type { PalaceStatus } from "@vertex-palace/shared";
import { configPath } from "../config/palace-config";
import { hashFile } from "../scanner/file-hash";
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
    await appendIndexedGeneratedArtifactHashes(root, index, nextHashes);
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
    factCount: index?.facts.length ?? 0,
    roomCount: index?.rooms.length ?? 0,
    lastIndexedAt: lastIndex.indexedAt,
    configPath: initialized ? configPath(root) : undefined
  };
}

async function appendIndexedGeneratedArtifactHashes(
  root: string,
  index: NonNullable<Awaited<ReturnType<typeof readIndex>>>,
  hashes: Record<string, string>
): Promise<void> {
  const generatedPaths = new Set(
    index.nodes
      .filter((node) => node.tags.includes("generated-artifact"))
      .map((node) => node.sourcePath)
  );
  for (const sourcePath of generatedPaths) {
    if (Object.prototype.hasOwnProperty.call(hashes, sourcePath)) continue;
    const absolute = path.resolve(root, sourcePath);
    const relative = path.relative(root, absolute);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) continue;
    try {
      hashes[sourcePath] = await hashFile(absolute);
    } catch {
      // A removed generated artifact makes the stored hash count differ and the index stale.
    }
  }
}
