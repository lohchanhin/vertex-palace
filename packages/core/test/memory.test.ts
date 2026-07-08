import { describe, expect, it } from "vitest";
import { redactSecrets, writeMemory } from "../src/memory/write-memory";
import { initPalace } from "../src/storage/init-palace";
import { withFixture } from "./test-utils";

describe("memory", () => {
  it("redacts secrets before writing memory", async () => {
    await withFixture("ts-api", async (root) => {
      await initPalace(root);
      expect(redactSecrets("Authorization: Bearer secret-token password=hunter2")).toContain("[REDACTED]");
      const result = await writeMemory({
        root,
        task: "fix token",
        outcome: "success",
        notes: "password=hunter2 Authorization: Bearer abc.def.ghi"
      });
      expect(result.ok).toBe(true);
      expect(result.memoryPath).toContain("successful-routes");
    });
  });
});
