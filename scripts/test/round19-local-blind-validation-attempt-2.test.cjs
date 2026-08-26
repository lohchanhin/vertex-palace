const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const attempt1 = require("../verify-local-blind-routing-round-19.cjs");
const attempt2 = require("../verify-local-blind-routing-round-19-attempt-2.cjs");

const root = path.resolve(__dirname, "../..");
const evidenceRoot = path.join(root, "docs/research/evidence");

test("Round 19 attempt 2 matches the selector's multiline commit-message contract", () => {
  const message = [
    "fix test and code to follow the common convention:",
    "\"lineno\" usually is a linenumber that starts with \"0\"",
    "",
    "Longer explanation"
  ].join("\n");
  assert.equal(
    attempt2.firstNonemptyCommitMessageLine(message),
    "fix test and code to follow the common convention:"
  );
  assert.equal(attempt2.firstNonemptyCommitMessageLine("\n  fix: one line\n"), "fix: one line");
});

test("Round 19 attempt 2 separates environment and harness materialization failures", () => {
  assert.equal(
    attempt2.materializationFailureCategory(new Error("Could not resolve host github.com")),
    "environment-or-setup"
  );
  assert.equal(
    attempt2.materializationFailureCategory(new assert.AssertionError({ actual: "a", expected: "b" })),
    "harness-contract"
  );
});

test("Round 19 attempt 2 leaves the semantic absolute gate unchanged", () => {
  const passing = {
    conditionRecordedTargets: 8,
    completedTrials: 16,
    taskTypeMatchedTargets: 8,
    coreSurfaceCompleteTargets: 8,
    auxiliarySurfaceTargetCount: 1,
    auxiliarySurfaceCompleteTargets: 1,
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
  assert.deepEqual(attempt2.conditionGateFailures(passing), attempt1.conditionGateFailures(passing));
  assert.deepEqual(
    attempt2.conditionGateFailures({ ...passing, targetMacroRouteFocus: 0.69 }),
    attempt1.conditionGateFailures({ ...passing, targetMacroRouteFocus: 0.69 })
  );
});

test("Round 19 attempt-2 freeze binds the partial attempt and unchanged candidate", async () => {
  const [freezeBytes, attempt1FreezeBytes, attempt1ResultBytes, failureRecordBytes, candidateFreezeBytes] = await Promise.all([
    readFile(path.join(evidenceRoot, "local-blind-routing-validation-freeze-attempt-2-0.4-alpha-round-19.json")),
    readFile(path.join(evidenceRoot, "local-blind-routing-validation-freeze-0.4-alpha-round-19.json")),
    readFile(path.join(evidenceRoot, "local-blind-routing-validation-0.4-alpha-round-19-attempt-1.json")),
    readFile(path.join(evidenceRoot, "local-blind-routing-validation-attempt-1-failure-record-0.4-alpha-round-19.json")),
    readFile(path.join(evidenceRoot, "local-blind-candidate-freeze-0.4-alpha-round-19.json"))
  ]);
  const freeze = JSON.parse(freezeBytes.toString("utf8"));

  assert.equal(freeze.status, "locally-frozen");
  assert.equal(freeze.freezeAttempt, 2);
  assert.equal(freeze.protocol.noPalaceResultObservedBeforeValidatorFreeze, false);
  assert.equal(freeze.protocol.palaceCallsOnSelectedTasksBeforeFreeze, 98);
  assert.equal(freeze.protocol.pairedTargetsObservedBeforeFreeze, 7);
  assert.equal(freeze.protocol.productTuningBeforeFreeze, false);
  assert.equal(freeze.protocol.harnessCorrectionOnly, true);
  assert.equal(freeze.amendment.attempt1FreezeSha256, sha256(attempt1FreezeBytes));
  assert.equal(freeze.amendment.attempt1ResultSha256, sha256(attempt1ResultBytes));
  assert.equal(freeze.amendment.failureRecordSha256, sha256(failureRecordBytes));
  assert.equal(freeze.inputs.candidateFreezeSha256, sha256(candidateFreezeBytes));
  assert.equal(freeze.amendment.productChange, false);
  assert.equal(freeze.amendment.targetOrOracleChange, false);
});

test("Round 19 attempt 2 remains create-only, static-only, and candid about prior exposure", async () => {
  const [validator, english, chinese] = await Promise.all([
    readFile(path.join(root, "scripts/verify-local-blind-routing-round-19-attempt-2.cjs"), "utf8"),
    readFile(path.join(root, "docs/research/LOCAL_BLIND_ROUTING_VALIDATION_PROTOCOL_0_4_ALPHA_ROUND_19_ATTEMPT_2_AMENDMENT.md"), "utf8"),
    readFile(path.join(root, "docs/zh-CN/LOCAL_BLIND_ROUTING_VALIDATION_PROTOCOL_0_4_ALPHA_ROUND_19_ATTEMPT_2_AMENDMENT.md"), "utf8")
  ]);
  assert.match(validator, /flag:\s*"wx"/);
  assert.match(validator, /--format=%B/);
  assert.doesNotMatch(validator, /--filter=blob:none/);
  assert.doesNotMatch(validator, /run\(\s*["']codex(?:\.cmd)?["']/i);
  assert.match(english, /not a pristine first observation/i);
  assert.match(english, /No product code was tuned/i);
  assert.match(chinese, /不是全新的第一次观察/);
  assert.match(chinese, /没有调整产品代码/);
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}
