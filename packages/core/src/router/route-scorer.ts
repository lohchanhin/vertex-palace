import type { PalaceEdge, PalaceNode, TaskType } from "@vertex-palace/shared";
import type { TaskAnalysis } from "./analyze-task";
import { floorTemplate } from "./locate-entry";
import { isBinaryLikePath } from "../utils/binary-files";

export type ScoredNode = {
  node: PalaceNode;
  score: number;
  reasons: string[];
};

export function scoreNodes(nodes: PalaceNode[], edges: PalaceEdge[], analysis: TaskAnalysis, taskType: TaskType): ScoredNode[] {
  const floors = floorTemplate(taskType);
  const edgeBoosts = relationBoosts(edges);

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

      const evaluationBoost = evaluationHintBoost(node, taskType, entityHit > 0);
      if (evaluationBoost !== 0) {
        score += evaluationBoost;
        reasons.push(evaluationBoost > 0 ? "matches evaluation/meta task context" : "application source is secondary for evaluation");
      }
      if (taskType === "evaluation" && !isEvaluationRouteAnchor(node, taskType, analysis, entityHit > 0)) {
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
      if (node.kind === "test" && taskType !== "test") {
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
    .filter((item) => item.score > 10)
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

function evaluationHintBoost(node: PalaceNode, taskType: TaskType, hasEntityHit: boolean): number {
  if (taskType !== "evaluation") return 0;
  const path = node.sourcePath.toLowerCase();
  if (isEvaluationMetaPath(path)) return 32;
  if (!hasEntityHit && /(^|\/)(backend|frontend|app|pages|components|controllers|services)(\/|$)/.test(path)) return -240;
  if (node.kind === "doc" || node.kind === "test") return 10;
  return 0;
}

function isEvaluationRouteAnchor(node: PalaceNode, taskType: TaskType, analysis: TaskAnalysis, hasEntityHit: boolean): boolean {
  if (taskType !== "evaluation") return true;
  const path = node.sourcePath.toLowerCase();
  if (isEvaluationMetaPath(path)) return true;
  if (hasEntityHit && /(^|\/)(memory|pitfalls?|routes?|tasks?|decisions?|notes?)(\/|$)|latest|changed|history|client|tenant/.test(path)) return true;
  if ((node.kind === "doc" || node.kind === "test") && hasEvaluationKeywordPath(path, analysis)) return true;
  return false;
}

function isEvaluationMetaPath(path: string): boolean {
  return /(^|\/)(memory|router|packer|storage|scanner|indexer)(\/|$)|pitfall|latest-route|task-log|route-planner|route-scorer|context-packer|write-memory|analyze-task|classify-task/.test(path);
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
