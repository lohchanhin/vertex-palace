import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { indexPalace } from "../src/indexer/index-palace";
import { routePalace } from "../src/router/route-planner";
import { readIndex } from "../src/storage/read-palace";
import { withFixture } from "./test-utils";

type EvidenceTarget = {
  id: string;
  task: string;
  routeLimit: number;
  requiredEvidence: Array<{ path: string; facet: string }>;
  allowedSupport: string[];
};

type EvidenceOracle = {
  targets: EvidenceTarget[];
  forbiddenEvidence: string[];
};

describe("Room Inventory Phase 4 evidence-facet planning", () => {
  it("closes every frozen compound-task facet without selecting lexical decoys", async () => {
    await withFixture("room-inventory-evidence-roles", async (root) => {
      const oraclePath = path.join(root, "oracle.json");
      const oracle = JSON.parse(await readFile(oraclePath, "utf8")) as EvidenceOracle;
      await rm(oraclePath);
      await indexPalace(root, { roomInventory: true });

      for (const target of oracle.targets) {
        const first = await routePalace(root, target.task, {
          routeLimit: target.routeLimit,
          budget: 6000,
          referencePolicy: "off"
        });
        const second = await routePalace(root, target.task, {
          routeLimit: target.routeLimit,
          budget: 6000,
          referencePolicy: "off"
        });
        const files = physicalPaths(first.route.map((step) => step.sourcePath));
        const repeated = physicalPaths(second.route.map((step) => step.sourcePath));
        const required = target.requiredEvidence.map((entry) => entry.path);
        const relevant = new Set([...required, ...target.allowedSupport]);

        expect(files, target.id).toEqual(expect.arrayContaining(required));
        expect(files.filter((sourcePath) => oracle.forbiddenEvidence.includes(sourcePath)), target.id).toEqual([]);
        expect(files.length, target.id).toBeLessThanOrEqual(target.routeLimit);
        expect(files.filter((sourcePath) => relevant.has(sourcePath)).length / files.length, target.id)
          .toBeGreaterThanOrEqual(0.6);
        expect(repeated, target.id).toEqual(files);
      }
    });
  });

  it("does not activate facet planning when Room Inventory is disabled", async () => {
    await withFixture("room-inventory-evidence-roles", async (root) => {
      await rm(path.join(root, "oracle.json"));
      await indexPalace(root, { roomInventory: false });
      const index = await readIndex(root);
      const route = await routePalace(
        root,
        "Fix compileEnvelope parsing and update its focused test.",
        { routeLimit: 6, referencePolicy: "off" }
      );

      expect(index.nodes.some((node) => Boolean(node.object))).toBe(false);
      expect(route.route.flatMap((step) => step.evidence).some((entry) => entry.includes("task evidence facet")))
        .toBe(false);
    });
  });
});

function physicalPaths(sourcePaths: string[]): string[] {
  return [...new Set(sourcePaths.map((sourcePath) => sourcePath.replace(/:\d+(?:-\d+)?$/, "")))];
}
