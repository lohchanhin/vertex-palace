import path from "node:path";
import type { IndexPalaceOutput, PalaceIndex } from "@context-palace/shared";
import { scanRepo } from "../scanner/scan-repo";
import { parseFile } from "../parser/parse-file";
import { buildDirectoryMap } from "./build-directory-map";
import { buildNodes, type ParsedFileWithHash } from "./build-nodes";
import { buildEdges } from "./build-edges";
import { buildRooms } from "./build-rooms";
import { initPalace } from "../storage/init-palace";
import { readIndex } from "../storage/read-palace";
import { writeIndex } from "../storage/write-palace";
import { stableJson } from "../utils/stable-json";
import { writeFile } from "node:fs/promises";

export async function indexPalace(root: string): Promise<IndexPalaceOutput> {
  await initPalace(root);
  const now = new Date().toISOString();
  const scan = await scanRepo({ root, includeHidden: true });
  const parsedFiles: ParsedFileWithHash[] = [];

  for (const file of scan.files) {
    const parsed = await parseFile(root, file.path, file.language);
    parsedFiles.push({ ...parsed, hash: file.hash, size: file.size });
  }

  const previous = await readIndex(root);
  const nodes = buildNodes(scan, parsedFiles, now);
  const edges = buildEdges(nodes, parsedFiles, now);
  const rooms = await buildRooms(nodes, root, now);
  const symbols = nodes.filter((node) => node.drawer || ["function", "class", "interface", "type", "symbol"].includes(node.kind));
  const directoryTree = buildDirectoryMap(scan.files.map((file) => file.path));
  const fileHashes = Object.fromEntries(scan.files.map((file) => [file.path, file.hash]));
  const index: PalaceIndex = {
    nodes,
    edges,
    rooms,
    symbols,
    directoryTree,
    fileHashes,
    routes: previous.routes,
  };

  await writeIndex(root, index);
  await writeFile(path.join(root, ".palace", "00-entrance", "directory-map.md"), `# Directory Map\n\n\`\`\`json\n${stableJson(directoryTree).trimEnd()}\n\`\`\`\n`, "utf8");

  return {
    root,
    palaceRoot: path.join(root, ".palace"),
    fileCount: scan.files.length,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    roomCount: rooms.length,
    symbolCount: symbols.length,
    ignoredCount: scan.ignored.length,
    indexedAt: now
  };
}
