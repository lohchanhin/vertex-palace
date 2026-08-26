const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const {
  conditionGateFailures,
  conditionOrderForIndex,
  independentCalibration,
  normalizePath
} = require("../verify-local-blind-routing-round-9.cjs");

const root = path.resolve(__dirname, "../..");

test("Round 9 validation uses balanced order and frozen calibration", () => {
  const orders = Array.from({ length: 8 }, (_, index) => conditionOrderForIndex(index));
  assert.equal(orders.filter((order) => order[0] === "baseline").length, 4);
  assert.equal(orders.filter((order) => order[0] === "candidate").length, 4);
  assert.equal(independentCalibration(0.9, 0.5).status, "overconfident");
  assert.equal(independentCalibration(0.2, 0.8).status, "underconfident");
  assert.equal(independentCalibration(0.8, 0.7).status, "well-calibrated");
  assert.equal(normalizePath("SRC\\Router.ts:10-20"), "src/router.ts:10-20");
});

test("Round 9 absolute gate prioritizes coverage and safety over payload", () => {
  const passing = {
    conditionRecordedTargets: 8,
    completedTrials: 16,
    taskTypeMatchedTargets: 8,
    coreSurfaceCompleteTargets: 8,
    auxiliarySurfaceTargetCount: 2,
    auxiliarySurfaceCompleteTargets: 2,
    deterministicTargets: 8,
    targetMacroChangedFileCoverage: 0.9,
    targetMacroRouteFocus: 0.7,
    minimumTargetChangedFileCoverage: 0.5,
    minimumTargetRouteFocus: 0.4,
    overconfidentTrials: 0,
    unsafeNarrowModeTrials: 0,
    unsafeEnforcedStopTrials: 0,
    maxContextEstimatedTokens: 6000,
    selectedExcludedOverlapTrials: 0,
    metricDisagreementTrials: 0,
    evaluationContextRouteDisagreementTrials: 0,
    staleAfterExplicitIndexTargets: 0,
    trackedWorktreeModifiedTargets: 0
  };
  assert.deepEqual(conditionGateFailures(passing), []);
  assert.match(
    conditionGateFailures({ ...passing, targetMacroChangedFileCoverage: 0.89 }).join("\n"),
    /coverage fell below 0\.90/
  );
  assert.match(
    conditionGateFailures({ ...passing, unsafeEnforcedStopTrials: 1 }).join("\n"),
    /incomplete routes enforced stopping/
  );
  assert.match(
    conditionGateFailures({ ...passing, maxContextEstimatedTokens: 6001 }).join("\n"),
    /payload exceeded/
  );
});

test("Round 9 validator is create-only, static-only, and hash bound", async () => {
  const validator = await readFile(path.join(root, "scripts/verify-local-blind-routing-round-9.cjs"), "utf8");
  const english = await readFile(
    path.join(root, "docs/research/LOCAL_BLIND_ROUTING_VALIDATION_PROTOCOL_0_4_ALPHA_ROUND_9.md"),
    "utf8"
  );
  const chinese = await readFile(
    path.join(root, "docs/zh-CN/LOCAL_BLIND_ROUTING_VALIDATION_PROTOCOL_0_4_ALPHA_ROUND_9.md"),
    "utf8"
  );
  const freeze = JSON.parse(await readFile(
    path.join(root, "docs/research/evidence/local-blind-routing-validation-freeze-0.4-alpha-round-9.json"),
    "utf8"
  ));

  assert.match(validator, /flag:\s*"wx"/);
  assert.match(validator, /complete-shallow-history-no-promisor/);
  assert.match(validator, /process\.env\.ComSpec\s*\|\|\s*"cmd\.exe"/);
  assert.match(validator, /\["\/d",\s*"\/s",\s*"\/c"/);
  assert.doesNotMatch(validator, /--filter=blob:none/);
  assert.doesNotMatch(validator, /run\(\s*["']codex(?:\.cmd)?["']/i);
  assert.doesNotMatch(validator, /spawnSync\(\s*["']codex(?:\.cmd)?["']/i);
  assert.match(english, /cannot support claims about Agent correctness/i);
  assert.match(english, /Payload and static timing never rescue/i);
  assert.match(chinese, /不能宣称 Agent 正确率/);
  assert.match(chinese, /不能补救正确性与证据门失败/);
  assert.equal(freeze.status, "locally-frozen");
  assert.equal(freeze.publicPreregistration, false);
  assert.equal(freeze.protocol.noTaskContentOpenedBeforeValidatorFreeze, true);
  assert.equal(freeze.protocol.palaceCallsOnSelectedTasksBeforeFreeze, 0);
  assert.equal(freeze.amendment.preflightAttempt1PalaceCalls, 0);
  assert.equal(freeze.amendment.productOrProtocolMetricsChanged, false);
});

test("Round 9 validation freeze binds the selected manifest without exposing it", async () => {
  const freeze = JSON.parse(await readFile(
    path.join(root, "docs/research/evidence/local-blind-routing-validation-freeze-0.4-alpha-round-9.json"),
    "utf8"
  ));
  const manifestBytes = await readFile(
    path.join(root, "docs/research/evidence/local-blind-routing-target-manifest-0.4-alpha-round-9.json")
  );
  const candidateFreezeBytes = await readFile(
    path.join(root, "docs/research/evidence/local-blind-candidate-freeze-0.4-alpha-round-9.json")
  );
  assert.equal(sha256(manifestBytes), freeze.inputs.targetManifestSha256);
  assert.equal(sha256(candidateFreezeBytes), freeze.inputs.candidateFreezeSha256);
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}
