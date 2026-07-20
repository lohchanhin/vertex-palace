import type {
  LoadLevel,
  MemorySelectionTelemetry,
  PackOutput,
  PalaceExecutionBoundaries,
  PalaceModeSelection,
  PalaceNode,
  PalacePayloadMetrics,
  PalaceRoute,
  PalaceRouteStep
} from "@vertex-palace/shared";
import { DEFAULT_BUDGET } from "../config/defaults";
import {
  readGuardedMemory,
  readPitfallBoardForPack,
  renderGuardedMemoryItem,
  type GuardedMemoryResult
} from "../memory/pitfall-board";
import { routePalace } from "../router/route-planner";
import { readIndex } from "../storage/read-palace";
import type { PackFormat } from "./output-format";
import { extractNodeContent, languageFence } from "./snippet-extractor";
import { estimateTokens } from "./token-estimator";

export type PackContextOptions = {
  budget?: number;
  format?: PackFormat;
  routeId?: string;
  routeLimit?: number;
  maxDrawers?: number;
  includeExcluded?: boolean;
  modeSelection?: PalaceModeSelection;
};

type PackedDrawer = {
  node: PalaceNode;
  content: string;
  tokens: number;
  reason: string;
  step: PalaceRouteStep;
};

type TieredRoute = {
  primary: PalaceRouteStep[];
  support: PalaceRouteStep[];
  deferred: PalaceRouteStep[];
};

export async function packContext(root: string, task: string, options: PackContextOptions = {}): Promise<PackOutput> {
  const index = await readIndex(root);
  const routeOptions = { budget: options.budget, routeLimit: options.routeLimit };
  const route = options.routeId
    ? index.routes.find((candidate) => candidate.id === options.routeId) ?? (await routePalace(root, task, routeOptions))
    : await routePalace(root, task, routeOptions);
  const refreshedIndex = await readIndex(root);

  if (options.modeSelection) {
    if (options.modeSelection.mode === "bypass") {
      return packBypassContext(task, route, options.modeSelection, options.format);
    }
    return packAdaptiveContext(root, task, route, refreshedIndex.nodes, options);
  }

  const byId = new Map(refreshedIndex.nodes.map((node) => [node.id, node]));
  const maxTokens = options.budget ?? DEFAULT_BUDGET.maxInputTokens;
  const maxDrawers = options.maxDrawers ?? defaultMaxDrawers(maxTokens, route.taskType);
  const drawers: PackedDrawer[] = [];
  const pitfallBoard = await readPitfallBoardForPack(root, { task, taskType: route.taskType });
  let used = estimateTokens(routeSummary(route, options.includeExcluded !== false)) + estimateTokens(pitfallBoard ?? "");

  for (const step of route.route) {
    if (drawers.length >= maxDrawers) break;
    const node = byId.get(step.nodeId);
    if (!node) continue;
    const content = await extractNodeContent(root, node, step.loadLevel);
    const tokens = estimateTokens(content) + estimateTokens(step.reason);
    if (used + tokens > maxTokens - DEFAULT_BUDGET.bufferTokens && drawers.length > 0) continue;
    used += tokens;
    drawers.push({ node, content, tokens, reason: step.reason, step });
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
    markdown: renderMarkdown(task, route, drawers, {
      includeExcluded: options.includeExcluded !== false,
      pitfallBoard
    })
  };
}

async function packAdaptiveContext(
  root: string,
  task: string,
  route: PalaceRoute,
  nodes: PalaceNode[],
  options: PackContextOptions
): Promise<PackOutput> {
  const selection = options.modeSelection as PalaceModeSelection;
  const memory = selection.memoryLevel !== "none"
    ? await readGuardedMemory(root, {
        task,
        taskType: route.taskType,
        limit: selection.riskSignals.staleMemoryRisk ? 2 : 3,
        maxTokens: selection.riskSignals.staleMemoryRisk ? 500 : 600,
        maxAgeDays: selection.riskSignals.staleMemoryRisk ? 60 : 90
      })
    : emptyGuardedMemory();
  const tiered = tierRoute(route, memory.telemetry.scopeInference?.client);
  const guardrails = adaptiveGuardrails(selection, memory);
  const boundaries = buildExecutionBoundaries(route, tiered, selection, memory);
  const desiredSteps = adaptiveLoadSteps(selection, tiered);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const maxDrawers = options.maxDrawers ?? adaptiveMaxDrawers(selection.mode);
  const drawers: PackedDrawer[] = [];
  const buffer = Math.min(400, Math.max(100, Math.floor(selection.maxContextTokens * 0.12)));
  let used = estimateTokens(adaptiveRouteSummary(task, route, tiered, selection, guardrails, memory, boundaries));

  for (const step of desiredSteps) {
    if (drawers.length >= maxDrawers) break;
    const node = byId.get(step.nodeId);
    if (!node) continue;
    let loadLevel = adaptiveLoadLevel(step.loadLevel, selection.mode, node);
    let content = await extractNodeContent(root, node, loadLevel);
    let tokens = estimateTokens(content) + estimateTokens(step.reason);
    if (used + tokens > selection.maxContextTokens - buffer) {
      content = node.summary;
      loadLevel = "summary";
      tokens = estimateTokens(content) + estimateTokens(step.reason);
    }
    if (used + tokens > selection.maxContextTokens - buffer) continue;
    used += tokens;
    drawers.push({ node, content, tokens, reason: step.reason, step: { ...step, loadLevel } });
  }

  const baseMetrics = metricSkeleton(selection, tiered, memory, guardrails);

  if (options.format === "json") {
    while (true) {
      const deferredReferences = adaptiveDeferredReferences(route, drawers);
      const measured = measureAdaptiveJson(
        task,
        route,
        selection,
        tiered,
        drawers,
        deferredReferences,
        guardrails,
        memory,
        boundaries,
        baseMetrics
      );
      if (measured.payload.contextEstimatedTokens <= selection.maxContextTokens) {
        return {
          task,
          routeId: route.id,
          mode: selection.mode,
          modeSelection: selection,
          payload: measured.payload,
          memoryTelemetry: memory.telemetry,
          executionBoundaries: boundaries,
          estimatedTokens: measured.payload.contextEstimatedTokens,
          json: measured.json
        };
      }
      assertAdaptiveReduction(drawers, selection, measured.payload, "JSON");
    }
  }

  while (true) {
    const deferredReferences = adaptiveDeferredReferences(route, drawers);
    const measured = measureAdaptiveMarkdown(
      task,
      route,
      selection,
      tiered,
      drawers,
      deferredReferences,
      guardrails,
      memory,
      boundaries,
      baseMetrics
    );
    if (measured.payload.contextEstimatedTokens <= selection.maxContextTokens) {
      return {
        task,
        routeId: route.id,
        mode: selection.mode,
        modeSelection: selection,
        payload: measured.payload,
        memoryTelemetry: memory.telemetry,
        executionBoundaries: boundaries,
        estimatedTokens: measured.payload.contextEstimatedTokens,
        markdown: measured.markdown
      };
    }
    assertAdaptiveReduction(drawers, selection, measured.payload, "Markdown");
  }
}

function adaptiveDeferredReferences(route: PalaceRoute, drawers: PackedDrawer[]): PalaceRouteStep[] {
  const loadedIds = new Set(drawers.map((drawer) => drawer.step.nodeId));
  return route.route.filter((step) => !loadedIds.has(step.nodeId));
}

function assertAdaptiveReduction(
  drawers: PackedDrawer[],
  selection: PalaceModeSelection,
  payload: PalacePayloadMetrics,
  format: "JSON" | "Markdown"
): void {
  if (reduceAdaptiveDrawers(drawers)) return;
  throw new Error(
    `${format} adaptive context requires ${payload.contextEstimatedTokens} estimated tokens, `
    + `which exceeds the ${selection.maxContextTokens}-token ceiling even without source drawers.`
  );
}

function reduceAdaptiveDrawers(drawers: PackedDrawer[]): boolean {
  const index = drawers.length - 1;
  if (index < 0) return false;
  const drawer = drawers[index];
  const summary = drawer.node.summary.trim();
  if (summary && drawer.content.trim() !== summary) {
    drawer.content = summary;
    drawer.tokens = estimateTokens(summary) + estimateTokens(drawer.reason);
    drawer.step = { ...drawer.step, loadLevel: "summary" };
    return true;
  }
  drawers.pop();
  return true;
}

function measureAdaptiveJson(
  task: string,
  route: PalaceRoute,
  selection: PalaceModeSelection,
  tiered: TieredRoute,
  drawers: PackedDrawer[],
  deferredReferences: PalaceRouteStep[],
  guardrails: string[],
  memory: GuardedMemoryResult,
  boundaries: PalaceExecutionBoundaries,
  baseMetrics: PalacePayloadMetrics
): { json: unknown; payload: PalacePayloadMetrics } {
  let payload = baseMetrics;
  let json = adaptiveJson(task, route, selection, tiered, drawers, deferredReferences, guardrails, memory, boundaries, payload);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const measured = withMeasuredPayload(baseMetrics, serializeJsonOutput(json));
    if (sameMeasuredPayload(payload, measured)) return { json, payload: measured };
    payload = measured;
    json = adaptiveJson(task, route, selection, tiered, drawers, deferredReferences, guardrails, memory, boundaries, payload);
  }
  throw new Error("JSON adaptive payload metrics did not converge.");
}

function measureAdaptiveMarkdown(
  task: string,
  route: PalaceRoute,
  selection: PalaceModeSelection,
  tiered: TieredRoute,
  drawers: PackedDrawer[],
  deferredReferences: PalaceRouteStep[],
  guardrails: string[],
  memory: GuardedMemoryResult,
  boundaries: PalaceExecutionBoundaries,
  baseMetrics: PalacePayloadMetrics
): { markdown: string; payload: PalacePayloadMetrics } {
  let payload = baseMetrics;
  let markdown = renderAdaptiveMarkdown(
    task,
    route,
    selection,
    tiered,
    drawers,
    deferredReferences,
    guardrails,
    memory,
    boundaries,
    payload
  );
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const measured = withMeasuredPayload(baseMetrics, markdown);
    if (sameMeasuredPayload(payload, measured)) return { markdown, payload: measured };
    payload = measured;
    markdown = renderAdaptiveMarkdown(
      task,
      route,
      selection,
      tiered,
      drawers,
      deferredReferences,
      guardrails,
      memory,
      boundaries,
      payload
    );
  }
  throw new Error("Markdown adaptive payload metrics did not converge.");
}

function sameMeasuredPayload(left: PalacePayloadMetrics, right: PalacePayloadMetrics): boolean {
  return left.contextBytes === right.contextBytes
    && left.contextEstimatedTokens === right.contextEstimatedTokens;
}

export function serializePackOutput(output: PackOutput): string {
  return output.markdown ?? serializeJsonOutput(output.json);
}

export function packBypassContext(
  task: string,
  route: PalaceRoute,
  selection: PalaceModeSelection,
  format: PackFormat = "markdown"
): PackOutput {
  const primary = route.route.find((step) => (step.tier ?? inferredTier(step.priority)) === "primary") ?? route.route[0];
  const reason = [
    selection.reasons.join(" "),
    "Direct: inspect once, edit, run the known or conventional test, batch final diff and status, stop."
  ].join(" ");
  const minimal = {
    mode: "bypass" as const,
    primaryCandidate: primary ? stripSourceLocation(primary.sourcePath) : null,
    reason
  };
  const serialized = format === "json"
    ? serializeJsonOutput(minimal)
    : [
        "Mode: bypass",
        `Primary candidate: ${minimal.primaryCandidate ?? "none"}`,
        `Reason: ${reason}`,
        ""
      ].join("\n");
  const telemetry = emptyMemoryTelemetry();
  const payload = withMeasuredPayload({
    mode: "bypass",
    calls: 1,
    contextCalls: 1,
    contextBytes: 0,
    contextEstimatedTokens: 0,
    routeStepCount: primary ? 1 : 0,
    primaryCount: primary ? 1 : 0,
    supportCount: 0,
    deferredCount: 0,
    memoryItemCount: 0,
    memoryCandidateCount: 0,
    memoryExcludedCount: 0,
    memoryEstimatedTokens: 0,
    guardrailCount: 0
  }, serialized);
  return {
    task,
    routeId: route.id,
    mode: "bypass",
    modeSelection: selection,
    payload,
    memoryTelemetry: telemetry,
    estimatedTokens: payload.contextEstimatedTokens,
    ...(format === "json" ? { json: minimal } : { markdown: serialized })
  };
}

function serializeJsonOutput(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function stripSourceLocation(sourcePath: string): string {
  return sourcePath.replace(/:\d+(?:-\d+)?$/, "");
}

function adaptiveJson(
  task: string,
  route: PalaceRoute,
  selection: PalaceModeSelection,
  tiered: TieredRoute,
  drawers: PackedDrawer[],
  deferredReferences: PalaceRouteStep[],
  guardrails: string[],
  memory: GuardedMemoryResult,
  boundaries: PalaceExecutionBoundaries,
  payload: PalacePayloadMetrics
): unknown {
  return {
    task,
    mode: selection.mode,
    selection: compactSelection(selection),
    route: {
      id: route.id,
      taskType: route.taskType,
      confidence: route.confidence,
      entry: route.entry,
      primary: tiered.primary.map(compactRouteStep)
    },
    context: drawers.map((drawer) => ({
      sourcePath: drawer.node.sourcePath,
      palacePath: drawer.node.palacePath,
      title: drawer.node.title,
      tier: drawer.step.tier ?? inferredTier(drawer.step.priority),
      loadLevel: drawer.step.loadLevel,
      reason: drawer.reason,
      estimatedTokens: drawer.tokens,
      content: drawer.content
    })),
    deferredReferences: deferredReferences.map(compactDeferredStep),
    guardrails,
    memory: memory.items,
    memoryTelemetry: memory.telemetry,
    executionBoundaries: boundaries,
    recommendedExecution: recommendedExecution(selection.mode),
    payload
  };
}

function renderAdaptiveMarkdown(
  task: string,
  route: PalaceRoute,
  selection: PalaceModeSelection,
  tiered: TieredRoute,
  drawers: PackedDrawer[],
  deferredReferences: PalaceRouteStep[],
  guardrails: string[],
  memory: GuardedMemoryResult,
  boundaries: PalaceExecutionBoundaries,
  payload: PalacePayloadMetrics
): string {
  const lines = [
    "# Vertex Palace Adaptive Context",
    "",
    `Mode: ${selection.mode}`,
    `Mode confidence: ${selection.confidence}`,
    `Route confidence: ${route.confidence}`,
    `Why: ${selection.reasons.join(" ")}`,
    "",
    "## Task",
    "",
    task,
    "",
    "## Payload",
    "",
    `Calls: ${payload.contextCalls} | Bytes: ${payload.contextBytes} | Estimated tokens: ${payload.contextEstimatedTokens}`,
    `Estimated context cost: ${payload.contextEstimatedTokens} / ${selection.maxContextTokens} token ceiling`,
    `Route: ${payload.routeStepCount} (${payload.primaryCount} primary, ${payload.supportCount} support, ${payload.deferredCount} deferred)`,
    `Memory: ${payload.memoryItemCount} included / ${payload.memoryCandidateCount} candidates / ${payload.memoryExcludedCount} excluded / ~${payload.memoryEstimatedTokens} tokens | Guardrails: ${payload.guardrailCount}`,
    "",
    "## Primary",
    "",
    ...(tiered.primary.length ? tiered.primary.map(renderRouteReference) : ["- No primary route selected."]),
    ""
  ];

  lines.push(
    "## Support",
    "",
    ...(tiered.support.length ? tiered.support.map(renderRouteReference) : ["- None."]),
    "",
    "## Required Evidence",
    "",
    ...(boundaries.requiredEvidence.length
      ? boundaries.requiredEvidence.map((sourcePath) => `- ${sourcePath}`)
      : ["- No separate supporting evidence was selected."]),
    ""
  );

  if (guardrails.length) {
    lines.push("## Guardrails", "", ...guardrails.map((guardrail) => `- ${guardrail}`), "");
  }

  if (selection.mode === "guarded-memory-palace" || memory.items.length) {
    lines.push(
      selection.mode === "guarded-memory-palace" ? "## Guarded Memory" : "## Relevant Memory",
      "",
      ...(memory.items.length
        ? memory.items.flatMap((item) => renderGuardedMemoryItem(item).split("\n"))
        : ["- No relevant, current memory evidence met the scope and age checks."]),
      ""
    );
  }

  if (memory.telemetry.memoryCandidates > 0) {
    lines.push(
      "## Memory Selection",
      "",
      `Candidates: ${memory.telemetry.memoryCandidates} | Included: ${memory.telemetry.memoryIncluded} | Excluded: ${memory.telemetry.memoryExcluded.length}`,
      `Included IDs: ${memory.telemetry.includedIds.length ? memory.telemetry.includedIds.join(", ") : "none"}`,
      ...(memory.telemetry.scopeInference
        ? [`Inferred scope: ${memory.telemetry.scopeInference.client} (${memory.telemetry.scopeInference.reason}; evidence: ${memory.telemetry.scopeInference.evidenceTokens.join(", ")})`]
        : []),
      ...(memory.telemetry.memoryExcluded.length
        ? memory.telemetry.memoryExcluded.map((item) => `- ${item.id}: ${item.reason}`)
        : ["- No retrieved memory was excluded."]),
      ""
    );
  }

  if (drawers.length) {
    lines.push("## Routed Context", "");
    for (const drawer of drawers) {
      const location = drawer.node.startLine
        ? `${drawer.node.sourcePath}:${drawer.node.startLine}${drawer.node.endLine ? `-${drawer.node.endLine}` : ""}`
        : drawer.node.sourcePath;
      lines.push(
        `### ${drawer.step.tier ?? inferredTier(drawer.step.priority)}: ${location}`,
        "",
        `Reason: ${drawer.reason}`,
        "",
        `\`\`\`${languageFence(drawer.node)}`,
        drawer.content.trimEnd(),
        "```",
        ""
      );
    }
  } else {
    lines.push(
      "## Routed Context",
      "",
      "No source content packed. Inspect the named target directly and expand only when evidence requires it.",
      ""
    );
  }

  lines.push(
    "## Deferred",
    "",
    ...(deferredReferences.length
      ? deferredReferences.map(renderRouteReference)
      : ["- None. All selected route steps are already represented above."]),
    "",
    "## Excluded",
    "",
    ...(boundaries.excluded.length
      ? boundaries.excluded.map((item) => `- ${item.sourcePath}: ${item.reason}`)
      : ["- None."]),
    "",
    "## Do Not",
    "",
    ...boundaries.doNot.map((item) => `- ${item}`),
    "",
    "## Stop Condition",
    "",
    ...boundaries.stopCondition.map((item) => `- ${item}`),
    "",
    "## Conflict Summary",
    "",
    ...boundaries.conflictSummary.map((item) => `- ${item}`),
    "",
    "## Recommended Execution",
    "",
    ...recommendedExecution(selection.mode).map((step, index) => `${index + 1}. ${step}`),
    ""
  );
  return lines.join("\n");
}

function tierRoute(route: PalaceRoute, inferredClient?: string): TieredRoute {
  const tiered: TieredRoute = { primary: [], support: [], deferred: [] };
  for (const step of route.route) tiered[step.tier ?? inferredTier(step.priority)].push(step);
  if (!tiered.primary.length && route.route[0]) {
    tiered.primary.push(route.route[0]);
    tiered.support = tiered.support.filter((step) => step.nodeId !== route.route[0].nodeId);
    tiered.deferred = tiered.deferred.filter((step) => step.nodeId !== route.route[0].nodeId);
  }
  const scopedStep = inferredClient
    ? route.route.find((step) => routePathMatchesScope(step.sourcePath, inferredClient))
    : undefined;
  if (scopedStep) {
    const promoted = {
      ...scopedStep,
      tier: "primary" as const,
      priority: 1,
      reason: `${scopedStep.reason}; promoted by inferred memory scope ${inferredClient}`
    };
    tiered.primary = [promoted];
    tiered.support = uniqueRouteSteps([
      ...route.route.filter((step) => (
        step.nodeId !== scopedStep.nodeId
        && tiered.primary.every((primary) => primary.nodeId !== step.nodeId)
        && (step.tier ?? inferredTier(step.priority)) !== "deferred"
      )).map((step) => ({
        ...step,
        tier: "support" as const,
        priority: Math.max(3, step.priority),
        reason: (step.tier ?? inferredTier(step.priority)) === "primary"
          ? `${step.reason}; demoted after inferred memory scope selected ${inferredClient}`
          : step.reason
      })),
      ...tiered.support
    ]);
    tiered.deferred = tiered.deferred.filter((step) => step.nodeId !== scopedStep.nodeId);
  }
  return tiered;
}

function routePathMatchesScope(sourcePath: string, scope: string): boolean {
  const normalizedScope = scope.toLowerCase().replace(/[^a-z0-9㐀-鿿]+/g, "");
  return sourcePath
    .toLowerCase()
    .split(/[\\/]/)
    .some((segment) => segment.replace(/[^a-z0-9㐀-鿿]+/g, "") === normalizedScope);
}

function uniqueRouteSteps(steps: PalaceRouteStep[]): PalaceRouteStep[] {
  const seen = new Set<string>();
  return steps.filter((step) => {
    if (seen.has(step.nodeId)) return false;
    seen.add(step.nodeId);
    return true;
  });
}

function adaptiveLoadSteps(selection: PalaceModeSelection, tiered: TieredRoute): PalaceRouteStep[] {
  if (selection.mode === "bypass") return [];
  if (selection.mode === "route-lite") return tiered.primary;
  return [...tiered.primary, ...tiered.support];
}

function adaptiveLoadLevel(
  loadLevel: LoadLevel,
  mode: PalaceModeSelection["mode"],
  node: PalaceNode
): LoadLevel {
  if (!node.startLine) {
    if (loadLevel !== "summary" && node.tokenCost <= 500) return "full_file";
    return "summary";
  }
  if (mode === "route-lite" && loadLevel === "full_file") return "snippet";
  return loadLevel;
}

function adaptiveMaxDrawers(mode: PalaceModeSelection["mode"]): number {
  if (mode === "bypass") return 0;
  if (mode === "route-lite") return 2;
  if (mode === "guarded-memory-palace") return 4;
  return 5;
}

function adaptiveGuardrails(selection: PalaceModeSelection, memory: GuardedMemoryResult): string[] {
  const guardrails: string[] = [];
  if (memory.items.length) guardrails.push("Current code and tests outrank remembered decisions and pitfalls.");
  if (selection.riskSignals.tenantIsolationRisk) guardrails.push("Confirm tenant or client scope before changing shared behavior.");
  if (selection.riskSignals.staleMemoryRisk) guardrails.push("Treat stale or legacy evidence as a warning, not an instruction.");
  if (selection.riskSignals.crossStack) guardrails.push("Verify the contract at every routed layer boundary.");
  if (selection.riskSignals.publicContractRisk) guardrails.push("Check callers and compatibility before changing the public contract.");
  return guardrails;
}

function buildExecutionBoundaries(
  route: PalaceRoute,
  tiered: TieredRoute,
  selection: PalaceModeSelection,
  memory: GuardedMemoryResult
): PalaceExecutionBoundaries {
  const primary = uniquePaths(tiered.primary);
  const support = uniquePaths(tiered.support);
  const deferred = uniquePaths(tiered.deferred);
  const taskRequestsDocumentation = /\b(?:docs?|documentation|readme|migration|migrate|migrated)\b/i.test(route.task);
  const requiredEvidence = uniquePaths(tiered.support.filter((step) => {
    if (/(?:^|\/)(?:tests?|specs?)(?:\/|\.|$)|\.(?:test|spec)\.[^/]+$/i.test(step.sourcePath)) return true;
    if (/(?:config|schema|contract)/i.test(step.sourcePath)) return true;
    return taskRequestsDocumentation && /(?:docs?|readme|migration)/i.test(step.sourcePath);
  })).slice(0, 4);
  const doNot = [
    "Do not inventory or broadly scan the repository.",
    "Do not inspect Deferred or Excluded paths unless Primary or Required Evidence conflicts.",
    "Do not continue exploration after the stop conditions pass."
  ];
  if (selection.riskSignals.tenantIsolationRisk) doNot.push("Do not change shared behavior without proving the tenant scope requires it.");
  if (selection.riskSignals.publicContractRisk) doNot.push("Do not change the public contract without checking callers and compatibility evidence.");

  const stopCondition = [
    "The intended Primary implementation scope is resolved; expand it only when Required Evidence proves another dependency.",
    "Targeted tests for the changed behavior pass.",
    "No Excluded path or unrelated file is modified.",
    "No unresolved conflict remains between current code, tests, and delivered memory."
  ];
  const conflictSummary: string[] = [];
  if (selection.riskSignals.staleMemoryRisk) conflictSummary.push("Stale-memory risk is present; current code and tests must resolve any disagreement.");
  if (memory.items.length) conflictSummary.push(`${memory.items.length} delivered memory item(s) still require current-code contradiction checks.`);
  if (memory.telemetry.memoryExcluded.length) conflictSummary.push(`${memory.telemetry.memoryExcluded.length} retrieved memory item(s) were excluded with machine-readable reasons.`);
  if (selection.confidence < 0.7 || route.confidence < 0.5) conflictSummary.push("Routing confidence is limited; stop and widen only if Primary evidence disagrees with the task.");
  if (!conflictSummary.length) conflictSummary.push("Static routing found no explicit conflict; current code, tests, and runtime evidence remain authoritative.");

  return {
    primary,
    support,
    deferred,
    excluded: route.excluded,
    requiredEvidence,
    doNot,
    stopCondition,
    conflictSummary
  };
}

function uniquePaths(steps: PalaceRouteStep[]): string[] {
  return [...new Set(steps.map((step) => step.sourcePath))];
}

function recommendedExecution(mode: PalaceModeSelection["mode"]): string[] {
  if (mode === "bypass") {
    return [
      "Open the explicitly named file and inspect the smallest relevant symbol.",
      "Run targeted verification; expand scope only when code or test evidence points elsewhere."
    ];
  }
  if (mode === "route-lite") {
    return [
      "Use delivered full_file or full_symbol drawers directly; do not reopen those paths.",
      "Batch-read only Required Evidence that was not delivered in full, then run targeted verification.",
      "Combine final status and diff checks in one command and stop when the stated conditions pass."
    ];
  }
  if (mode === "guarded-memory-palace") {
    return [
      "Validate each memory item against current code before relying on it.",
      "Use delivered full_file or full_symbol drawers directly; batch-read only incomplete Required Evidence.",
      "Run scope-specific verification, combine final status and diff checks, and stop when the stated conditions pass."
    ];
  }
  return [
    "Use delivered full_file or full_symbol drawers directly; do not reopen those paths.",
    "Batch-read only incomplete Required Evidence, then run targeted and broader verification in one invocation when both are needed.",
    "Combine final status and diff checks in one command; broaden into Deferred only when evidence conflicts."
  ];
}

function metricSkeleton(
  selection: PalaceModeSelection,
  tiered: TieredRoute,
  memory: GuardedMemoryResult,
  guardrails: string[]
): PalacePayloadMetrics {
  return {
    mode: selection.mode,
    calls: 1,
    contextCalls: 1,
    contextBytes: 0,
    contextEstimatedTokens: 0,
    routeStepCount: tiered.primary.length + tiered.support.length + tiered.deferred.length,
    primaryCount: tiered.primary.length,
    supportCount: tiered.support.length,
    deferredCount: tiered.deferred.length,
    memoryItemCount: memory.items.length,
    memoryCandidateCount: memory.telemetry.memoryCandidates,
    memoryExcludedCount: memory.telemetry.memoryExcluded.length,
    memoryEstimatedTokens: memory.estimatedTokens,
    guardrailCount: guardrails.length
  };
}

function withMeasuredPayload(base: PalacePayloadMetrics, payload: string): PalacePayloadMetrics {
  return {
    ...base,
    contextBytes: Buffer.byteLength(payload, "utf8"),
    contextEstimatedTokens: estimateTokens(payload)
  };
}

function compactRouteStep(step: PalaceRouteStep): unknown {
  return {
    sourcePath: step.sourcePath,
    palacePath: step.palacePath,
    tier: step.tier ?? inferredTier(step.priority),
    loadLevel: step.loadLevel,
    confidence: step.confidence,
    reason: step.reason
  };
}

function compactDeferredStep(step: PalaceRouteStep): unknown {
  return {
    sourcePath: step.sourcePath,
    tier: step.tier ?? inferredTier(step.priority),
    reason: step.reason
  };
}

function compactSelection(selection: PalaceModeSelection): unknown {
  return {
    confidence: selection.confidence,
    reasons: selection.reasons,
    maxContextTokens: selection.maxContextTokens,
    memoryLevel: selection.memoryLevel,
    risks: Object.entries(selection.riskSignals)
      .filter(([, enabled]) => enabled)
      .map(([risk]) => risk)
  };
}

function renderRouteReference(step: PalaceRouteStep): string {
  const tier = step.tier ?? inferredTier(step.priority);
  return `- ${step.sourcePath} (${tier}, ${step.loadLevel}): ${step.reason}`;
}

function inferredTier(priority: number): "primary" | "support" | "deferred" {
  if (priority <= 2) return "primary";
  if (priority <= 5) return "support";
  return "deferred";
}

function emptyGuardedMemory(): GuardedMemoryResult {
  return {
    items: [],
    estimatedTokens: 0,
    telemetry: emptyMemoryTelemetry()
  };
}

function emptyMemoryTelemetry(): MemorySelectionTelemetry {
  return {
    memoryCandidates: 0,
    memoryIncluded: 0,
    memoryExcluded: [],
    candidateIds: [],
    includedIds: []
  };
}

function adaptiveRouteSummary(
  task: string,
  route: PalaceRoute,
  tiered: TieredRoute,
  selection: PalaceModeSelection,
  guardrails: string[],
  memory: GuardedMemoryResult,
  boundaries: PalaceExecutionBoundaries
): string {
  return [
    task,
    route.taskType,
    selection.mode,
    ...selection.reasons,
    ...tiered.primary.map((step) => `${step.sourcePath} ${step.reason}`),
    ...tiered.support.map((step) => step.sourcePath),
    ...tiered.deferred.map((step) => step.sourcePath),
    ...guardrails,
    ...memory.items.map(renderGuardedMemoryItem),
    JSON.stringify(memory.telemetry),
    JSON.stringify(boundaries)
  ].join("\n");
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

function defaultMaxDrawers(budget: number, taskType?: PalaceRoute["taskType"]): number {
  if (taskType === "evaluation") return budget <= 6000 ? 2 : 3;
  if (budget <= 6000) return 4;
  if (budget <= 12000) return 6;
  return 8;
}

function renderMarkdown(
  task: string,
  route: PalaceRoute,
  drawers: PackedDrawer[],
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
    const location = drawer.node.startLine
      ? `${drawer.node.sourcePath}:${drawer.node.startLine}${drawer.node.endLine ? `-${drawer.node.endLine}` : ""}`
      : drawer.node.sourcePath;
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
