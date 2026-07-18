export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

const rootProperty = {
  type: "string",
  description: "Repository root. Defaults to the MCP server current working directory."
};

export const toolDefinitions: ToolDefinition[] = [
  {
    name: "palace_status",
    description: "Check whether a repository has a Vertex Palace and whether the index is stale.",
    inputSchema: {
      type: "object",
      properties: { root: rootProperty }
    }
  },
  {
    name: "palace_init",
    description: "Initialize .palace with config, floors, indexes, rooms, routes, and memory folders.",
    inputSchema: {
      type: "object",
      properties: { root: rootProperty }
    }
  },
  {
    name: "palace_index",
    description: "Scan, parse, and index the repository into palace nodes, edges, rooms, symbols, and hashes.",
    inputSchema: {
      type: "object",
      properties: { root: rootProperty }
    }
  },
  {
    name: "palace_route",
    description: "Plan a minimal Vertex Palace route for a coding task.",
    inputSchema: {
      type: "object",
      required: ["task"],
      properties: {
        root: rootProperty,
        task: { type: "string" },
        budget: { type: "number" },
        routeLimit: { type: "number", description: "Maximum route steps to return." }
      }
    }
  },
  {
    name: "palace_pack",
    description: "Generate a Markdown or JSON context pack for a routed task.",
    inputSchema: {
      type: "object",
      required: ["task"],
      properties: {
        root: rootProperty,
        task: { type: "string" },
        budget: { type: "number" },
        format: { type: "string", enum: ["markdown", "json"] },
        routeId: { type: "string" },
        routeLimit: { type: "number", description: "Maximum route steps to plan when no routeId is provided." },
        maxDrawers: { type: "number", description: "Maximum source drawers to include in the pack." },
        includeExcluded: { type: "boolean", description: "Include excluded areas in Markdown output." }
      }
    }
  },
  {
    name: "palace_evaluate",
    description: "Measure context-token reduction, changed-file coverage, route focus, and confidence calibration.",
    inputSchema: {
      type: "object",
      required: ["task"],
      properties: {
        root: rootProperty,
        task: { type: "string" },
        routeId: { type: "string", description: "Existing route ID to evaluate. Omit to plan a fresh route." },
        changedFiles: {
          type: "array",
          items: { type: "string" },
          description: "Files actually changed while completing the task. Enables route-quality and confidence measurement."
        },
        budget: { type: "number" },
        routeLimit: { type: "number", description: "Maximum route steps when planning a fresh route." },
        maxDrawers: { type: "number", description: "Maximum drawers in the measured context pack." }
      }
    }
  },
  {
    name: "palace_open",
    description: "Open a node, room drawer, or palace path at the requested load level.",
    inputSchema: {
      type: "object",
      properties: {
        root: rootProperty,
        nodeId: { type: "string" },
        palacePath: { type: "string" },
        loadLevel: { type: "string", enum: ["summary", "signature", "snippet", "full_symbol", "full_file", "defer"] }
      }
    }
  },
  {
    name: "palace_write_memory",
    description: "Write successful, failed, or partial route memory after a task.",
    inputSchema: {
      type: "object",
      required: ["task", "outcome"],
      properties: {
        root: rootProperty,
        client: { type: "string", description: "Client or tenant label for multi-client memory isolation." },
        task: { type: "string" },
        routeId: { type: "string" },
        outcome: { type: "string", enum: ["success", "failed", "partial"] },
        changedFiles: { type: "array", items: { type: "string" } },
        testsRun: {
          type: "array",
          items: {
            type: "object",
            properties: {
              command: { type: "string" },
              status: { type: "string", enum: ["passed", "failed", "skipped"] },
              summary: { type: "string" }
            }
          }
        },
        decisions: { type: "array", items: { type: "string" } },
        failedAttempts: { type: "array", items: { type: "string" } },
        pitfalls: { type: "array", items: { type: "string" }, description: "Mistakes to show on .palace/00-entrance/pitfall-board.md before future tasks." },
        tags: { type: "array", items: { type: "string" } },
        notes: { type: "string" }
      }
    }
  },
  {
    name: "palace_doctor",
    description: "Check .palace health and report repair suggestions.",
    inputSchema: {
      type: "object",
      properties: { root: rootProperty }
    }
  }
];
