import type { PalaceNode } from "@vertex-palace/shared";
import { describe, expect, it } from "vitest";
import { buildRouteConfidenceEvidence, evaluateEvidenceClosure } from "../src/evidence/evidence-closure";
import { describeNodeEvidence } from "../src/evidence/evidence-model";
import { analyzeTask } from "../src/router/analyze-task";
import { buildTaskIntent } from "../src/router/task-intent";
import { extractCodeIdentifierCompacts } from "../src/utils/lexical-tokens";

describe("repository evidence model", () => {
  it("treats research tooling as implementation and machine evidence as verification", () => {
    const collector = describeNodeEvidence({
      sourcePath: "scripts/research/audit-codex-palace-usage.cjs",
      floor: "03-implementation",
      kind: "file"
    });
    const summary = describeNodeEvidence({
      sourcePath: "docs/research/evidence/codex-palace-usage-summary.json",
      floor: "02-interface",
      kind: "config"
    });

    expect(collector).toMatchObject({ scope: "tooling" });
    expect(collector.roles.map((item) => item.role)).toContain("implementation");
    expect(summary).toMatchObject({ scope: "documentation" });
    expect(summary.roles.map((item) => item.role)).toEqual(
      expect.arrayContaining(["documentation", "verification", "configuration"])
    );
  });

  it("classifies documentation tests separately from product verification", () => {
    const docsTest = describeNodeEvidence({
      sourcePath: "docs/tests/api/returns-arg.test.js",
      floor: "05-verification",
      kind: "test"
    });
    const productTest = describeNodeEvidence({
      sourcePath: "test/src/stub-test.js",
      floor: "05-verification",
      kind: "test"
    });

    expect(docsTest.scope).toBe("documentation");
    expect(docsTest.roles.map((item) => item.role)).toEqual(expect.arrayContaining(["documentation", "verification"]));
    expect(productTest).toMatchObject({ scope: "product" });
    expect(productTest.roles.map((item) => item.role)).toEqual(["verification"]);
  });

  it("classifies TypeScript declaration tests as product verification", () => {
    const declarationTest = describeNodeEvidence({
      sourcePath: "types/index.test-d.ts",
      floor: "03-implementation",
      kind: "file"
    });

    expect(declarationTest).toMatchObject({ scope: "product" });
    expect(declarationTest.roles.map((item) => item.role)).toEqual(["verification"]);
  });

  it("does not treat test-directory helpers or source-adjacent test modules as product implementation", () => {
    const pythonHelper = describeNodeEvidence({
      sourcePath: "testing/python/fixtures.py",
      floor: "03-implementation",
      kind: "function",
      title: "test_fixture_directory_collection"
    });
    const rustTestModule = describeNodeEvidence({
      sourcePath: "tower/src/balance/p2c/test.rs",
      floor: "03-implementation",
      kind: "file"
    });

    expect(pythonHelper).toMatchObject({ scope: "product" });
    expect(pythonHelper.roles.map((item) => item.role)).toEqual(["verification"]);
    expect(rustTestModule.roles.map((item) => item.role)).toEqual(["verification"]);
  });

  it("treats extensionless testdata and fixture artifacts as verification evidence", () => {
    const testdata = describeNodeEvidence({
      sourcePath: "testdata/watch-dir/only-remove",
      floor: "03-implementation",
      kind: "file"
    });
    const fixture = describeNodeEvidence({
      sourcePath: "fixtures/locales/ja-date-format",
      floor: "03-implementation",
      kind: "file"
    });

    expect(testdata).toMatchObject({ scope: "product" });
    expect(testdata.roles.map((item) => item.role)).toEqual(["verification"]);
    expect(fixture.roles.map((item) => item.role)).toEqual(["verification"]);
  });

  it("treats fuzz and benchmark trees as verification rather than product implementation", () => {
    const fuzzTarget = describeNodeEvidence({
      sourcePath: "fuzz/fuzz_targets/smallvec_ops.rs",
      floor: "03-implementation",
      kind: "file"
    });
    const benchmark = describeNodeEvidence({
      sourcePath: "benches/bench.rs",
      floor: "03-implementation",
      kind: "function"
    });

    expect(fuzzTarget).toMatchObject({ scope: "product" });
    expect(fuzzTarget.roles.map((item) => item.role)).toEqual(["verification"]);
    expect(benchmark.roles.map((item) => item.role)).toEqual(["verification"]);
  });

  it("classifies test-runner configuration as configuration and verification evidence", () => {
    const tox = describeNodeEvidence({
      sourcePath: "tox.ini",
      floor: "04-data",
      kind: "config"
    });

    expect(tox).toMatchObject({ scope: "product" });
    expect(tox.roles.map((item) => item.role)).toEqual(
      expect.arrayContaining(["configuration", "verification"])
    );
    expect(tox.roles.map((item) => item.role)).not.toContain("implementation");
  });

  it("turns a repair request into explicit implementation and verification obligations", () => {
    const analysis = analyzeTask("fix returns so that it overrides returnsArg without changing the public contract");
    const intent = buildTaskIntent(
      analysis,
      "bugfix",
      []
    );

    expect(analysis.identifiers).toContain("returnsArg");
    expect(intent.requiredRoles).toEqual(["implementation", "verification"]);
    expect(intent.preferredScopes).toEqual(["product"]);
    expect(intent.subjects).toEqual(expect.arrayContaining([
      expect.objectContaining({ normalized: "returnsarg", kind: "identifier", source: "explicit" })
    ]));
    expect(intent.outcomes[0]?.normalized).toContain("override return arg");
    expect(intent.constraints[0]?.normalized).toContain("changing the public contract");
  });

  it("keeps identifiers from a without-clause in constraints instead of subjects", () => {
    const intent = buildTaskIntent(
      analyzeTask("fix: build the redaction shape without Object.prototype"),
      "bugfix",
      []
    );
    const subjects = intent.subjects.map((term) => term.normalized);

    expect(subjects).toEqual(expect.arrayContaining(["redaction", "shape"]));
    expect(subjects).not.toEqual(expect.arrayContaining([
      "object",
      "prototype",
      "objectprototype"
    ]));
    expect(intent.constraints).toEqual(expect.arrayContaining([
      expect.objectContaining({ normalized: "object prototype", kind: "constraint" })
    ]));
  });

  it("keeps artifact output qualifiers out of subjects without hiding implementation qualifiers", () => {
    const artifactIntent = buildTaskIntent(
      analyzeTask("Fix the Keystone router; record machine-readable JSON evidence and write English and Simplified Chinese result reports."),
      "bugfix",
      []
    );
    const artifactSubjects = artifactIntent.subjects.map((term) => term.normalized);

    expect(artifactSubjects).toContain("keystone");
    expect(artifactSubjects).not.toEqual(expect.arrayContaining([
      "machinereadable",
      "json",
      "english",
      "simplified",
      "chinese"
    ]));

    const implementationIntent = buildTaskIntent(
      analyzeTask("Fix the English parser"),
      "bugfix",
      []
    );
    const implementationSubjects = implementationIntent.subjects.map((term) => term.normalized);

    expect(implementationSubjects).toEqual(expect.arrayContaining(["english", "parser"]));
  });

  it("matches explicit code identifiers exactly instead of by natural-language prefix", () => {
    expect(extractCodeIdentifierCompacts("defaultBehaviors.returnsArg")).toContain("returnsarg");
    expect(extractCodeIdentifierCompacts(".returnsArg")).toContain("returnsarg");
    expect(extractCodeIdentifierCompacts("returns existing override for arguments")).not.toContain("returnsarg");
  });

  it("requires a causal implementation-to-verification closure", () => {
    const implementation = makeNode("implementation", "lib/behavior.js", "file", "03-implementation");
    const bridge = makeNode("bridge", "lib/public-api.js", "file", "03-implementation");
    const verification = makeNode("verification", "spec/public-api.spec.js", "test", "05-verification");
    const intent = buildTaskIntent(analyzeTask("fix behavior"), "bugfix", []);
    const edges = [
      makeEdge("implementation", "bridge", "imports", 0.8),
      makeEdge("verification", "bridge", "imports", 0.8)
    ];

    const complete = evaluateEvidenceClosure({
      intent,
      selectedNodes: [implementation, bridge, verification],
      allNodes: [implementation, bridge, verification],
      edges
    });
    const transitive = evaluateEvidenceClosure({
      intent,
      selectedNodes: [implementation, verification],
      allNodes: [implementation, bridge, verification],
      edges
    });
    const incomplete = evaluateEvidenceClosure({
      intent,
      selectedNodes: [implementation],
      allNodes: [implementation, bridge, verification],
      edges
    });

    expect(complete).toMatchObject({ status: "sufficient", missingRoles: [] });
    expect(complete.connectedRolePairs).toEqual([
      expect.objectContaining({ from: "implementation", to: "verification", hops: 1, via: [] })
    ]);
    expect(buildRouteConfidenceEvidence(complete)).toMatchObject({
      score: 0.99,
      completeness: 1,
      connectivity: 1
    });
    expect(transitive).toMatchObject({
      status: "sufficient",
      connectedRolePairs: [
        expect.objectContaining({
          from: "implementation",
          to: "verification",
          hops: 2,
          via: ["lib/public-api.js"]
        })
      ]
    });
    expect(incomplete).toMatchObject({ status: "insufficient", missingRoles: ["verification"] });
  });

  it("does not expand an owner contract through every consumer when additive members are absent", () => {
    const owner = makeNode("owner", "src/lib.rs", "interface", "03-implementation", "Itertools");
    const adapter = makeNode("adapter", "src/adaptors/map.rs", "file", "03-implementation", "Itertools map adapter");
    const verification = makeNode("verification", "tests/quick.rs", "test", "05-verification", "Itertools quick properties");
    const intent = buildTaskIntent(
      analyzeTask("feat(Itertools): add strip_prefix and strip_prefix_by methods"),
      "feature",
      []
    );

    const closure = evaluateEvidenceClosure({
      intent,
      selectedNodes: [owner, verification],
      allNodes: [owner, adapter, verification],
      edges: [
        makeEdge("adapter", "owner", "depends_on", 0.6),
        makeEdge("verification", "owner", "tests", 0.9)
      ]
    });

    expect(closure.status).toBe("insufficient");
    expect(closure.termCoverage.subjects.missing).toEqual(
      expect.arrayContaining(["strip_prefix", "strip_prefix_by"])
    );
    expect(closure.requiredCausalSources).not.toContain("src/adaptors/map.rs");
  });

  it("requires task-aligned causal implementation participants without pulling generic neighbors", () => {
    const controller = makeNode("controller", "src/auth.controller.ts", "file", "03-implementation");
    const tokenService = makeNode("token", "src/token.service.ts", "file", "03-implementation");
    const authService = makeNode("auth", "src/auth.service.ts", "file", "03-implementation");
    const verification = makeNode("test", "tests/auth.test.ts", "test", "05-verification");
    tokenService.summary = "Generates refresh tokens for authenticated sessions.";
    authService.summary = "Loads authenticated users.";
    verification.summary = "Verifies login returns a refresh token.";
    const intent = buildTaskIntent(analyzeTask("fix login refresh token bug"), "bugfix", []);
    const allNodes = [controller, tokenService, authService, verification];
    const edges = [
      makeEdge("controller", "token", "imports", 0.8),
      makeEdge("controller", "auth", "imports", 0.8),
      makeEdge("test", "controller", "tests", 0.9)
    ];

    const incomplete = evaluateEvidenceClosure({
      intent,
      selectedNodes: [controller, verification],
      allNodes,
      edges
    });
    const complete = evaluateEvidenceClosure({
      intent,
      selectedNodes: [controller, tokenService, verification],
      allNodes,
      edges
    });

    expect(incomplete).toMatchObject({
      status: "insufficient",
      requiredCausalSources: ["src/token.service.ts"],
      missingCausalSources: ["src/token.service.ts"]
    });
    expect(complete).toMatchObject({ status: "sufficient", missingCausalSources: [] });
    expect(complete.requiredCausalSources).not.toContain("src/auth.service.ts");
  });

  it("does not let documentation verification satisfy a product repair", () => {
    const implementation = makeNode("implementation", "lib/behavior.js", "file", "03-implementation");
    const docsTest = makeNode("docs-test", "docs/tests/behavior.test.js", "test", "05-verification");
    const intent = buildTaskIntent(analyzeTask("fix behavior"), "bugfix", []);

    const closure = evaluateEvidenceClosure({
      intent,
      selectedNodes: [implementation, docsTest],
      allNodes: [implementation, docsTest],
      edges: [makeEdge("docs-test", "implementation", "tests", 0.99)]
    });

    expect(closure).toMatchObject({ status: "insufficient", missingRoles: ["verification"] });
    expect(closure.reasons).toContain("Ignored 1 selected source(s) outside the task's preferred evidence scope.");
  });

  it("keeps a role-complete route open when an explicit behavior constraint is uncovered", () => {
    const implementation = makeNode("implementation", "src/ResultEnvelope.ts", "file", "03-implementation");
    const verification = makeNode("verification", "test/ResultEnvelope.test.ts", "test", "05-verification");
    const intent = buildTaskIntent(
      analyzeTask("fix(ResultEnvelope): forward cookies only when response is used"),
      "bugfix",
      []
    );
    const closure = evaluateEvidenceClosure({
      intent,
      selectedNodes: [implementation, verification],
      allNodes: [implementation, verification],
      edges: [makeEdge("verification", "implementation", "tests", 0.99)]
    });

    expect(closure).toMatchObject({
      status: "insufficient",
      missingRoles: [],
      termCoverage: {
        constraints: { missing: ["response is used"] }
      }
    });
  });
});

function makeNode(
  id: string,
  sourcePath: string,
  kind: PalaceNode["kind"],
  floor: PalaceNode["floor"],
  title = sourcePath
): PalaceNode {
  return {
    id,
    palacePath: `${floor}/${id}`,
    sourcePath,
    floor,
    kind,
    evidence: describeNodeEvidence({ sourcePath, floor, kind, title }),
    title,
    summary: title,
    tags: [],
    tokenCost: 1,
    contentHash: id,
    sourceHash: id,
    lod: { level0: floor, level5Ref: { sourcePath } },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

function makeEdge(from: string, to: string, type: "depends_on" | "imports" | "tests", weight: number) {
  return {
    id: `${from}-${to}`,
    from,
    to,
    type,
    weight,
    createdAt: "2026-01-01T00:00:00.000Z"
  } as const;
}
