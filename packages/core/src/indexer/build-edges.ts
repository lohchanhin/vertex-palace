import path from "node:path";
import type { PalaceEdge, PalaceNode, ParsedFile } from "@vertex-palace/shared";
import { hashText } from "../scanner/file-hash";
import { normalizeRelativePath } from "../utils/path-utils";
import { tokenizeLexical } from "../utils/lexical-tokens";

export function buildEdges(nodes: PalaceNode[], parsedFiles: ParsedFile[], now: string): PalaceEdge[] {
  const edges: PalaceEdge[] = [];
  const bySource = groupBy(nodes, (node) => node.sourcePath);
  const fileNodes = nodes.filter((node) => ["file", "api", "test", "config", "doc", "runtime-log"].includes(node.kind));
  const directoryNodes = nodes.filter((node) => node.kind === "directory");
  const fileNodeByPath = new Map(fileNodes.map((node) => [node.sourcePath, node]));

  for (const fileNode of fileNodes) {
    const parentPath = normalizeRelativePath(path.posix.dirname(fileNode.sourcePath));
    const parent = directoryNodes.find((node) => node.sourcePath === parentPath);
    if (parent) edges.push(makeEdge(parent.id, fileNode.id, "contains", 1, `Directory ${parent.sourcePath} contains ${fileNode.sourcePath}`, now));

    for (const symbol of bySource.get(fileNode.sourcePath) ?? []) {
      if (symbol.id !== fileNode.id && symbol.kind !== "directory") {
        edges.push(makeEdge(fileNode.id, symbol.id, "contains", 1, `${fileNode.sourcePath} contains ${symbol.title}`, now));
      }
    }
  }

  for (const parsed of parsedFiles) {
    const from = fileNodeByPath.get(parsed.sourcePath);
    if (!from) continue;
    for (const importPath of [...parsed.imports, ...parsed.exports]) {
      const targetPath = resolveImport(parsed.sourcePath, importPath, [...fileNodeByPath.keys()]);
      if (!targetPath) continue;
      const to = fileNodeByPath.get(targetPath);
      if (to) edges.push(makeEdge(from.id, to.id, "imports", 0.8, `${parsed.sourcePath} imports ${importPath}`, now));
    }
  }

  const tests = fileNodes.filter((node) => node.kind === "test");
  const sources = fileNodes.filter((node) => !["test", "doc", "config", "runtime-log"].includes(node.kind));
  const parsedByPath = new Map(parsedFiles.map((parsed) => [parsed.sourcePath, parsed]));
  for (const test of tests) {
    const related = sources
      .map((source) => ({
        source,
        weight: testRelationWeight(
          test.sourcePath,
          source.sourcePath,
          parsedByPath.get(test.sourcePath),
          parsedByPath.get(source.sourcePath)
        )
      }))
      .filter((item) => item.weight > 0)
      .sort((a, b) => b.weight - a.weight || a.source.sourcePath.localeCompare(b.source.sourcePath))
      .slice(0, 12);
    for (const { source, weight } of related) {
        edges.push(makeEdge(test.id, source.id, "tests", weight, `${test.sourcePath} appears to test ${source.sourcePath}`, now));
        edges.push(makeEdge(source.id, test.id, "tested_by", weight, `${source.sourcePath} is covered by ${test.sourcePath}`, now));
    }
  }

  const testSymbolNodes = nodes.filter((node) => node.floor === "05-verification" && node.startLine && node.kind !== "test");
  const sourceSymbolNodes = nodes.filter(
    (node) => node.floor !== "05-verification" && node.startLine && !["directory", "file", "api", "doc", "config", "runtime-log"].includes(node.kind)
  );
  for (const testSymbol of testSymbolNodes) {
    const testTokens = meaningfulTokens(testSymbol.title.split(".").at(-1) ?? testSymbol.title);
    const matches = sourceSymbolNodes
      .map((sourceSymbol) => ({
        sourceSymbol,
        sourceTokens: meaningfulTokens(sourceSymbol.title.split(".").at(-1) ?? sourceSymbol.title)
      }))
      .filter(
        ({ sourceTokens }) =>
          sourceTokens.size >= 2 && [...sourceTokens].every((token) => testTokens.has(token))
      )
      .sort(
        (a, b) =>
          commonDirectoryPrefix(testSymbol.sourcePath, b.sourceSymbol.sourcePath) - commonDirectoryPrefix(testSymbol.sourcePath, a.sourceSymbol.sourcePath)
          || a.sourceSymbol.sourcePath.localeCompare(b.sourceSymbol.sourcePath)
      )
      .slice(0, 8);
    for (const { sourceSymbol } of matches) {
      edges.push(makeEdge(testSymbol.id, sourceSymbol.id, "tests", 0.99, `${testSymbol.title} directly tests ${sourceSymbol.title}`, now));
      edges.push(makeEdge(sourceSymbol.id, testSymbol.id, "tested_by", 0.99, `${sourceSymbol.title} is directly covered by ${testSymbol.title}`, now));
    }
  }

  const byRoom = groupBy(
    nodes.filter((node) => node.wing && node.room),
    (node) => `${node.floor}:${node.wing}:${node.room}`
  );
  for (const roomNodes of byRoom.values()) {
    const capped = roomNodes.slice(0, 24);
    for (let i = 0; i < capped.length; i += 1) {
      for (let j = i + 1; j < capped.length; j += 1) {
        edges.push(makeEdge(capped[i].id, capped[j].id, "same_room", 0.35, `Both nodes are in ${capped[i].wing}/${capped[i].room}`, now));
      }
    }
  }

  const unique = new Map<string, PalaceEdge>();
  for (const edge of edges) unique.set(edge.id, edge);
  return [...unique.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function makeEdge(from: string, to: string, type: PalaceEdge["type"], weight: number, evidence: string, now: string): PalaceEdge {
  const id = `edge_${hashText(`${from}:${to}:${type}:${evidence}`).slice(0, 16)}`;
  return { id, from, to, type, weight: Math.max(0, Math.min(1, weight)), evidence, createdAt: now };
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return map;
}

function resolveImport(sourcePath: string, importPath: string, candidates: string[]): string | undefined {
  if (!importPath.startsWith(".")) return undefined;
  if (sourcePath.endsWith(".py")) return resolvePythonImport(sourcePath, importPath, candidates);
  const base = normalizeRelativePath(path.posix.join(path.posix.dirname(sourcePath), importPath));
  const withoutRuntimeExtension = base.replace(/\.(?:mjs|cjs|js|jsx)$/, "");
  const possible = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.json`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${withoutRuntimeExtension}.ts`,
    `${withoutRuntimeExtension}.tsx`,
    `${withoutRuntimeExtension}.mts`,
    `${withoutRuntimeExtension}.cts`
  ];
  return possible.find((candidate) => candidates.includes(candidate));
}

function resolvePythonImport(sourcePath: string, importPath: string, candidates: string[]): string | undefined {
  const leadingDots = importPath.match(/^\.+/)?.[0].length ?? 0;
  const modulePath = importPath.slice(leadingDots).replace(/\./g, "/");
  let baseDirectory = path.posix.dirname(sourcePath);
  for (let level = 1; level < leadingDots; level += 1) baseDirectory = path.posix.dirname(baseDirectory);
  const base = normalizeRelativePath(path.posix.join(baseDirectory, modulePath));
  return [base, `${base}.py`, `${base}/__init__.py`].find((candidate) => candidates.includes(candidate));
}

function testRelationWeight(testPath: string, sourcePath: string, test?: ParsedFile, source?: ParsedFile): number {
  const clean = (value: string) =>
    normalizeRelativePath(value)
      .toLowerCase()
      .replace(/(^|\/)(test|tests|spec|__tests__)\//g, "/")
      .replace(/\.(test|spec|e2e)/g, "")
      .replace(/\.[^.]+$/g, "")
      .replace(/(controller|service|component|page|api)/g, "")
      .replace(/[^a-z0-9]+/g, "");
  const cleanTest = clean(testPath);
  const cleanSource = clean(sourcePath);
  if (!cleanTest || !cleanSource) return 0;
  if (cleanTest.includes(cleanSource) || cleanSource.includes(cleanTest)) return 0.9;
  const shared = [...new Set(cleanTest.split(/(?=auth|login|token|user|checkout|payment|admin)/).filter(Boolean))].filter((part) => cleanSource.includes(part));
  const legacyWeight = shared.length ? 0.55 : 0;
  return Math.max(legacyWeight, semanticTestRelationWeight(testPath, sourcePath, test, source));
}

function semanticTestRelationWeight(testPath: string, sourcePath: string, test?: ParsedFile, source?: ParsedFile): number {
  if (!test || !source || /(^|\/)(bench|benches|benchmarks?|perf)(\/|$)/i.test(sourcePath)) return 0;
  const sourceSymbols = source.symbols.map((symbol) => meaningfulTokens(symbol.name.split(".").at(-1) ?? symbol.name));
  const testPathTokens = meaningfulTokens(path.posix.basename(testPath));
  const conceptMatch = sourceSymbols.some((sourceTokens) => intersectionSize(testPathTokens, sourceTokens) >= 2);
  if (!conceptMatch) return 0;
  return Math.min(0.9, 0.78 + commonDirectoryPrefix(testPath, sourcePath) * 0.02);
}

function meaningfulTokens(value: string): Set<string> {
  return new Set([...tokenizeLexical(value)].filter((token) => !["spec", "test", "should"].includes(token)));
}

function intersectionSize(left: Set<string>, right: Set<string>): number {
  return [...left].filter((token) => right.has(token)).length;
}

function commonDirectoryPrefix(left: string, right: string): number {
  const leftParts = path.posix.dirname(left).split("/");
  const rightParts = path.posix.dirname(right).split("/");
  let count = 0;
  while (count < leftParts.length && leftParts[count] === rightParts[count]) count += 1;
  return Math.min(6, count);
}
