import path from "node:path";
import type { PalaceEdge, PalaceNode, ParsedFile } from "@vertex-palace/shared";
import { hashText } from "../scanner/file-hash";
import { normalizeRelativePath } from "../utils/path-utils";

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
    for (const importPath of parsed.imports) {
      const targetPath = resolveImport(parsed.sourcePath, importPath, [...fileNodeByPath.keys()]);
      if (!targetPath) continue;
      const to = fileNodeByPath.get(targetPath);
      if (to) edges.push(makeEdge(from.id, to.id, "imports", 0.8, `${parsed.sourcePath} imports ${importPath}`, now));
    }
  }

  const tests = fileNodes.filter((node) => node.kind === "test");
  const sources = fileNodes.filter((node) => node.kind !== "test");
  for (const test of tests) {
    for (const source of sources) {
      const weight = testRelationWeight(test.sourcePath, source.sourcePath);
      if (weight > 0) {
        edges.push(makeEdge(test.id, source.id, "tests", weight, `${test.sourcePath} appears to test ${source.sourcePath}`, now));
        edges.push(makeEdge(source.id, test.id, "tested_by", weight, `${source.sourcePath} is covered by ${test.sourcePath}`, now));
      }
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
  const base = normalizeRelativePath(path.posix.join(path.posix.dirname(sourcePath), importPath));
  const possible = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.json`, `${base}/index.ts`, `${base}/index.tsx`, `${base}/index.js`];
  return possible.find((candidate) => candidates.includes(candidate));
}

function testRelationWeight(testPath: string, sourcePath: string): number {
  const clean = (value: string) =>
    normalizeRelativePath(value)
      .toLowerCase()
      .replace(/(^|\/)(test|tests|spec|__tests__)\//g, "/")
      .replace(/\.(test|spec|e2e)/g, "")
      .replace(/\.[^.]+$/g, "")
      .replace(/(controller|service|component|page|api)/g, "")
      .replace(/[^a-z0-9]+/g, "");
  const test = clean(testPath);
  const source = clean(sourcePath);
  if (!test || !source) return 0;
  if (test.includes(source) || source.includes(test)) return 0.9;
  const shared = [...new Set(test.split(/(?=auth|login|token|user|checkout|payment|admin)/).filter(Boolean))].filter((part) => source.includes(part));
  return shared.length ? 0.55 : 0;
}
