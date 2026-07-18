import { describe, expect, it } from "vitest";
import { palaceContext } from "../src/index";
import { getPalaceStatus } from "../src/storage/status";
import { withFixture } from "./test-utils";

describe("palaceContext", () => {
  it("initializes, indexes, routes, and packs an uninitialized repository in one call", async () => {
    await withFixture("ts-api", async (root) => {
      const output = await palaceContext({
        root,
        task: "fix login refresh token bug",
        budget: 6000,
        routeLimit: 4,
        maxDrawers: 2
      });
      const status = await getPalaceStatus(root);

      expect(status.initialized).toBe(true);
      expect(status.indexed).toBe(true);
      expect(status.stale).toBe(false);
      expect(output.routeId).toMatch(/^route_/);
      expect(output.markdown).toContain("## Palace Route");
      expect(output.markdown).not.toContain("## Excluded Areas");
      expect((output.markdown?.match(/### Drawer:/g) ?? []).length).toBeLessThanOrEqual(2);
    });
  });
});
