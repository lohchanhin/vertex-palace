const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const evidencePath = path.join(
  root,
  "docs/research/evidence/confidence-evidence-gate-round-15-self-audit-0.4-alpha.json"
);
const reportPaths = [
  path.join(root, "docs/research/CONFIDENCE_EVIDENCE_GATE_ROUND_15_RESULT_0_4_ALPHA.md"),
  path.join(root, "docs/zh-CN/CONFIDENCE_EVIDENCE_GATE_ROUND_15_RESULT_0_4_ALPHA.md")
];

test("locks the Round 15 complete, budget, and causal-verification confidence controls", async () => {
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  const { completeEvidence, tightBudget, incompleteIndependentVerification } = evidence.conditions;

  assert.equal(evidence.round, 15);
  assert.equal(evidence.evidenceClass, "post-observation-controlled-regression");
  assert.equal(
    evidence.status,
    "controlled-regression-passed-self-hosting-repaired-with-residuals"
  );
  assert.equal(evidence.oracle.length, 7);

  assert.deepEqual(
    {
      matchedFiles: completeEvidence.matchedFiles,
      oracleFiles: completeEvidence.oracleFiles,
      routeOnlyFiles: completeEvidence.routeOnlyFiles,
      changedFileCoverage: completeEvidence.changedFileCoverage,
      routeFocus: completeEvidence.routeFocus,
      routeConfidence: completeEvidence.routeConfidence,
      evidenceClosure: completeEvidence.evidenceClosure,
      independentImplementationAnchor: completeEvidence.independentImplementationAnchor
    },
    {
      matchedFiles: 7,
      oracleFiles: 7,
      routeOnlyFiles: 0,
      changedFileCoverage: 1,
      routeFocus: 1,
      routeConfidence: 0.68,
      evidenceClosure: "sufficient",
      independentImplementationAnchor: "confirmed"
    }
  );
  assert.deepEqual(completeEvidence.confidenceEvidence, {
    basis: "evidence-closure-v2",
    score: 0.99,
    completeness: 1,
    connectivity: 1,
    semanticCoverage: 1,
    ambiguity: 0,
    indexFreshness: "fresh",
    memoryReliability: "not-applied"
  });

  assert.equal(tightBudget.sameOrderedRouteAsCompleteEvidence, true);
  assert.equal(tightBudget.estimatedRouteTokens, completeEvidence.estimatedRouteTokens);
  assert.equal(tightBudget.routeConfidence, 0.4);
  assert.ok(tightBudget.estimatedRouteTokens > tightBudget.budgetTokens);

  assert.equal(incompleteIndependentVerification.sameRouteFileSetAsCompleteEvidence, true);
  assert.equal(incompleteIndependentVerification.changedFileCoverage, 1);
  assert.equal(incompleteIndependentVerification.routeFocus, 1);
  assert.equal(incompleteIndependentVerification.evidenceClosure, "sufficient");
  assert.equal(incompleteIndependentVerification.independentImplementationAnchor, "missing");
  assert.equal(incompleteIndependentVerification.routeConfidence, 0.4);
  assert.deepEqual(incompleteIndependentVerification.uncoveredImplementationSources, [
    "packages/core/src/router/route-planner.ts",
    "packages/core/src/router/route-scorer.ts"
  ]);

  assert.deepEqual(evidence.intentQualifierControl.implementationSubjectsPreserved, [
    "english",
    "parser"
  ]);
  assert.deepEqual(evidence.verification.monorepoTests, {
    core: 225,
    cli: 2,
    mcp: 2,
    passed: 229,
    total: 229
  });
  assert.deepEqual(
    {
      evaluationId: evidence.selfHostingObservation.baseline.evaluationId,
      taskType: evidence.selfHostingObservation.baseline.taskType,
      matchedFiles: evidence.selfHostingObservation.baseline.matchedFiles,
      oracleFiles: evidence.selfHostingObservation.baseline.oracleFiles,
      changedFileCoverage: evidence.selfHostingObservation.baseline.changedFileCoverage,
      routeFocus: evidence.selfHostingObservation.baseline.routeFocus,
      routeConfidence: evidence.selfHostingObservation.baseline.routeConfidence,
      calibration: evidence.selfHostingObservation.baseline.calibration
    },
    {
      evaluationId: "evaluation_d806f35697a07487",
      taskType: "evaluation",
      matchedFiles: 0,
      oracleFiles: 9,
      changedFileCoverage: 0,
      routeFocus: 0,
      routeConfidence: 0.3,
      calibration: "overconfident"
    }
  );
  assert.deepEqual(
    {
      evaluationId: evidence.selfHostingObservation.intermediate.evaluationId,
      matchedFiles: evidence.selfHostingObservation.intermediate.matchedFiles,
      changedFileCoverage: evidence.selfHostingObservation.intermediate.changedFileCoverage,
      routeFocus: evidence.selfHostingObservation.intermediate.routeFocus,
      routeConfidence: evidence.selfHostingObservation.intermediate.routeConfidence,
      calibration: evidence.selfHostingObservation.intermediate.calibration
    },
    {
      evaluationId: "evaluation_33738334c61a91f0",
      matchedFiles: 4,
      changedFileCoverage: 0.444,
      routeFocus: 0.571,
      routeConfidence: 0.4,
      calibration: "well-calibrated"
    }
  );
  assert.deepEqual(
    {
      evaluationId: evidence.selfHostingObservation.repaired.evaluationId,
      routeId: evidence.selfHostingObservation.repaired.routeId,
      semanticCoreMatchedFiles:
        evidence.selfHostingObservation.repaired.semanticCoreMatchedFiles,
      semanticCoreFiles: evidence.selfHostingObservation.repaired.semanticCoreFiles,
      matchedFiles: evidence.selfHostingObservation.repaired.matchedFiles,
      oracleFiles: evidence.selfHostingObservation.repaired.oracleFiles,
      changedFileCoverage: evidence.selfHostingObservation.repaired.changedFileCoverage,
      routeFocus: evidence.selfHostingObservation.repaired.routeFocus,
      routeConfidence: evidence.selfHostingObservation.repaired.routeConfidence,
      calibration: evidence.selfHostingObservation.repaired.calibration,
      routeOnlyFiles: evidence.selfHostingObservation.repaired.routeOnlyFiles,
      contextTokens: evidence.selfHostingObservation.repaired.contextTokens,
      contextTokenCeiling: evidence.selfHostingObservation.repaired.contextTokenCeiling
    },
    {
      evaluationId: "evaluation_d36bfd38072b0d23",
      routeId: "route_8a7710e68e5a69f8",
      semanticCoreMatchedFiles: 7,
      semanticCoreFiles: 7,
      matchedFiles: 7,
      oracleFiles: 9,
      changedFileCoverage: 0.778,
      routeFocus: 1,
      routeConfidence: 0.4,
      calibration: "underconfident",
      routeOnlyFiles: 0,
      contextTokens: 4852,
      contextTokenCeiling: 6000
    }
  );
  assert.deepEqual(evidence.selfHostingObservation.repaired.missedFiles, [
    "scripts/test/round15-confidence-evidence-gate.test.cjs",
    "plugins/vertex-palace/mcp/server.cjs"
  ]);
  assert.equal(evidence.selfHostingObservation.repairLineage, "post-observation-disclosed");
  assert.equal(evidence.selfHostingObservation.independentHeldOut, false);
  assert.deepEqual(evidence.verification.researchLifecycleTests, {
    regular: 173,
    inheritedBeforeRound15: 170,
    round15EvidenceLocks: 3,
    round11Freeze: 2,
    round12Freeze: 2,
    failed: 0
  });
  assert.deepEqual(evidence.competitionFreeze, {
    active: true,
    localChangesOnly: true,
    committed: false,
    pushed: false,
    tagged: false,
    npmPublished: false,
    published: false
  });
});

test("keeps both Round 15 reports explicit about calibration and performance boundaries", async () => {
  const [english, chinese] = await Promise.all(
    reportPaths.map((reportPath) => readFile(reportPath, "utf8"))
  );

  for (const report of [english, chinese]) {
    assert.match(report, /7\/7/);
    assert.match(report, /0\/9/);
    assert.match(report, /7\/9/);
    assert.match(report, /0\.68/);
    assert.match(report, /0\.40/);
    assert.match(report, /120\/120/);
    assert.match(report, /229\/229/);
    assert.match(report, /173\/173/);
    assert.match(report, /evaluation_d806f35697a07487/);
    assert.match(report, /evaluation_d36bfd38072b0d23/);
    assert.match(report, /round15-confidence-evidence-gate\.test\.cjs/);
    assert.match(report, /plugins\/vertex-palace\/mcp\/server\.cjs/);
    assert.match(report, /post-observation|事后观察/i);
    assert.match(report, /Agent/);
    assert.match(report, /Token/);
  }
  assert.match(english, /supports no claim about Agent correctness, Token use, tool calls, or wall time/i);
  assert.match(chinese, /不能据此声称 Agent 正确率、Token、工具调用或耗时得到改善/);
});

test("binds the Round 15 evidence to focused product regressions", async () => {
  const [routerTest, evidenceModelTest] = await Promise.all([
    readFile(path.join(root, "packages/core/test/router.test.ts"), "utf8"),
    readFile(path.join(root, "packages/core/test/evidence-model.test.ts"), "utf8")
  ]);

  assert.match(
    routerTest,
    /raises compound bugfix confidence only with complete verification closure and sufficient budget/
  );
  assert.match(
    evidenceModelTest,
    /keeps artifact output qualifiers out of subjects without hiding implementation qualifiers/
  );
});
