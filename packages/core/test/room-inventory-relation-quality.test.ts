import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_OBJECT_RELATIONS_PER_NODE } from "../src/indexer/build-object-relations";
import { indexPalace } from "../src/indexer/index-palace";
import { readIndex } from "../src/storage/read-palace";
import { withFixture } from "./test-utils";

type RelationTuple = [string, string, "contains" | "calls" | "tests" | "tested_by", string, string];

type RelationOracle = {
  cases: {
    language: string;
    expected: RelationTuple[];
    forbidden: RelationTuple[];
  }[];
};

describe("Room Inventory Phase 3 relation quality", () => {
  it("meets the frozen five-language relation truth without guessing ambiguous targets", async () => {
    await withFixture("room-inventory-relations", async (root) => {
      const oracle = JSON.parse(await readFile(path.join(root, "oracle.json"), "utf8")) as RelationOracle;

      await indexPalace(root, { roomInventory: false });
      const baseline = await readIndex(root);
      expect(baseline.nodes.some((node) => node.object)).toBe(false);
      expect(objectRelationKeys(baseline)).toHaveLength(0);

      await indexPalace(root, { roomInventory: true });
      const first = await readIndex(root);
      const firstRelations = objectRelationKeys(first);
      const expected = oracle.cases.flatMap((entry) => entry.expected.map(tupleKey)).sort();
      const forbidden = oracle.cases.flatMap((entry) => entry.forbidden.map(tupleKey));

      expect(first.nodes.filter((node) => node.object)).toHaveLength(46);
      expect(firstRelations).toEqual(expected);
      for (const relation of forbidden) expect(firstRelations).not.toContain(relation);
      expect(testObjectKind(first, "go/store_test.go", "TestGoBuildStore")).toBe("test");
      expect(testObjectKind(first, "rust/router.rs", "rust_builds_route")).toBe("test");
      expect(maximumOutgoingRelations(firstRelations)).toBeLessThanOrEqual(MAX_OBJECT_RELATIONS_PER_NODE);

      await indexPalace(root, { roomInventory: true });
      const repeated = await readIndex(root);
      expect(objectRelationKeys(repeated)).toEqual(firstRelations);
    });
  });
});

function objectRelationKeys(index: Awaited<ReturnType<typeof readIndex>>): string[] {
  const objects = new Map(index.nodes.filter((node) => node.object).map((node) => [node.id, node]));
  return index.edges
    .filter((edge) => (
      ["contains", "calls", "tests", "tested_by"].includes(edge.type)
      && objects.has(edge.from)
      && objects.has(edge.to)
    ))
    .map((edge) => {
      const from = objects.get(edge.from)!;
      const to = objects.get(edge.to)!;
      return tupleKey([
        from.sourcePath,
        from.object!.qualifiedName,
        edge.type as RelationTuple[2],
        to.sourcePath,
        to.object!.qualifiedName
      ]);
    })
    .sort();
}

function tupleKey(tuple: RelationTuple): string {
  return tuple.join("|");
}

function testObjectKind(
  index: Awaited<ReturnType<typeof readIndex>>,
  sourcePath: string,
  qualifiedName: string
) {
  return index.nodes.find((node) => (
    node.sourcePath === sourcePath && node.object?.qualifiedName === qualifiedName
  ))?.object?.objectKind;
}

function maximumOutgoingRelations(relations: string[]): number {
  const counts = new Map<string, number>();
  for (const relation of relations) {
    const [sourcePath, qualifiedName] = relation.split("|");
    const key = `${sourcePath}|${qualifiedName}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Math.max(0, ...counts.values());
}
