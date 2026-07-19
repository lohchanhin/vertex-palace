import type { PalaceEdge, PalaceNode, TaskType } from "@vertex-palace/shared";
import type { TaskAnalysis } from "./analyze-task";
import { floorTemplate } from "./locate-entry";
import { isBinaryLikePath } from "../utils/binary-files";
import { normalizeLexicalToken, tokenizeLexical } from "../utils/lexical-tokens";
import { analyzePublicationIntent } from "./publication-intent";

export type ScoredNode = {
  node: PalaceNode;
  score: number;
  reasons: string[];
  matchedKeywordCount: number;
};

export type RouteSurface =
  | "cli"
  | "mcp"
  | "shared"
  | "test"
  | "config"
  | "docs"
  | "ci"
  | "evidence"
  | "package"
  | "plugin"
  | "implementation";

export function scoreNodes(nodes: PalaceNode[], edges: PalaceEdge[], analysis: TaskAnalysis, taskType: TaskType): ScoredNode[] {
  const floors = floorTemplate(taskType);
  const edgeBoosts = relationBoosts(edges);
  const requestedSurfaces = requestedRouteSurfaces(analysis);
  const semanticMatchLimit = taskType === "bugfix" ? 8 : 4;
  const typeDeclarationIntent = isTypeDeclarationIntent(analysis);

  return nodes
    .filter((node) => node.kind !== "directory")
    .map((node) => {
      const reasons: string[] = [];
      let score = 0;
      const haystack = [node.sourcePath, node.title, node.summary, node.lod.level4, node.wing, node.room, ...node.tags].filter(Boolean).join(" ").toLowerCase();
      const tokens = tokenize(haystack);
      const entityHit = entityHintBoost(node, analysis);
      const matchedKeywords = new Set<string>();
      let semanticMatchCount = 0;

      for (const keyword of analysis.keywords) {
        if (!keyword) continue;
        const normalizedKeyword = normalizeLexicalToken(keyword);
        if (SURFACE_ONLY_KEYWORDS.has(normalizedKeyword)) continue;
        if (tokenize(node.sourcePath).has(normalizedKeyword)) {
          score += 35;
          reasons.push(`source path matches "${keyword}"`);
          matchedKeywords.add(normalizedKeyword);
        } else if (tokenize(node.title).has(normalizedKeyword)) {
          score += 30;
          reasons.push(`symbol or file title matches "${keyword}"`);
          matchedKeywords.add(normalizedKeyword);
        } else if (tokens.has(normalizedKeyword)) {
          const lowSignal = LOW_SIGNAL_SEMANTIC_KEYWORDS.has(normalizedKeyword);
          score += lowSignal ? 8 : semanticMatchCount < semanticMatchLimit ? 25 : 4;
          if (!lowSignal) semanticMatchCount += 1;
          reasons.push(`summary or tags match "${keyword}"`);
          matchedKeywords.add(normalizedKeyword);
        }
      }

      if (isImplementationNode(node) && taskType !== "test" && matchedKeywords.size >= 2) {
        score += 35;
        reasons.push("implementation covers multiple task concepts");
      }
      const discriminativeKeywordCount = [...matchedKeywords].filter(
        (keyword) => !LOW_SIGNAL_SEMANTIC_KEYWORDS.has(keyword)
      ).length;
      if (isImplementationNode(node) && taskType === "bugfix" && discriminativeKeywordCount >= 4) {
        score += Math.min(60, (discriminativeKeywordCount - 3) * 15);
        reasons.push("implementation coherently matches several bug symptoms");
      }
      if (node.startLine && matchedKeywords.size > 0) {
        score += 12;
        reasons.push("symbol-level match provides a precise source range");
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
      const typeDeclarationBoost = typeDeclarationHintBoost(node, analysis, typeDeclarationIntent);
      if (typeDeclarationBoost !== 0) {
        score += typeDeclarationBoost;
        reasons.push(
          typeDeclarationBoost > 0
            ? "matches explicit type-declaration task intent"
            : "runtime surface is secondary for a type-declaration-only task"
        );
      }
      const surfaceHits = requestedSurfaces.filter(
        (surface) =>
          matchesRouteSurface(node, surface)
          && !(taskType === "bugfix" && surface === "test" && isVerificationScriptPath(node.sourcePath))
      );
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
      if (isBenchmarkLikePath(node.sourcePath) && !analysis.keywords.some((keyword) => ["benchmark", "performance", "profiling"].includes(keyword))) {
        score -= 90;
        reasons.push("benchmark code is secondary for this task");
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

      return {
        node,
        score,
        reasons: [...new Set(reasons)].slice(0, 4),
        matchedKeywordCount: matchedKeywords.size
      };
    })
    .filter(
      (item) =>
        item.score > 10 &&
        (taskType === "test" || analysis.keywords.includes("fixture") || !isFixtureLikePath(item.node.sourcePath))
    )
    .sort((a, b) => b.score - a.score || a.node.sourcePath.localeCompare(b.node.sourcePath));
}

const SURFACE_ONLY_KEYWORDS = new Set(["regression", "test", "verification"]);
const LOW_SIGNAL_SEMANTIC_KEYWORDS = new Set([
  "allow",
  "allowing",
  "data",
  "input",
  "option",
  "options",
  "output",
  "preserve",
  "result",
  "results",
  "select",
  "value",
  "values"
]);

function isImplementationNode(node: PalaceNode): boolean {
  return node.floor !== "05-verification" && !["test", "config", "doc", "runtime-log"].includes(node.kind);
}

function wantsMediaAsset(analysis: TaskAnalysis): boolean {
  const mediaKeywords = new Set(["asset", "assets", "image", "images", "img", "logo", "icon", "png", "jpg", "jpeg", "gif", "webp", "screenshot", "picture", "photo"]);
  return analysis.keywords.some((keyword) => mediaKeywords.has(keyword));
}

function isFixtureLikePath(sourcePath: string): boolean {
  return /(^|\/)(fixtures?|__fixtures__)(\/|$)/i.test(sourcePath);
}

function isBenchmarkLikePath(sourcePath: string): boolean {
  return /(^|\/)(?:bench(?:mark(?:er|s)?)?|benches|perf)(?:[._/-]|$)/i.test(sourcePath);
}

export function isTypeDeclarationIntent(analysis: TaskAnalysis): boolean {
  const task = analysis.raw.toLowerCase();
  const signals = [
    /\b(?:typescript\s+)?declaration(?:s|\s+files?)?\b/,
    /\bcompile[-\s]?time\b/,
    /\btype[-\s]?tests?\b/,
    /\btype\s+hints?\b/,
    /\b(?:public|exported)\b.{0,40}\btypes?\b/,
    /(?:类型|型別)(?:声明|宣告|测试|測試)/,
    /(?:编译期|編譯期|编译时|編譯時)/
  ].filter((pattern) => pattern.test(task)).length;
  return /\btsd\b/.test(task) || signals >= 2;
}

function typeDeclarationHintBoost(node: PalaceNode, analysis: TaskAnalysis, enabled: boolean): number {
  if (!enabled) return 0;
  const sourcePath = node.sourcePath.toLowerCase();
  if (isTypeTestPath(sourcePath)) return 170;
  if (isTypeDeclarationPath(sourcePath)) return 150;
  if (isPackageManifestPath(sourcePath) && requestsTypeTestSetup(analysis)) return 90;
  if (node.kind === "test") return -130;
  if (/\.[cm]?[jt]sx?$/.test(sourcePath)) return -110;
  return 0;
}

function isTypeDeclarationPath(sourcePath: string): boolean {
  return /\.d\.[cm]?ts$/.test(sourcePath);
}

function isTypeTestPath(sourcePath: string): boolean {
  return /\.(?:test|spec)-d\.[cm]?ts$/.test(sourcePath)
    || /(^|\/)(?:test-d|type-tests?)(\/|$)/.test(sourcePath);
}

function requestsTypeTestSetup(analysis: TaskAnalysis): boolean {
  return /\b(?:type[-\s]?tests?|tsd|test\s+setup)\b/i.test(analysis.raw)
    || /(?:类型|型別)(?:测试|測試)|(?:测试|測試)(?:配置|設定)/.test(analysis.raw);
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
  const publication = analyzePublicationIntent(analysis.raw);
  const requested: RouteSurface[] = [];
  if (hasAny(keywords, ["cli", "command", "commands"])) requested.push("cli");
  if (keywords.has("mcp")) requested.push("mcp");
  if (hasAny(keywords, ["shared", "schema", "schemas", "type", "types", "contract", "contracts"])) requested.push("shared");
  if (hasAny(keywords, ["bypass", "boundaries", "boundary", "transport", "telemetry", "payload"]) && !requested.includes("shared")) requested.push("shared");
  const explicitVerification = hasAny(keywords, ["test", "tests", "validate", "validation", "verification", "regression"]);
  const evidencePinVerification = keywords.has("evidence")
    && hasAny(keywords, ["implementation", "source"])
    && hasAny(keywords, ["config", "plan", "protocol", "frozen"]);
  if (explicitVerification || evidencePinVerification) requested.push("test");
  if (hasAny(keywords, ["config", "plan", "protocol", "frozen"])) requested.push("config");
  if (hasAny(keywords, ["doc", "docs", "documentation", "readme"])) requested.push("docs");
  if (hasAny(keywords, ["ci", "workflow", "workflows", "actions"])) requested.push("ci");
  if (isMachineEvidenceArtifactRequest(analysis.raw)) requested.push("evidence");
  if (publication.releaseIntent || (isTypeDeclarationIntent(analysis) && requestsTypeTestSetup(analysis))) requested.push("package");
  if (hasAny(keywords, ["plugin", "marketplace"])) requested.push("plugin");
  const evaluationIntent = hasAny(keywords, ["evaluation", "evaluate", "retrospective"]);
  if (
    hasAny(keywords, ["implementation", "source", "generator"])
    || (!evaluationIntent && hasAny(keywords, ["adaptive", "bypass", "mode", "selector", "context", "packer", "route", "router", "score", "scorer", "precision", "recall", "confidence"]))
  ) requested.push("implementation");
  if (hasAny(keywords, ["release", "changelog"]) && !requested.includes("docs")) requested.push("docs");
  if (keywords.has("release") && requested.includes("plugin")) {
    if (!requested.includes("mcp")) requested.push("mcp");
    if (!requested.includes("cli")) requested.push("cli");
    if (!requested.includes("shared")) requested.push("shared");
  }
  return requested;
}

function isMachineEvidenceArtifactRequest(task: string): boolean {
  const english = /\b(?:sync|preserve|record|write|update|refresh|include|attach)\b.{0,80}\bmachine(?:[-\s]?readable)?\b.{0,40}\bevidence\b/i;
  const chinese = /(?:同步|保留|记录|記錄|写入|寫入|更新|刷新|纳入|納入|附上|补齐|補齊).{0,50}(?:机器(?:可读)?|機器(?:可讀)?).{0,30}(?:证据|證據)/;
  return english.test(task) || chinese.test(task);
}

export function matchesRouteSurface(node: PalaceNode, surface: RouteSurface): boolean {
  const sourcePath = node.sourcePath.toLowerCase();
  switch (surface) {
    case "cli":
      return /(^|\/)packages\/cli(\/|$)|(^|\/)cli(\/|$)/.test(sourcePath);
    case "mcp":
      return /(^|\/)packages\/mcp(\/|$)|(^|\/)mcp(\/|$)|(^|\/)scripts\/[^/]*mcp[^/]*$/.test(sourcePath);
    case "shared":
      return /(^|\/)packages\/shared(\/|$)|(^|\/)shared(\/|$)|(^|\/)(types?|schemas?|contracts?)\.[^.]+$|\.d\.[cm]?ts$/.test(sourcePath);
    case "test":
      return node.kind === "test"
        || /(^|\/)(test|tests|spec|__tests__)(\/|$)|\.(test|spec)\.[^.]+$/.test(sourcePath)
        || /(^|\/)scripts\/[^/]*(?:verify|smoke|benchmark)[^/]*$/.test(sourcePath);
    case "config":
      return node.kind === "config"
        || /(^|\/)(?:results\/[^/]+\/)?(?:plan|manifest|protocol|config)[^/]*\.(?:json|ya?ml|toml)$/.test(sourcePath);
    case "docs":
      return node.kind === "doc" || /(^|\/)(docs?|readme)(\/|\.|$)|build_week\.md$/.test(sourcePath);
    case "ci":
      return /(^|\/)\.github\/workflows(\/|$)|(^|\/)(ci|workflows?)(\/|$)/.test(sourcePath);
    case "evidence":
      return isMachineEvidencePath(sourcePath);
    case "package":
      return isPackageManifestPath(sourcePath);
    case "plugin":
      return /(^|\/)\.agents\/plugins\/marketplace\.json$|(^|\/)plugins\/[^/]+\//.test(sourcePath);
    case "implementation":
      return /(^|\/)src\//.test(sourcePath)
        && node.kind !== "test"
        && !["config", "doc", "runtime-log"].includes(node.kind);
  }
}

function isVerificationScriptPath(sourcePath: string): boolean {
  return /(^|\/)scripts\/[^/]*(?:verify|smoke|benchmark)[^/]*$/.test(sourcePath.toLowerCase());
}

function isPackageManifestPath(sourcePath: string): boolean {
  return /(^|\/)(?:package\.json|pyproject\.toml|setup\.(?:py|cfg)|cargo\.toml|go\.mod|pom\.xml|build\.gradle(?:\.kts)?|composer\.json|gemfile|[^/]+\.csproj)$/.test(sourcePath);
}

function isMachineEvidencePath(sourcePath: string): boolean {
  const fileName = sourcePath.split("/").at(-1) ?? sourcePath;
  if (!/(^|\/)(?:docs\/research\/)?evidence\//.test(sourcePath) || !/\.json$/.test(fileName)) return false;
  if (/(?:^|[-_.])(?:trial|run|trace|transcript|raw)[-_]?\d*/.test(fileName)) return false;
  return /(?:evaluation|summary|report|audit|validation|sync|gate|preflight|evidence)/.test(fileName);
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
  return tokenizeLexical(value);
}

function relationBoosts(edges: PalaceEdge[]): Map<string, number> {
  const boosts = new Map<string, number>();
  for (const edge of edges) {
    if (!["imports", "tests", "tested_by", "changed_with", "configures", "depends_on"].includes(edge.type)) continue;
    if (["changed_with", "configures", "depends_on"].includes(edge.type) && edge.weight < 0.8) continue;
    boosts.set(edge.from, (boosts.get(edge.from) ?? 0) + edge.weight * 8);
    boosts.set(edge.to, (boosts.get(edge.to) ?? 0) + edge.weight * 8);
  }
  return boosts;
}
