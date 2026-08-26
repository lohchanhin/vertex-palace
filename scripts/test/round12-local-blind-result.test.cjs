const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const evidencePath = path.join(root, "docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-12-attempt-2.json");
const failedPath = path.join(root, "docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-12-attempt-1.json");
const freezePath = path.join(root, "docs/research/evidence/local-blind-routing-validation-freeze-attempt-2-0.4-alpha-round-12.json");

test("Round 12 preserves the valid corrected result and pre-observation harness failure", async () => {
  const [evidenceBytes, failedBytes, freezeBytes] = await Promise.all([
    readFile(evidencePath),
    readFile(failedPath),
    readFile(freezePath)
  ]);
  assert.equal(sha256(evidenceBytes), "4A7D6DBB68FBD6C1AEA3CD3159A092E5C2E8D6931187533F827A55BA6B1529D3");
  assert.equal(sha256(failedBytes), "AC7725C8CFD70283D504E699FDE1570411142F1B4B5A68138D3C7F49900379F3");
  assert.equal(sha256(freezeBytes), "FB0F9E9F438B822FD98F9FDDF075A184B5807CB440D16A3C0199C33B6443841B");

  const failed = JSON.parse(failedBytes.toString("utf8"));
  const freeze = JSON.parse(freezeBytes.toString("utf8"));
  assert.equal(failed.status, "invalid");
  assert.equal(freeze.freezeAttempt, 2);
  assert.equal(freeze.amendment.reason, "validator-freeze-version-assertion-harness-error");
  assert.equal(freeze.amendment.selectedTaskPalaceCallsBeforeAttempt2, 0);
  assert.equal(freeze.amendment.productChange, false);
});

test("Round 12 completed without environment failures but failed the candidate absolute gate", async () => {
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  assert.equal(evidence.status, "completed");
  assert.deepEqual(evidence.validityFailures, []);
  assert.equal(evidence.candidateGateStatus, "failed");
  assert.equal(evidence.advancementStatus, "not-eligible-for-agent-protocol");
  for (const condition of [evidence.aggregate.baseline, evidence.aggregate.candidate]) {
    assert.equal(condition.environmentOrSetupFailures, 0);
    assert.equal(condition.harnessContractFailures, 0);
    assert.equal(condition.completedTrials, 16);
    assert.equal(condition.deterministicTargets, 8);
    assert.equal(condition.unsafeNarrowModeTrials, 0);
    assert.equal(condition.unsafeEnforcedStopTrials, 0);
    assert.equal(condition.evaluationContextRouteDisagreementTrials, 0);
    assert.equal(condition.trackedWorktreeModifiedTargets, 0);
  }
});

test("Round 12 locks the observed aggregate and target failure pattern", async () => {
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  const baseline = evidence.aggregate.baseline;
  const candidate = evidence.aggregate.candidate;
  assert.equal(baseline.targetMacroChangedFileCoverage, 0.542);
  assert.equal(candidate.targetMacroChangedFileCoverage, 0.625);
  assert.equal(baseline.targetMacroRouteFocus, 0.542);
  assert.equal(candidate.targetMacroRouteFocus, 0.563);
  assert.equal(candidate.coreSurfaceCompleteTargets, 4);
  assert.equal(candidate.auxiliarySurfaceCompleteTargets, 0);
  assert.equal(candidate.calibrationMeanAbsoluteError, 0.331);
  assert.equal(candidate.contextEstimatedTokensMean, 2899.875);
  assert.equal(candidate.metricDisagreementTrials, 0);
  assert.equal(evidence.comparison.aggregateDelta.changedFileCoverage, 0.083);
  assert.equal(evidence.comparison.aggregateDelta.routeFocus, 0.021);
  assert.equal(evidence.comparison.aggregateDelta.contextEstimatedTokensMean, -185.25);

  const pairs = Object.fromEntries(evidence.comparison.targetPairs.map((pair) => [pair.target, pair.candidate]));
  assert.equal(pairs.redux.changedFileCoverage, 0.5);
  assert.equal(pairs.blinker.changedFileCoverage, 0.333);
  assert.equal(pairs.sqlx.routeFocus, 0.167);
  assert.equal(pairs.pino.changedFileCoverage, 0);
  assert.equal(pairs.packaging.routeFocus, 1);
  assert.equal(pairs.afero.routeFocus, 1);
  assert.equal(pairs.notify.changedFileCoverage, 1);
});

test("Round 12 reports keep the static-only and post-observation boundaries", async () => {
  const [english, chinese] = await Promise.all([
    readFile(path.join(root, "docs/research/LOCAL_BLIND_ROUTING_ROUND_12_RESULT_0_4_ALPHA.md"), "utf8"),
    readFile(path.join(root, "docs/zh-CN/LOCAL_BLIND_ROUTING_ROUND_12_RESULT_0_4_ALPHA.md"), "utf8")
  ]);
  assert.match(english, /failed the frozen absolute gate/i);
  assert.match(english, /does not establish Agent correctness/i);
  assert.match(english, /Auxiliary-oracle ambiguity/);
  assert.match(english, /recursively non-overlapping Round 13/);
  assert.match(chinese, /没有通过冻结的绝对门槛/);
  assert.match(chinese, /不能证明 Agent 正确率/);
  assert.match(chinese, /第 13 轮/);
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}
