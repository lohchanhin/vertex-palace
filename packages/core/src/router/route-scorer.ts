import type { PalaceEdge, PalaceNode, TaskType } from "@context-palace/shared";
import type { TaskAnalysis } from "./analyze-task";
import { floorTemplate } from "./locate-entry";

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

      if (node.wing && analysis.wingHints.includes(node.wing)) {
        score += 25;
        reasons.push(`wing matches task hint "${node.wing}"`);
      }
      if (node.room && analysis.roomHints.includes(node.room)) {
        score += 25;
        reasons.push(`room matches task hint "${node.room}"`);
      }

      const floorIndex = floors.indexOf(node.floor);
      if (floorIndex >= 0 && (score > 0 || node.kind === "test")) {
        score += Math.max(8, 24 - floorIndex * 6);
        reasons.push(`floor ${node.floor} is part of ${taskType} route template`);
      }

      if (taskType === "bugfix" && node.kind === "test") {
        score += 12;
        reasons.push("verification node is useful for a bugfix");
      }

      const relationBoost = edgeBoosts.get(node.id) ?? 0;
      if (relationBoost) {
        score += relationBoost;
        reasons.push("near related import or test edge");
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
