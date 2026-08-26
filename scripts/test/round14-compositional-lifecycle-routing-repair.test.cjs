const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const evidencePath = path.join(
  root,
  "docs/research/evidence/compositional-lifecycle-routing-repair-round-14-self-audit-0.4-alpha.json"
);
const reportPaths = [
  path.join(root, "docs/research/COMPOSITIONAL_LIFECYCLE_ROUTING_REPAIR_ROUND_14_RESULT_0_4_ALPHA.md"),
  path.join(root, "docs/zh-CN/COMPOSITIONAL_LIFECYCLE_ROUTING_REPAIR_ROUND_14_RESULT_0_4_ALPHA.md")
];

test("locks the Round 14 compositional lifecycle repair progression and residuals", async () => {
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));

  assert.equal(evidence.round, 14);
  assert.equal(evidence.evidenceClass, "post-observation-development-self-audit");
  assert.equal(evidence.status, "improved-with-residuals");
  assert.equal(evidence.fullChangedFileOracle.length, 9);
  assert.deepEqual(
    Object.fromEntries(Object.entries(evidence.observations).map(([name, value]) => [
      name,
      {
        evaluationId: value.evaluationId,
        changedFileCoverage: value.changedFileCoverage,
        routeFocus: value.routeFocus,
        routeConfidence: value.routeConfidence
      }
    ])),
    {
      baseline: {
        evaluationId: "evaluation_8b8f74264a8b8ff6",
        changedFileCoverage: 0.222,
        routeFocus: 0.4,
        routeConfidence: 0.15
      },
      afterClauseComposition: {
        evaluationId: "evaluation_7db16c85710ed312",
        changedFileCoverage: 0.444,
        routeFocus: 0.571,
        routeConfidence: 0.15
      },
      candidate: {
        evaluationId: "evaluation_5757c7811b91f791",
        changedFileCoverage: 0.778,
        routeFocus: 1,
        routeConfidence: 0.4
      }
    }
  );
  assert.equal(evidence.observations.candidate.routeOnlyFiles.length, 0);
  assert.equal(evidence.postObservationSemanticCore.coverage, 1);
  assert.equal(evidence.postObservationSemanticCore.selectedAfterObservation, true);
  assert.equal(evidence.residualMisses.length, 2);
  assert.deepEqual(
    evidence.residualMisses.map((entry) => entry.path),
    [
      "plugins/vertex-palace/mcp/server.cjs",
      "scripts/test/round13-research-lifecycle-routing-repair.test.cjs"
    ]
  );
  assert.equal(evidence.controlledRegression.fullOracleCoverage, 0.875);
  assert.equal(evidence.controlledRegression.unrelatedConfigurationSelected, false);
  assert.equal(evidence.controlledRegression.historicRound8ArtifactsSelected, false);
  assert.deepEqual(
    {
      evaluationId: evidence.finalRound14Audit.evaluationId,
      taskType: evidence.finalRound14Audit.taskType,
      fullChangedFileOracleCount: evidence.finalRound14Audit.fullChangedFileOracleCount,
      matchedChangedFiles: evidence.finalRound14Audit.matchedChangedFiles,
      changedFileCoverage: evidence.finalRound14Audit.changedFileCoverage,
      routeFocus: evidence.finalRound14Audit.routeFocus,
      routeConfidence: evidence.finalRound14Audit.routeConfidence,
      calibration: evidence.finalRound14Audit.calibration
    },
    {
      evaluationId: "evaluation_349196c29ddf9bb7",
      taskType: "bugfix",
      fullChangedFileOracleCount: 13,
      matchedChangedFiles: 10,
      changedFileCoverage: 0.769,
      routeFocus: 1,
      routeConfidence: 0.4,
      calibration: "underconfident"
    }
  );
  assert.equal(evidence.finalRound14Audit.routeOnlyFiles.length, 0);
  assert.equal(evidence.finalRound14Audit.postObservationSemanticCore.coverage, 1);
  assert.equal(evidence.finalRound14Audit.postObservationSemanticCore.matchedFiles, 10);
  assert.deepEqual(evidence.finalRound14Audit.missedFiles, [
    "plugins/vertex-palace/mcp/server.cjs",
    "scripts/test/round13-research-lifecycle-routing-repair.test.cjs",
    "scripts/test/round14-compositional-lifecycle-routing-repair.test.cjs"
  ]);
  assert.ok(evidence.finalRound14Audit.routeFiles.includes("packages/core/test/router.test.ts"));
  assert.ok(!evidence.finalRound14Audit.routeFiles.includes(
    "scripts/test/round14-compositional-lifecycle-routing-repair.test.cjs"
  ));
  assert.deepEqual(evidence.crossRoundBilingualRegression, {
    testName: "pairs bilingual reports across numbered rounds when the localized heading carries the identity",
    fullOracleCoverage: 1,
    fullOracleFiles: 10,
    routeFocus: 1,
    localizedHeadingSuppliesRoundIdentity: true,
    productRegressionSelectedFirst: true,
    historicRound8ArtifactsSelected: false
  });
  assert.deepEqual(evidence.competitionFreeze, {
    active: true,
    localChangesOnly: true,
    committed: false,
    pushed: false,
    published: false
  });
});

test("keeps both Round 14 reports explicit about post-observation and Agent-performance boundaries", async () => {
  const [english, chinese] = await Promise.all(
    reportPaths.map((reportPath) => readFile(reportPath, "utf8"))
  );

  for (const report of [english, chinese]) {
    assert.match(report, /evaluation_8b8f74264a8b8ff6/);
    assert.match(report, /evaluation_7db16c85710ed312/);
    assert.match(report, /evaluation_5757c7811b91f791/);
    assert.match(report, /evaluation_349196c29ddf9bb7/);
    assert.match(report, /0\.778/);
    assert.match(report, /0\.769/);
    assert.match(report, /1\.000/);
    assert.match(report, /7\/7/);
    assert.match(report, /10\/13/);
    assert.match(report, /10\/10/);
    assert.match(report, /Round 11/);
    assert.match(report, /Round 12/);
  }
  assert.match(english, /post-observation development self-audit/i);
  assert.match(english, /no claim about Agent correctness, Token use, tool calls, or wall time/i);
  assert.match(chinese, /事后观察/);
  assert.match(chinese, /不能据此声称 Agent 正确率、Token、工具调用或耗时改善/);
});
