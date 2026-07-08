import { describe, expect, it } from "vitest";
import { indexPalace } from "../src/indexer/index-palace";
import { packContext } from "../src/packer/context-packer";
import { withFixture } from "./test-utils";

describe("packContext", () => {
  it("outputs Markdown with route, source paths, and snippets", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);
      const pack = await packContext(root, "fix login refresh token bug", { budget: 12000 });

      expect(pack.markdown).toContain("# Context Palace Pack");
      expect(pack.markdown).toContain("## Palace Route");
      expect(pack.markdown).toMatch(/src\/.*:\d+/);
      expect(pack.estimatedTokens).toBeLessThan(12000);
    });
  });
});
