import path from "node:path";
import type { PalaceFloor, PalaceNode, ParsedFile, ScanRepoOutput } from "@context-palace/shared";
import { hashText } from "../scanner/file-hash";
import { makePalaceAddress } from "../palace/palace-address";
import { KNOWN_ROOMS, KNOWN_WINGS } from "../palace/room-types";
import { estimateTokens } from "../packer/token-estimator";
import { normalizeRelativePath, slugify, stripExtension } from "../utils/path-utils";

export type ParsedFileWithHash = ParsedFile & {
  hash: string;
  size: number;
};

export function buildNodes(scan: ScanRepoOutput, parsedFiles: ParsedFileWithHash[], now: string): PalaceNode[] {
  const nodes: PalaceNode[] = [];
  const directorySet = new Set<string>();

  for (const file of scan.files) {
    const parts = file.path.split("/");
    for (let index = 0; index < parts.length - 1; index += 1) {
      directorySet.add(parts.slice(0, index + 1).join("/"));
    }
  }

  for (const directory of [...directorySet].sort()) {
    const floor = inferFloor(directory, "text");
    const { wing, room } = inferRoom(directory);
    nodes.push(makeNode({ sourcePath: directory, floor, wing, room, kind: "directory", title: path.posix.basename(directory), summary: `Directory ${directory}`, now }));
  }

  for (const parsed of parsedFiles.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath))) {
    const floor = inferFloor(parsed.sourcePath, parsed.language);
    const roomInfo = inferRoom(parsed.sourcePath, parsed.symbols.map((symbol) => symbol.name).join(" "));
    const fileKind = inferFileKind(parsed.sourcePath, parsed.language, floor);
    const fileNode = makeNode({
      sourcePath: parsed.sourcePath,
      floor,
      wing: roomInfo.wing,
      room: roomInfo.room,
      cabinet: path.posix.basename(parsed.sourcePath),
      kind: fileKind,
      language: parsed.language,
      title: path.posix.basename(parsed.sourcePath),
      summary: summarizeParsedFile(parsed),
      sourceHash: parsed.hash,
      contentHash: hashText(parsed.summarySeed),
      now
    });
    nodes.push(fileNode);

    for (const symbol of parsed.symbols) {
      const symbolRoom = inferRoom(parsed.sourcePath, symbol.name);
      const symbolFloor = symbol.kind === "interface" || symbol.name.toLowerCase().includes("dto") ? "02-interface" : floor;
      nodes.push(
        makeNode({
          sourcePath: parsed.sourcePath,
          floor: symbolFloor,
          wing: symbolRoom.wing ?? roomInfo.wing,
          room: symbolRoom.room ?? roomInfo.room,
          cabinet: path.posix.basename(parsed.sourcePath),
          drawer: symbol.name,
          kind: mapSymbolKind(symbol.kind),
          language: parsed.language,
          title: symbol.name,
          summary: `${symbol.kind} ${symbol.name} in ${parsed.sourcePath}`,
          startLine: symbol.startLine,
          endLine: symbol.endLine,
          sourceHash: parsed.hash,
          contentHash: hashText(`${parsed.sourcePath}:${symbol.name}:${symbol.signature}`),
          signature: symbol.signature,
          now
        })
      );
    }
  }

  return nodes.sort((a, b) => a.id.localeCompare(b.id));
}

export function inferFloor(sourcePath: string, language: string): PalaceFloor {
  const lower = normalizeRelativePath(sourcePath).toLowerCase();
  if (/(^|\/)(test|tests|spec|__tests__)(\/|$)|\.(test|spec|e2e)\.[tj]sx?$/.test(lower)) return "05-verification";
  if (/(migration|migrations|schema|model|models|entity|entities|prisma|database|db)/.test(lower)) return "04-data";
  if (/(controller|controllers|route|routes|api|dto|schema|contract|event|message)/.test(lower)) return "02-interface";
  if (/(log|logs|error|errors|output|stack)/.test(lower)) return "06-runtime";
  if (/(^|\/)(readme|agents)\.md$|(^|\/)(docs|doc)(\/|$)/.test(lower)) return lower.endsWith("readme.md") ? "00-entrance" : "01-business";
  if (language === "markdown") return "01-business";
  if (/(package\.json|tsconfig|vite\.config|vitest\.config|eslint|prettier|\.config\.)/.test(lower)) return "00-entrance";
  return "03-implementation";
}

export function inferRoom(sourcePath: string, symbolText = ""): { wing: string; room: string } {
  const haystack = splitWords(`${stripExtension(sourcePath)} ${symbolText}`);
  const wing = haystack.find((token) => KNOWN_WINGS.includes(token)) ?? firstUsefulPathPart(sourcePath) ?? "unknown";
  const room =
    haystack.find((token) => KNOWN_ROOMS.includes(token) && token !== wing) ??
    haystack.find((token) => ["refresh", "password", "session"].includes(token)) ??
    "general";
  return { wing: slugify(wing), room: slugify(room) };
}

function makeNode(input: {
  sourcePath: string;
  floor: PalaceFloor;
  wing?: string;
  room?: string;
  cabinet?: string;
  drawer?: string;
  kind: PalaceNode["kind"];
  language?: string;
  title: string;
  summary: string;
  startLine?: number;
  endLine?: number;
  sourceHash?: string;
  contentHash?: string;
  signature?: string;
  now: string;
}): PalaceNode {
  const sourcePath = normalizeRelativePath(input.sourcePath);
  const palacePath = makePalaceAddress(input);
  const id = `node_${hashText(`${palacePath}:${sourcePath}:${input.startLine ?? ""}:${input.title}`).slice(0, 16)}`;
  const tokenCost = estimateTokens(input.summary) + estimateTokens(input.signature ?? "");
  return {
    id,
    palacePath,
    sourcePath,
    floor: input.floor,
    wing: input.wing,
    room: input.room,
    cabinet: input.cabinet,
    drawer: input.drawer,
    kind: input.kind,
    language: input.language,
    title: input.title,
    summary: input.summary,
    tags: buildTags(input),
    startLine: input.startLine,
    endLine: input.endLine,
    tokenCost,
    contentHash: input.contentHash ?? hashText(input.summary),
    sourceHash: input.sourceHash ?? hashText(input.summary),
    lod: {
      level0: input.floor,
      level1: [input.wing, input.room].filter(Boolean).join("/") || input.floor,
      level2: input.summary,
      level3: `${input.kind}: ${input.title}`,
      level4: input.signature,
      level5Ref: {
        sourcePath,
        startLine: input.startLine,
        endLine: input.endLine
      }
    },
    createdAt: input.now,
    updatedAt: input.now
  };
}

function inferFileKind(sourcePath: string, language: string, floor: PalaceFloor): PalaceNode["kind"] {
  const lower = sourcePath.toLowerCase();
  if (floor === "05-verification") return "test";
  if (floor === "02-interface") return "api";
  if (language === "markdown") return "doc";
  if (/(package\.json|tsconfig|config|\.config\.)/.test(lower)) return "config";
  if (floor === "06-runtime") return "runtime-log";
  return "file";
}

function mapSymbolKind(kind: ParsedFile["symbols"][number]["kind"]): PalaceNode["kind"] {
  if (kind === "const") return "symbol";
  if (kind === "method") return "function";
  return kind;
}

function summarizeParsedFile(parsed: ParsedFile): string {
  const symbolText = parsed.symbols.length ? `Symbols: ${parsed.symbols.map((symbol) => symbol.name).slice(0, 12).join(", ")}.` : "";
  const importText = parsed.imports.length ? `Imports: ${parsed.imports.slice(0, 8).join(", ")}.` : "";
  const headingText = parsed.headings?.length ? `Headings: ${parsed.headings.map((heading) => heading.text).slice(0, 8).join(", ")}.` : "";
  return [parsed.language, symbolText, importText, headingText, parsed.summarySeed].filter(Boolean).join(" ").slice(0, 800);
}

function buildTags(input: { sourcePath: string; floor: PalaceFloor; wing?: string; room?: string; kind: string; title: string }): string[] {
  return [
    ...new Set(
      [input.floor, input.wing, input.room, input.kind, ...splitWords(input.sourcePath), ...splitWords(input.title)].filter(
        (tag): tag is string => typeof tag === "string" && tag.length > 0
      )
    )
  ].slice(0, 24);
}

function splitWords(value: string): string[] {
  return normalizeRelativePath(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !["src", "lib", "app", "pages", "components", "services", "controllers", "tests", "test"].includes(token));
}

function firstUsefulPathPart(sourcePath: string): string | undefined {
  return normalizeRelativePath(sourcePath)
    .split("/")
    .map((part) => part.replace(/\.[^.]+$/, ""))
    .find((part) => !["src", "lib", "app", "pages", "components", "services", "controllers", "tests", "test"].includes(part.toLowerCase()));
}
