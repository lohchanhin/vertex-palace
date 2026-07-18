import { describe, expect, it } from "vitest";
import { toolDefinitions } from "../src/tools/definitions";

describe("toolDefinitions", () => {
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
