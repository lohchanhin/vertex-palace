import path from "node:path";
import { stat } from "node:fs/promises";
import type { IndexPalaceOutput, PalaceIndex } from "@vertex-palace/shared";
import { detectLanguage, scanRepo } from "../scanner/scan-repo";
import { hashFile } from "../scanner/file-hash";
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
    const parsed = await parseFile(root, file.path, file.language, file.size);
    parsedFiles.push({ ...parsed, hash: file.hash, size: file.size });
  }
  await appendDeclaredGeneratedArtifacts(root, scan, parsedFiles);

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

async function appendDeclaredGeneratedArtifacts(
  root: string,
  scan: Awaited<ReturnType<typeof scanRepo>>,
  parsedFiles: ParsedFileWithHash[]
): Promise<void> {
  const known = new Set(scan.files.map((file) => file.path));
  const declarations = parsedFiles.flatMap((parsed) => (
    (parsed.generatedArtifacts ?? []).map((artifact) => ({ artifact, configPath: parsed.sourcePath }))
  ));

  for (const { artifact, configPath } of declarations) {
    if (known.has(artifact.outputPath)) continue;
    const absolute = path.resolve(root, artifact.outputPath);
    const relative = path.relative(root, absolute);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) continue;
    try {
      const info = await stat(absolute);
      if (!info.isFile()) continue;
      const hash = await hashFile(absolute);
      const language = detectLanguage(artifact.outputPath);
      scan.files.push({ path: artifact.outputPath, size: info.size, hash, language });
      parsedFiles.push({
        sourcePath: artifact.outputPath,
        language,
        imports: [],
        exports: [],
        symbols: [],
        generatedArtifact: {
          inputPath: artifact.inputPath,
          configPath,
          tool: artifact.tool
        },
        summarySeed: `Generated ${artifact.tool} artifact declared by ${configPath} from ${artifact.inputPath}`,
        hash,
        size: info.size
      });
      known.add(artifact.outputPath);
    } catch {
      // A declared output is indexed only after the build has produced it.
    }
  }
}
