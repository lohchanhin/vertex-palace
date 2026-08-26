import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { EvidenceClosure, EvidenceRole, PalaceNode } from "@vertex-palace/shared";
import { indexPalace } from "../src/indexer/index-palace";
import { routePalace } from "../src/router/route-planner";
import {
  applyExplicitEvidenceContractToClosure,
  enforceExplicitEvidenceContract,
  extractExplicitTaskPaths
} from "../src/router/task-evidence-contract";
import type { ScoredNode } from "../src/router/route-scorer";

describe("explicit task evidence contract", () => {
  it("preserves explicit implementation, test, and contract paths ahead of a high-degree decoy", () => {
    const implementation = makeNode("implementation", "src/cursor.rs", "implementation");
    const test = makeNode("test", "tests/cursor_test.rs", "verification");
    const contract = makeNode("contract", "src/cursor_contract.rs", "contract");
    const hub = makeNode("hub", "shared/registry.rs", "implementation");
    const nodes = [implementation, test, contract, hub];
    const result = enforceExplicitEvidenceContract(
      [makeScored(hub, 200)],
      [makeScored(hub, 200), makeScored(implementation, 90)],
      nodes,
      "Refactor src/cursor.rs with tests/cursor_test.rs and preserve src/cursor_contract.rs.",
      3
    );

    expect(result.route.map((item) => item.node.sourcePath)).toEqual([
      "src/cursor.rs",
      "tests/cursor_test.rs",
      "src/cursor_contract.rs"
    ]);
    expect(result.missingPaths).toEqual([]);
  });

  it("marks missing or over-budget explicit paths as insufficient evidence", () => {
    const implementation = makeNode("implementation", "src/value.ts", "implementation");
    const contract = enforceExplicitEvidenceContract(
      [makeScored(implementation, 100)],
      [makeScored(implementation, 100)],
      [implementation],
      "Fix src/value.ts with tests/value.test.ts.",
      1
    );
    const closure = applyExplicitEvidenceContractToClosure(sufficientClosure(), contract);

    expect(contract.requiredPaths).toEqual(["src/value.ts", "tests/value.test.ts"]);
    expect(contract.missingPaths).toEqual(["tests/value.test.ts"]);
    expect(closure.status).toBe("insufficient");
    expect(closure.missingCausalSources).toContain("explicit:tests/value.test.ts");
  });

  it("extracts repository paths without interpreting release versions as files", () => {
    expect(extractExplicitTaskPaths("Release 0.4.0 after changing README.md and src\\index.ts:12."))
      .toEqual(["README.md", "src/index.ts"]);
  });

  it("closes explicit source, focused test, and contract paths through routePalace", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-explicit-contract-"));
    try {
      await writeFiles(root, {
        "src/cursor.rs": "pub fn advance_cursor(value: usize) -> usize { value + 1 }\n",
        "tests/cursor_test.rs": "use cursor::advance_cursor;\n#[test]\nfn advances() { assert_eq!(advance_cursor(1), 2); }\n",
        "src/cursor_contract.rs": "pub trait CursorContract { fn advance(&self) -> usize; }\n",
        "shared/registry.rs": "pub const SHARED_REGISTRY: &str = \"cursor module_1 module_2 module_3\";\n"
      });
      await indexPalace(root);
      const route = await routePalace(
        root,
        "Refactor advance_cursor in src/cursor.rs with tests/cursor_test.rs and preserve src/cursor_contract.rs.",
        { routeLimit: 3, referencePolicy: "off" }
      );
      const routed = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));
      expect(routed.slice(0, 3)).toEqual([
        "src/cursor.rs",
        "tests/cursor_test.rs",
        "src/cursor_contract.rs"
      ]);
      expect(routed).toContain("shared/registry.rs");
      expect(route.evidenceClosure?.missingCausalSources).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

function makeNode(id: string, sourcePath: string, role: EvidenceRole): PalaceNode {
  return {
    id,
    palacePath: `03-implementation/${id}`,
    sourcePath,
    floor: role === "verification" ? "05-verification" : "03-implementation",
    kind: role === "verification" ? "test" : "file",
    evidence: {
      scope: "product",
      roles: [{ role, basis: "artifact-kind", confidence: 1 }]
    },
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

function sufficientClosure(): EvidenceClosure {
  return {
    status: "sufficient",
    requiredRoles: ["implementation"],
    coveredRoles: ["implementation"],
    missingRoles: [],
    termCoverage: {
      subjects: { required: [], covered: [], missing: [] },
      outcomes: { required: [], covered: [], missing: [] },
      constraints: { required: [], covered: [], missing: [] }
    },
    connectedRolePairs: [],
    requiredCausalSources: [],
    missingCausalSources: [],
    reasons: []
  };
}

async function writeFiles(root: string, files: Record<string, string>): Promise<void> {
  for (const [relativePath, content] of Object.entries(files)) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
}
