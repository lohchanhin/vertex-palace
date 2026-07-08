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

  it("can produce compact packs with a drawer cap", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);
      const pack = await packContext(root, "fix login refresh token bug", {
        budget: 6000,
        includeExcluded: false,
        maxDrawers: 1,
        routeLimit: 4
      });

      expect(pack.markdown).not.toContain("## Excluded Areas");
      expect((pack.markdown?.match(/### Drawer:/g) ?? []).length).toBe(1);
      expect(pack.estimatedTokens).toBeLessThan(6000);
    });
  });
});
