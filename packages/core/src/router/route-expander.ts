import type { PalaceEdge, PalaceNode } from "@vertex-palace/shared";
import type { ScoredNode } from "./route-scorer";

export type RouteExpansionOptions = {
  limit?: number;
  focused?: boolean;
  preferVerificationRelations?: boolean;
  minSeedScoreRatio?: number;
  minRelationScoreRatio?: number;
};

const FILE_NODE_KINDS = new Set(["file", "api", "test", "config", "doc", "runtime-log"]);
const EXPANDABLE_RELATIONS = new Set(["imports", "tests", "tested_by", "changed_with", "configures", "depends_on"]);
const PROVENANCE_RELATIONS = new Set(["changed_with", "configures", "depends_on"]);

export function expandRoute(
  scored: ScoredNode[],
  edges: PalaceEdge[],
  nodes: PalaceNode[],
  input: number | RouteExpansionOptions = 12
): ScoredNode[] {
  const options = normalizeOptions(input);
  const limit = options.limit;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const bySource = groupBySource(nodes);
  const adjacency = buildAdjacency(edges);
  const scoredById = new Map(scored.map((item) => [item.node.id, item]));
  const bestScoredBySource = bestBySource(scored);
  const selected = new Map<string, ScoredNode>();
  const selectedSources = new Set<string>();
  const seedLimit = Math.min(limit, Math.max(3, Math.ceil(limit * 0.5)));

  const seeds = diverseSeed(scored, seedLimit, options.focused ? options.minSeedScoreRatio : 0);
  const focusedAnchorId = options.focused ? seeds[0]?.node.id : undefined;
  for (const item of seeds) {
    selected.set(item.node.id, item);
    selectedSources.add(item.node.sourcePath);
  }

  const relationGroups: ScoredNode[][] = [];
  for (const item of [...selected.values()].slice(0, 8)) {
    const directEdges = uniqueEdges(adjacency.get(item.node.id) ?? []);
    const hasDirectCrossSourceRelation = directEdges.some((edge) => {
      const neighbor = neighborFor(edge, item.node.id, byId);
      return neighbor && neighbor.sourcePath !== item.node.sourcePath;
    });
    const fallbackFileNode = (bySource.get(item.node.sourcePath) ?? []).find(
      (node) => node.id !== item.node.id && FILE_NODE_KINDS.has(node.kind) && !node.startLine
    );
    let relatedEdges = hasDirectCrossSourceRelation || !fallbackFileNode
      ? directEdges
      : uniqueEdges(adjacency.get(fallbackFileNode.id) ?? []);
    const relationAnchorIds = new Set([
      hasDirectCrossSourceRelation || !fallbackFileNode ? item.node.id : fallbackFileNode.id
    ]);
    if (options.preferVerificationRelations && relatedEdges.some((edge) => ["tests", "tested_by"].includes(edge.type))) {
      relatedEdges = relatedEdges.filter((edge) => ["tests", "tested_by"].includes(edge.type));
    }

    const candidates = relationCandidates(
      item,
      relatedEdges,
      relationAnchorIds,
      byId,
      scoredById,
      bestScoredBySource,
      selectedSources
    );
    const bestRelationScore = candidates[0]?.score ?? 0;
    relationGroups.push(candidates.filter(
      (candidate) => !options.focused || candidate.score >= bestRelationScore * options.minRelationScoreRatio
    ));
  }

  const relationOffsets = relationGroups.map(() => 0);
  let addedRelation = true;
  while (selected.size < limit && addedRelation) {
    addedRelation = false;
    for (let groupIndex = 0; groupIndex < relationGroups.length; groupIndex += 1) {
      const group = relationGroups[groupIndex];
      while (
        relationOffsets[groupIndex] < group.length
        && selectedSources.has(group[relationOffsets[groupIndex]].node.sourcePath)
      ) relationOffsets[groupIndex] += 1;
      const candidate = group[relationOffsets[groupIndex]];
      if (!candidate) continue;
      relationOffsets[groupIndex] += 1;
      selected.set(candidate.node.id, candidate);
      selectedSources.add(candidate.node.sourcePath);
      addedRelation = true;
      if (selected.size >= limit) break;
    }
  }

  if (!options.focused) {
    for (const item of scored) {
      if (selected.size >= limit) break;
      if (selected.has(item.node.id) || selectedSources.has(item.node.sourcePath)) continue;
      selected.set(item.node.id, item);
      selectedSources.add(item.node.sourcePath);
    }
  }

  const result = [...selected.values()].sort((a, b) => b.score - a.score || a.node.sourcePath.localeCompare(b.node.sourcePath));
  if (!focusedAnchorId) return result.slice(0, limit);
  const focusedAnchor = selected.get(focusedAnchorId);
  return focusedAnchor
    ? [focusedAnchor, ...result.filter((item) => item.node.id !== focusedAnchorId)].slice(0, limit)
    : result.slice(0, limit);
}

function normalizeOptions(input: number | RouteExpansionOptions): Required<RouteExpansionOptions> {
  if (typeof input === "number") {
    return {
      limit: input,
      focused: false,
      preferVerificationRelations: false,
      minSeedScoreRatio: 0.84,
      minRelationScoreRatio: 0.8
    };
  }
  return {
    limit: input.limit ?? 12,
    focused: input.focused ?? false,
    preferVerificationRelations: input.preferVerificationRelations ?? false,
    minSeedScoreRatio: input.minSeedScoreRatio ?? 0.84,
    minRelationScoreRatio: input.minRelationScoreRatio ?? 0.8
  };
}

function relationCandidates(
  anchor: ScoredNode,
  edges: PalaceEdge[],
  anchorIds: Set<string>,
  byId: Map<string, PalaceNode>,
  scoredById: Map<string, ScoredNode>,
  bestScoredBySource: Map<string, ScoredNode>,
  selectedSources: Set<string>
): ScoredNode[] {
  const candidates = new Map<string, ScoredNode>();
  for (const edge of edges) {
    const anchorId = anchorIds.has(edge.from) ? edge.from : anchorIds.has(edge.to) ? edge.to : undefined;
    if (!anchorId) continue;
    const neighbor = neighborFor(edge, anchorId, byId);
    if (!neighbor || neighbor.kind === "directory" || selectedSources.has(neighbor.sourcePath)) continue;
    const direct = scoredById.get(neighbor.id) ?? bestScoredBySource.get(neighbor.sourcePath);
    const relationScore = anchor.score * edge.weight * 0.5;
    const score = direct ? direct.score * 0.55 + relationScore * 0.45 : relationScore * 0.45;
    const candidate: ScoredNode = {
      node: direct?.node ?? neighbor,
      score,
      reasons: [
        `expanded through ${edge.type} relation from ${anchor.node.sourcePath}`,
        ...(direct?.reasons ?? [])
      ].slice(0, 4),
      matchedKeywordCount: direct?.matchedKeywordCount ?? 0
    };
    const existing = candidates.get(candidate.node.sourcePath);
    if (!existing || candidate.score > existing.score) candidates.set(candidate.node.sourcePath, candidate);
  }
  const sorted = [...candidates.values()].sort((a, b) => b.score - a.score || a.node.sourcePath.localeCompare(b.node.sourcePath));
  const anchorVersion = versionSegment(anchor.node.sourcePath);
  if (!anchorVersion || !sorted.some((candidate) => versionSegment(candidate.node.sourcePath) === anchorVersion)) return sorted;
  return sorted.filter((candidate) => {
    const candidateVersion = versionSegment(candidate.node.sourcePath);
    return !candidateVersion || candidateVersion === anchorVersion;
  });
}

function neighborFor(edge: PalaceEdge, anchorId: string, byId: Map<string, PalaceNode>): PalaceNode | undefined {
  if (edge.from === anchorId) return byId.get(edge.to);
  if (edge.to === anchorId) return byId.get(edge.from);
  return undefined;
}

function bestBySource(scored: ScoredNode[]): Map<string, ScoredNode> {
  const result = new Map<string, ScoredNode>();
  for (const item of scored) {
    if (!result.has(item.node.sourcePath)) result.set(item.node.sourcePath, item);
  }
  return result;
}

function diverseSeed(scored: ScoredNode[], limit: number, minScoreRatio: number): ScoredNode[] {
  const result: ScoredNode[] = [];
  const bySource = new Map<string, number>();
  const byTop = new Map<string, number>();
  const groupLimit = limit <= 4 ? 1 : Math.max(3, Math.ceil(limit / 4));
  const minimumScore = (scored[0]?.score ?? 0) * minScoreRatio;
  const aboveThreshold = minScoreRatio > 0 ? scored.filter((item) => item.score >= minimumScore) : scored;
  const anchorVersion = versionSegment(scored[0]?.node.sourcePath ?? "");
  const eligible = anchorVersion && aboveThreshold.some((item) => versionSegment(item.node.sourcePath) === anchorVersion)
    ? aboveThreshold.filter((item) => {
        const candidateVersion = versionSegment(item.node.sourcePath);
        return !candidateVersion || candidateVersion === anchorVersion;
      })
    : aboveThreshold;

  for (const item of eligible) {
    const sourceCount = bySource.get(item.node.sourcePath) ?? 0;
    const top = topSegment(item.node.sourcePath);
    const topCount = byTop.get(top) ?? 0;
    if (sourceCount >= 1 || topCount >= groupLimit) continue;
    result.push(item);
    bySource.set(item.node.sourcePath, sourceCount + 1);
    byTop.set(top, topCount + 1);
    if (result.length >= limit) return result;
  }

  for (const item of eligible) {
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

function versionSegment(sourcePath: string): string | undefined {
  return sourcePath.match(/(?:^|\/)(v\d+(?:\.\d+)?)(?:\/|$)/i)?.[1]?.toLowerCase();
}

function buildAdjacency(edges: PalaceEdge[]): Map<string, PalaceEdge[]> {
  const adjacency = new Map<string, PalaceEdge[]>();
  for (const edge of edges) {
    if (!EXPANDABLE_RELATIONS.has(edge.type)) continue;
    if (PROVENANCE_RELATIONS.has(edge.type) && edge.weight < 0.8) continue;
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
