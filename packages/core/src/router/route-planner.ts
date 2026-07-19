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
  isTypeDeclarationIntent,
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
  const typeDeclarationTask = taskType === "bugfix" && isTypeDeclarationIntent(analysis);
  const routeLimit =
    taskType === "evaluation"
      ? evaluationRouteLimit(normalized.routeLimit, requestedSurfaces, analysis)
      : normalized.routeLimit;
  const implementationAnchor = taskType === "bugfix"
    ? scored.find((item) => isImplementationCandidate(item.node))
    : undefined;
  const top = implementationAnchor ?? scored[0];
  const crossStack = analysis.wingHints.includes("frontend") && analysis.wingHints.includes("backend");
  const focused = typeDeclarationTask || (
    taskType === "bugfix"
    && Boolean(top?.node.startLine)
    && (top?.matchedKeywordCount ?? 0) >= 4
    && requestedSurfaces.length <= 1
    && !crossStack
  );
  const expansionCandidates = focused && implementationAnchor
    ? [implementationAnchor, ...scored.filter((item) => item.node.id !== implementationAnchor.node.id)]
    : scored;
  const initialRoute = expandRoute(expansionCandidates, index.edges, index.nodes, {
    limit: routeLimit,
    focused,
    preferVerificationRelations: focused,
    minSeedScoreRatio: focused ? 0.75 : undefined
  });
  const expanded =
    taskType === "evaluation"
      ? ensureRequestedSurfaceCoverage(initialRoute, scored, requestedSurfaces, analysis, routeLimit)
      : taskType === "release"
        ? ensureReleaseSurfaceCoverage(scored, requestedSurfaces, analysis, routeLimit)
        : taskType === "bugfix"
          ? typeDeclarationTask
            ? ensureTypeDeclarationCoverage(initialRoute, scored, requestedSurfaces, routeLimit)
            : ensureBugfixVerificationCoverage(initialRoute, scored, requestedSurfaces, implementationAnchor, routeLimit)
          : ensureGeneralSurfaceCoverage(initialRoute, scored, requestedSurfaces, analysis, routeLimit);
  const now = new Date().toISOString();

  const routeSteps = expanded.map((item, index) => {
    const loadLevel = chooseLoadLevel(item.node.kind, index, item.score, item.node.tags.includes("generated-artifact"));
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

function isImplementationCandidate(node: Awaited<ReturnType<typeof readIndex>>["nodes"][number]): boolean {
  return node.floor !== "05-verification" && !["test", "config", "doc", "runtime-log", "directory"].includes(node.kind);
}

function ensureBugfixVerificationCoverage(
  selected: ScoredNode[],
  scored: ScoredNode[],
  requested: RouteSurface[],
  implementationAnchor: ScoredNode | undefined,
  limit: number
): ScoredNode[] {
  if (!requested.includes("test") || selected.some(isDirectTestCandidate)) return selected;

  const selectedPaths = new Set(selected.map((item) => item.node.sourcePath));
  const companion = scored.find(
    (item) =>
      isDirectTestCandidate(item)
      && item.matchedKeywordCount > 0
      && !selectedPaths.has(item.node.sourcePath)
  );
  if (!companion) return selected;

  const result = [...selected];
  if (result.length < limit) {
    result.push(companion);
  } else {
    let removableIndex = -1;
    for (let index = result.length - 1; index >= 0; index -= 1) {
      const item = result[index];
      if (item.node.id !== implementationAnchor?.node.id && !isDirectTestCandidate(item)) {
        removableIndex = index;
        break;
      }
    }
    if (removableIndex < 0) return selected;
    result[removableIndex] = companion;
  }

  return result.sort((a, b) => {
    if (a.node.id === implementationAnchor?.node.id) return -1;
    if (b.node.id === implementationAnchor?.node.id) return 1;
    return b.score - a.score || a.node.sourcePath.localeCompare(b.node.sourcePath);
  });
}

function isDirectTestCandidate(item: ScoredNode): boolean {
  const sourcePath = item.node.sourcePath.toLowerCase();
  return item.node.kind === "test"
    || /(^|\/)(?:test|tests|spec|__tests__)(\/|$)|\.(?:test|spec)\.[^.]+$/.test(sourcePath);
}

function ensureTypeDeclarationCoverage(
  selected: ScoredNode[],
  scored: ScoredNode[],
  requested: RouteSurface[],
  limit: number
): ScoredNode[] {
  const declaration = scored.find((item) => isTypeDeclarationPath(item.node.sourcePath) && !isTypeTestPath(item.node.sourcePath));
  if (!declaration) return selected;

  const result: ScoredNode[] = [];
  const sourcePaths = new Set<string>();
  const append = (item: ScoredNode | undefined): void => {
    if (!item || result.length >= limit || sourcePaths.has(item.node.sourcePath)) return;
    result.push(item);
    sourcePaths.add(item.node.sourcePath);
  };
  append(declaration);
  if (requested.includes("test")) append(scored.find((item) => isTypeTestPath(item.node.sourcePath)));
  if (requested.includes("package")) append(scored.find((item) => matchesRouteSurface(item.node, "package")));
  for (const item of selected) {
    if (isTypeDeclarationPath(item.node.sourcePath) || matchesRouteSurface(item.node, "package")) append(item);
  }
  return result;
}

function isTypeDeclarationPath(sourcePath: string): boolean {
  return /\.d\.[cm]?ts$/i.test(sourcePath);
}

function isTypeTestPath(sourcePath: string): boolean {
  return /\.(?:test|spec)-d\.[cm]?ts$/i.test(sourcePath)
    || /(^|\/)(?:test-d|type-tests?)(\/|$)/i.test(sourcePath);
}

function ensureGeneralSurfaceCoverage(
  selected: ScoredNode[],
  scored: ScoredNode[],
  requested: RouteSurface[],
  analysis: ReturnType<typeof analyzeTask>,
  limit: number
): ScoredNode[] {
  if (requested.length < 2) return selected;
  const result: ScoredNode[] = [];
  const sourcePaths = new Set<string>();
  const append = (item: ScoredNode | undefined): void => {
    if (!item || result.length >= limit || sourcePaths.has(item.node.sourcePath)) return;
    result.push(item);
    sourcePaths.add(item.node.sourcePath);
  };

  append(selected[0]);
  for (const surface of requested) {
    const quota = generalSurfaceQuota(scored, surface, requested, analysis);
    for (const representative of selectGeneralSurfaceRepresentatives(scored, surface, analysis, quota)) {
      append(representative);
    }
  }
  for (const item of selected) append(item);

  return result.sort((a, b) => b.score - a.score || a.node.sourcePath.localeCompare(b.node.sourcePath));
}

function selectGeneralSurfaceRepresentatives(
  scored: ScoredNode[],
  surface: RouteSurface,
  analysis: ReturnType<typeof analyzeTask>,
  quota: number
): ScoredNode[] {
  const ranked = [...scored]
    .filter((item) => matchesRouteSurface(item.node, surface))
    .sort(
      (a, b) => generalSurfacePriority(b, surface, analysis) - generalSurfacePriority(a, surface, analysis)
        || b.score - a.score
        || a.node.sourcePath.localeCompare(b.node.sourcePath)
    )
    .filter((item, index, items) => items.findIndex((candidate) => candidate.node.sourcePath === item.node.sourcePath) === index);
  if (surface !== "test" || quota <= 1) return ranked.slice(0, quota);

  const result: ScoredNode[] = [];
  const concepts = new Set<string>();
  for (const item of ranked) {
    const concept = testPathConcept(item.node.sourcePath, analysis);
    if (!concept && result.length > 0) continue;
    if (concept && concepts.has(concept)) continue;
    result.push(item);
    if (concept) concepts.add(concept);
    if (result.length >= quota) break;
  }
  return result;
}

function generalSurfaceQuota(
  scored: ScoredNode[],
  surface: RouteSurface,
  requested: RouteSurface[],
  analysis: ReturnType<typeof analyzeTask>
): number {
  if (surface !== "test" || !requested.includes("implementation")) return 1;
  const concepts = new Set(
    scored
      .filter((item) => matchesRouteSurface(item.node, "test") && item.node.kind === "test")
      .map((item) => testPathConcept(item.node.sourcePath, analysis))
      .filter((concept): concept is string => Boolean(concept))
  );
  return Math.max(1, Math.min(3, concepts.size));
}

function generalSurfacePriority(
  item: ScoredNode,
  surface: RouteSurface,
  analysis: ReturnType<typeof analyzeTask>
): number {
  const sourcePath = item.node.sourcePath.toLowerCase();
  const keywords = new Set(analysis.keywords);
  let priority = item.score;
  if (surface === "mcp" && hasAnyKeyword(keywords, ["generated", "artifact", "bundle"])) {
    if (/generated\s+\w+\s+artifact/i.test(item.node.summary)) priority += 600;
    else if (/(^|\/)packages\/mcp\/src\//.test(sourcePath)) priority += 200;
  }
  if (surface === "test") {
    priority += item.node.kind === "test" ? 100 : -100;
    if (isVerificationScriptPath(sourcePath)) priority -= 120;
    if (/(?:^|[-_/])(?:release|publish)(?:[-_.\/]|$)/.test(sourcePath) && !hasAnyKeyword(keywords, ["release", "publish"])) {
      priority -= 100;
    }
    const concept = testPathConcept(sourcePath, analysis);
    if (concept) {
      priority += 30;
      if (new RegExp(`(?:^|/)${escapeRegExp(concept)}\\.(?:test|spec)\\.`).test(sourcePath)) priority += 40;
    }
  }
  if (surface === "evidence" && /evaluation/.test(sourcePath)) priority += 500;
  return priority;
}

function testPathConcept(sourcePath: string, analysis: ReturnType<typeof analyzeTask>): string | undefined {
  const normalizedPath = sourcePath.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return analysis.keywords.find(
    (keyword) => keyword.length > 3
      && !["test", "tests", "spec", "regression", "verification", "focused"].includes(keyword)
      && new RegExp(`(?:^| )${escapeRegExp(keyword)}(?: |$)`).test(normalizedPath)
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isVerificationScriptPath(sourcePath: string): boolean {
  return /(^|\/)scripts\/[^/]*(?:verify|smoke|benchmark)[^/]*$/.test(sourcePath);
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

function chooseLoadLevel(kind: string, index: number, score: number, generatedArtifact = false): LoadLevel {
  if (generatedArtifact) return "summary";
  if (index > 10) return "summary";
  if (["function", "class", "interface", "type", "symbol"].includes(kind)) return score > 80 || index < 4 ? "full_symbol" : "signature";
  if (kind === "test") return "snippet";
  if (kind === "doc" || kind === "config") return "summary";
  return index < 3 ? "snippet" : "summary";
}

function chooseRouteTier(item: ScoredNode, index: number, taskType: TaskType): Exclude<RouteTier, "excluded"> {
  const supportKind = item.node.floor === "05-verification"
    || ["test", "config", "doc"].includes(item.node.kind)
    || isTypeTestPath(item.node.sourcePath);
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
  const selectedSourcePaths = new Set(
    nodes.filter((node) => selected.has(node.id)).map((node) => node.sourcePath)
  );
  const byTop = new Map<string, number>();
  for (const node of nodes) {
    if (selected.has(node.id) || selectedSourcePaths.has(node.sourcePath)) continue;
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
  const requestedSurfaceCount = requestedRouteSurfaces(analysis).length;
  const breadthCap = requestedSurfaceCount >= 3 ? 0.35 : requestedSurfaceCount === 2 ? 0.65 : 0.98;
  const taskCap = Math.min(taskType === "release" ? 0.65 : 0.98, breadthCap);
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
  analysis: ReturnType<typeof analyzeTask>,
  limit: number
): ScoredNode[] {
  if (!requested.length) return selected;

  const result: ScoredNode[] = [];
  const protectedIds = new Set<string>();
  if (!requested.includes("implementation") && selected[0]) {
    result.push(selected[0]);
    protectedIds.add(selected[0].node.id);
  }

  for (const surface of requested) {
    const quota = evaluationSurfaceQuota(surface, analysis);
    const representatives = selectEvaluationSurfaceRepresentatives(
      scored.filter(
        (item) =>
          matchesRouteSurface(item.node, surface)
          && !protectedIds.has(item.node.id)
          && !result.some((selectedItem) => selectedItem.node.sourcePath === item.node.sourcePath)
      ),
      surface,
      analysis,
      quota
    );
    for (const representative of representatives) {
      if (!result.some((item) => item.node.id === representative.node.id)) result.push(representative);
      protectedIds.add(representative.node.id);
    }
  }

  if (!result.length) return selected.slice(0, limit);
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

function evaluationRouteLimit(
  baseLimit: number,
  requested: RouteSurface[],
  analysis: ReturnType<typeof analyzeTask>
): number {
  const required = requested.reduce(
    (sum, surface) => sum + evaluationSurfaceQuota(surface, analysis),
    0
  );
  return Math.max(baseLimit, Math.min(12, required));
}

function evaluationSurfaceQuota(surface: RouteSurface, analysis: ReturnType<typeof analyzeTask>): number {
  if (surface !== "docs") return 1;
  const keywords = new Set(analysis.keywords);
  let quota = 1;
  if (keywords.has("evidence")) quota += 1;
  if (keywords.has("protocol")) quota += 1;
  if (keywords.has("readme")) quota += 1;
  if (hasAnyKeyword(keywords, ["bilingual", "localization"])) quota += 1;
  return Math.min(5, quota);
}

function selectEvaluationSurfaceRepresentatives(
  candidates: ScoredNode[],
  surface: RouteSurface,
  analysis: ReturnType<typeof analyzeTask>,
  quota: number
): ScoredNode[] {
  const ranked = [...candidates]
    .sort((a, b) => compareEvaluationSurfaceCandidates(a, b, surface, analysis))
    .filter((item, index, items) => items.findIndex((candidate) => candidate.node.sourcePath === item.node.sourcePath) === index);
  if (surface !== "docs" || quota <= 1) return ranked.slice(0, quota);

  const keywords = new Set(analysis.keywords);
  const selected: ScoredNode[] = [];
  const selectedPaths = new Set<string>();
  const appendFirst = (predicate: (sourcePath: string) => boolean): void => {
    const representative = ranked.find(
      (item) => !selectedPaths.has(item.node.sourcePath) && predicate(item.node.sourcePath.toLowerCase())
    );
    if (!representative) return;
    selected.push(representative);
    selectedPaths.add(representative.node.sourcePath);
  };
  const localized = (sourcePath: string): boolean => /(^|\/)(?:zh-cn|zh-hans|zh_cn)(\/|$)/.test(sourcePath);
  const narrative = (sourcePath: string): boolean => /\.(?:md|mdx|rst|txt)$/.test(sourcePath);

  if (keywords.has("evidence")) {
    appendFirst((sourcePath) => !localized(sourcePath) && narrative(sourcePath) && isNarrativeEvidencePath(sourcePath));
  }
  if (keywords.has("protocol")) {
    appendFirst((sourcePath) => !localized(sourcePath) && /protocol/.test(sourcePath));
  }
  if (keywords.has("readme")) {
    appendFirst((sourcePath) => !localized(sourcePath) && /(^|\/)readme\.md$/.test(sourcePath));
  }
  if (hasAnyKeyword(keywords, ["bilingual", "localization"])) {
    if (keywords.has("protocol")) appendFirst((sourcePath) => localized(sourcePath) && /protocol/.test(sourcePath));
    if (keywords.has("readme")) appendFirst((sourcePath) => localized(sourcePath) && /(^|\/)readme\.md$/.test(sourcePath));
    appendFirst(localized);
  }
  for (const item of ranked) {
    if (selected.length >= quota) break;
    if (selectedPaths.has(item.node.sourcePath)) continue;
    selected.push(item);
    selectedPaths.add(item.node.sourcePath);
  }
  return selected.slice(0, quota);
}

function compareEvaluationSurfaceCandidates(
  a: ScoredNode,
  b: ScoredNode,
  surface: RouteSurface,
  analysis: ReturnType<typeof analyzeTask>
): number {
  return evaluationSurfacePriority(b, surface, analysis) - evaluationSurfacePriority(a, surface, analysis)
    || evaluationSurfaceVersionPriority(b.node.sourcePath) - evaluationSurfaceVersionPriority(a.node.sourcePath)
    || b.score - a.score
    || a.node.sourcePath.localeCompare(b.node.sourcePath);
}

function evaluationSurfaceVersionPriority(sourcePath: string): number {
  const versions = [...sourcePath.toLowerCase().matchAll(/(?:^|[^a-z0-9])v(\d+)(?:[._-](\d+))?/g)];
  return versions.reduce((highest, match) => {
    const major = Number(match[1] ?? 0);
    const minor = Number(match[2] ?? 0);
    return Math.max(highest, major * 1000 + minor);
  }, 0);
}

function evaluationSurfacePriority(
  item: ScoredNode,
  surface: RouteSurface,
  analysis: ReturnType<typeof analyzeTask>
): number {
  const sourcePath = item.node.sourcePath.toLowerCase();
  const keywords = new Set(analysis.keywords);
  if (surface === "implementation") {
    if (hasAnyKeyword(keywords, ["plan", "protocol", "frozen"]) && /(^|\/)src\/commands?\/study\./.test(sourcePath)) return 600;
    return 100;
  }
  if (surface === "test") {
    if (hasAnyKeyword(keywords, ["plan", "protocol", "frozen"]) && /(^|\/)(?:test|tests)\/study\.test\./.test(sourcePath)) return 600;
    return 100;
  }
  if (surface === "config") {
    if (keywords.has("plan") && /(^|\/)results\/[^/]+\/plan\.json$/.test(sourcePath)) return 600;
    if (keywords.has("plan") && /(^|\/)plan\.json$/.test(sourcePath)) return 550;
    if (keywords.has("manifest") && /(^|\/)manifest\.json$/.test(sourcePath)) return 500;
    return 100;
  }
  if (surface === "evidence") {
    if (/evaluation/.test(sourcePath)) return 650;
    if (/(?:sync|validation|audit|summary|report)/.test(sourcePath)) return 600;
    return 100;
  }
  if (surface !== "docs") return 100;

  let priority = 100;
  if (keywords.has("evidence") && isNarrativeEvidencePath(sourcePath)) priority += 500;
  if (keywords.has("protocol") && /protocol/.test(sourcePath)) priority += 450;
  if (keywords.has("readme") && /(^|\/)readme\.md$/.test(sourcePath)) priority += 400;
  if (keywords.has("readme") && sourcePath === "readme.md") priority += 200;
  if (hasAnyKeyword(keywords, ["bilingual", "localization"]) && /(^|\/)(?:zh-cn|zh-hans|zh_cn)(\/|$)/.test(sourcePath)) priority += 125;
  const compactSourcePath = compactRouteValue(sourcePath);
  if (analysis.entities.some((entity) => {
    const compactEntity = compactRouteValue(entity);
    return compactEntity.length > 0 && compactSourcePath.includes(compactEntity);
  })) priority += 75;
  return priority;
}

function isNarrativeEvidencePath(sourcePath: string): boolean {
  const fileName = sourcePath.split("/").at(-1) ?? sourcePath;
  return /\.(?:md|mdx|rst|txt)$/.test(fileName) && /(?:preflight|evidence|research)/.test(fileName);
}

function compactRouteValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function ensureReleaseSurfaceCoverage(
  scored: ScoredNode[],
  requested: RouteSurface[],
  analysis: ReturnType<typeof analyzeTask>,
  limit: number
): ScoredNode[] {
  const packageQuota = requested.includes("implementation") ? 2 : 5;
  const quotas: Array<[RouteSurface, number]> = [
    ["implementation", 4],
    ["test", 3],
    ["shared", 1],
    ["docs", 3],
    ["plugin", 3],
    ["mcp", 1],
    ["cli", 1],
    ["package", packageQuota],
    ["ci", 1]
  ];
  const result: ScoredNode[] = [];
  const sourcePaths = new Set<string>();
  const append = (item: ScoredNode): boolean => {
    if (result.length >= limit || sourcePaths.has(item.node.sourcePath)) return false;
    result.push(item);
    sourcePaths.add(item.node.sourcePath);
    return true;
  };

  const addedBySurface = new Map<RouteSurface, number>();
  const maxQuota = Math.max(...quotas.map(([, quota]) => quota));
  for (let round = 0; round < maxQuota && result.length < limit; round += 1) {
    for (const [surface, quota] of quotas) {
      if (!requested.includes(surface) || (addedBySurface.get(surface) ?? 0) >= quota) continue;
      const representative = [...scored]
        .filter(
          (item) =>
          matchesRouteSurface(item.node, surface)
          && isReleaseSurfaceCandidate(item, surface, analysis)
          && !sourcePaths.has(item.node.sourcePath)
        )
        .sort((a, b) => releaseSurfacePriority(b, surface, analysis) - releaseSurfacePriority(a, surface, analysis) || b.score - a.score)[0];
      if (representative && append(representative)) {
        addedBySurface.set(surface, (addedBySurface.get(surface) ?? 0) + 1);
      }
      if (result.length >= limit) break;
    }
  }

  const remaining = [...scored]
    .filter((item) => requested.some(
      (surface) => matchesRouteSurface(item.node, surface) && isReleaseSurfaceCandidate(item, surface, analysis)
    ))
    .sort(
      (a, b) => maxReleaseSurfacePriority(b, requested, analysis) - maxReleaseSurfacePriority(a, requested, analysis)
        || b.score - a.score
    );
  for (const item of remaining) {
    if (result.length >= limit) break;
    append(item);
  }

  return result.sort((a, b) => b.score - a.score || a.node.sourcePath.localeCompare(b.node.sourcePath));
}

function maxReleaseSurfacePriority(
  item: ScoredNode,
  requested: RouteSurface[],
  analysis: ReturnType<typeof analyzeTask>
): number {
  return Math.max(
    0,
    ...requested
      .filter((surface) => matchesRouteSurface(item.node, surface))
      .map((surface) => releaseSurfacePriority(item, surface, analysis))
  );
}

function releaseSurfacePriority(
  item: ScoredNode,
  surface: RouteSurface,
  analysis: ReturnType<typeof analyzeTask>
): number {
  const sourcePath = item.node.sourcePath.toLowerCase();
  if (surface === "implementation") {
    const keywords = new Set(analysis.keywords);
    if (hasAnyKeyword(keywords, ["route", "router"]) && /route-planner\.[cm]?[jt]s$/.test(sourcePath)) return 500;
    if (hasAnyKeyword(keywords, ["route", "router"]) && /route-scorer\.[cm]?[jt]s$/.test(sourcePath)) return 475;
    if (/context-packer\.[cm]?[jt]s$/.test(sourcePath)) return 450;
    if (/mode-selector\.[cm]?[jt]s$/.test(sourcePath)) return 425;
    if (/pitfall-board\.[cm]?[jt]s$/.test(sourcePath)) return 400;
    if (/analyze-task\.[cm]?[jt]s$/.test(sourcePath)) return 350;
    if (/packages\/core\/src\/index\.[cm]?[jt]s$/.test(sourcePath)) return 200;
    return 100;
  }
  if (surface === "test") {
    const keywords = new Set(analysis.keywords);
    if (hasAnyKeyword(keywords, ["route", "router"]) && /release-routing\.test\./.test(sourcePath)) return 500;
    if (/context\.test\./.test(sourcePath)) return 450;
    if (/mode-selector\.test\./.test(sourcePath)) return 425;
    if (/router\.test\./.test(sourcePath)) return 400;
    if (/scripts\/(?:verify-release-candidate|smoke-mcp)\./.test(sourcePath)) return 350;
    return 100;
  }
  if (surface === "mcp") {
    if (/(^|\/)packages\/mcp\/src\//.test(sourcePath)) return 300;
    if (/\.mcp\.json$/.test(sourcePath)) return 200;
    return 100;
  }
  if (surface === "cli") {
    if (/(^|\/)packages\/cli\/src\//.test(sourcePath)) return 300;
    return 100;
  }
  if (surface !== "plugin") return 0;
  if (/\.codex-plugin\/plugin\.json$/.test(sourcePath)) return 400;
  if (/\.mcp\.json$/.test(sourcePath)) return 350;
  if (/(^|\/)\.agents\/plugins\/marketplace\.json$/.test(sourcePath)) return 300;
  if (/(^|\/)skills?\//.test(sourcePath)) return 200;
  return 100;
}

function isReleaseSurfaceCandidate(
  item: ScoredNode,
  surface: RouteSurface,
  analysis: ReturnType<typeof analyzeTask>
): boolean {
  const sourcePath = item.node.sourcePath.toLowerCase();
  const keywords = new Set(analysis.keywords);
  if (surface === "implementation" && hasAnyKeyword(keywords, ["preflight", "bypass", "boundaries", "boundary"])) {
    const routeCandidate = hasAnyKeyword(keywords, ["route", "router"]) && /(route-planner|route-scorer|analyze-task)/.test(sourcePath);
    return routeCandidate || /(context-packer|mode-selector|pitfall-board)|packages\/core\/src\/index\.ts$/.test(sourcePath);
  }
  if (surface === "test") {
    if (
      hasAnyKeyword(keywords, ["release", "tarball", "verification", "mcp"])
      && /scripts\/(?:verify-release-candidate|smoke-mcp)\./.test(sourcePath)
    ) return true;
    if (hasAnyKeyword(keywords, ["bypass", "boundaries", "boundary", "preflight"])) {
      return /(mode-selector|context|router|release-routing)\.test\./.test(sourcePath);
    }
    return /(release|publish|version|plugin|marketplace|mcp|mode-selector|context|packer|adaptive)/.test(sourcePath);
  }
  if (surface === "shared" && hasAnyKeyword(keywords, ["bypass", "boundaries", "boundary", "transport", "telemetry", "payload"])) {
    return /(^|\/)packages\/shared\/src\/(types?|schemas?)\.[cm]?[jt]s$/.test(sourcePath);
  }
  if (surface === "docs" && hasAnyKeyword(keywords, ["documentation", "bilingual", "changelog", "release"])) {
    return /(^|\/)(readme|changelog|build_week)\.md$|^docs\/research\/.*(?:adaptive|bypass|0_3_0)/.test(sourcePath);
  }
  if (surface !== "package") return true;

  if (keywords.has("python") || keywords.has("pypi")) return /(^|\/)(pyproject\.toml|setup\.(?:py|cfg))$/.test(sourcePath);
  if (keywords.has("rust") || keywords.has("cargo") || keywords.has("crate")) return /(^|\/)cargo\.toml$/.test(sourcePath);
  if (keywords.has("java") || keywords.has("maven") || keywords.has("gradle")) return /(^|\/)(pom\.xml|build\.gradle(?:\.kts)?)$/.test(sourcePath);
  if (keywords.has("dotnet") || keywords.has("nuget")) return /\.csproj$/.test(sourcePath);
  return true;
}

function hasAnyKeyword(keywords: Set<string>, candidates: string[]): boolean {
  return candidates.some((candidate) => keywords.has(candidate));
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
