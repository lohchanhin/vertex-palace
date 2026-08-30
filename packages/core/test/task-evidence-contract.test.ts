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
  extractExplicitTaskPaths,
  extractExplicitTaskSymbols
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

  it("preserves an explicit qualified method ahead of repeated lexical decoys", () => {
    const implementation = makeNode(
      "decoder",
      "src/message-decoder.ts",
      "implementation",
      "MessageDecoder.decode_frame"
    );
    const hub = makeNode("hub", "src/render-release-registry.ts", "implementation");
    const result = enforceExplicitEvidenceContract(
      [makeScored(hub, 500)],
      [makeScored(hub, 500), makeScored(implementation, 120)],
      [implementation, hub],
      [
        "MessageDecoder.decode_frame corrupts escaped payloads.",
        "This is a release blocker with render escape filter security context.",
        "Fix `MessageDecoder.decode_frame` without widening trust."
      ].join(" "),
      2
    );

    expect(result.route.map((item) => item.node.sourcePath)).toEqual([
      "src/message-decoder.ts",
      "src/render-release-registry.ts"
    ]);
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

  it("extracts explicit symbols across common language spellings without duplicating paths", () => {
    const task = "Fix `parse` in src/parser.ts, then verify RustDecoder::decode_frame, verify View#render, and verify parse_frame().";
    const paths = extractExplicitTaskPaths(task);

    expect(paths).toEqual(["src/parser.ts"]);
    expect(extractExplicitTaskSymbols(task, paths)).toEqual([
      "parse",
      "RustDecoder.decode_frame",
      "View.render",
      "parse_frame"
    ]);
  });

  it("does not turn illustrative inline values into mandatory symbol evidence", () => {
    const task = [
      "decode_value corrupts escaped parent content.",
      "The report includes `main`, `content`, `value`, and `str` examples.",
      "`MessageDecoder.decode_value` returns `str(value)`.",
      "Reproduced after helper_bootstrap().",
      "Fix `MessageDecoder.decode_value` without widening trust."
    ].join(" ");

    const symbols = extractExplicitTaskSymbols(task);
    expect(symbols).toEqual(["MessageDecoder.decode_value"]);
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

  it("keeps a qualified method and explicit test ahead of noisy surface expansion", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-symbol-contract-"));
    try {
      await writeFiles(root, {
        "src/message-decoder.ts": [
          "export class MessageDecoder {",
          "  decode_frame(value: string): string { return value; }",
          "}",
          ""
        ].join("\n"),
        "tests/message-decoder.test.ts": [
          "import { MessageDecoder } from '../src/message-decoder';",
          "test('decode_frame preserves escaped payloads', () => new MessageDecoder().decode_frame('ok'));",
          ""
        ].join("\n"),
        "src/render-release-registry.ts": [
          "export const registry = 'render escape filter release security render escape filter';",
          ""
        ].join("\n")
      });
      await indexPalace(root);
      const route = await routePalace(
        root,
        [
          "MessageDecoder.decode_frame corrupts escaped payloads.",
          "This is a release blocker with render escape filter security context.",
          "Fix `MessageDecoder.decode_frame` and verify tests/message-decoder.test.ts without widening trust."
        ].join(" "),
        { routeLimit: 2, referencePolicy: "off" }
      );

      expect(route.taskType).toBe("bugfix");
      const routed = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));
      expect(routed.slice(0, 2)).toEqual([
        "src/message-decoder.ts",
        "tests/message-decoder.test.ts"
      ]);
      expect(routed.indexOf("src/render-release-registry.ts")).toBeGreaterThan(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

function makeNode(
  id: string,
  sourcePath: string,
  role: EvidenceRole,
  qualifiedName?: string
): PalaceNode {
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
    object: qualifiedName
      ? {
          version: 1,
          declarationKey: `${sourcePath}:${qualifiedName}`,
          signatureShape: `${qualifiedName}()`,
          semanticHash: id,
          objectKind: "method",
          qualifiedName,
          ownerName: qualifiedName.split(".")[0],
          exported: false,
          modifiers: [],
          parser: "ts-morph",
          parserConfidence: 1
        }
      : undefined,
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
