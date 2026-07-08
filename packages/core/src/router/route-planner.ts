import path from "node:path";
import type { LoadLevel, PalaceRoute } from "@vertex-palace/shared";
import { DEFAULT_BUDGET } from "../config/defaults";
import { readIndex } from "../storage/read-palace";
import { appendRoute } from "../storage/write-palace";
import { hashText } from "../scanner/file-hash";
import { analyzeTask } from "./analyze-task";
import { classifyTask } from "./classify-task";
import { locateEntry } from "./locate-entry";
import { scoreNodes } from "./route-scorer";
import { expandRoute } from "./route-expander";

export type RoutePalaceOptions = {
  budget?: number;
  routeLimit?: number;
};

export async function routePalace(root: string, task: string, options: number | RoutePalaceOptions = DEFAULT_BUDGET.maxInputTokens): Promise<PalaceRoute> {
  const normalized = normalizeOptions(options);
  const budget = normalized.budget;
  const index = await readIndex(root);
  const analysis = analyzeTask(task);
  const taskType = classifyTask(task);
  const scored = scoreNodes(index.nodes, index.edges, analysis, taskType);
  const expanded = expandRoute(scored, index.edges, index.nodes, normalized.routeLimit);
  const now = new Date().toISOString();

  const routeSteps = expanded.map((item, index) => {
    const loadLevel = chooseLoadLevel(item.node.kind, index, item.score);
    return {
      nodeId: item.node.id,
      palacePath: item.node.palacePath,
      sourcePath: linePath(item.node.sourcePath, item.node.startLine, item.node.endLine),
      reason: item.reasons[0] ?? `Matched ${analysis.keywords.join(", ") || "task"} against palace index.`,
      loadLevel,
      estimatedTokens: estimatedTokensForLevel(item.node.tokenCost, loadLevel),
      priority: index + 1
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
    confidence: confidence(scored.length, expanded.length, estimatedTokens, budget),
    createdAt: now
  };

  await appendRoute(root, index.routes, route);
  return route;
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
  if (budget <= 12000) return 8;
  return 10;
}

function chooseLoadLevel(kind: string, index: number, score: number): LoadLevel {
  if (index > 10) return "summary";
  if (["function", "class", "interface", "type", "symbol"].includes(kind)) return score > 80 || index < 4 ? "full_symbol" : "signature";
  if (kind === "test") return "snippet";
  if (kind === "doc" || kind === "config") return "summary";
  return index < 3 ? "snippet" : "summary";
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

function confidence(scoredCount: number, selectedCount: number, estimatedTokens: number, budget: number): number {
  if (!selectedCount) return 0.1;
  const coverage = Math.min(0.65, selectedCount / 12);
  const candidateStrength = Math.min(0.25, scoredCount / 80);
  const budgetFit = estimatedTokens <= budget ? 0.1 : 0;
  return Number((coverage + candidateStrength + budgetFit).toFixed(2));
}
