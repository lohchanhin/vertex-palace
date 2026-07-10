import { describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { indexPalace } from "../src/indexer/index-palace";
import { writeMemory } from "../src/memory/write-memory";
import { packContext } from "../src/packer/context-packer";
import { withFixture } from "./test-utils";

describe("packContext", () => {
  it("outputs Markdown with route, source paths, and snippets", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);
      const pack = await packContext(root, "fix login refresh token bug", { budget: 12000 });

      expect(pack.markdown).toContain("# Vertex Palace Pack");
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

  it("caps default drawers for small packs", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);
      const pack = await packContext(root, "fix login refresh token bug", {
        budget: 6000,
        includeExcluded: false,
        routeLimit: 12
      });

      expect((pack.markdown?.match(/### Drawer:/g) ?? []).length).toBeLessThanOrEqual(4);
      expect(pack.estimatedTokens).toBeLessThan(6000);
    });
  });

  it("omits binary asset bytes from packs", async () => {
    await withFixture("ts-api", async (root) => {
      await mkdir(path.join(root, "assets"), { recursive: true });
      await writeFile(path.join(root, "assets", "agent.png"), "PNG_BYTES_SHOULD_NOT_APPEAR", "utf8");
      await indexPalace(root);

      const pack = await packContext(root, "agent png asset", {
        budget: 6000,
        includeExcluded: false,
        maxDrawers: 2,
        routeLimit: 4
      });

      expect(pack.markdown).toContain("assets/agent.png");
      expect(pack.markdown).toContain("[Binary/media file omitted from context pack]");
      expect(pack.markdown).toContain("SHA-256:");
      expect(pack.markdown).not.toContain("PNG_BYTES_SHOULD_NOT_APPEAR");
    });
  });

  it("keeps binary assets out of non-asset packs", async () => {
    await withFixture("ts-api", async (root) => {
      await mkdir(path.join(root, "assets"), { recursive: true });
      await writeFile(path.join(root, "assets", "agent.png"), "PNG_BYTES_SHOULD_NOT_APPEAR", "utf8");
      await indexPalace(root);

      const pack = await packContext(root, "explain agent tool routing", {
        budget: 6000,
        includeExcluded: false,
        maxDrawers: 4,
        routeLimit: 8
      });

      expect(pack.markdown).not.toContain("assets/agent.png");
      expect(pack.markdown).not.toContain("PNG_BYTES_SHOULD_NOT_APPEAR");
    });
  });

  it("includes entrance pitfalls before route drawers", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);
      await writeMemory({
        root,
        task: "fix token",
        outcome: "partial",
        pitfalls: ["Check the pitfall board before trusting an old optimized route."]
      });

      const pack = await packContext(root, "fix login refresh token bug", {
        budget: 12000,
        includeExcluded: false,
        routeLimit: 6
      });

      expect(pack.markdown).toContain("## Entrance Pitfall Board");
      expect(pack.markdown).toContain("Check the pitfall board");
      expect((pack.markdown ?? "").indexOf("## Entrance Pitfall Board")).toBeLessThan((pack.markdown ?? "").indexOf("## Read First"));
    });
  });
});
