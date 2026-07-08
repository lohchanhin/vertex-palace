import {
  palaceDoctor,
  palaceIndex,
  palaceInit,
  palaceOpen,
  palacePack,
  palaceRoute,
  palaceStatus,
  palaceWriteMemory,
  type LoadLevel,
  type MemoryInput
} from "@context-palace/core";

type ToolArgs = Record<string, unknown>;

export async function callTool(name: string, args: ToolArgs): Promise<unknown> {
  switch (name) {
    case "palace_status":
      return palaceStatus({ root: asString(args.root) });
    case "palace_init":
      return palaceInit({ root: asString(args.root) });
    case "palace_index":
      return palaceIndex({ root: asString(args.root) });
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
