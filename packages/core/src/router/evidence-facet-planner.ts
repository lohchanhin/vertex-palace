import path from "node:path";
import type { PalaceEdge, PalaceNode, TaskType } from "@vertex-palace/shared";
import { nodeHasEvidenceRole } from "../evidence/evidence-model";
import { compactCodeIdentifier, tokenizeLexical } from "../utils/lexical-tokens";
import type { TaskAnalysis } from "./analyze-task";
import type { ScoredNode } from "./route-scorer";

export type EvidenceFacetClosure = {
  applied: boolean;
  route: ScoredNode[];
  requiredFacets: string[];
  coveredFacets: string[];
  missingFacets: string[];
};

type EvidenceFacetKind = "identifier" | "concern" | "constraint" | "verification" | "generated";

type EvidenceFacet = {
  id: string;
  kind: EvidenceFacetKind;
  terms: string[];
  identifier?: string;
};

type SourceProfile = {
  sourcePath: string;
  nodes: PalaceNode[];
  item: ScoredNode;
  identityTerms: Set<string>;
  roles: Set<string>;
  language: string;
  ownership: string;
};

type RelationPath = {
  hops: number;
  strength: number;
};

const CODE_TASKS = new Set<TaskType>(["bugfix", "feature", "refactor", "review", "test"]);
const RELATION_TYPES = new Set<PalaceEdge["type"]>([
  "imports",
  "calls",
  "tests",
  "tested_by",
  "configures",
  "changed_with",
  "depends_on"
]);
const ACTION_NOISE = new Set([
  "add",
  "and",
  "behavior",
  "change",
  "ensure",
  "expected",
  "fix",
  "focused",
  "for",
  "its",
  "preserve",
  "preserving",
  "rebuild",
  "rejected",
  "so",
  "that",
  "the",
  "update",
  "while",
  "with",
  "without"
]);
const FACET_SIGNAL_NOISE = new Set(["implementation", "source", "code", "project", "repository"]);

export function closeTaskEvidenceFacets(input: {
  selected: ScoredNode[];
  scored: ScoredNode[];
  nodes: PalaceNode[];
  edges: PalaceEdge[];
  analysis: TaskAnalysis;
  taskType: TaskType;
  limit: number;
}): EvidenceFacetClosure {
  if (!CODE_TASKS.has(input.taskType) || !input.nodes.some((node) => Boolean(node.object))) {
    return unchanged(input.selected);
  }
  const facets = deriveTaskEvidenceFacets(input.analysis);
  if (facets.length < 2) return unchanged(input.selected);

  const profiles = sourceProfiles(input.nodes, input.scored);
  const profileBySource = new Map(profiles.map((profile) => [profile.sourcePath, profile]));
  const anchor = input.selected
    .map((item) => profileBySource.get(item.node.sourcePath))
    .find((profile) => profile?.roles.has("implementation"));
  if (!anchor) return unchanged(input.selected);

  const adjacency = sourceAdjacency(input.nodes, input.edges);
  const sourceDegrees = new Map([...adjacency].map(([sourcePath, neighbors]) => [sourcePath, neighbors.size]));
  const selected = pruneUnownedNoise(input.selected, profileBySource, anchor, adjacency, input.analysis.raw);
  const selectedSources = new Set(selected.map((item) => item.node.sourcePath));
  const topScore = Math.max(1, ...input.scored.map((item) => item.score));

  for (const facet of facets) {
    if (facetCovered(facet, selectedSources, profileBySource)) continue;
    if (selected.length >= input.limit) break;
    const candidate = profiles
      .filter((profile) => !selectedSources.has(profile.sourcePath))
      .map((profile) => candidateForFacet({
        facet,
        profile,
        anchor,
        adjacency,
        sourceDegrees,
        topScore
      }))
      .filter((candidate): candidate is { profile: SourceProfile; gain: number; relation: RelationPath } => Boolean(candidate))
      .sort((left, right) => right.gain - left.gain
        || right.relation.strength - left.relation.strength
        || left.relation.hops - right.relation.hops
        || left.profile.sourcePath.localeCompare(right.profile.sourcePath))[0];
    if (!candidate || candidate.gain < 0.55) continue;
    selected.push({
      ...candidate.profile.item,
      reasons: [
        `closes task evidence facet ${facet.id} with gain ${candidate.gain.toFixed(3)}`,
        `relation closure from ${anchor.sourcePath} in ${candidate.relation.hops} hop(s)`,
        ...candidate.profile.item.reasons
      ].slice(0, 4)
    });
    selectedSources.add(candidate.profile.sourcePath);
  }

  const requiredFacets = facets.map((facet) => facet.id);
  const coveredFacets = facets
    .filter((facet) => facetCovered(facet, selectedSources, profileBySource))
    .map((facet) => facet.id);
  const covered = new Set(coveredFacets);
  return {
    applied: true,
    route: selected.slice(0, input.limit),
    requiredFacets,
    coveredFacets,
    missingFacets: requiredFacets.filter((facet) => !covered.has(facet))
  };
}

export function deriveTaskEvidenceFacets(analysis: TaskAnalysis): EvidenceFacet[] {
  const clauses = splitTaskClauses(analysis.raw);
  const facets: EvidenceFacet[] = [];
  for (const [clauseIndex, clause] of clauses.entries()) {
    const kind = clauseKind(clause);
    const identifiers = analysis.identifiers.filter((identifier) => clauseIncludesIdentifier(clause, identifier));
    const identifierTerms = new Set(identifiers.flatMap(identifierTokens));
    for (const identifier of identifiers) {
      facets.push({
        id: `${kind}:identifier:${compactCodeIdentifier(identifier)}`,
        kind: kind === "verification" || kind === "generated" ? kind : "identifier",
        terms: identifierTokens(identifier),
        identifier: compactCodeIdentifier(identifier)
      });
    }
    const residualTerms = semanticTerms(clause).filter((term) => !identifierTerms.has(term));
    if (kind === "verification") {
      if (!identifiers.length) facets.push({ id: `verification:clause-${clauseIndex}`, kind, terms: residualTerms });
      continue;
    }
    if (kind === "generated") {
      facets.push({ id: `generated:clause-${clauseIndex}`, kind, terms: residualTerms });
      continue;
    }
    if (kind === "constraint") {
      if (!identifiers.length && residualTerms.length) {
        facets.push({ id: `constraint:clause-${clauseIndex}`, kind, terms: residualTerms });
      }
      continue;
    }
    if (residualTerms.length) {
      facets.push({ id: `concern:clause-${clauseIndex}`, kind: "concern", terms: residualTerms });
    }
  }
  return dedupeFacets(facets.filter((facet) => facet.identifier || facet.terms.length));
}

function splitTaskClauses(task: string): string[] {
  return task
    .replace(/\bwhile\s+preserving\b/gi, ", preserve")
    .replace(/\band\s+(?=(?:add|preserve|rebuild|regenerate|synchronize|sync|update|verify)\b)/gi, ", ")
    .split(/[,;，；。]+/)
    .flatMap((clause) => clause.split(/\bso(?:\s+that)?\b/i))
    .map((clause) => clause.trim())
    .filter(Boolean);
}

function clauseKind(clause: string): EvidenceFacetKind {
  if (/\b(?:generated|rebuild|regenerate|synchronize|sync)\b/i.test(clause)) return "generated";
  if (/\b(?:test|tests|testing|verification|verify|regression)\b/i.test(clause)) return "verification";
  if (/\b(?:compatibility|compatible|legacy|preserve|without)\b/i.test(clause)) return "constraint";
  return "concern";
}

function candidateForFacet(input: {
  facet: EvidenceFacet;
  profile: SourceProfile;
  anchor: SourceProfile;
  adjacency: Map<string, Map<string, number>>;
  sourceDegrees: Map<string, number>;
  topScore: number;
}): { profile: SourceProfile; gain: number; relation: RelationPath } | undefined {
  if (!profileSupportsFacet(input.profile, input.facet)) return undefined;
  const relation = strongestSourcePath(input.anchor.sourcePath, input.profile.sourcePath, input.adjacency, 2);
  if (!relation) return undefined;
  const explicitIdentifier = Boolean(input.facet.identifier && profileIdentifierMatch(input.profile, input.facet.identifier));
  const sameOwnership = input.profile.ownership === input.anchor.ownership;
  const sameLanguage = input.profile.language === input.anchor.language;
  if (input.facet.kind !== "generated" && !explicitIdentifier && (!sameOwnership || !sameLanguage)) return undefined;

  const lexicalAffinity = facetAffinity(input.facet, input.profile);
  if (lexicalAffinity <= 0 && !explicitIdentifier) return undefined;
  const scoredAffinity = Math.max(0, input.profile.item.score / input.topScore);
  const taskAffinity = Math.min(1, Math.max(lexicalAffinity, scoredAffinity));
  const degreePenalty = Math.min(1, Math.log2(1 + (input.sourceDegrees.get(input.profile.sourcePath) ?? 0)) / 8);
  const gain = round(
    0.45 * taskAffinity
      + 0.30 * relation.strength
      + 0.25
      - 0.20 * degreePenalty
  );
  return { profile: input.profile, gain, relation };
}

function facetCovered(
  facet: EvidenceFacet,
  selectedSources: Set<string>,
  profiles: Map<string, SourceProfile>
): boolean {
  return [...selectedSources].some((sourcePath) => {
    const profile = profiles.get(sourcePath);
    return profile ? profileSupportsFacet(profile, facet) : false;
  });
}

function profileSupportsFacet(profile: SourceProfile, facet: EvidenceFacet): boolean {
  if (facet.kind === "verification" && !profile.roles.has("verification")) return false;
  if (facet.kind === "generated" && !profile.roles.has("generated")) return false;
  if (["identifier", "concern", "constraint"].includes(facet.kind)
    && !profile.roles.has("implementation")
    && !profile.roles.has("contract")) return false;
  if (facet.identifier && facet.kind === "identifier") {
    return profileIdentifierMatch(profile, facet.identifier);
  }
  if (facet.identifier && profileIdentifierMatch(profile, facet.identifier)) return true;
  return facetAffinity(facet, profile) > 0;
}

function profileIdentifierMatch(profile: SourceProfile, identifier: string): boolean {
  const compact = compactCodeIdentifier(identifier);
  return profile.nodes.some((node) => {
    const candidates = [node.title, node.object?.qualifiedName, node.object?.declarationKey]
      .filter((value): value is string => Boolean(value))
      .map(compactCodeIdentifier);
    return candidates.some((candidate) => candidate === compact || candidate.endsWith(compact));
  });
}

function facetAffinity(facet: EvidenceFacet, profile: SourceProfile): number {
  if (!facet.terms.length) return facet.kind === "verification" || facet.kind === "generated" ? 1 : 0;
  const matched = facet.terms.filter((term) => (
    [...profile.identityTerms].some((candidate) => termEquivalent(term, candidate))
  ));
  if (!matched.length) return 0;
  return Math.min(1, matched.length / Math.min(3, facet.terms.length));
}

function pruneUnownedNoise(
  selected: ScoredNode[],
  profileBySource: Map<string, SourceProfile>,
  anchor: SourceProfile,
  adjacency: Map<string, Map<string, number>>,
  task: string
): ScoredNode[] {
  const seen = new Set<string>();
  return selected.filter((item) => {
    const sourcePath = item.node.sourcePath;
    if (seen.has(sourcePath)) return false;
    seen.add(sourcePath);
    if (sourcePath === anchor.sourcePath || taskExplicitlyNamesPath(task, sourcePath)) return true;
    const profile = profileBySource.get(sourcePath);
    if (!profile) return false;
    if (profile.ownership === anchor.ownership && profile.language === anchor.language) return true;
    return Boolean(strongestSourcePath(anchor.sourcePath, sourcePath, adjacency, 2));
  });
}

function sourceProfiles(nodes: PalaceNode[], scored: ScoredNode[]): SourceProfile[] {
  const grouped = new Map<string, PalaceNode[]>();
  for (const node of nodes) grouped.set(node.sourcePath, [...(grouped.get(node.sourcePath) ?? []), node]);
  const scoredBySource = new Map<string, ScoredNode>();
  for (const item of scored) {
    const current = scoredBySource.get(item.node.sourcePath);
    if (!current || item.score > current.score) scoredBySource.set(item.node.sourcePath, item);
  }
  return [...grouped].flatMap(([sourcePath, sourceNodes]) => {
    const physical = sourceNodes.find((node) => !node.startLine) ?? sourceNodes[0];
    if (!physical || physical.kind === "directory") return [];
    const item = scoredBySource.get(sourcePath) ?? {
      node: physical,
      score: 0,
      reasons: ["relation-connected evidence-facet candidate"],
      matchedKeywordCount: 0
    };
    const identityText = sourceNodes.flatMap((node) => [
      node.sourcePath,
      node.title,
      node.object?.qualifiedName ?? "",
      node.object?.declarationKey ?? "",
      ...node.tags
    ]).join(" ");
    return [{
      sourcePath,
      nodes: sourceNodes,
      item,
      identityTerms: tokenSet(identityText),
      roles: new Set(sourceNodes.flatMap((node) => [
        ...(nodeHasEvidenceRole(node, "implementation") ? ["implementation"] : []),
        ...(nodeHasEvidenceRole(node, "verification") ? ["verification"] : []),
        ...(nodeHasEvidenceRole(node, "contract") ? ["contract"] : []),
        ...(nodeHasEvidenceRole(node, "generated") ? ["generated"] : [])
      ])),
      language: languageFamily(sourcePath),
      ownership: ownershipScope(sourcePath)
    }];
  });
}

function sourceAdjacency(nodes: PalaceNode[], edges: PalaceEdge[]): Map<string, Map<string, number>> {
  const sourceById = new Map(nodes.map((node) => [node.id, node.sourcePath]));
  const adjacency = new Map<string, Map<string, number>>();
  for (const edge of edges) {
    if (!RELATION_TYPES.has(edge.type)) continue;
    const from = sourceById.get(edge.from);
    const to = sourceById.get(edge.to);
    if (!from || !to || from === to) continue;
    connect(adjacency, from, to, edge.weight);
    connect(adjacency, to, from, edge.weight);
  }
  return adjacency;
}

function strongestSourcePath(
  start: string,
  target: string,
  adjacency: Map<string, Map<string, number>>,
  maximumHops: number
): RelationPath | undefined {
  if (start === target) return { hops: 0, strength: 1 };
  const queue = [{ sourcePath: start, hops: 0, strength: 1 }];
  const best = new Map<string, number>([[start, 1]]);
  let result: RelationPath | undefined;
  while (queue.length) {
    const current = queue.shift()!;
    if (current.hops >= maximumHops) continue;
    for (const [neighbor, edgeWeight] of adjacency.get(current.sourcePath) ?? []) {
      const hops = current.hops + 1;
      const strength = Math.min(current.strength, edgeWeight) * (hops === 1 ? 1 : 0.9);
      if (strength <= (best.get(neighbor) ?? 0)) continue;
      best.set(neighbor, strength);
      if (neighbor === target) {
        if (!result || strength > result.strength || (strength === result.strength && hops < result.hops)) {
          result = { hops, strength };
        }
        continue;
      }
      queue.push({ sourcePath: neighbor, hops, strength });
    }
  }
  return result;
}

function connect(adjacency: Map<string, Map<string, number>>, from: string, to: string, weight: number): void {
  const neighbors = adjacency.get(from) ?? new Map<string, number>();
  neighbors.set(to, Math.max(neighbors.get(to) ?? 0, weight));
  adjacency.set(from, neighbors);
}

function semanticTerms(value: string): string[] {
  return [...tokenizeLexical(value)]
    .map(normalizeTerm)
    .filter((term) => term.length >= 3 && !ACTION_NOISE.has(term) && !FACET_SIGNAL_NOISE.has(term));
}

function identifierTokens(identifier: string): string[] {
  return [...tokenizeLexical(identifier)].map(normalizeTerm).filter((term) => term.length >= 2);
}

function tokenSet(value: string): Set<string> {
  return new Set([...tokenizeLexical(value)].map(normalizeTerm).filter(Boolean));
}

function normalizeTerm(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (normalized.length > 5 && normalized.endsWith("ing")) return normalized.slice(0, -3);
  if (normalized.length > 4 && normalized.endsWith("ed")) return normalized.slice(0, -2);
  if (normalized.length > 4 && normalized.endsWith("s")) return normalized.slice(0, -1);
  return normalized;
}

function termEquivalent(left: string, right: string): boolean {
  if (left === right) return true;
  const length = Math.min(left.length, right.length);
  if (length < 4) return false;
  let common = 0;
  while (common < length && left[common] === right[common]) common += 1;
  return common >= 4 && common / length >= 0.7;
}

function clauseIncludesIdentifier(clause: string, identifier: string): boolean {
  return compactCodeIdentifier(clause).includes(compactCodeIdentifier(identifier));
}

function taskExplicitlyNamesPath(task: string, sourcePath: string): boolean {
  const normalizedTask = task.replaceAll("\\", "/").toLowerCase();
  const normalizedPath = sourcePath.replaceAll("\\", "/").toLowerCase();
  return normalizedTask.includes(normalizedPath) || normalizedTask.includes(path.posix.basename(normalizedPath));
}

function ownershipScope(sourcePath: string): string {
  const parts = sourcePath.replaceAll("\\", "/").split("/");
  if (["apps", "clients", "packages", "services"].includes(parts[0]) && parts[1]) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts.length > 1 ? parts[0] : "<root>";
}

function languageFamily(sourcePath: string): string {
  const extension = path.posix.extname(sourcePath.toLowerCase());
  if ([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"].includes(extension)) return "javascript";
  if (extension === ".py") return "python";
  if (extension === ".go") return "go";
  if (extension === ".rs") return "rust";
  return extension || "unknown";
}

function dedupeFacets(facets: EvidenceFacet[]): EvidenceFacet[] {
  const seen = new Set<string>();
  return facets.filter((facet) => {
    const key = `${facet.kind}:${facet.identifier ?? facet.terms.join("-")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function unchanged(route: ScoredNode[]): EvidenceFacetClosure {
  return { applied: false, route, requiredFacets: [], coveredFacets: [], missingFacets: [] };
}

function round(value: number): number {
  return Number(value.toFixed(6));
}
