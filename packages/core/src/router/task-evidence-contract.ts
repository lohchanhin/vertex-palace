import type { EvidenceClosure, PalaceNode } from "@vertex-palace/shared";
import type { ScoredNode } from "./route-scorer";

const TASK_PATH_PATTERN = /(?:^|[\s`'"])((?:\.{1,2}[\\/])?[A-Za-z0-9_.@+-]+(?:[\\/][A-Za-z0-9_.@+-]+)*\.[A-Za-z][A-Za-z0-9]{0,11})(?=$|[\s`'":,;)\].])/g;

export type ExplicitEvidenceContract = {
  requiredPaths: string[];
  matchedPaths: string[];
  missingPaths: string[];
  route: ScoredNode[];
};

export function enforceExplicitEvidenceContract(
  selected: ScoredNode[],
  scored: ScoredNode[],
  nodes: PalaceNode[],
  task: string,
  limit: number
): ExplicitEvidenceContract {
  const requiredPaths = extractExplicitTaskPaths(task);
  if (!requiredPaths.length) {
    return { requiredPaths: [], matchedPaths: [], missingPaths: [], route: selected.slice(0, limit) };
  }

  const availableSources = sourcePathMap(nodes);
  const selectedBySource = bestBySource(selected);
  const scoredBySource = bestBySource(scored);
  const mandatory: ScoredNode[] = [];
  for (const requiredPath of requiredPaths) {
    const actualSource = availableSources.get(pathKey(requiredPath));
    if (!actualSource) continue;
    const existing = selectedBySource.get(pathKey(actualSource));
    const candidate = existing
      ?? scoredBySource.get(pathKey(actualSource))
      ?? fallbackScoredNode(nodes, actualSource, scored[0]?.score ?? selected[0]?.score ?? 1);
    if (!candidate) continue;
    mandatory.push({
      ...candidate,
      reasons: [
        `explicit task evidence contract requires ${actualSource}`,
        ...candidate.reasons
      ]
    });
  }

  const mandatorySources = new Set(mandatory.map((item) => pathKey(item.node.sourcePath)));
  const route = uniqueBySource([
    ...mandatory,
    ...selected.filter((item) => !mandatorySources.has(pathKey(item.node.sourcePath)))
  ]).slice(0, limit);
  const routedSources = new Set(route.map((item) => pathKey(item.node.sourcePath)));
  const matchedPaths = requiredPaths.filter((requiredPath) => {
    const actualSource = availableSources.get(pathKey(requiredPath));
    return Boolean(actualSource && routedSources.has(pathKey(actualSource)));
  });
  const matched = new Set(matchedPaths.map(pathKey));
  const missingPaths = requiredPaths.filter((requiredPath) => !matched.has(pathKey(requiredPath)));
  return { requiredPaths, matchedPaths, missingPaths, route };
}

export function applyExplicitEvidenceContractToClosure(
  closure: EvidenceClosure,
  contract: ExplicitEvidenceContract
): EvidenceClosure {
  if (!contract.missingPaths.length) return closure;
  const missingSources = contract.missingPaths.map((sourcePath) => `explicit:${sourcePath}`);
  return {
    ...closure,
    status: "insufficient",
    requiredCausalSources: unique([...closure.requiredCausalSources, ...contract.requiredPaths.map((sourcePath) => `explicit:${sourcePath}`)]),
    missingCausalSources: unique([...closure.missingCausalSources, ...missingSources]),
    reasons: unique([
      ...closure.reasons,
      ...contract.missingPaths.map((sourcePath) => `Explicit task evidence is missing from the route: ${sourcePath}.`)
    ])
  };
}

export function extractExplicitTaskPaths(task: string): string[] {
  return unique(
    [...task.matchAll(TASK_PATH_PATTERN)]
      .map((match) => normalizePath(match[1]))
      .filter(Boolean)
  );
}

function sourcePathMap(nodes: PalaceNode[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const node of nodes) {
    const key = pathKey(node.sourcePath);
    if (!result.has(key)) result.set(key, normalizePath(node.sourcePath));
  }
  return result;
}

function bestBySource(items: ScoredNode[]): Map<string, ScoredNode> {
  const result = new Map<string, ScoredNode>();
  for (const item of items) {
    const key = pathKey(item.node.sourcePath);
    const current = result.get(key);
    if (!current || item.score > current.score) result.set(key, item);
  }
  return result;
}

function fallbackScoredNode(nodes: PalaceNode[], sourcePath: string, topScore: number): ScoredNode | undefined {
  const candidates = nodes.filter((node) => pathKey(node.sourcePath) === pathKey(sourcePath));
  const node = candidates.find((candidate) => !candidate.startLine && ["file", "test", "config", "doc"].includes(candidate.kind))
    ?? candidates.find((candidate) => !candidate.startLine)
    ?? candidates[0];
  return node
    ? {
        node,
        score: Math.max(1, topScore),
        reasons: [`explicit task evidence contract requires ${sourcePath}`],
        matchedKeywordCount: 1
      }
    : undefined;
}

function uniqueBySource(items: ScoredNode[]): ScoredNode[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = pathKey(item.node.sourcePath);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizePath(value: string): string {
  return value.trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

function pathKey(value: string): string {
  return normalizePath(value).toLowerCase();
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
