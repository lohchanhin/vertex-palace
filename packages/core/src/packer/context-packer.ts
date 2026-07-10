import type { PackOutput, PalaceNode, PalaceRoute } from "@vertex-palace/shared";
import { DEFAULT_BUDGET } from "../config/defaults";
import { readPitfallBoardForPack } from "../memory/pitfall-board";
import { readIndex } from "../storage/read-palace";
import { routePalace } from "../router/route-planner";
import { estimateTokens } from "./token-estimator";
import { extractNodeContent, languageFence } from "./snippet-extractor";
import type { PackFormat } from "./output-format";

export type PackContextOptions = {
  budget?: number;
  format?: PackFormat;
  routeId?: string;
  routeLimit?: number;
  maxDrawers?: number;
  includeExcluded?: boolean;
};

export async function packContext(root: string, task: string, options: PackContextOptions = {}): Promise<PackOutput> {
  const index = await readIndex(root);
  const routeOptions = { budget: options.budget, routeLimit: options.routeLimit };
  const route = options.routeId ? index.routes.find((candidate) => candidate.id === options.routeId) ?? (await routePalace(root, task, routeOptions)) : await routePalace(root, task, routeOptions);
  const refreshedIndex = await readIndex(root);
  const byId = new Map(refreshedIndex.nodes.map((node) => [node.id, node]));
  const maxTokens = options.budget ?? DEFAULT_BUDGET.maxInputTokens;
  const maxDrawers = options.maxDrawers ?? defaultMaxDrawers(maxTokens);
  const drawers: Array<{ node: PalaceNode; content: string; tokens: number; reason: string }> = [];
  const pitfallBoard = await readPitfallBoardForPack(root);
  let used = estimateTokens(routeSummary(route, options.includeExcluded !== false)) + estimateTokens(pitfallBoard ?? "");

  for (const step of route.route) {
    if (drawers.length >= maxDrawers) break;
    const node = byId.get(step.nodeId);
    if (!node) continue;
    const content = await extractNodeContent(root, node, step.loadLevel);
    const tokens = estimateTokens(content) + estimateTokens(step.reason);
    if (used + tokens > maxTokens - DEFAULT_BUDGET.bufferTokens && drawers.length > 0) continue;
    used += tokens;
    drawers.push({ node, content, tokens, reason: step.reason });
  }

  const json = {
    task,
    route,
    pitfallBoard,
    drawers: drawers.map((drawer) => ({
      node: drawer.node,
      content: drawer.content,
      estimatedTokens: drawer.tokens,
      reason: drawer.reason
    }))
  };

  if (options.format === "json") {
    return { task, routeId: route.id, estimatedTokens: used, json };
  }

  return {
    task,
    routeId: route.id,
    estimatedTokens: used,
    markdown: renderMarkdown(task, route, drawers, { includeExcluded: options.includeExcluded !== false, pitfallBoard })
  };
}

function routeSummary(route: PalaceRoute, includeExcluded: boolean): string {
  return [
    route.task,
    route.taskType,
    route.entry.floor,
    route.entry.wing,
    route.entry.room,
    ...route.route.map((step) => `${step.sourcePath} ${step.reason}`),
    ...(includeExcluded ? route.excluded.map((item) => `${item.sourcePath} ${item.reason}`) : [])
  ].join("\n");
}

function defaultMaxDrawers(budget: number): number {
  if (budget <= 6000) return 4;
  if (budget <= 12000) return 6;
  return 8;
}

function renderMarkdown(
  task: string,
  route: PalaceRoute,
  drawers: Array<{ node: PalaceNode; content: string; tokens: number; reason: string }>,
  options: { includeExcluded: boolean; pitfallBoard?: string }
): string {
  const lines: string[] = [
    "# Vertex Palace Pack",
    "",
    "## Task",
    task,
    "",
    "## Palace Route",
    `Task type: ${route.taskType}`,
    `Confidence: ${route.confidence}`,
    "",
    "You are in:",
    `- Floor: ${route.entry.floor}`,
    `- Wing: ${route.entry.wing ?? "unknown"}`,
    `- Room: ${route.entry.room ?? "general"}`,
    ""
  ];

  if (options.pitfallBoard) {
    lines.push("## Entrance Pitfall Board", "", stripMarkdownTitle(options.pitfallBoard), "");
  }

  lines.push(
    "## Read First",
    ...route.route.map((step, index) => `${index + 1}. ${step.sourcePath}\n   Reason: ${step.reason}\n   Load: ${step.loadLevel}`),
    "",
    "## Relevant Drawers"
  );

  if (options.includeExcluded) {
    lines.splice(
      lines.indexOf("## Relevant Drawers"),
      0,
      "## Excluded Areas",
      ...(route.excluded.length ? route.excluded.map((item) => `- ${item.sourcePath}: ${item.reason}`) : ["- None"]),
      ""
    );
  }

  for (const drawer of drawers) {
    const location = drawer.node.startLine ? `${drawer.node.sourcePath}:${drawer.node.startLine}${drawer.node.endLine ? `-${drawer.node.endLine}` : ""}` : drawer.node.sourcePath;
    lines.push(
      "",
      `### Drawer: ${drawer.node.cabinet ?? drawer.node.title}${drawer.node.drawer ? ` / ${drawer.node.drawer}` : ""}`,
      `Source: ${location}`,
      `Reason: ${drawer.reason}`,
      "",
      `\`\`\`${languageFence(drawer.node)}`,
      drawer.content.trimEnd(),
      "```"
    );
  }

  lines.push("", "## Verification", "", "Run the targeted tests for the route before broadening scope.", "");
  return lines.join("\n");
}

function stripMarkdownTitle(content: string): string {
  return content.replace(/^# .+\r?\n+/, "").trim();
}
