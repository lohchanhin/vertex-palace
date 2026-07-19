import {
  palaceContext,
  palaceDoctor,
  palaceEvaluate,
  palaceIndex,
  palaceInit,
  palaceOpen,
  palacePack,
  palaceRoute,
  serializePackOutput,
  palaceStatus,
  palaceWriteMemory,
  type LoadLevel,
  type MemoryInput,
  type PalaceMode
} from "@vertex-palace/core";

type ToolArgs = Record<string, unknown>;

export async function callTool(name: string, args: ToolArgs): Promise<unknown> {
  switch (name) {
    case "palace_status":
      return palaceStatus({ root: asString(args.root) });
    case "palace_init":
      return palaceInit({ root: asString(args.root) });
    case "palace_index":
      return palaceIndex({ root: asString(args.root) });
    case "palace_context": {
      const output = await palaceContext({
        root: asString(args.root),
        task: requiredString(args.task, "task"),
        budget: asNumber(args.budget),
        format: args.format === "json" ? "json" : "markdown",
        routeLimit: asNumber(args.routeLimit),
        maxDrawers: asNumber(args.maxDrawers),
        auto: typeof args.auto === "boolean" ? args.auto : undefined,
        mode: asPalaceMode(args.mode)
      });
      return serializePackOutput(output);
    }
    case "palace_route":
      return palaceRoute({
        root: asString(args.root),
        task: requiredString(args.task, "task"),
        budget: asNumber(args.budget),
        routeLimit: asNumber(args.routeLimit)
      });
    case "palace_pack":
      return palacePack({
        root: asString(args.root),
        task: requiredString(args.task, "task"),
        budget: asNumber(args.budget),
        format: args.format === "json" ? "json" : "markdown",
        routeId: asString(args.routeId),
        routeLimit: asNumber(args.routeLimit),
        maxDrawers: asNumber(args.maxDrawers),
        includeExcluded: typeof args.includeExcluded === "boolean" ? args.includeExcluded : undefined
      });
    case "palace_evaluate":
      return palaceEvaluate({
        root: asString(args.root),
        task: requiredString(args.task, "task"),
        routeId: asString(args.routeId),
        changedFiles: asStringArray(args.changedFiles),
        budget: asNumber(args.budget),
        routeLimit: asNumber(args.routeLimit),
        maxDrawers: asNumber(args.maxDrawers)
      });
    case "palace_open":
      return palaceOpen({
        root: asString(args.root),
        nodeId: asString(args.nodeId),
        palacePath: asString(args.palacePath),
        loadLevel: asString(args.loadLevel) as LoadLevel | undefined
      });
    case "palace_write_memory":
      return palaceWriteMemory({
        root: asString(args.root),
        client: asString(args.client),
        task: requiredString(args.task, "task"),
        routeId: asString(args.routeId),
        outcome: requiredString(args.outcome, "outcome") as MemoryInput["outcome"],
        changedFiles: asStringArray(args.changedFiles),
        testsRun: Array.isArray(args.testsRun) ? (args.testsRun as MemoryInput["testsRun"]) : undefined,
        decisions: asStringArray(args.decisions),
        failedAttempts: asStringArray(args.failedAttempts),
        pitfalls: asStringArray(args.pitfalls),
        tags: asStringArray(args.tags),
        notes: asString(args.notes)
      });
    case "palace_doctor":
      return palaceDoctor({ root: asString(args.root) });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value) throw new Error(`Missing required string argument: ${name}`);
  return value;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined;
}

function asPalaceMode(value: unknown): PalaceMode | undefined {
  return typeof value === "string" && ["bypass", "route-lite", "full-palace", "guarded-memory-palace"].includes(value)
    ? value as PalaceMode
    : undefined;
}
