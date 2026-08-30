import type { EvidenceClosure, PalaceNode } from "@vertex-palace/shared";
import { compactCodeIdentifier, extractCodeIdentifiers } from "../utils/lexical-tokens";
import type { ScoredNode } from "./route-scorer";

const TASK_PATH_PATTERN = /(?:^|[\s`'"])((?:\.{1,2}[\\/])?[A-Za-z0-9_.@+-]+(?:[\\/][A-Za-z0-9_.@+-]+)*\.[A-Za-z][A-Za-z0-9]{0,11})(?=$|[\s`'":,;)\].])/g;

export type ExplicitEvidenceContract = {
  requiredPaths: string[];
  matchedPaths: string[];
  missingPaths: string[];
  requiredSymbols: string[];
  matchedSymbols: string[];
  missingSymbols: string[];
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
  const requiredSymbols = extractExplicitTaskSymbols(task, requiredPaths);
  if (!requiredPaths.length && !requiredSymbols.length) {
    return {
      requiredPaths: [],
      matchedPaths: [],
      missingPaths: [],
      requiredSymbols: [],
      matchedSymbols: [],
      missingSymbols: [],
      route: selected.slice(0, limit)
    };
  }

  const availableSources = sourcePathMap(nodes);
  const selectedBySource = bestBySource(selected);
  const scoredBySource = bestBySource(scored);
  const mandatory: Array<{ item: ScoredNode; position: number }> = [];
  for (const requiredPath of requiredPaths) {
    const actualSource = availableSources.get(pathKey(requiredPath));
    if (!actualSource) continue;
    const existing = selectedBySource.get(pathKey(actualSource));
    const candidate = existing
      ?? scoredBySource.get(pathKey(actualSource))
      ?? fallbackScoredNode(nodes, actualSource, scored[0]?.score ?? selected[0]?.score ?? 1);
    if (!candidate) continue;
    mandatory.push({
      item: {
        ...candidate,
        reasons: [
          `explicit task evidence contract requires ${actualSource}`,
          ...candidate.reasons
        ]
      },
      position: taskIdentityPosition(task, requiredPath)
    });
  }

  for (const requiredSymbol of requiredSymbols) {
    const candidate = bestSymbolCandidate(selected, scored, nodes, requiredSymbol);
    if (!candidate) continue;
    mandatory.push({
      item: {
        ...candidate,
        reasons: [
          `explicit task evidence contract requires symbol ${requiredSymbol}`,
          ...candidate.reasons
        ]
      },
      position: taskIdentityPosition(task, requiredSymbol)
    });
  }

  mandatory.sort((a, b) => a.position - b.position || b.item.score - a.item.score);

  const mandatoryItems = mandatory.map(({ item }) => item);
  const mandatorySources = new Set(mandatoryItems.map((item) => pathKey(item.node.sourcePath)));
  const route = uniqueBySource([
    ...mandatoryItems,
    ...selected.filter((item) => !mandatorySources.has(pathKey(item.node.sourcePath)))
  ]).slice(0, limit);
  const routedSources = new Set(route.map((item) => pathKey(item.node.sourcePath)));
  const matchedPaths = requiredPaths.filter((requiredPath) => {
    const actualSource = availableSources.get(pathKey(requiredPath));
    return Boolean(actualSource && routedSources.has(pathKey(actualSource)));
  });
  const matched = new Set(matchedPaths.map(pathKey));
  const missingPaths = requiredPaths.filter((requiredPath) => !matched.has(pathKey(requiredPath)));
  const matchedSymbols = requiredSymbols.filter((requiredSymbol) =>
    route.some((item) => symbolMatchScore(item, requiredSymbol) > 0)
  );
  const matchedSymbolKeys = new Set(matchedSymbols.map(symbolKey));
  const missingSymbols = requiredSymbols.filter(
    (requiredSymbol) => !matchedSymbolKeys.has(symbolKey(requiredSymbol))
  );
  return {
    requiredPaths,
    matchedPaths,
    missingPaths,
    requiredSymbols,
    matchedSymbols,
    missingSymbols,
    route
  };
}

export function applyExplicitEvidenceContractToClosure(
  closure: EvidenceClosure,
  contract: ExplicitEvidenceContract
): EvidenceClosure {
  if (!contract.missingPaths.length && !contract.missingSymbols.length) return closure;
  const missingSources = contract.missingPaths.map((sourcePath) => `explicit:${sourcePath}`);
  const missingSymbols = contract.missingSymbols.map((symbol) => `explicit-symbol:${symbol}`);
  return {
    ...closure,
    status: "insufficient",
    requiredCausalSources: unique([
      ...closure.requiredCausalSources,
      ...contract.requiredPaths.map((sourcePath) => `explicit:${sourcePath}`),
      ...contract.requiredSymbols.map((symbol) => `explicit-symbol:${symbol}`)
    ]),
    missingCausalSources: unique([...closure.missingCausalSources, ...missingSources, ...missingSymbols]),
    reasons: unique([
      ...closure.reasons,
      ...contract.missingPaths.map((sourcePath) => `Explicit task evidence is missing from the route: ${sourcePath}.`),
      ...contract.missingSymbols.map((symbol) => `Explicit task symbol is missing from the route: ${symbol}.`)
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

export function extractExplicitTaskSymbols(task: string, explicitPaths = extractExplicitTaskPaths(task)): string[] {
  const pathKeys = new Set(explicitPaths.flatMap((explicitPath) => {
    const normalizedPath = normalizePath(explicitPath);
    const basename = normalizedPath.split("/").at(-1) ?? normalizedPath;
    return [symbolKey(normalizedPath), symbolKey(basename)];
  }));
  const delimited = [...task.matchAll(/`([^`\r\n]+)`/g)]
    .flatMap((match) => match[1]?.match(/[A-Za-z_$][A-Za-z0-9_$]*(?:(?:\.|::|#)[A-Za-z_$][A-Za-z0-9_$]*)*/g) ?? [])
    .map(normalizeSymbol);
  const delimitedKeys = new Set(delimited.map(symbolKey));
  const qualified = [...task.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*(?:(?:\.|::|#)[A-Za-z_$][A-Za-z0-9_$]*)+)\b/g)]
    .flatMap((match) => match[1] ? [normalizeSymbol(match[1])] : []);
  const qualifiedSegmentKeys = new Set(
    qualified.flatMap((symbol) => symbolSegments(symbol).map(symbolKey))
  );
  const calls = [...task.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\(\s*\)/g)]
    .flatMap((match) => match[1] ? [normalizeSymbol(match[1])] : []);
  return unique(
    [...delimited, ...qualified, ...calls, ...extractCodeIdentifiers(task)]
      .map(normalizeSymbol)
      .filter(Boolean)
      .filter((symbol) => !pathKeys.has(symbolKey(symbol)))
      .filter((symbol) => delimitedKeys.has(symbolKey(symbol)) || calls.includes(symbol) || isStrongExplicitSymbol(symbol))
      .filter((symbol) =>
        /\./.test(symbol)
        || delimitedKeys.has(symbolKey(symbol))
        || calls.includes(symbol)
        || !qualifiedSegmentKeys.has(symbolKey(symbol))
      )
      .filter((symbol) => isRequestedSymbolIdentity(task, symbol))
  );
}

function bestSymbolCandidate(
  selected: ScoredNode[],
  scored: ScoredNode[],
  nodes: PalaceNode[],
  requiredSymbol: string
): ScoredNode | undefined {
  const itemByNode = new Map<string, ScoredNode>();
  for (const item of [...selected, ...scored]) {
    const current = itemByNode.get(item.node.id);
    if (!current || item.score > current.score) itemByNode.set(item.node.id, item);
  }
  const topScore = scored[0]?.score ?? selected[0]?.score ?? 1;
  const directMatches = [...itemByNode.values()].filter(
    (item) => symbolMatchScore(item, requiredSymbol) > 0
  );
  const fallbackMatches = nodes
    .filter((node) => symbolMatchScore({
      node,
      score: 0,
      reasons: [],
      matchedKeywordCount: 0
    }, requiredSymbol) > 0)
    .map((node) => itemByNode.get(node.id) ?? {
      node,
      score: Math.max(1, topScore),
      reasons: [`exact indexed symbol match ${requiredSymbol}`],
      matchedKeywordCount: 1
    });
  return uniqueByNode([...directMatches, ...fallbackMatches])
    .sort((a, b) =>
      symbolMatchScore(b, requiredSymbol) - symbolMatchScore(a, requiredSymbol)
        || b.score - a.score
        || a.node.sourcePath.localeCompare(b.node.sourcePath)
    )[0];
}

function symbolMatchScore(item: ScoredNode, requiredSymbol: string): number {
  if (!isSymbolEvidenceNode(item)) return 0;
  const requested = symbolKey(requiredSymbol);
  if (!requested) return 0;
  const qualifiedName = symbolKey(item.node.object?.qualifiedName ?? "");
  if (qualifiedName && qualifiedName === requested) return 5;

  const requestedSegments = symbolSegments(requiredSymbol);
  const objectOwner = symbolKey(item.node.object?.ownerName ?? "");
  const objectLocal = symbolKey(item.node.object?.qualifiedName.split(".").at(-1) ?? "");
  if (
    requestedSegments.length > 1
    && objectOwner === symbolKey(requestedSegments.at(-2) ?? "")
    && objectLocal === symbolKey(requestedSegments.at(-1) ?? "")
  ) return 4;
  if (requestedSegments.length === 1 && objectLocal === requested) return 3;

  const factName = symbolKey(item.matchedFact?.name ?? "");
  if (factName === requested) return 2;
  const title = symbolKey(item.node.title);
  return title === requested ? 1 : 0;
}

function isSymbolEvidenceNode(item: ScoredNode): boolean {
  if (["directory", "doc", "config", "runtime-log", "decision", "memory"].includes(item.node.kind)) {
    return false;
  }
  if (item.node.evidence?.scope === "documentation" || /\.(?:md|mdx|rst|txt)$/i.test(item.node.sourcePath)) {
    return false;
  }
  return Boolean(item.node.object || item.matchedFact)
    || ["symbol", "function", "class", "interface", "type", "api", "test"].includes(item.node.kind);
}

function isStrongExplicitSymbol(value: string): boolean {
  return /[.:]/.test(value)
    || /_/.test(value)
    || /[a-z0-9][A-Z]/.test(value)
    || /^[A-Z]{2,}[A-Za-z0-9_$]*$/.test(value);
}

function isRequestedSymbolIdentity(task: string, symbol: string): boolean {
  const compact = symbolKey(symbol);
  if (!compact) return false;
  const leading = leadingTaskStatement(task);
  if (
    compactCodeIdentifier(leading).includes(compact)
    && isStrongExplicitSymbol(symbol)
  ) return true;

  const owner = symbolSegments(symbol).at(-2);
  if (owner && /^[A-Z][A-Za-z0-9_$]*$/.test(owner) && /[a-z0-9][A-Z]/.test(owner)) {
    return true;
  }

  const symbolPattern = explicitSymbolPattern(symbol);
  const symbolOccurrence = `(?<![A-Za-z0-9_$.:#])(?:\\x60)?${symbolPattern}(?:\\x60)?(?![A-Za-z0-9_$])`;
  const actionBefore = new RegExp(
    `\\b(?:add|change|check|correct|debug|fix|implement|inspect|preserve|refactor|repair|resolve|test|update|verify)\\b(?:\\s+(?:the|this|a|an|named|method|function|class|handler|test)){0,4}\\s+${symbolOccurrence}`,
    "i"
  );
  const chineseActionBefore = new RegExp(
    `(?:修复|修正|检查|檢查|验证|驗證|更新|重构|重構|实现|實作|保留)(?:.{0,16})${symbolOccurrence}`,
    "i"
  );
  const behaviorOwner = new RegExp(
    `${symbolOccurrence}\\s+(?:corrupts?|emits?|escapes?|fails?|handles?|returns|throws?)\\b`,
    "i"
  );
  return actionBefore.test(task) || chineseActionBefore.test(task) || behaviorOwner.test(task);
}

function leadingTaskStatement(task: string): string {
  return task
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^#+\s*/, ""))
    .find(Boolean)
    ?.split(/[.!?。！？]/, 1)[0]
    ?? "";
}

function explicitSymbolPattern(symbol: string): string {
  return symbolSegments(symbol)
    .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("(?:\\.|::|#)");
}

function normalizeSymbol(value: string): string {
  return value.trim().replaceAll("::", ".").replaceAll("#", ".").replace(/\(\)$/, "");
}

function symbolSegments(value: string): string[] {
  return normalizeSymbol(value).split(".").filter(Boolean);
}

function symbolKey(value: string): string {
  return compactCodeIdentifier(normalizeSymbol(value));
}

function taskIdentityPosition(task: string, identity: string): number {
  const position = task.toLowerCase().indexOf(identity.toLowerCase());
  return position >= 0 ? position : Number.MAX_SAFE_INTEGER;
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

function uniqueByNode(items: ScoredNode[]): ScoredNode[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.node.id)) return false;
    seen.add(item.node.id);
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
