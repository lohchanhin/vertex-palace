import path from "node:path";
import type { LoadLevel, PalaceRoute, RouteTier, TaskType } from "@vertex-palace/shared";
import { DEFAULT_BUDGET } from "../config/defaults";
import { indexPalace } from "../indexer/index-palace";
import { readIndex } from "../storage/read-palace";
import { getPalaceStatus } from "../storage/status";
import { appendRoute } from "../storage/write-palace";
import { hashText } from "../scanner/file-hash";
import { analyzeTask } from "./analyze-task";
import { classifyTask } from "./classify-task";
import { locateEntry } from "./locate-entry";
import {
  matchesRouteSurface,
  requestedRouteSurfaces,
  scoreNodes,
  type RouteSurface,
  type ScoredNode
} from "./route-scorer";
import { expandRoute } from "./route-expander";

export type RoutePalaceOptions = {
  budget?: number;
  routeLimit?: number;
};

export async function routePalace(root: string, task: string, options: number | RoutePalaceOptions = DEFAULT_BUDGET.maxInputTokens): Promise<PalaceRoute> {
  const normalized = normalizeOptions(options);
  const budget = normalized.budget;
  await ensureFreshIndex(root);
  const index = await readIndex(root);
  const analysis = analyzeTask(task);
  const taskType = classifyTask(task);
  const scored = scoreNodes(index.nodes, index.edges, analysis, taskType);
  const requestedSurfaces = requestedRouteSurfaces(analysis);
  const routeLimit =
    taskType === "evaluation"
      ? Math.max(normalized.routeLimit, Math.min(10, requestedSurfaces.length + 1))
      : taskType === "release"
        ? Math.max(normalized.routeLimit, Math.min(12, requestedSurfaces.length + 5))
        : normalized.routeLimit;
  const initialRoute = expandRoute(scored, index.edges, index.nodes, routeLimit);
  const expanded =
    taskType === "evaluation"
      ? ensureRequestedSurfaceCoverage(initialRoute, scored, requestedSurfaces, routeLimit)
      : taskType === "release"
        ? ensureReleaseSurfaceCoverage(initialRoute, scored, requestedSurfaces, routeLimit)
        : initialRoute;
  const now = new Date().toISOString();

  const routeSteps = expanded.map((item, index) => {
    const loadLevel = chooseLoadLevel(item.node.kind, index, item.score);
    const tier = chooseRouteTier(item, index, taskType);
    return {
      nodeId: item.node.id,
      palacePath: item.node.palacePath,
      sourcePath: linePath(item.node.sourcePath, item.node.startLine, item.node.endLine),
      reason: item.reasons[0] ?? `Matched ${analysis.keywords.join(", ") || "task"} against palace index.`,
      loadLevel,
      estimatedTokens: estimatedTokensForLevel(item.node.tokenCost, loadLevel),
      priority: index + 1,
      tier,
      confidence: Number(Math.max(0.1, Math.min(0.99, item.score / 160)).toFixed(2)),
      evidence: item.reasons.slice(0, 3)
    };
  });

  const estimatedTokens = routeSteps.reduce((sum, step) => sum + step.estimatedTokens, 0);
  const route: PalaceRoute = {
    id: `route_${hashText(`${task}:${now}`).slice(0, 16)}`,
    task,
    taskType,
    entry: locateEntry(taskType, analysis),
    route: routeSteps,
    excluded: buildExcluded(index.nodes, routeSteps.map((step) => step.nodeId), analysis),
    budget: {
      maxInputTokens: budget,
      estimatedTokens,
      reservedOutputTokens: DEFAULT_BUDGET.reservedOutputTokens
    },
    confidence: confidence(expanded, analysis, estimatedTokens, budget, taskType),
    createdAt: now
  };

  await appendRoute(root, index.routes, route);
  return route;
}

async function ensureFreshIndex(root: string): Promise<void> {
  const status = await getPalaceStatus(root);
  if (!status.initialized || !status.indexed || status.stale) {
    await indexPalace(root);
  }
}

function normalizeOptions(options: number | RoutePalaceOptions): Required<RoutePalaceOptions> {
  const budget = typeof options === "number" ? options : options.budget ?? DEFAULT_BUDGET.maxInputTokens;
  const routeLimit = typeof options === "number" ? defaultRouteLimitForBudget(budget) : options.routeLimit ?? defaultRouteLimitForBudget(budget);
  return {
    budget,
    routeLimit: Math.max(4, Math.min(24, routeLimit))
  };
}

function defaultRouteLimitForBudget(budget: number): number {
  if (budget <= 6000) return 6;
  if (budget <= 12000) return 10;
  return 12;
}

function chooseLoadLevel(kind: string, index: number, score: number): LoadLevel {
  if (index > 10) return "summary";
  if (["function", "class", "interface", "type", "symbol"].includes(kind)) return score > 80 || index < 4 ? "full_symbol" : "signature";
  if (kind === "test") return "snippet";
  if (kind === "doc" || kind === "config") return "summary";
  return index < 3 ? "snippet" : "summary";
}

function chooseRouteTier(item: ScoredNode, index: number, taskType: TaskType): Exclude<RouteTier, "excluded"> {
  const supportKind = ["test", "config", "doc"].includes(item.node.kind);
  const expandedByRelation = item.reasons.some((reason) => reason.startsWith("expanded through"));
  const taskMakesSupportPrimary =
    (taskType === "test" && item.node.kind === "test") ||
    (taskType === "explain" && item.node.kind === "doc") ||
    (taskType === "release" && ["config", "doc"].includes(item.node.kind));

  if (index < 2 && (!supportKind || taskMakesSupportPrimary)) return "primary";
  if (index < 5 || supportKind || expandedByRelation) return "support";
  return "deferred";
}

function estimatedTokensForLevel(base: number, loadLevel: LoadLevel): number {
  switch (loadLevel) {
    case "full_file":
      return Math.max(800, base * 8);
    case "full_symbol":
      return Math.max(240, base * 5);
    case "snippet":
      return Math.max(180, base * 3);
    case "signature":
      return Math.max(80, base * 2);
    case "summary":
      return Math.max(40, base);
    default:
      return 0;
  }
}

function linePath(sourcePath: string, startLine?: number, endLine?: number): string {
  if (!startLine) return sourcePath;
  return `${sourcePath}:${startLine}${endLine && endLine !== startLine ? `-${endLine}` : ""}`;
}

function buildExcluded(nodes: Awaited<ReturnType<typeof readIndex>>["nodes"], selectedIds: string[], analysis: ReturnType<typeof analyzeTask>): PalaceRoute["excluded"] {
  const selected = new Set(selectedIds);
  const byTop = new Map<string, number>();
  for (const node of nodes) {
    if (selected.has(node.id)) continue;
    const parts = node.sourcePath.split("/");
    const top = parts[0] === "src" && parts[1] ? `${parts[0]}/${parts[1]}` : parts[0] ?? node.sourcePath;
    const haystack = [node.sourcePath, node.wing, node.room, node.title].join(" ").toLowerCase();
    if (analysis.keywords.some((keyword) => haystack.includes(keyword))) continue;
    byTop.set(top, (byTop.get(top) ?? 0) + 1);
  }
  return [...byTop.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([sourcePath]) => ({
      sourcePath,
      reason: "No strong keyword, room, or route relation match."
    }));
}

function confidence(selected: ScoredNode[], analysis: ReturnType<typeof analyzeTask>, estimatedTokens: number, budget: number, taskType: TaskType): number {
  if (!selected.length) return 0.1;
  const top = selected.slice(0, 12);
  const keywords = analysis.keywords.filter((keyword) => !["task", "fresh"].includes(keyword));
  const covered = keywords.filter((keyword) => top.some((item) => nodeHaystack(item).includes(keyword))).length;
  const keywordCoverage = keywords.length ? covered / keywords.length : 0.45;
  const averageScore = top.reduce((sum, item) => sum + item.score, 0) / top.length;
  const scoreStrength = Math.min(1, averageScore / 140);
  const focus = dominantTopSegmentShare(top);
  const budgetFit = estimatedTokens <= budget ? 1 : 0;
  const surfacePenalty = requestedSurfacePenalty(top, analysis);
  const value = (0.08 + keywordCoverage * 0.34 + scoreStrength * 0.28 + focus * 0.2 + budgetFit * 0.1) * surfacePenalty;
  const taskCap = taskType === "release" ? 0.65 : 0.98;
  return Number(Math.max(0.1, Math.min(taskCap, value)).toFixed(2));
}

function requestedSurfacePenalty(items: ScoredNode[], analysis: ReturnType<typeof analyzeTask>): number {
  const requested = requestedRouteSurfaces(analysis);
  if (!requested.length) return 1;
  const covered = requested.filter((surface) => items.some((item) => matchesRouteSurface(item.node, surface))).length;
  return 0.65 + (covered / requested.length) * 0.35;
}

function ensureRequestedSurfaceCoverage(
  selected: ScoredNode[],
  scored: ScoredNode[],
  requested: RouteSurface[],
  limit: number
): ScoredNode[] {
  if (!requested.length) return selected;

  const result = [...selected];
  const protectedIds = new Set<string>();
  if (selected[0]) protectedIds.add(selected[0].node.id);

  for (const surface of requested) {
    let representative = result.find((item) => matchesRouteSurface(item.node, surface));
    if (!representative) {
      representative = scored.find(
        (item) =>
          matchesRouteSurface(item.node, surface) &&
          !result.some((selectedItem) => selectedItem.node.sourcePath === item.node.sourcePath)
      );
      if (representative) result.push(representative);
    }
    if (representative) protectedIds.add(representative.node.id);
  }

  result.sort((a, b) => b.score - a.score || a.node.sourcePath.localeCompare(b.node.sourcePath));
  while (result.length > limit) {
    let removableIndex = -1;
    for (let index = result.length - 1; index >= 0; index -= 1) {
      if (!protectedIds.has(result[index].node.id)) {
        removableIndex = index;
        break;
      }
    }
    if (removableIndex < 0) break;
    result.splice(removableIndex, 1);
  }
  return result;
}

function ensureReleaseSurfaceCoverage(
  selected: ScoredNode[],
  scored: ScoredNode[],
  requested: RouteSurface[],
  limit: number
): ScoredNode[] {
  const quotas: Array<[RouteSurface, number]> = [
    ["implementation", 2],
    ["test", 1],
    ["package", 5],
    ["plugin", 3],
    ["docs", 1]
  ];
  const result: ScoredNode[] = [];
  const sourcePaths = new Set<string>();
  const append = (item: ScoredNode): boolean => {
    if (result.length >= limit || sourcePaths.has(item.node.sourcePath)) return false;
    result.push(item);
    sourcePaths.add(item.node.sourcePath);
    return true;
  };

  for (const [surface, quota] of quotas) {
    if (!requested.includes(surface)) continue;
    let added = 0;
    for (const item of scored) {
      if (!matchesRouteSurface(item.node, surface)) continue;
      if (append(item)) added += 1;
      if (added >= quota || result.length >= limit) break;
    }
  }

  for (const item of [...selected, ...scored]) {
    if (result.length >= limit) break;
    append(item);
  }

  return result.sort((a, b) => b.score - a.score || a.node.sourcePath.localeCompare(b.node.sourcePath));
}

function nodeHaystack(item: ScoredNode): string {
  return [item.node.sourcePath, item.node.title, item.node.summary, item.node.wing, item.node.room, ...item.node.tags].filter(Boolean).join(" ").toLowerCase();
}

function dominantTopSegmentShare(items: ScoredNode[]): number {
  const counts = new Map<string, number>();
  for (const item of items) {
    const [first, second] = item.node.sourcePath.split("/");
    const top = first === "packages" && second ? `${first}/${second}` : first || item.node.sourcePath;
    counts.set(top, (counts.get(top) ?? 0) + 1);
  }
  const max = Math.max(...counts.values());
  return max / items.length;
}
