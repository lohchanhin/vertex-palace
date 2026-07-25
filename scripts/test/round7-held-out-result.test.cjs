const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const evidencePath = path.join(projectRoot, "docs", "research", "evidence", "held-out-cross-repository-routing-0.4-alpha-round-7.json");
const englishReportPath = path.join(projectRoot, "docs", "research", "HELD_OUT_CROSS_REPOSITORY_ROUTING_RESULT_0_4_ALPHA_ROUND_7.md");
const chineseReportPath = path.join(projectRoot, "docs", "zh-CN", "HELD_OUT_CROSS_REPOSITORY_ROUTING_RESULT_0_4_ALPHA_ROUND_7.md");
const evidenceSha = "C53C9186853F1661158212604804261C8394781454A7C7B7DF15811D4E42D7B9";

test("preserves the failed first Round 7 held-out observation", () => {
  const bytes = readFileSync(evidencePath);
  const result = JSON.parse(bytes.toString("utf8"));

  assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), evidenceSha);
  assert.equal(result.status, "failed");
  assert.equal(result.heldOutAgainstCandidate, true);
  assert.equal(result.evidenceClass, "preregistered-candidate-held-out-static-routing");
  assert.match(result.claimBoundary, /cannot support Agent correctness/);
  assert.deepEqual(result.aggregate, {
    targetCount: 8,
    passedTargets: 2,
    failedTargets: 6,
    trialCount: 16,
    completedTrials: 16,
    passedTrials: 4,
    taskTypeMatchedTargets: 6,
    coreSurfaceCompleteTargets: 3,
    auxiliarySurfaceTargetCount: 2,
    auxiliarySurfaceCompleteTargets: 0,
    exactOracleTargets: 2,
    deterministicTargets: 8,
    oracleFileTotal: 21,
    auxiliaryOracleFileTotal: 2,
    routeFileTotal: 30,
    macroChangedFileCoverage: 0.557,
    macroAuxiliarySurfaceCoverage: 0,
    macroRouteFocus: 0.48,
    macroRoutePrecision: 0.481,
    minimumTargetRouteFocus: 0,
    minimumTargetRoutePrecision: 0,
    overconfidentTrials: 4,
    maxContextEstimatedTokens: 3453,
    transientMaterializationAttempts: 0,
    transientFreshIndexAttempts: 0,
    environmentOrSetupFailures: 0,
    harnessContractFailures: 0,
    productOrContractFailures: 6
  });
  assert.deepEqual(
    result.targets.filter((target) => target.status === "passed").map((target) => target.name),
    ["go-multierror", "node-glob"]
  );
  for (const target of result.targets) {
    assert.equal(target.trials.length, 2, target.name);
    assert.equal(target.deterministicRoutes, true, target.name);
    assert.deepEqual(target.trials[0].routeFiles, target.trials[1].routeFiles, target.name);
  }
});

test("keeps both Round 7 reports explicit about failure and claim limits", () => {
  const english = readFileSync(englishReportPath, "utf8");
  const chinese = readFileSync(chineseReportPath, "utf8");

  for (const report of [english, chinese]) {
    assert.match(report, /C53C9186853F1661158212604804261C8394781454A7C7B7DF15811D4E42D7B9/);
    assert.match(report, /0\.557/);
    assert.match(report, /0\.480/);
    assert.match(report, /2 \/ 8/);
    assert.match(report, /16 \/ 16/);
    assert.match(report, /disclosed regression/i);
  }
  assert.match(english, /Failed/);
  assert.match(english, /does not show Token/);
  assert.match(chinese, /失败/);
  assert.match(chinese, /不能证明 Token/);
});
