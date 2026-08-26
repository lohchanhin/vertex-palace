const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const evidencePath = path.join(
  root,
  "docs/research/evidence/research-lifecycle-routing-repair-self-audit-0.4-alpha.json"
);
const englishPath = path.join(
  root,
  "docs/research/RESEARCH_LIFECYCLE_ROUTING_REPAIR_RESULT_0_4_ALPHA.md"
);
const chinesePath = path.join(
  root,
  "docs/zh-CN/RESEARCH_LIFECYCLE_ROUTING_REPAIR_RESULT_0_4_ALPHA.md"
);

test("locks the Round 13 research-lifecycle self-audit metrics and route membership", async () => {
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));

  assert.equal(evidence.round, 13);
  assert.equal(evidence.evidenceClass, "post-observation-development-self-audit");
  assert.equal(evidence.status, "improved-with-residuals");
  assert.deepEqual(evidence.conditions, {
    repository: "vertex-palace-local-worktree",
    sourceState: "dirty-local-development-worktree",
    routeLimit: 10,
    budgetTokens: 6000,
    maxDrawers: 4,
    sameTaskText: true,
    sameFullChangedFileOracle: true,
    immutableCandidateCommit: false,
    independentHeldOut: false
  });
  assert.deepEqual(
    {
      id: evidence.baseline.evaluationId,
      matched: evidence.baseline.matchedChangedFileCount,
      coverage: evidence.baseline.changedFileCoverage,
      focus: evidence.baseline.routeFocus,
      confidence: evidence.baseline.routeConfidence,
      calibration: evidence.baseline.calibration
    },
    {
      id: "evaluation_247934ce4e376b45",
      matched: 1,
      coverage: 0.067,
      focus: 0.1,
      confidence: 0.4,
      calibration: "overconfident"
    }
  );
  assert.deepEqual(
    {
      id: evidence.candidate.evaluationId,
      matched: evidence.candidate.matchedChangedFileCount,
      coverage: evidence.candidate.changedFileCoverage,
      focus: evidence.candidate.routeFocus,
      confidence: evidence.candidate.routeConfidence,
      calibration: evidence.candidate.calibration
    },
    {
      id: "evaluation_41e998c519d15686",
      matched: 8,
      coverage: 0.533,
      focus: 0.8,
      confidence: 0.4,
      calibration: "well-calibrated"
    }
  );
  assert.deepEqual(evidence.delta, {
    matchedChangedFiles: 7,
    changedFileCoverage: 0.466,
    routeFocus: 0.7,
    overconfidenceRemoved: true
  });
  assert.equal(evidence.fullChangedFileOracle.fileCount, 15);
  assert.equal(evidence.fullChangedFileOracle.candidateMatched, 8);
  assert.equal(evidence.postObservationSemanticCore.definedAfterObservation, true);
  assert.equal(evidence.postObservationSemanticCore.mustNotBeUsedAsHeldOutEvidence, true);
  assert.equal(evidence.postObservationSemanticCore.matched, 8);
  assert.equal(evidence.postObservationSemanticCore.coverage, 1);
  assert.equal(evidence.residualMisses.length, 7);
  assert.equal(evidence.controlledRegression.assertions.changedFileCoverage, 1);
  assert.equal(evidence.controlledRegression.assertions.minimumRouteFocus, 0.875);
  assert.equal(evidence.competitionFreeze.active, true);
  assert.equal(evidence.competitionFreeze.push, false);
  assert.equal(evidence.competitionFreeze.npmPublish, false);
});

test("keeps the bilingual Round 13 report explicit about post-observation and performance boundaries", async () => {
  const [english, chinese] = await Promise.all([
    readFile(englishPath, "utf8"),
    readFile(chinesePath, "utf8")
  ]);

  for (const value of [english, chinese]) {
    assert.match(value, /1\s*\/\s*15/);
    assert.match(value, /8\s*\/\s*15/);
    assert.match(value, /0\.80/);
    assert.match(value, /evaluation_247934ce4e376b45/);
    assert.match(value, /evaluation_41e998c519d15686/);
    assert.match(value, /Round 11/);
    assert.match(value, /Round 12/);
  }
  assert.match(english, /Round 13 Research Lifecycle Routing Repair Result/);
  assert.match(chinese, /第 13 轮/);
  assert.match(english, /post-observation development self-audit/i);
  assert.match(english, /does not prove Agent correctness, token savings, fewer tool calls, or lower wall time/i);
  assert.match(chinese, /事后观察的开发期自审/);
  assert.match(chinese, /不能证明 Agent 正确率、Token 节省、工具调用减少或墙钟时间下降/);
  assert.match(chinese, /所有修改仅保留在本地/);
});
