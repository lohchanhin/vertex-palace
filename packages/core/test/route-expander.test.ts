import { describe, expect, it } from "vitest";
import type { EvidenceRole, PalaceEdge, PalaceNode } from "@vertex-palace/shared";
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
    const required = makeNode("required", "tests/beta/required.test.ts", "verification");
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

    const expanded = expandRoute(scored, edges, nodes, { limit: 6, requiredRoles: ["verification"] });

    expect(expanded.map((item) => item.node.sourcePath)).toContain("tests/beta/required.test.ts");
  });

  it("allows two seeds from a relevant source group on broad routes", () => {
    const alphaPrimary = makeNode("alpha-primary", "src/alpha/primary.ts");
    const alphaCompanion = makeNode("alpha-companion", "src/alpha/companion.ts");
    const required = makeNode("alpha-required", "tests/alpha/required.test.ts", "verification");
    const otherSeeds = ["beta", "gamma", "delta", "epsilon", "zeta"].map(
      (name) => makeNode(name, `src/${name}/main.ts`)
    );
    const nodes = [alphaPrimary, alphaCompanion, required, ...otherSeeds];
    const scored = [
      makeScored(alphaPrimary, 100),
      makeScored(alphaCompanion, 99),
      ...otherSeeds.map((node, index) => makeScored(node, 90 - index)),
      makeScored(required, 70)
    ];
    const edges = [makeEdge("edge-alpha-required", alphaCompanion, required, "changed_with", 0.95)];

    const expanded = expandRoute(scored, edges, nodes, { limit: 12, requiredRoles: ["verification"] });

    expect(expanded.map((item) => item.node.sourcePath)).toContain("tests/alpha/required.test.ts");
  });

  it("penalizes a high-degree hub that adds no missing evidence facet", () => {
    const seed = makeNode("seed", "src/checkout/quote.ts", "implementation");
    const hub = makeNode("hub", "src/shared/index.ts", "implementation");
    const focusedTest = makeNode("focused-test", "tests/checkout/quote.test.ts", "verification");
    const noise = Array.from({ length: 24 }, (_, index) => makeNode(`noise-${index}`, `src/noise/${index}.ts`));
    const nodes = [seed, hub, focusedTest, ...noise];
    const edges = [
      makeEdge("seed-hub", seed, hub, "imports", 0.99),
      makeEdge("seed-test", seed, focusedTest, "tested_by", 0.9),
      ...noise.map((node, index) => makeEdge(`hub-noise-${index}`, hub, node, "imports", 0.9))
    ];
    const expanded = expandRoute(
      [makeScored(seed, 100), makeScored(hub, 80), makeScored(focusedTest, 70)],
      edges,
      nodes,
      { limit: 3, focused: true, requiredRoles: ["implementation", "verification"], taskTerms: ["checkout", "quote"] }
    );

    expect(expanded.map((item) => item.node.sourcePath)).toEqual([
      "src/checkout/quote.ts",
      "tests/checkout/quote.test.ts"
    ]);
  });

  it("adds at most one file for an explicit auxiliary evidence role", () => {
    const seed = makeNode("seed", "src/payment/client.ts", "implementation");
    const readme = makeNode("readme", "README.md", "documentation");
    const guide = makeNode("guide", "docs/payment.md", "documentation");
    const nodes = [seed, readme, guide];
    const edges = [
      makeEdge("seed-readme", seed, readme, "changed_with", 0.95),
      makeEdge("seed-guide", seed, guide, "changed_with", 0.94)
    ];

    const expanded = expandRoute([makeScored(seed, 100)], edges, nodes, {
      limit: 4,
      requiredRoles: ["implementation", "documentation"],
      taskTerms: ["payment"]
    });

    expect(expanded.filter((item) => item.node.evidence?.roles.some((role) => role.role === "documentation"))).toHaveLength(1);
  });
});

function makeNode(id: string, sourcePath: string, role?: EvidenceRole): PalaceNode {
  return {
    id,
    palacePath: `03-implementation/${id}`,
    sourcePath,
    floor: "03-implementation",
    kind: "file",
    ...(role ? { evidence: { scope: role === "documentation" ? "documentation" : "product", roles: [{ role, basis: "artifact-kind", confidence: 1 }] } } : {}),
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
