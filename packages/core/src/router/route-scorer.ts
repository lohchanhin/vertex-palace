import type { PalaceEdge, PalaceNode, TaskType } from "@vertex-palace/shared";
import type { TaskAnalysis } from "./analyze-task";
import { floorTemplate } from "./locate-entry";
import { isBinaryLikePath } from "../utils/binary-files";

export type ScoredNode = {
  node: PalaceNode;
  score: number;
  reasons: string[];
};

export type RouteSurface =
  | "cli"
  | "mcp"
  | "shared"
  | "test"
  | "docs"
  | "ci"
  | "package"
  | "plugin"
  | "implementation";

export function scoreNodes(nodes: PalaceNode[], edges: PalaceEdge[], analysis: TaskAnalysis, taskType: TaskType): ScoredNode[] {
  const floors = floorTemplate(taskType);
  const edgeBoosts = relationBoosts(edges);
  const requestedSurfaces = requestedRouteSurfaces(analysis);

  return nodes
    .filter((node) => node.kind !== "directory")
    .map((node) => {
      const reasons: string[] = [];
      let score = 0;
      const haystack = [node.sourcePath, node.title, node.summary, node.wing, node.room, ...node.tags].filter(Boolean).join(" ").toLowerCase();
      const tokens = tokenize(haystack);
      const entityHit = entityHintBoost(node, analysis);

      for (const keyword of analysis.keywords) {
        if (!keyword) continue;
        if (tokenize(node.sourcePath).has(keyword)) {
          score += 35;
          reasons.push(`source path matches "${keyword}"`);
        }
        if (tokenize(node.title).has(keyword)) {
          score += 30;
          reasons.push(`symbol or file title matches "${keyword}"`);
        }
        if (tokens.has(keyword)) {
          score += 25;
          reasons.push(`summary or tags match "${keyword}"`);
        }
      }

      if (entityHit > 0) {
        score += entityHit;
        reasons.push("matches tenant or project entity");
      }

      if (node.wing && analysis.wingHints.includes(node.wing)) {
        score += 25;
        reasons.push(`wing matches task hint "${node.wing}"`);
      }
      if (node.room && analysis.roomHints.includes(node.room)) {
        score += 25;
        reasons.push(`room matches task hint "${node.room}"`);
      }

      const layerBoost = layerHintBoost(node, analysis);
      if (layerBoost > 0) {
        score += layerBoost;
        reasons.push("matches frontend/backend layer hint");
      }

      const evaluationBoost = evaluationHintBoost(node, taskType, analysis, entityHit > 0);
      if (evaluationBoost !== 0) {
        score += evaluationBoost;
        reasons.push(evaluationBoost > 0 ? "matches evaluation/meta task context" : "application source is secondary for evaluation");
      }
      const releaseBoost = releaseHintBoost(node, taskType, analysis);
      if (releaseBoost > 0) {
        score += releaseBoost;
        reasons.push("matches release or distribution surface");
      }
      const surfaceHits = requestedSurfaces.filter((surface) => matchesRouteSurface(node, surface));
      if (surfaceHits.length) {
        score += 45;
        reasons.push(`matches requested ${surfaceHits.join("/")} surface`);
      }
      if (taskType === "evaluation" && !isEvaluationRouteAnchor(node, taskType, analysis, entityHit > 0, surfaceHits.length > 0)) {
        score -= 260;
        reasons.push("not anchored to evaluation or memory context");
      }

      const relationBoost = edgeBoosts.get(node.id) ?? 0;
      const hasLocalRelevance = score > 0;
      const floorIndex = floors.indexOf(node.floor);
      if (floorIndex >= 0 && hasLocalRelevance) {
        score += Math.max(8, 24 - floorIndex * 6);
        reasons.push(`floor ${node.floor} is part of ${taskType} route template`);
      }

      if (taskType === "bugfix" && node.kind === "test" && hasLocalRelevance) {
        score += 12;
        reasons.push("verification node is useful for a bugfix");
      }

      if (relationBoost && hasLocalRelevance) {
        score += Math.min(30, relationBoost);
        reasons.push("near related import or test edge");
      }

      const lineSpan = node.startLine && node.endLine ? node.endLine - node.startLine + 1 : undefined;
      if (lineSpan !== undefined && lineSpan <= 2 && ["type", "interface", "symbol"].includes(node.kind)) {
        score -= 60;
        reasons.push("penalized as trivial declaration");
      }
      if (node.kind === "test" && taskType === "release") {
        score += 18;
        reasons.push("release regression coverage is required");
      } else if (node.kind === "test" && taskType !== "test") {
        score -= 20;
        reasons.push("test is secondary for this task type");
      }
      if (isFixtureLikePath(node.sourcePath) && taskType !== "test" && !analysis.keywords.includes("fixture")) {
        score -= 120;
        reasons.push("fixture is secondary for non-test tasks");
      }
      if (isBinaryLikePath(node.sourcePath, node.language) && !wantsMediaAsset(analysis)) {
        score -= 120;
        reasons.push("binary/media asset is secondary for non-asset task");
      }

      score -= Math.min(15, node.tokenCost / 200);
      if (/(payment|billing|admin)/.test(haystack) && !analysis.keywords.some((keyword) => haystack.includes(keyword))) {
        score -= 40;
        reasons.push("penalized as likely unrelated room");
      }

      return { node, score, reasons: [...new Set(reasons)].slice(0, 4) };
    })
    .filter(
      (item) =>
        item.score > 10 &&
        (taskType === "test" || analysis.keywords.includes("fixture") || !isFixtureLikePath(item.node.sourcePath))
    )
    .sort((a, b) => b.score - a.score || a.node.sourcePath.localeCompare(b.node.sourcePath));
}

function wantsMediaAsset(analysis: TaskAnalysis): boolean {
  const mediaKeywords = new Set(["asset", "assets", "image", "images", "img", "logo", "icon", "png", "jpg", "jpeg", "gif", "webp", "screenshot", "picture", "photo"]);
  return analysis.keywords.some((keyword) => mediaKeywords.has(keyword));
}

function isFixtureLikePath(sourcePath: string): boolean {
  return /(^|\/)(fixtures?|__fixtures__)(\/|$)/i.test(sourcePath);
}

function entityHintBoost(node: PalaceNode, analysis: TaskAnalysis): number {
  if (!analysis.entities.length) return 0;
  const compactPath = compact(node.sourcePath);
  const compactTitle = compact(node.title);
  const compactSummary = compact(node.summary);
  let boost = 0;
  for (const entity of analysis.entities) {
    const compactEntity = compact(entity);
    if (!compactEntity) continue;
    if (compactPath.includes(compactEntity)) boost += 50;
    else if (compactTitle.includes(compactEntity)) boost += 35;
    else if (compactSummary.includes(compactEntity)) boost += 20;
  }
  return Math.min(90, boost);
}

function evaluationHintBoost(node: PalaceNode, taskType: TaskType, analysis: TaskAnalysis, hasEntityHit: boolean): number {
  if (taskType !== "evaluation") return 0;
  const path = node.sourcePath.toLowerCase();
  if (isEvaluationMetaPath(path, analysis)) return 32;
  if (!hasEntityHit && /(^|\/)(backend|frontend|app|pages|components|controllers|services)(\/|$)/.test(path)) return -240;
  if (node.kind === "doc" || node.kind === "test") return 10;
  return 0;
}

function releaseHintBoost(node: PalaceNode, taskType: TaskType, analysis: TaskAnalysis): number {
  if (taskType !== "release") return 0;
  const sourcePath = node.sourcePath.toLowerCase();
  if (isPackageManifestPath(sourcePath) && !sourcePath.includes("/")) return 130;
  if (/^\.agents\/plugins\/marketplace\.json$/.test(sourcePath)) return 120;
  if (/^plugins\/[^/]+\/(?:\.mcp\.json|\.codex-plugin\/plugin\.json)$/.test(sourcePath)) return 115;
  if (/^packages\/(?:cli|mcp)\/src\/(?:index|server)\.[cm]?[jt]s$/.test(sourcePath)) return 90;
  if (isPackageManifestPath(sourcePath)) return 72;
  if (/(^|\/)(changelog|readme|build_week)\.md$|^docs\/research\//.test(sourcePath)) return 62;

  const keywords = new Set(analysis.keywords);
  if (
    /^packages\/core\/src\//.test(sourcePath)
    && hasAny(keywords, ["adaptive", "mode", "selector", "context", "packer", "memory"])
    && /(adaptive|mode-selector|context-packer|memory)/.test(sourcePath)
  ) return 58;
  if (
    /^packages\/core\/(?:test|tests)\//.test(sourcePath)
    && hasAny(keywords, ["adaptive", "mode", "selector", "context", "packer", "test", "verification", "regression"])
    && /(mode-selector|context|packer|adaptive)/.test(sourcePath)
  ) return 48;
  return 0;
}

function isEvaluationRouteAnchor(
  node: PalaceNode,
  taskType: TaskType,
  analysis: TaskAnalysis,
  hasEntityHit: boolean,
  hasSurfaceHit: boolean
): boolean {
  if (taskType !== "evaluation") return true;
  const path = node.sourcePath.toLowerCase();
  if (isEvaluationMetaPath(path, analysis)) return true;
  if (hasSurfaceHit) return true;
  if (hasEntityHit && /(^|\/)(memory|pitfalls?|routes?|tasks?|decisions?|notes?)(\/|$)|latest|changed|history|client|tenant/.test(path)) return true;
  if ((node.kind === "doc" || node.kind === "test") && hasEvaluationKeywordPath(path, analysis)) return true;
  return false;
}

function isEvaluationMetaPath(path: string, analysis: TaskAnalysis): boolean {
  if (/(^|\/)(evaluation)(\/|$)|evaluate|confidence-calibration|changed-file-coverage/.test(path)) return true;

  const keywords = new Set(analysis.keywords);
  if (hasAny(keywords, ["route", "router", "confidence", "score", "scorer", "classify", "analyze"]) && /(router|route-planner|route-scorer|route-expander|locate-entry|analyze-task|classify-task)/.test(path)) return true;
  if (hasAny(keywords, ["pack", "packer", "context", "token"]) && /(packer|context-packer|token-estimator|snippet-extractor|output-format)/.test(path)) return true;
  if (hasAny(keywords, ["memory", "retrospective", "pitfall"]) && /(memory|pitfall|latest-route|task-log|write-memory)/.test(path)) return true;
  if (hasAny(keywords, ["scanner", "scan", "ignore"]) && /(scanner|scan-repo|ignore-rules)/.test(path)) return true;
  if (hasAny(keywords, ["index", "indexer", "stale", "fresh"]) && /(indexer|index-palace|incremental-index|storage|status)/.test(path)) return true;
  return false;
}

export function requestedRouteSurfaces(analysis: TaskAnalysis): RouteSurface[] {
  const keywords = new Set(analysis.keywords);
  const requested: RouteSurface[] = [];
  if (hasAny(keywords, ["cli", "command", "commands"])) requested.push("cli");
  if (keywords.has("mcp")) requested.push("mcp");
  if (hasAny(keywords, ["shared", "schema", "schemas", "type", "types", "contract", "contracts"])) requested.push("shared");
  if (hasAny(keywords, ["test", "tests", "verification", "regression"])) requested.push("test");
  if (hasAny(keywords, ["doc", "docs", "documentation", "readme"])) requested.push("docs");
  if (hasAny(keywords, ["ci", "workflow", "workflows", "actions"])) requested.push("ci");
  if (hasAny(keywords, ["release", "publish", "package", "manifest", "version", "npm", "registry", "tag"])) requested.push("package");
  if (hasAny(keywords, ["plugin", "marketplace"])) requested.push("plugin");
  if (hasAny(keywords, ["adaptive", "mode", "selector", "context", "packer"])) requested.push("implementation");
  if (hasAny(keywords, ["release", "changelog"]) && !requested.includes("docs")) requested.push("docs");
  return requested;
}

export function matchesRouteSurface(node: PalaceNode, surface: RouteSurface): boolean {
  const sourcePath = node.sourcePath.toLowerCase();
  switch (surface) {
    case "cli":
      return /(^|\/)packages\/cli(\/|$)|(^|\/)cli(\/|$)/.test(sourcePath);
    case "mcp":
      return /(^|\/)packages\/mcp(\/|$)|(^|\/)mcp(\/|$)/.test(sourcePath);
    case "shared":
      return /(^|\/)packages\/shared(\/|$)|(^|\/)shared(\/|$)|(^|\/)(types?|schemas?|contracts?)\.[^.]+$/.test(sourcePath);
    case "test":
      return node.kind === "test" || /(^|\/)(test|tests|spec|__tests__)(\/|$)|\.(test|spec)\.[^.]+$/.test(sourcePath);
    case "docs":
      return node.kind === "doc" || /(^|\/)(docs?|readme)(\/|\.|$)|build_week\.md$/.test(sourcePath);
    case "ci":
      return /(^|\/)\.github\/workflows(\/|$)|(^|\/)(ci|workflows?)(\/|$)/.test(sourcePath);
    case "package":
      return isPackageManifestPath(sourcePath);
    case "plugin":
      return /(^|\/)\.agents\/plugins\/marketplace\.json$|(^|\/)plugins\/[^/]+\//.test(sourcePath);
    case "implementation":
      return /(^|\/)packages\/core\/src\//.test(sourcePath) && node.kind !== "test";
  }
}

function isPackageManifestPath(sourcePath: string): boolean {
  return /(^|\/)(?:package\.json|pyproject\.toml|setup\.(?:py|cfg)|cargo\.toml|go\.mod|pom\.xml|build\.gradle(?:\.kts)?|composer\.json|gemfile|[^/]+\.csproj)$/.test(sourcePath);
}

function hasEvaluationKeywordPath(path: string, analysis: TaskAnalysis): boolean {
  if (/(route|router|memory|packer|context|pitfall|confidence|index|stale|classif|evaluation|retrospective)/.test(path)) return true;
  return analysis.keywords.some((keyword) => keyword.length > 3 && path.includes(keyword));
}

function layerHintBoost(node: PalaceNode, analysis: TaskAnalysis): number {
  const path = node.sourcePath.toLowerCase();
  const keywords = new Set(analysis.keywords);
  let boost = 0;
  if (hasAny(keywords, ["frontend", "page", "component", "ui"]) && /(^|\/)(frontend|client|web|app|pages|components)(\/|$)/.test(path)) boost += 22;
  if (hasAny(keywords, ["backend", "server", "service", "api", "controller"]) && /(^|\/)(backend|server|api|controllers|routes|services)(\/|$)/.test(path)) boost += 22;
  if (hasAny(keywords, ["database", "schema", "model"]) && /(schema|model|models|prisma|database|db|migration)/.test(path)) boost += 18;
  return boost;
}

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function hasAny(values: Set<string>, candidates: string[]): boolean {
  return candidates.some((candidate) => values.has(candidate));
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );
}

function relationBoosts(edges: PalaceEdge[]): Map<string, number> {
  const boosts = new Map<string, number>();
  for (const edge of edges) {
    if (!["imports", "tests", "tested_by"].includes(edge.type)) continue;
    boosts.set(edge.from, (boosts.get(edge.from) ?? 0) + edge.weight * 8);
    boosts.set(edge.to, (boosts.get(edge.to) ?? 0) + edge.weight * 8);
  }
  return boosts;
}
