import type { PackOutput, PalaceNode, PalaceRoute } from "@context-palace/shared";
import { DEFAULT_BUDGET } from "../config/defaults";
import { readIndex } from "../storage/read-palace";
import { routePalace } from "../router/route-planner";
import { estimateTokens } from "./token-estimator";
import { extractNodeContent, languageFence } from "./snippet-extractor";
import type { PackFormat } from "./output-format";

export async function packContext(root: string, task: string, options: { budget?: number; format?: PackFormat; routeId?: string } = {}): Promise<PackOutput> {
  const index = await readIndex(root);
  const route = options.routeId ? index.routes.find((candidate) => candidate.id === options.routeId) ?? (await routePalace(root, task, options.budget)) : await routePalace(root, task, options.budget);
  const refreshedIndex = await readIndex(root);
  const byId = new Map(refreshedIndex.nodes.map((node) => [node.id, node]));
  const maxTokens = options.budget ?? DEFAULT_BUDGET.maxInputTokens;
  const drawers: Array<{ node: PalaceNode; content: string; tokens: number; reason: string }> = [];
  let used = estimateTokens(routeSummary(route));

  for (const step of route.route) {
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
    markdown: renderMarkdown(task, route, drawers)
  };
}

function routeSummary(route: PalaceRoute): string {
  return [route.task, route.taskType, route.entry.floor, route.entry.wing, route.entry.room, ...route.route.map((step) => `${step.sourcePath} ${step.reason}`)].join("\n");
}

function renderMarkdown(task: string, route: PalaceRoute, drawers: Array<{ node: PalaceNode; content: string; tokens: number; reason: string }>): string {
  const lines: string[] = [
    "# Context Palace Pack",
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
    "",
    "## Read First",
    ...route.route.map((step, index) => `${index + 1}. ${step.sourcePath}\n   Reason: ${step.reason}\n   Load: ${step.loadLevel}`),
    "",
    "## Excluded Areas",
    ...(route.excluded.length ? route.excluded.map((item) => `- ${item.sourcePath}: ${item.reason}`) : ["- None"]),
    "",
    "## Relevant Drawers"
  ];

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
