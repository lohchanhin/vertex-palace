import { describe, expect, it } from "vitest";
import type { PalaceEdge, PalaceNode } from "@vertex-palace/shared";
import { expandRoute } from "../src/router/route-expander";
import type { ScoredNode } from "../src/router/route-scorer";

describe("expandRoute", () => {
  it("round-robins relation expansion so one anchor cannot consume every remaining slot", () => {
    const seedA = makeNode("seed-a", "src/alpha/main.ts");
    const seedB = makeNode("seed-b", "src/beta/main.ts");
    const seedC = makeNode("seed-c", "src/gamma/main.ts");
    const decoyA = makeNode("decoy-a", "src/alpha/a.ts");
    const decoyB = makeNode("decoy-b", "src/alpha/b.ts");
    const decoyC = makeNode("decoy-c", "src/alpha/c.ts");
    const required = makeNode("required", "src/beta/required.ts");
    const nodes = [seedA, seedB, seedC, decoyA, decoyB, decoyC, required];
    const scored: ScoredNode[] = [
      makeScored(seedA, 100),
      makeScored(seedB, 95),
      makeScored(seedC, 90)
    ];
    const edges: PalaceEdge[] = [
      makeEdge("edge-a", seedA, decoyA, "imports", 1),
      makeEdge("edge-b", seedA, decoyB, "imports", 0.99),
      makeEdge("edge-c", seedA, decoyC, "imports", 0.98),
      makeEdge("edge-required", seedB, required, "changed_with", 0.95)
    ];

    const expanded = expandRoute(scored, edges, nodes, { limit: 6 });

    expect(expanded.map((item) => item.node.sourcePath)).toContain("src/beta/required.ts");
  });

  it("allows two seeds from a relevant source group on broad routes", () => {
    const alphaPrimary = makeNode("alpha-primary", "src/alpha/primary.ts");
    const alphaCompanion = makeNode("alpha-companion", "src/alpha/companion.ts");
    const required = makeNode("alpha-required", "src/alpha/required.ts");
    const otherSeeds = ["beta", "gamma", "delta", "epsilon", "zeta"].map(
      (name) => makeNode(name, `src/${name}/main.ts`)
    );
    const nodes = [alphaPrimary, alphaCompanion, required, ...otherSeeds];
    const scored = [
      makeScored(alphaPrimary, 100),
      makeScored(alphaCompanion, 99),
      ...otherSeeds.map((node, index) => makeScored(node, 90 - index))
    ];
    const edges = [makeEdge("edge-alpha-required", alphaCompanion, required, "changed_with", 0.95)];

    const expanded = expandRoute(scored, edges, nodes, { limit: 12 });

    expect(expanded.map((item) => item.node.sourcePath)).toContain("src/alpha/required.ts");
  });
});

function makeNode(id: string, sourcePath: string): PalaceNode {
  return {
    id,
    palacePath: `03-implementation/${id}`,
    sourcePath,
    floor: "03-implementation",
    kind: "file",
    title: sourcePath.split("/").at(-1) ?? sourcePath,
    summary: sourcePath,
    tags: [],
    tokenCost: 10,
    contentHash: id,
    sourceHash: id,
    lod: { level0: "03-implementation", level5Ref: { sourcePath } },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

function makeScored(node: PalaceNode, score: number): ScoredNode {
  return { node, score, reasons: ["seed"], matchedKeywordCount: 1 };
}

function makeEdge(
  id: string,
  from: PalaceNode,
  to: PalaceNode,
  type: PalaceEdge["type"],
  weight: number
): PalaceEdge {
  return {
    id,
    from: from.id,
    to: to.id,
    type,
    weight,
    evidence: id,
    createdAt: "2026-01-01T00:00:00.000Z"
  };
}
