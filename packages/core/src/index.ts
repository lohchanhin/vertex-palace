import { resolveRoot } from "./utils/path-utils";

export * from "@vertex-palace/shared";
export * from "./config/defaults";
export * from "./config/palace-config";
export * from "./scanner/scan-repo";
export * from "./scanner/ignore-rules";
export * from "./scanner/file-hash";
export * from "./parser/parse-file";
export * from "./parser/parse-ts-js";
export * from "./parser/parse-markdown";
export * from "./parser/parse-json";
export * from "./parser/parse-fallback";
export * from "./indexer/index-palace";
export * from "./indexer/build-directory-map";
export * from "./indexer/build-nodes";
export * from "./indexer/build-edges";
export * from "./indexer/build-rooms";
export * from "./indexer/incremental-index";
export * from "./router/analyze-task";
export * from "./router/classify-task";
export * from "./router/locate-entry";
export * from "./router/route-planner";
export * from "./router/route-scorer";
export * from "./router/route-expander";
export * from "./packer/token-estimator";
export * from "./packer/context-packer";
export * from "./packer/snippet-extractor";
export * from "./packer/output-format";
export * from "./packer/open";
export * from "./evaluation/evaluate-route";
export * from "./memory/write-memory";
export * from "./memory/pitfall-board";
export * from "./memory/redact";
export * from "./storage/init-palace";
export * from "./storage/status";
export * from "./storage/read-palace";
export * from "./storage/write-palace";
export * from "./storage/doctor";
export * from "./storage/schema-version";
export * from "./utils/errors";
export * from "./utils/path-utils";
export * from "./utils/stable-json";
export * from "./utils/binary-files";

export async function palaceInit(input: { root?: string } = {}) {
  const { initPalace } = await import("./storage/init-palace");
  return initPalace(resolveRoot(input.root));
}

export async function palaceStatus(input: { root?: string } = {}) {
  const { getPalaceStatus } = await import("./storage/status");
  return getPalaceStatus(resolveRoot(input.root));
}

export async function palaceIndex(input: { root?: string } = {}) {
  const { indexPalace } = await import("./indexer/index-palace");
  return indexPalace(resolveRoot(input.root));
}

export async function palaceRoute(input: { root?: string; task: string; budget?: number; routeLimit?: number }) {
  const { routePalace } = await import("./router/route-planner");
  return routePalace(resolveRoot(input.root), input.task, { budget: input.budget, routeLimit: input.routeLimit });
}

export async function palacePack(input: {
  root?: string;
  task: string;
  budget?: number;
  format?: "markdown" | "json";
  routeId?: string;
  routeLimit?: number;
  maxDrawers?: number;
  includeExcluded?: boolean;
}) {
  const { packContext } = await import("./packer/context-packer");
  return packContext(resolveRoot(input.root), input.task, input);
}

export async function palaceEvaluate(input: import("@vertex-palace/shared").PalaceEvaluationInput) {
  const { evaluateRoute } = await import("./evaluation/evaluate-route");
  return evaluateRoute(resolveRoot(input.root), input.task, input);
}

export async function palaceOpen(input: { root?: string; nodeId?: string; palacePath?: string; loadLevel?: import("@vertex-palace/shared").LoadLevel }) {
  const { openPalaceNode } = await import("./packer/open");
  return openPalaceNode(resolveRoot(input.root), input);
}

export async function palaceWriteMemory(input: import("@vertex-palace/shared").MemoryInput) {
  const { writeMemory } = await import("./memory/write-memory");
  return writeMemory({ ...input, root: resolveRoot(input.root) });
}

export async function palaceDoctor(input: { root?: string } = {}) {
  const { doctorPalace } = await import("./storage/doctor");
  return doctorPalace(resolveRoot(input.root));
}
