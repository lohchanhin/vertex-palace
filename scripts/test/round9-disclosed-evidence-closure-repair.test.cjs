const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const {
  independentCalibration,
  stripLocation
} = require("../verify-disclosed-routing-round-9-after-evidence-closure-repair.cjs");

const projectRoot = path.resolve(__dirname, "../..");
const evidenceRoot = path.join(projectRoot, "docs", "research", "evidence");
const formalPath = path.join(evidenceRoot, "local-blind-routing-validation-0.4-alpha-round-9-attempt-2.json");
const invalidAttemptPath = path.join(evidenceRoot, "disclosed-routing-round-9-after-evidence-closure-repair-attempt-1-invalid-harness-0.4-alpha.json");
const attempt2Path = path.join(evidenceRoot, "disclosed-routing-round-9-after-evidence-closure-repair-attempt-2-0.4-alpha.json");
const attempt3Path = path.join(evidenceRoot, "disclosed-routing-round-9-after-evidence-closure-repair-attempt-3-0.4-alpha.json");
const scriptPath = path.join(projectRoot, "scripts", "verify-disclosed-routing-round-9-after-evidence-closure-repair.cjs");

test("preserves the failed formal Round 9 observation and the complete disclosed repair chain", async () => {
  const [formal, invalidAttempt, attempt2, attempt3] = await Promise.all([
    readJson(formalPath),
    readJson(invalidAttemptPath),
    readJson(attempt2Path),
    readJson(attempt3Path)
  ]);

  assert.equal(formal.status, "completed");
  assert.equal(formal.candidateGateStatus, "failed");
  assert.equal(formal.aggregate.candidate.passedTargets, 3);
  assert.equal(formal.aggregate.candidate.coreSurfaceCompleteTargets, 6);
  assert.equal(formal.aggregate.candidate.targetMacroChangedFileCoverage, 0.792);
  assert.equal(formal.aggregate.candidate.targetMacroRouteFocus, 0.499);
  assert.equal(formal.aggregate.candidate.unsafeNarrowModeTrials, 2);

  assert.equal(invalidAttempt.gateStatus, "failed");
  assert.equal(invalidAttempt.aggregate.evaluationContextRouteDisagreementTrials, 14);
  assert.equal(attempt2.status, "completed");
  assert.equal(attempt2.gateStatus, "passed");
  assert.equal(attempt2.aggregate.targetMacroRouteFocus, 0.808);
  assert.equal(attempt3.status, "completed");
  assert.equal(attempt3.gateStatus, "passed");
  assert.equal(attempt3.heldOutAgainstCandidate, false);
  assert.match(attempt3.claimBoundary, /not held out/i);
  assert.match(attempt3.claimBoundary, /fresh Round 10/i);

  assert.equal(attempt3.originalFormalEvidence.sha256, await sha256(formalPath));
  assert.equal(attempt3.priorInvalidAttempt.sha256, await sha256(invalidAttemptPath));
  assert.equal(attempt3.previousDisclosedAttempt.sha256, await sha256(attempt2Path));
  assert.equal(attempt3.originalFormalEvidence.preservedWithoutModification, true);
  assert.equal(attempt3.priorInvalidAttempt.preservedWithoutModification, true);
  assert.equal(attempt3.previousDisclosedAttempt.preservedWithoutModification, true);
});

test("locks the disclosed Attempt 3 safety, coverage, and focus result", async () => {
  const result = await readJson(attempt3Path);
  const aggregate = result.aggregate;

  assert.equal(aggregate.targetCount, 8);
  assert.equal(aggregate.completedTargets, 8);
  assert.equal(aggregate.passedTargets, 8);
  assert.equal(aggregate.failedTargets, 0);
  assert.equal(aggregate.executionErrorTargets, 0);
  assert.equal(aggregate.deterministicTargets, 8);
  assert.equal(aggregate.taskTypeMatchedTargets, 8);
  assert.equal(aggregate.coreSurfaceCompleteTargets, 8);
  assert.equal(aggregate.targetMacroChangedFileCoverage, 0.927);
  assert.equal(aggregate.targetMacroCoreSurfaceCoverage, 1);
  assert.equal(aggregate.targetMacroRouteFocus, 0.958);
  assert.equal(aggregate.minimumTargetRouteFocus, 0.667);
  assert.equal(aggregate.overconfidentAgainstCoreTrials, 0);
  assert.equal(aggregate.unsafeNarrowAgainstCoreTrials, 0);
  assert.equal(aggregate.unsafeEnforcedStopAgainstCoreTrials, 0);
  assert.equal(aggregate.metricDisagreementTrials, 0);
  assert.equal(aggregate.evaluationContextRouteDisagreementTrials, 0);
  assert.equal(aggregate.trackedTargetWorktreeChanges, 0);
  assert.ok(aggregate.maxContextEstimatedTokens <= result.protocol.budget);

  const routes = Object.fromEntries(result.targets.map((target) => [
    target.name,
    target.repairedCandidate.trials[0].routeFiles
  ]));
  assert.deepEqual(routes.fsnotify, ["fsnotify.go", "fsnotify_test.go"]);
  assert.deepEqual(routes.smallvec, ["src/lib.rs", "Cargo.toml", "src/tests.rs"]);
  assert.deepEqual(routes.ramda, ["source/internal/_equals.js", "test/equals.js"]);
  assert.deepEqual(routes.rand, [
    "rand_distr/src/pert.rs",
    "rand_distr/src/lib.rs",
    "rand_distr/tests/value_stability.rs"
  ]);
  assert.deepEqual(routes.pendulum, [
    "src/pendulum/locales/ja/custom.py",
    "tests/formatting/test_formatter.py"
  ]);
});

test("keeps the disclosed harness create-only and treats line ranges as locations", async () => {
  const source = await readFile(scriptPath, "utf8");
  assert.match(source, /flag:\s*"wx"/);
  assert.match(source, /targetTestsExecuted:\s*false/);
  assert.equal(stripLocation("fsnotify_test.go:87-117"), "fsnotify_test.go");
  assert.equal(stripLocation("src/lib.rs:300"), "src/lib.rs");
  assert.deepEqual(independentCalibration(0.8, 0.6), {
    confidence: 0.8,
    coverage: 0.6,
    signedError: 0.2,
    absoluteError: 0.2,
    status: "overconfident"
  });
});

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex").toUpperCase();
}
