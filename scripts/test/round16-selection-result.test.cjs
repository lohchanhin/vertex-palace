const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const { sha256Bytes } = require("../lib/local-blind-freeze.cjs");

const root = path.resolve(__dirname, "..", "..");
const evidencePath = path.join(
  root,
  "docs/research/evidence/local-blind-routing-target-selection-round-16-attempt-1-failure.json"
);
const reportPaths = [
  path.join(root, "docs/research/LOCAL_BLIND_ROUTING_ROUND_16_SELECTION_RESULT_0_4_ALPHA.md"),
  path.join(root, "docs/zh-CN/LOCAL_BLIND_ROUTING_ROUND_16_SELECTION_RESULT_0_4_ALPHA.md")
];

test("preserves the Round 16 mechanical selection failure before semantic review", async () => {
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  assert.equal(evidence.studyId, "local-blind-routing-round-16-0.4-alpha");
  assert.equal(evidence.status, "selection-failed-before-semantic-review");
  assert.equal(evidence.candidateQueue.repositoriesInspected, 16);
  assert.equal(evidence.candidateQueue.mechanicalCandidates, 56);
  assert.deepEqual(evidence.blockingFamilies, ["rust"]);
  assert.deepEqual(
    evidence.familyFeasibility.map((family) => ({
      family: family.languageFamily,
      candidateRepositories: family.repositoriesWithMechanicalCandidates,
      feasible: family.feasibleBeforeSemanticReview
    })),
    [
      { family: "javascript-typescript", candidateRepositories: 4, feasible: true },
      { family: "python", candidateRepositories: 3, feasible: true },
      { family: "go", candidateRepositories: 4, feasible: true },
      { family: "rust", candidateRepositories: 1, feasible: false }
    ]
  );
  assert.deepEqual(
    evidence.familyFeasibility.find(({ languageFamily }) => languageFamily === "rust")
      .repositoriesWithoutMechanicalCandidates,
    ["cfg-if", "predicates-rs", "chumsky"]
  );
  assert.equal(evidence.selection.semanticReviewStarted, false);
  assert.equal(evidence.selection.familyQuotaLowered, false);
  assert.equal(evidence.selection.poolSubstitutedAfterHistoryObservation, false);
  assert.equal(evidence.exposureBoundary.palaceCallsOnCandidateTasks, 0);
  assert.equal(evidence.exposureBoundary.productChangesAfterCandidateFreeze, false);
  assert.equal(evidence.advancement.round16StaticValidationAuthorized, false);
  assert.equal(evidence.advancement.v5AgentStudyAuthorized, false);
});

test("binds the Round 16 failure to the immutable freeze, pool, and queue", async () => {
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  for (const artifact of [
    evidence.candidateFreeze,
    evidence.repositoryPool,
    evidence.candidateQueue
  ]) {
    const bytes = await readFile(path.join(root, artifact.path));
    assert.equal(sha256Bytes(bytes), artifact.sha256);
  }
});

test("keeps both Round 16 reports explicit about failure and claim boundaries", async () => {
  const reports = await Promise.all(reportPaths.map((reportPath) => readFile(reportPath, "utf8")));
  for (const report of reports) {
    assert.match(report, /16\/16/);
    assert.match(report, /56/);
    assert.match(report, /1\/4/);
    assert.match(report, /toml/);
    assert.match(report, /cfg-if/);
    assert.match(report, /predicates-rs/);
    assert.match(report, /chumsky/);
    assert.match(report, /Palace/);
    assert.match(report, /Token/);
  }
  assert.match(reports[0], /not a product-routing\s+result/i);
  assert.match(reports[1], /不是产品路由结果/);
});
