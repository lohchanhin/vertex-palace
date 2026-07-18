import type { PalaceEdge, PalaceNode } from "@vertex-palace/shared";
import type { ScoredNode } from "./route-scorer";

export function expandRoute(scored: ScoredNode[], edges: PalaceEdge[], nodes: PalaceNode[], limit = 12): ScoredNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const bySource = groupBySource(nodes);
  const adjacency = buildAdjacency(edges);
  const selected = new Map<string, ScoredNode>();
  const selectedSources = new Set<string>();
  const seedLimit = Math.min(limit, Math.max(4, Math.ceil(limit * 0.67)));

  for (const item of diverseSeed(scored, seedLimit)) {
    selected.set(item.node.id, item);
    selectedSources.add(item.node.sourcePath);
  }

  for (const item of [...selected.values()].slice(0, 8)) {
    const anchorIds = [item.node.id, ...(bySource.get(item.node.sourcePath) ?? []).map((node) => node.id)];
    const relatedEdges = uniqueEdges(anchorIds.flatMap((nodeId) => adjacency.get(nodeId) ?? []));
    for (const edge of relatedEdges) {
      const anchorId = anchorIds.includes(edge.from) ? edge.from : edge.to;
      const neighborId = edge.from === anchorId ? edge.to : edge.from;
      if (selected.has(neighborId)) continue;
      const node = byId.get(neighborId);
      if (!node || node.kind === "directory" || selectedSources.has(node.sourcePath)) continue;
      selected.set(neighborId, {
        node,
        score: item.score * edge.weight * 0.5,
        reasons: [`expanded through ${edge.type} relation from ${item.node.sourcePath}`]
      });
      selectedSources.add(node.sourcePath);
      if (selected.size >= limit) break;
    }
    if (selected.size >= limit) break;
  }

  for (const item of scored) {
    if (selected.size >= limit) break;
    if (selected.has(item.node.id) || selectedSources.has(item.node.sourcePath)) continue;
    selected.set(item.node.id, item);
    selectedSources.add(item.node.sourcePath);
  }

  return [...selected.values()].sort((a, b) => b.score - a.score || a.node.sourcePath.localeCompare(b.node.sourcePath)).slice(0, limit);
}

function diverseSeed(scored: ScoredNode[], limit: number): ScoredNode[] {
  const result: ScoredNode[] = [];
  const bySource = new Map<string, number>();
  const byTop = new Map<string, number>();
  const groupLimit = limit <= 8 ? 1 : Math.max(2, Math.ceil(limit / 5));

  for (const item of scored) {
    const sourceCount = bySource.get(item.node.sourcePath) ?? 0;
    const top = topSegment(item.node.sourcePath);
    const topCount = byTop.get(top) ?? 0;
    if (sourceCount >= 1 || topCount >= groupLimit) continue;
    result.push(item);
    bySource.set(item.node.sourcePath, sourceCount + 1);
    byTop.set(top, topCount + 1);
    if (result.length >= limit) return result;
  }

  for (const item of scored) {
    if (result.some((selected) => selected.node.id === item.node.id || selected.node.sourcePath === item.node.sourcePath)) continue;
    result.push(item);
    if (result.length >= limit) break;
  }

  return result;
}

function topSegment(sourcePath: string): string {
  const parts = sourcePath.split("/");
  if (parts[0] === "packages" && parts[1] && parts[2] === "src" && parts[3]) {
    return parts.slice(0, 4).join("/");
  }
  if (["frontend", "backend"].includes(parts[0] ?? "") && parts[1] === "src" && parts[2]) {
    return parts.slice(0, 3).join("/");
  }
  if (parts[0] === "src" && parts[1]) return `${parts[0]}/${parts[1]}`;
  return parts.slice(0, Math.min(2, parts.length)).join("/") || sourcePath;
}

function buildAdjacency(edges: PalaceEdge[]): Map<string, PalaceEdge[]> {
  const adjacency = new Map<string, PalaceEdge[]>();
  for (const edge of edges) {
    if (!["imports", "tests", "tested_by"].includes(edge.type)) continue;
    const fromEdges = adjacency.get(edge.from) ?? [];
    fromEdges.push(edge);
    adjacency.set(edge.from, fromEdges);
    const toEdges = adjacency.get(edge.to) ?? [];
    toEdges.push(edge);
    adjacency.set(edge.to, toEdges);
  }
  return adjacency;
}

function groupBySource(nodes: PalaceNode[]): Map<string, PalaceNode[]> {
  const grouped = new Map<string, PalaceNode[]>();
  for (const node of nodes) grouped.set(node.sourcePath, [...(grouped.get(node.sourcePath) ?? []), node]);
  return grouped;
}

function uniqueEdges(edges: PalaceEdge[]): PalaceEdge[] {
  return [...new Map(edges.map((edge) => [edge.id, edge])).values()].sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
}
