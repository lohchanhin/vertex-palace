import type { PalaceEdge, PalaceNode } from "@vertex-palace/shared";
import type { ScoredNode } from "./route-scorer";

export function expandRoute(scored: ScoredNode[], edges: PalaceEdge[], nodes: PalaceNode[], limit = 12): ScoredNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = buildAdjacency(edges);
  const selected = new Map<string, ScoredNode>();

  for (const item of diverseSeed(scored, Math.max(4, limit))) {
    selected.set(item.node.id, item);
  }

  for (const item of scored.slice(0, 6)) {
    for (const edge of adjacency.get(item.node.id) ?? []) {
      const neighborId = edge.from === item.node.id ? edge.to : edge.from;
      if (selected.has(neighborId)) continue;
      const node = byId.get(neighborId);
      if (!node || node.kind === "directory") continue;
      selected.set(neighborId, {
        node,
        score: item.score * edge.weight * 0.5,
        reasons: [`expanded through ${edge.type} relation from ${item.node.sourcePath}`]
      });
      if (selected.size >= limit) break;
    }
    if (selected.size >= limit) break;
  }

  return [...selected.values()].sort((a, b) => b.score - a.score || a.node.sourcePath.localeCompare(b.node.sourcePath)).slice(0, limit);
}

function diverseSeed(scored: ScoredNode[], limit: number): ScoredNode[] {
  const result: ScoredNode[] = [];
  const bySource = new Map<string, number>();
  const byTop = new Map<string, number>();

  for (const item of scored) {
    const sourceCount = bySource.get(item.node.sourcePath) ?? 0;
    const top = topSegment(item.node.sourcePath);
    const topCount = byTop.get(top) ?? 0;
    if (sourceCount >= 2 || topCount >= Math.max(3, Math.ceil(limit / 2))) continue;
    result.push(item);
    bySource.set(item.node.sourcePath, sourceCount + 1);
    byTop.set(top, topCount + 1);
    if (result.length >= limit) return result;
  }

  for (const item of scored) {
    if (result.some((selected) => selected.node.id === item.node.id)) continue;
    result.push(item);
    if (result.length >= limit) break;
  }

  return result;
}

function topSegment(sourcePath: string): string {
  const parts = sourcePath.split("/");
  return parts[0] === "src" && parts[1] ? `${parts[0]}/${parts[1]}` : parts[0] ?? sourcePath;
}

function buildAdjacency(edges: PalaceEdge[]): Map<string, PalaceEdge[]> {
  const adjacency = new Map<string, PalaceEdge[]>();
  for (const edge of edges) {
    if (!["imports", "tests", "tested_by", "same_room"].includes(edge.type)) continue;
    const fromEdges = adjacency.get(edge.from) ?? [];
    fromEdges.push(edge);
    adjacency.set(edge.from, fromEdges);
    const toEdges = adjacency.get(edge.to) ?? [];
    toEdges.push(edge);
    adjacency.set(edge.to, toEdges);
  }
  return adjacency;
}
