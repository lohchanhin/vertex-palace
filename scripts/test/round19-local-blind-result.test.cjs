const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const evidenceRoot = path.join(root, "docs/research/evidence");
const resultPath = path.join(evidenceRoot, "local-blind-routing-validation-0.4-alpha-round-19-attempt-2.json");

test("Round 19 locks the corrected completed result and prior invalid attempt", async () => {
  const [resultBytes, freezeBytes, attempt1Bytes, failureRecordBytes] = await Promise.all([
    readFile(resultPath),
    readFile(path.join(evidenceRoot, "local-blind-routing-validation-freeze-attempt-2-0.4-alpha-round-19.json")),
    readFile(path.join(evidenceRoot, "local-blind-routing-validation-0.4-alpha-round-19-attempt-1.json")),
    readFile(path.join(evidenceRoot, "local-blind-routing-validation-attempt-1-failure-record-0.4-alpha-round-19.json"))
  ]);
  assert.equal(sha256(resultBytes), "84A37CFE029977CF22594A66DA2F9769F4703AE641FD43647C76AA8469EB383B");
  assert.equal(sha256(freezeBytes), "B29CB4A4575CDE8D0DCDBDC76AA64F38370752E0B7002AA03DBF3744B7C46375");
  assert.equal(sha256(attempt1Bytes), "FE60BA76CF77C79CC6BE54F3213237B8008D1180A1A0056BE784CE8064344560");
  assert.equal(sha256(failureRecordBytes), "172923D47C0315B8CA298C77AF84F0CC7B774FB85BA300471E74D68916436DEC");
});

test("Round 19 completed cleanly but failed the candidate absolute gate", async () => {
  const result = JSON.parse(await readFile(resultPath, "utf8"));
  assert.equal(result.status, "completed");
  assert.deepEqual(result.validityFailures, []);
  assert.equal(result.candidateGateStatus, "failed");
  assert.equal(result.advancementStatus, "not-eligible-for-agent-protocol");
  assert.equal(result.comparison.completedPairedTargets, 8);
  for (const condition of [result.aggregate.baseline, result.aggregate.candidate]) {
    assert.equal(condition.environmentOrSetupFailures, 0);
    assert.equal(condition.harnessContractFailures, 0);
    assert.equal(condition.completedTrials, 16);
    assert.equal(condition.deterministicTargets, 8);
    assert.equal(condition.unsafeEnforcedStopTrials, 0);
    assert.equal(condition.evaluationContextRouteDisagreementTrials, 0);
    assert.equal(condition.trackedWorktreeModifiedTargets, 0);
  }
});

test("Round 19 locks the aggregate and target failure pattern", async () => {
  const result = JSON.parse(await readFile(resultPath, "utf8"));
  const baseline = result.aggregate.baseline;
  const candidate = result.aggregate.candidate;
  assert.equal(baseline.targetMacroChangedFileCoverage, 0.646);
  assert.equal(candidate.targetMacroChangedFileCoverage, 0.667);
  assert.equal(baseline.targetMacroRouteFocus, 0.46);
  assert.equal(candidate.targetMacroRouteFocus, 0.484);
  assert.equal(candidate.coreSurfaceCompleteTargets, 4);
  assert.equal(candidate.auxiliarySurfaceCompleteTargets, 0);
  assert.equal(candidate.calibrationMeanAbsoluteError, 0.44);
  assert.equal(candidate.overconfidentTrials, 2);
  assert.equal(candidate.unsafeNarrowModeTrials, 0);
  assert.equal(candidate.contextEstimatedTokensMean, 2779.125);
  assert.equal(candidate.metricDisagreementTrials, 0);
  assert.equal(result.comparison.aggregateDelta.changedFileCoverage, 0.021);
  assert.equal(result.comparison.aggregateDelta.routeFocus, 0.024);
  assert.equal(result.comparison.aggregateDelta.contextEstimatedTokensMean, 703.75);

  const targets = Object.fromEntries(result.comparison.targetPairs.map((pair) => [pair.target, pair.candidate]));
  assert.equal(targets.cors.changedFileCoverage, 0.333);
  assert.equal(targets.hoek.changedFileCoverage, 0);
  assert.equal(targets["jaraco-path"].routeFocus, 0.25);
  assert.equal(targets.iniconfig.routeFocus, 1);
  assert.equal(targets.pretty.routeFocus, 1);
  assert.equal(targets.groupcache.changedFileCoverage, 0.5);
  assert.equal(targets.semver.routeFocus, 0.375);
  assert.equal(targets["cc-rs"].changedFileCoverage, 0.5);
});

test("Round 19 reports preserve static-only, negative-gate, and competition boundaries", async () => {
  const [english, chinese] = await Promise.all([
    readFile(path.join(root, "docs/research/LOCAL_BLIND_ROUTING_ROUND_19_RESULT_0_4_ALPHA.md"), "utf8"),
    readFile(path.join(root, "docs/zh-CN/LOCAL_BLIND_ROUTING_ROUND_19_RESULT_0_4_ALPHA.md"), "utf8")
  ]);
  assert.match(english, /did \*\*not\*\* pass the frozen absolute gate/i);
  assert.match(english, /does not establish Agent correctness/i);
  assert.match(english, /not a pristine first observation/i);
  assert.match(english, /No public Git, npm, Devpost, or video update/i);
  assert.match(chinese, /没有通过.*绝对门槛/);
  assert.match(chinese, /不能证明 Agent 正确率/);
  assert.match(chinese, /不是全新的第一次观察/);
  assert.match(chinese, /不能公开更新 Git、npm、Devpost 或影片/);
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}
