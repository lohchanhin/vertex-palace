import type {
  EvidenceClosure,
  EvidenceRole,
  EvidenceTermCoverage,
  PalaceEdge,
  PalaceEvidenceFact,
  PalaceNode,
  RouteConfidenceEvidence,
  TaskIntent,
  TaskIntentTerm
} from "@vertex-palace/shared";
import { extractCodeIdentifierCompacts, tokenizeLexical } from "../utils/lexical-tokens";
import { nodeEvidence, nodeHasEvidenceRole } from "./evidence-model";

const CAUSAL_EDGE_TYPES = new Set<PalaceEdge["type"]>([
  "imports",
  "exports",
  "calls",
  "tested_by",
  "tests",
  "documents",
  "configures",
  "depends_on"
]);

const CAUSAL_PARTICIPANT_EDGE_TYPES = new Set<PalaceEdge["type"]>([
  "imports",
  "exports",
  "calls",
  "depends_on"
]);

const MIN_CAUSAL_CONNECTION_STRENGTH = 0.45;

const SEMANTIC_TERM_NOISE = new Set([
  "a",
  "an",
  "and",
  "be",
  "change",
  "changing",
  "do",
  "is",
  "only",
  "the",
  "to",
  "when",
  "without"
]);

const CAUSAL_TERM_NOISE = new Set([
  ...SEMANTIC_TERM_NOISE,
  "add",
  "bug",
  "code",
  "create",
  "expose",
  "feat",
  "feature",
  "fix",
  "implement",
  "improve",
  "project",
  "refactor",
  "repository",
  "test",
  "update",
  "via"
]);

export function evaluateEvidenceClosure(input: {
  intent: TaskIntent;
  selectedNodes: PalaceNode[];
  selectedFacts?: PalaceEvidenceFact[];
  allNodes: PalaceNode[];
  edges: PalaceEdge[];
}): EvidenceClosure {
  const selectedSources = uniqueSourceNodes(input.selectedNodes);
  const selected = selectedSources.filter((node) => {
    const scope = nodeEvidence(node).scope;
    return scope === "unknown" || input.intent.preferredScopes.includes(scope);
  });
  const ignoredOutOfScope = selectedSources.length - selected.length;
  const coveredRoles = new Set<EvidenceRole>();
  for (const node of selected) {
    for (const assignment of nodeEvidence(node).roles) coveredRoles.add(assignment.role);
  }
  const missingRoles = input.intent.requiredRoles.filter((role) => !coveredRoles.has(role));
  const evidenceText = selectedEvidenceText(selected, input.selectedFacts ?? []);
  const requiredSubjects = requiredSubjectTerms(input.intent);
  const termCoverage = {
    subjects: evaluateTermCoverage(requiredSubjects, evidenceText),
    outcomes: evaluateTermCoverage(input.intent.outcomes, evidenceText),
    constraints: evaluateTermCoverage(input.intent.constraints, evidenceText)
  };
  const missingTerms = [
    ...termCoverage.subjects.missing,
    ...termCoverage.outcomes.missing,
    ...termCoverage.constraints.missing
  ];
  const allowedNodes = input.allNodes.filter((node) => {
    const scope = nodeEvidence(node).scope;
    return scope === "unknown" || input.intent.preferredScopes.includes(scope);
  });
  const connectedRolePairs = requiredRolePairs(input.intent.requiredRoles).flatMap(([from, to]) => {
    const connection = minimumSufficientRoleConnection(from, to, selected, allowedNodes, input.edges);
    return connection ? [{ from, to, ...connection }] : [];
  });
  const selectedSourcePaths = new Set(selected.map((node) => node.sourcePath));
  const requiredCausalSources = taskAlignedCausalParticipantSources(
    input.intent,
    selected,
    allowedNodes,
    input.edges
  );
  const missingCausalSources = requiredCausalSources.filter(
    (sourcePath) => !selectedSourcePaths.has(sourcePath)
  );
  const expectedPairCount = requiredRolePairs(input.intent.requiredRoles).length;
  const disconnectedPairs = expectedPairCount - connectedRolePairs.length;
  const reasons = [
    ...missingRoles.map((role) => `Missing required ${role} evidence.`),
    ...termCoverage.subjects.missing.map((term) => `Missing task-subject evidence for "${term}".`),
    ...termCoverage.outcomes.missing.map((term) => `Missing expected-outcome evidence for "${term}".`),
    ...termCoverage.constraints.missing.map((term) => `Missing constraint evidence for "${term}".`),
    ...(missingCausalSources.length
      ? [`Missing ${missingCausalSources.length} task-aligned causal participant(s): ${missingCausalSources.join(", ")}.`]
      : []),
    ...(disconnectedPairs > 0 ? [`${disconnectedPairs} required evidence role pair(s) are not causally connected.`] : []),
    ...(ignoredOutOfScope > 0 ? [`Ignored ${ignoredOutOfScope} selected source(s) outside the task's preferred evidence scope.`] : []),
    ...(missingRoles.length === 0
      && missingTerms.length === 0
      && missingCausalSources.length === 0
      && disconnectedPairs === 0
      ? ["All required evidence roles, task terms, and causal participants are present and connected."]
      : [])
  ];

  return {
    status: missingRoles.length === 0
      && missingTerms.length === 0
      && missingCausalSources.length === 0
      && disconnectedPairs === 0
      ? "sufficient"
      : "insufficient",
    requiredRoles: [...input.intent.requiredRoles],
    coveredRoles: [...coveredRoles],
    missingRoles,
    termCoverage,
    connectedRolePairs,
    requiredCausalSources,
    missingCausalSources,
    reasons
  };
}

export function buildRouteConfidenceEvidence(
  closure: EvidenceClosure,
  competingImplementationAnchors = 0
): RouteConfidenceEvidence {
  const termGroups = Object.values(closure.termCoverage);
  const requiredTermCount = termGroups.reduce((sum, group) => sum + group.required.length, 0);
  const coveredTermCount = termGroups.reduce((sum, group) => sum + group.covered.length, 0);
  const semanticCoverage = requiredTermCount ? coveredTermCount / requiredTermCount : 1;
  const requiredObligations = closure.requiredRoles.length
    + requiredTermCount
    + closure.requiredCausalSources.length;
  const coveredObligations = closure.requiredRoles.length
    - closure.missingRoles.length
    + coveredTermCount
    + closure.requiredCausalSources.length
    - closure.missingCausalSources.length;
  const completeness = requiredObligations ? coveredObligations / requiredObligations : 1;
  const expectedConnections = requiredRolePairs(closure.requiredRoles).length;
  const connectivity = expectedConnections
    ? closure.connectedRolePairs.length / expectedConnections
    : 1;
  const ambiguity = 1 - 1 / (1 + Math.max(0, competingImplementationAnchors));
  const score = completeness * 0.4
    + connectivity * 0.2
    + semanticCoverage * 0.2
    + (1 - ambiguity) * 0.15
    + 0.05;
  return {
    basis: "evidence-closure-v2",
    score: Number(Math.max(0.1, Math.min(0.99, score)).toFixed(3)),
    completeness: Number(completeness.toFixed(3)),
    connectivity: Number(connectivity.toFixed(3)),
    semanticCoverage: Number(semanticCoverage.toFixed(3)),
    ambiguity: Number(ambiguity.toFixed(3)),
    indexFreshness: "fresh",
    memoryReliability: "not-applied"
  };
}

function requiredSubjectTerms(intent: TaskIntent): TaskIntentTerm[] {
  const explicitIdentifiers = intent.subjects.filter(
    (term) => term.kind === "identifier" && term.source === "explicit"
  );
  if (explicitIdentifiers.length) return explicitIdentifiers;
  return intent.subjects.filter((term) => term.kind === "concept").slice(0, 2);
}

function evaluateTermCoverage(terms: TaskIntentTerm[], evidenceText: string): EvidenceTermCoverage {
  const covered: string[] = [];
  const missing: string[] = [];
  for (const term of terms) {
    (termCovered(term, evidenceText) ? covered : missing).push(term.value);
  }
  return {
    required: terms.map((term) => term.value),
    covered,
    missing
  };
}

function termCovered(term: TaskIntentTerm, evidenceText: string): boolean {
  if (term.kind === "identifier") {
    return extractCodeIdentifierCompacts(evidenceText).has(term.normalized);
  }
  const evidenceTokens = tokenizeLexical(evidenceText);
  const termTokens = [...tokenizeLexical(term.value)]
    .filter((token) => token.length > 1 && !SEMANTIC_TERM_NOISE.has(token));
  return termTokens.length > 0 && termTokens.every((token) => evidenceTokens.has(token));
}

function selectedEvidenceText(nodes: PalaceNode[], facts: PalaceEvidenceFact[]): string {
  return [
    ...nodes.flatMap((node) => [
      node.sourcePath,
      node.title,
      node.summary,
      node.lod.level4,
      ...node.tags
    ]),
    ...facts.flatMap((fact) => [fact.name, fact.searchText ?? ""])
  ].join(" ");
}

function taskAlignedCausalParticipantSources(
  intent: TaskIntent,
  selected: PalaceNode[],
  allNodes: PalaceNode[],
  edges: PalaceEdge[]
): string[] {
  if (intent.implementationBoundary === "declaration") return [];
  const selectedImplementationSources = new Set(
    selected
      .filter((node) => nodeHasEvidenceRole(node, "implementation"))
      .map((node) => node.sourcePath)
  );
  if (!selectedImplementationSources.size) return [];
  const explicitIdentifiers = intent.subjects.filter(
    (term) => term.kind === "identifier" && term.source === "explicit"
  );
  const selectedImplementationEvidence = selectedEvidenceText(
    selected.filter((node) => nodeHasEvidenceRole(node, "implementation")),
    []
  );
  const explicitExpansionTerms = explicitIdentifiers.length > 1
    ? explicitIdentifiers.filter((term) => !termCovered(term, selectedImplementationEvidence))
    : explicitIdentifiers;
  const expandExplicitContract = explicitExpansionTerms.length > 0 && selected.some(
    (node) => nodeHasEvidenceRole(node, "implementation")
      && nodeHasEvidenceRole(node, "contract")
      && explicitIdentifiers.some((term) => termCovered(term, selectedEvidenceText([node], [])))
  );

  const nodesBySource = new Map<string, PalaceNode[]>();
  for (const node of allNodes) {
    if (!nodeHasEvidenceRole(node, "implementation")) continue;
    const current = nodesBySource.get(node.sourcePath) ?? [];
    current.push(node);
    nodesBySource.set(node.sourcePath, current);
  }
  const adjacency = participantSourceAdjacency(allNodes, edges);
  return [...nodesBySource]
    .filter(([sourcePath]) => [...selectedImplementationSources].some(
      (selectedSource) => selectedSource !== sourcePath
        && (adjacency.get(selectedSource)?.has(sourcePath) ?? false)
    ))
    .filter(([, sourceNodes]) => sourceMatchesCausalIntent(
      sourceNodes,
      intent,
      expandExplicitContract ? explicitExpansionTerms : []
    ))
    .map(([sourcePath]) => sourcePath)
    .sort();
}

function participantSourceAdjacency(
  nodes: PalaceNode[],
  edges: PalaceEdge[]
): Map<string, Set<string>> {
  const sourceById = new Map(nodes.map((node) => [node.id, node.sourcePath]));
  const adjacency = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!CAUSAL_PARTICIPANT_EDGE_TYPES.has(edge.type)) continue;
    const from = sourceById.get(edge.from);
    const to = sourceById.get(edge.to);
    if (!from || !to || from === to) continue;
    connectSources(adjacency, from, to);
    connectSources(adjacency, to, from);
  }
  return adjacency;
}

function connectSources(adjacency: Map<string, Set<string>>, from: string, to: string): void {
  const neighbors = adjacency.get(from) ?? new Set<string>();
  neighbors.add(to);
  adjacency.set(from, neighbors);
}

function sourceMatchesCausalIntent(
  nodes: PalaceNode[],
  intent: TaskIntent,
  explicitExpansionTerms: TaskIntentTerm[]
): boolean {
  const evidenceText = selectedEvidenceText(nodes, []);
  const identifiers = intent.subjects.filter(
    (term) => term.kind === "identifier" && term.source === "explicit"
  );
  if (identifiers.length) {
    if (!explicitExpansionTerms.length) return false;
    if (!explicitExpansionTerms.some((term) => termCovered(term, evidenceText))) return false;
  }

  const concepts = intent.subjects.filter(
    (term) => term.kind === "concept"
      && !CAUSAL_TERM_NOISE.has(term.normalized)
      && term.normalized.length > 1
  );
  if (!concepts.length) return identifiers.length > 0;
  const coveredConcepts = concepts.filter((term) => termCovered(term, evidenceText)).length;
  return coveredConcepts >= (identifiers.length ? 1 : Math.min(2, concepts.length));
}

function requiredRolePairs(roles: EvidenceRole[]): Array<[EvidenceRole, EvidenceRole]> {
  const required = new Set(roles);
  const pairs: Array<[EvidenceRole, EvidenceRole]> = [];
  if (required.has("implementation") && required.has("verification")) pairs.push(["implementation", "verification"]);
  if (required.has("implementation") && required.has("contract")) pairs.push(["implementation", "contract"]);
  if (required.has("implementation") && required.has("configuration")) pairs.push(["implementation", "configuration"]);
  if (!required.has("implementation") && required.has("documentation") && required.has("verification")) {
    pairs.push(["documentation", "verification"]);
  }
  return pairs;
}

function minimumSufficientRoleConnection(
  fromRole: EvidenceRole,
  toRole: EvidenceRole,
  selected: PalaceNode[],
  allNodes: PalaceNode[],
  edges: PalaceEdge[]
): { strength: number; hops: number; via: string[] } | undefined {
  const fromSources = new Set(selected.filter((node) => nodeHasEvidenceRole(node, fromRole)).map((node) => node.sourcePath));
  const toSources = new Set(selected.filter((node) => nodeHasEvidenceRole(node, toRole)).map((node) => node.sourcePath));
  if (!fromSources.size || !toSources.size) return undefined;
  const adjacency = sourceAdjacency(allNodes, edges);
  const direct = strongestDirectConnection(fromSources, toSources, adjacency);
  if (direct) return direct;
  let strongest: { strength: number; hops: number; via: string[] } | undefined;
  for (const source of fromSources) {
    const candidate = strongestPath(source, toSources, adjacency, 3);
    if (!candidate) continue;
    if (!strongest || candidate.strength > strongest.strength || (
      candidate.strength === strongest.strength && candidate.hops < strongest.hops
    )) strongest = candidate;
  }
  return strongest && strongest.strength >= MIN_CAUSAL_CONNECTION_STRENGTH ? strongest : undefined;
}

function strongestDirectConnection(
  fromSources: Set<string>,
  toSources: Set<string>,
  adjacency: Map<string, Map<string, number>>
): { strength: number; hops: number; via: string[] } | undefined {
  let strongest: { strength: number; hops: number; via: string[] } | undefined;
  for (const source of fromSources) {
    for (const target of toSources) {
      const strength = adjacency.get(source)?.get(target) ?? 0;
      if (strength < MIN_CAUSAL_CONNECTION_STRENGTH) continue;
      if (!strongest || strength > strongest.strength) {
        strongest = { strength, hops: 1, via: [] };
      }
    }
  }
  return strongest;
}

function sourceAdjacency(nodes: PalaceNode[], edges: PalaceEdge[]): Map<string, Map<string, number>> {
  const sourceById = new Map(nodes.map((node) => [node.id, node.sourcePath]));
  const adjacency = new Map<string, Map<string, number>>();
  for (const edge of edges) {
    if (!CAUSAL_EDGE_TYPES.has(edge.type)) continue;
    const from = sourceById.get(edge.from);
    const to = sourceById.get(edge.to);
    if (!from || !to || from === to) continue;
    connect(adjacency, from, to, edge.weight);
    connect(adjacency, to, from, edge.weight);
  }
  return adjacency;
}

function strongestPath(
  start: string,
  targets: Set<string>,
  adjacency: Map<string, Map<string, number>>,
  maxHops: number
): { strength: number; hops: number; via: string[] } | undefined {
  const queue: Array<{ sourcePath: string; strength: number; hops: number; path: string[] }> = [
    { sourcePath: start, strength: 1, hops: 0, path: [start] }
  ];
  const best = new Map<string, number>([[start, 1]]);
  let strongest: { strength: number; hops: number; via: string[] } | undefined;
  while (queue.length) {
    const current = queue.shift()!;
    if (current.hops >= maxHops) continue;
    for (const [neighbor, edgeWeight] of adjacency.get(current.sourcePath) ?? []) {
      const hops = current.hops + 1;
      const strength = Math.min(current.strength, edgeWeight) * (hops === 1 ? 1 : 0.9);
      if (strength <= (best.get(neighbor) ?? 0)) continue;
      best.set(neighbor, strength);
      if (targets.has(neighbor)) {
        if (!strongest || strength > strongest.strength || (strength === strongest.strength && hops < strongest.hops)) {
          strongest = { strength, hops, via: [...current.path, neighbor].slice(1, -1) };
        }
      }
      queue.push({ sourcePath: neighbor, strength, hops, path: [...current.path, neighbor] });
    }
  }
  return strongest;
}

function connect(adjacency: Map<string, Map<string, number>>, from: string, to: string, weight: number): void {
  const neighbors = adjacency.get(from) ?? new Map<string, number>();
  neighbors.set(to, Math.max(neighbors.get(to) ?? 0, weight));
  adjacency.set(from, neighbors);
}

function uniqueSourceNodes(nodes: PalaceNode[]): PalaceNode[] {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    if (seen.has(node.sourcePath)) return false;
    seen.add(node.sourcePath);
    return true;
  });
}
