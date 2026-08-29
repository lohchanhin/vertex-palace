import type { EvidenceRole, PalaceEdge, PalaceNode } from "@vertex-palace/shared";
import { nodeHasEvidenceRole } from "../evidence/evidence-model";
import type { ScoredNode } from "./route-scorer";

export type RouteExpansionOptions = {
  limit?: number;
  focused?: boolean;
  bounded?: boolean;
  preferVerificationRelations?: boolean;
  minSeedScoreRatio?: number;
  minRelationScoreRatio?: number;
  requiredRoles?: EvidenceRole[];
  taskTerms?: string[];
  minExpansionGain?: number;
};

type NormalizedRouteExpansionOptions = Required<Omit<RouteExpansionOptions, "requiredRoles" | "taskTerms">> & {
  requiredRoles: EvidenceRole[];
  taskTerms: string[];
};

type ExpansionCandidate = {
  item: ScoredNode;
  taskAffinity: number;
  relationStrength: number;
  degreePenalty: number;
  roles: EvidenceRole[];
  taskTerms: string[];
  causalSource: boolean;
};

const FILE_NODE_KINDS = new Set(["file", "api", "test", "config", "doc", "runtime-log"]);
const EXPANDABLE_RELATIONS = new Set(["imports", "calls", "tests", "tested_by", "changed_with", "configures", "depends_on"]);
const PROVENANCE_RELATIONS = new Set(["changed_with", "configures", "depends_on"]);
const CAUSAL_RELATIONS = new Set(["imports", "calls", "tests", "tested_by", "changed_with", "configures", "depends_on"]);
const AUXILIARY_ROLES = new Set<EvidenceRole>(["contract", "documentation", "configuration", "generated", "runtime"]);

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
  const sourceDegrees = buildSourceDegrees(edges, byId);
  const scoredById = new Map(scored.map((item) => [item.node.id, item]));
  const bestScoredBySource = bestBySource(scored);
  const selected = new Map<string, ScoredNode>();
  const selectedSources = new Set<string>();
  const seedLimit = options.focused
    ? 1
    : options.bounded
      ? Math.min(limit, Math.max(2, Math.ceil(limit * 0.33)))
      : Math.min(limit, Math.max(3, Math.ceil(limit * 0.5)));

  const seeds = diverseSeed(scored, seedLimit, options.focused || options.bounded ? options.minSeedScoreRatio : 0);
  const focusedAnchorId = options.focused ? seeds[0]?.node.id : undefined;
  for (const item of seeds) {
    selected.set(item.node.id, item);
    selectedSources.add(item.node.sourcePath);
  }
  const selectedRoles = rolesForSources(selectedSources, bySource, options.requiredRoles);
  const selectedTerms = termsForSources(selectedSources, bySource, options.taskTerms);
  const auxiliaryRoleSources = auxiliaryRoleSourcesFor(selectedSources, bySource, options.requiredRoles);
  const topTaskScore = Math.max(0, ...scored.map((item) => item.score));

  const relationGroups: ExpansionCandidate[][] = [];
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
      selectedSources,
      options.requiredRoles,
      options.taskTerms,
      selectedRoles,
      selectedTerms,
      sourceDegrees,
      topTaskScore
    );
    const bestRelationScore = candidates[0]
      ? expansionGain(candidates[0], selectedRoles, selectedTerms)
      : 0;
    const strongCandidates = options.focused || options.bounded
      ? candidates.filter((candidate) =>
          expansionGain(candidate, selectedRoles, selectedTerms) >= bestRelationScore * options.minRelationScoreRatio
        )
      : candidates;
    relationGroups.push(
      options.focused
        ? strongCandidates.slice(0, 2)
        : options.bounded
          ? strongCandidates.slice(0, 1)
          : strongCandidates
    );
  }

  const relationOffsets = relationGroups.map(() => 0);
  let addedRelation = true;
  while (selected.size < limit && addedRelation) {
    addedRelation = false;
    for (let groupIndex = 0; groupIndex < relationGroups.length; groupIndex += 1) {
      const group = relationGroups[groupIndex];
      while (
        relationOffsets[groupIndex] < group.length
        && !isExpansionCandidateUsable(
          group[relationOffsets[groupIndex]],
          selectedSources,
          selectedRoles,
          selectedTerms,
          auxiliaryRoleSources,
          options.requiredRoles,
          options.minExpansionGain
        )
      ) relationOffsets[groupIndex] += 1;
      const candidate = group[relationOffsets[groupIndex]];
      if (!candidate) continue;
      relationOffsets[groupIndex] += 1;
      const gain = expansionGain(candidate, selectedRoles, selectedTerms);
      const item = withExpansionReason(candidate, gain);
      selected.set(item.node.id, item);
      selectedSources.add(item.node.sourcePath);
      for (const role of candidate.roles) {
        selectedRoles.add(role);
        if (AUXILIARY_ROLES.has(role) && !auxiliaryRoleSources.has(role)) {
          auxiliaryRoleSources.set(role, item.node.sourcePath);
        }
      }
      for (const term of candidate.taskTerms) selectedTerms.add(term);
      addedRelation = true;
      if (selected.size >= limit) break;
    }
  }

  if (!options.focused && !options.bounded) {
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

function normalizeOptions(input: number | RouteExpansionOptions): NormalizedRouteExpansionOptions {
  if (typeof input === "number") {
    return {
      limit: input,
      focused: false,
      bounded: false,
      preferVerificationRelations: false,
      minSeedScoreRatio: 0.84,
      minRelationScoreRatio: 0.8,
      requiredRoles: [],
      taskTerms: [],
      minExpansionGain: 0.55
    };
  }
  return {
    limit: input.limit ?? 12,
    focused: input.focused ?? false,
    bounded: input.bounded ?? false,
    preferVerificationRelations: input.preferVerificationRelations ?? false,
    minSeedScoreRatio: input.minSeedScoreRatio ?? 0.84,
    minRelationScoreRatio: input.minRelationScoreRatio ?? 0.8,
    requiredRoles: [...new Set(input.requiredRoles ?? [])],
    taskTerms: normalizeTaskTerms(input.taskTerms ?? []),
    minExpansionGain: input.minExpansionGain ?? 0.55
  };
}

function relationCandidates(
  anchor: ScoredNode,
  edges: PalaceEdge[],
  anchorIds: Set<string>,
  byId: Map<string, PalaceNode>,
  scoredById: Map<string, ScoredNode>,
  bestScoredBySource: Map<string, ScoredNode>,
  selectedSources: Set<string>,
  requiredRoles: EvidenceRole[],
  taskTerms: string[],
  selectedRoles: Set<EvidenceRole>,
  selectedTerms: Set<string>,
  sourceDegrees: Map<string, number>,
  topTaskScore: number
): ExpansionCandidate[] {
  const candidates = new Map<string, ExpansionCandidate>();
  for (const edge of edges) {
    const anchorId = anchorIds.has(edge.from) ? edge.from : anchorIds.has(edge.to) ? edge.to : undefined;
    if (!anchorId) continue;
    const neighbor = neighborFor(edge, anchorId, byId);
    if (!neighbor || neighbor.kind === "directory" || selectedSources.has(neighbor.sourcePath)) continue;
    const exact = scoredById.get(neighbor.id);
    const bestForSource = bestScoredBySource.get(neighbor.sourcePath);
    const direct = !exact || (bestForSource?.score ?? -Infinity) > exact.score ? bestForSource : exact;
    const relationScore = anchor.score * edge.weight * 0.5;
    const score = direct ? direct.score * 0.55 + relationScore * 0.45 : relationScore * 0.45;
    const candidateNode = direct?.node ?? neighbor;
    const candidate: ExpansionCandidate = {
      item: {
        node: candidateNode,
        score,
        reasons: [
          `expanded through ${edge.type} relation from ${anchor.node.sourcePath}`,
          ...(direct?.reasons ?? [])
        ].slice(0, 4),
        matchedKeywordCount: direct?.matchedKeywordCount ?? 0
      },
      taskAffinity: clamp(topTaskScore ? (direct?.score ?? 0) / topTaskScore : 0),
      relationStrength: clamp(edge.weight),
      degreePenalty: Math.min(1, Math.log2(1 + (sourceDegrees.get(candidateNode.sourcePath) ?? 0)) / 8),
      roles: requiredRoles.filter((role) => nodeHasEvidenceRole(candidateNode, role)),
      taskTerms: matchingTaskTerms(candidateNode, taskTerms),
      causalSource: CAUSAL_RELATIONS.has(edge.type)
    };
    const facetGain = expansionFacetGain(candidate, selectedRoles, selectedTerms);
    const eligible = facetGain > 0
      || (candidate.taskAffinity >= 0.65 && candidate.relationStrength >= 0.75 && candidate.degreePenalty < 0.75);
    if (!eligible) continue;
    const existing = candidates.get(candidateNode.sourcePath);
    if (!existing || expansionGain(candidate, selectedRoles, selectedTerms) > expansionGain(existing, selectedRoles, selectedTerms)) {
      candidates.set(candidateNode.sourcePath, candidate);
    }
  }
  const sorted = [...candidates.values()].sort((a, b) =>
    expansionGain(b, selectedRoles, selectedTerms) - expansionGain(a, selectedRoles, selectedTerms)
      || b.item.score - a.item.score
      || a.item.node.sourcePath.localeCompare(b.item.node.sourcePath)
  );
  const anchorVersion = versionSegment(anchor.node.sourcePath);
  if (!anchorVersion || !sorted.some((candidate) => versionSegment(candidate.item.node.sourcePath) === anchorVersion)) return sorted;
  return sorted.filter((candidate) => {
    const candidateVersion = versionSegment(candidate.item.node.sourcePath);
    return !candidateVersion || candidateVersion === anchorVersion;
  });
}

function isExpansionCandidateUsable(
  candidate: ExpansionCandidate,
  selectedSources: Set<string>,
  selectedRoles: Set<EvidenceRole>,
  selectedTerms: Set<string>,
  auxiliaryRoleSources: Map<EvidenceRole, string>,
  requiredRoles: EvidenceRole[],
  minExpansionGain: number
): boolean {
  if (selectedSources.has(candidate.item.node.sourcePath)) return false;
  const newRoles = candidate.roles.filter((role) => !selectedRoles.has(role));
  const newTerms = candidate.taskTerms.filter((term) => !selectedTerms.has(term));
  const newAuxiliaryRole = newRoles.some((role) =>
    AUXILIARY_ROLES.has(role) && !auxiliaryRoleSources.has(role)
  );
  if (candidate.degreePenalty >= 0.5 && !newRoles.length && !newTerms.length) return false;
  const coreComplete = requiredRoles.every((role) => selectedRoles.has(role));
  const gain = expansionGain(candidate, selectedRoles, selectedTerms);
  if (coreComplete && gain < minExpansionGain) return false;
  if (candidate.roles.some((role) => AUXILIARY_ROLES.has(role)) && !newAuxiliaryRole && !newTerms.length && !candidate.causalSource) {
    return false;
  }
  return expansionFacetGain(candidate, selectedRoles, selectedTerms) > 0
    || (candidate.taskAffinity >= 0.65 && candidate.relationStrength >= 0.75 && candidate.degreePenalty < 0.75);
}

function expansionGain(
  candidate: ExpansionCandidate,
  selectedRoles: Set<EvidenceRole>,
  selectedTerms: Set<string>
): number {
  const facetGain = expansionFacetGain(candidate, selectedRoles, selectedTerms);
  const redundancy = facetGain === 0 ? 1 : 0;
  return round(
    0.45 * candidate.taskAffinity
      + 0.30 * candidate.relationStrength
      + 0.25 * facetGain
      - 0.20 * candidate.degreePenalty
      - 0.25 * redundancy
  );
}

function expansionFacetGain(
  candidate: ExpansionCandidate,
  selectedRoles: Set<EvidenceRole>,
  selectedTerms: Set<string>
): number {
  const addsRole = candidate.roles.some((role) => !selectedRoles.has(role));
  const addsTerm = candidate.taskTerms.some((term) => !selectedTerms.has(term));
  return Math.min(1, (addsRole ? 0.5 : 0) + (addsTerm ? 0.3 : 0) + (candidate.causalSource ? 0.2 : 0));
}

function withExpansionReason(candidate: ExpansionCandidate, gain: number): ScoredNode {
  return {
    ...candidate.item,
    reasons: [
      `evidence gain ${gain.toFixed(3)} (affinity ${candidate.taskAffinity.toFixed(3)}, relation ${candidate.relationStrength.toFixed(3)}, degree penalty ${candidate.degreePenalty.toFixed(3)})`,
      ...candidate.item.reasons
    ].slice(0, 4)
  };
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

function buildSourceDegrees(edges: PalaceEdge[], byId: Map<string, PalaceNode>): Map<string, number> {
  const neighbors = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!EXPANDABLE_RELATIONS.has(edge.type)) continue;
    const from = byId.get(edge.from)?.sourcePath;
    const to = byId.get(edge.to)?.sourcePath;
    if (!from || !to || from === to) continue;
    const fromNeighbors = neighbors.get(from) ?? new Set<string>();
    fromNeighbors.add(to);
    neighbors.set(from, fromNeighbors);
    const toNeighbors = neighbors.get(to) ?? new Set<string>();
    toNeighbors.add(from);
    neighbors.set(to, toNeighbors);
  }
  return new Map([...neighbors].map(([sourcePath, values]) => [sourcePath, values.size]));
}

function rolesForSources(
  sources: Set<string>,
  bySource: Map<string, PalaceNode[]>,
  requiredRoles: EvidenceRole[]
): Set<EvidenceRole> {
  const roles = new Set<EvidenceRole>();
  for (const sourcePath of sources) {
    for (const node of bySource.get(sourcePath) ?? []) {
      for (const role of requiredRoles) {
        if (nodeHasEvidenceRole(node, role)) roles.add(role);
      }
    }
  }
  return roles;
}

function auxiliaryRoleSourcesFor(
  sources: Set<string>,
  bySource: Map<string, PalaceNode[]>,
  requiredRoles: EvidenceRole[]
): Map<EvidenceRole, string> {
  const result = new Map<EvidenceRole, string>();
  for (const sourcePath of sources) {
    for (const node of bySource.get(sourcePath) ?? []) {
      for (const role of requiredRoles) {
        if (AUXILIARY_ROLES.has(role) && nodeHasEvidenceRole(node, role) && !result.has(role)) {
          result.set(role, sourcePath);
        }
      }
    }
  }
  return result;
}

function termsForSources(
  sources: Set<string>,
  bySource: Map<string, PalaceNode[]>,
  taskTerms: string[]
): Set<string> {
  const terms = new Set<string>();
  for (const sourcePath of sources) {
    for (const node of bySource.get(sourcePath) ?? []) {
      for (const term of matchingTaskTerms(node, taskTerms)) terms.add(term);
    }
  }
  return terms;
}

function matchingTaskTerms(node: PalaceNode, taskTerms: string[]): string[] {
  const searchText = [node.sourcePath, node.title, node.summary, ...node.tags].join(" ").toLowerCase();
  return taskTerms.filter((term) => searchText.includes(term));
}

function normalizeTaskTerms(terms: string[]): string[] {
  return [...new Set(
    terms
      .map((term) => term.trim().toLowerCase())
      .filter((term) => term.length >= 3)
  )];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round(value: number): number {
  return Number(value.toFixed(6));
}

function groupBySource(nodes: PalaceNode[]): Map<string, PalaceNode[]> {
  const grouped = new Map<string, PalaceNode[]>();
  for (const node of nodes) grouped.set(node.sourcePath, [...(grouped.get(node.sourcePath) ?? []), node]);
  return grouped;
}

function uniqueEdges(edges: PalaceEdge[]): PalaceEdge[] {
  return [...new Map(edges.map((edge) => [edge.id, edge])).values()].sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
}
