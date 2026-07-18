import { describe, expect, it } from "vitest";
import { toolDefinitions } from "../src/tools/definitions";

describe("toolDefinitions", () => {
  it("exposes one-call task context preparation through MCP", () => {
    const context = toolDefinitions.find((tool) => tool.name === "palace_context");

    expect(context).toBeDefined();
    expect(context?.inputSchema).toMatchObject({
      required: ["task"],
      properties: {
        task: { type: "string" },
        routeLimit: { type: "number" },
        maxDrawers: { type: "number" }
      }
    });
  });

  it("exposes route evaluation through MCP", () => {
    const evaluation = toolDefinitions.find((tool) => tool.name === "palace_evaluate");

    expect(evaluation).toBeDefined();
    expect(evaluation?.inputSchema).toMatchObject({
      required: ["task"],
      properties: {
        task: { type: "string" },
        changedFiles: { type: "array" }
      }
    });
  });
});
