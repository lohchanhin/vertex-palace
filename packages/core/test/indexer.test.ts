import { describe, expect, it } from "vitest";
import path from "node:path";
import { access, mkdir, writeFile } from "node:fs/promises";
import { indexPalace } from "../src/indexer/index-palace";
import { readIndex } from "../src/storage/read-palace";
import { withFixture } from "./test-utils";

describe("indexPalace", () => {
  it("creates nodes, edges, rooms, symbols, and verification floor nodes", async () => {
    await withFixture("ts-api", async (root) => {
      const result = await indexPalace(root);
      const index = await readIndex(root);

      expect(result.nodeCount).toBeGreaterThan(result.fileCount);
      expect(index.edges.length).toBeGreaterThan(0);
      expect(index.rooms.length).toBeGreaterThan(0);
      expect(index.symbols.some((node) => node.title.includes("login"))).toBe(true);
      expect(index.nodes.some((node) => node.sourcePath.endsWith("auth.e2e.test.ts") && node.floor === "05-verification")).toBe(true);
    });
  });

  it("removes stale generated rooms when rebuilding the index", async () => {
    await withFixture("ts-api", async (root) => {
      const staleRoom = path.join(root, ".palace", "rooms", "stale-wing", "stale-room");
      await mkdir(staleRoom, { recursive: true });
      await writeFile(path.join(staleRoom, "overview.md"), "stale", "utf8");

      await indexPalace(root);

      await expect(access(staleRoom)).rejects.toThrow();
    });
  });
});
