const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const evidenceRoot = path.join(projectRoot, "docs", "research", "evidence");
const successfulEvidence = readJson(
  path.join(evidenceRoot, "disclosed-cross-repository-routing-0.4-alpha-round-3-regression.json")
);
const timeoutEvidence = readJson(
  path.join(evidenceRoot, "disclosed-cross-repository-routing-0.4-alpha-round-3-regression-attempt-1-timeout.json")
);

test("preserves the complete disclosed Round 3 regression result", () => {
  assert.equal(successfulEvidence.status, "passed");
  assert.equal(successfulEvidence.evidenceClass, "disclosed-development-regression");
  assert.match(successfulEvidence.claimBoundary, /not held-out evidence/);
  assert.match(successfulEvidence.claimBoundary, /cannot support generalization/);
  assert.match(successfulEvidence.claimBoundary, /Agent Token/);
  assert.match(successfulEvidence.claimBoundary, /wall-time/);
  assert.equal(
    successfulEvidence.candidate.productCommit,
    "efd53274e42fb8123745f2b8bb09a24e4fa384b7"
  );
  assert.deepEqual(successfulEvidence.aggregate, {
    targets: 8,
    completedTargets: 8,
    passedTargets: 8,
    failedTargets: 0,
    environmentFailedTargets: 0,
    completedTrials: 16,
    passedTrials: 16,
    taskTypeMatches: 16,
    deterministicTargets: 8,
    oracleFileTotal: 16,
    routeFileTotal: 16,
    macroChangedFileCoverage: 1,
    macroRouteFocus: 1,
    macroRoutePrecision: 1,
    minimumRouteFocus: 1,
    maximumPackTokens: 4844,
    medianElapsedMs: 1607.5
  });

  for (const target of successfulEvidence.targets) {
    assert.equal(target.status, "passed", target.name);
    assert.equal(target.deterministicRoutes, true, target.name);
    assert.equal(target.trials.length, 2, target.name);
    for (const trial of target.trials) {
      assert.equal(trial.status, "passed", `${target.name} trial ${trial.trial}`);
      assert.equal(trial.taskType, target.expectedTaskType, target.name);
      assert.deepEqual(
        [...trial.routeFiles].sort(),
        [...target.changedFiles].sort(),
        target.name
      );
      assert.equal(trial.changedFileCoverage, 1, target.name);
      assert.equal(trial.routeFocus, 1, target.name);
      assert.equal(trial.routePrecision, 1, target.name);
      assert.notEqual(trial.calibration.status, "overconfident", target.name);
      assert.deepEqual(
        trial.executionAttempts.map(({ status, errorCode }) => ({ status, errorCode })),
        [{ status: "completed", errorCode: null }],
        target.name
      );
    }
  }
});

test("retains the incomplete timeout attempt without rewriting its label", () => {
  assert.equal(timeoutEvidence.status, "failed");
  assert.equal(timeoutEvidence.aggregate.completedTargets, 7);
  assert.equal(timeoutEvidence.aggregate.completedTrials, 14);
  const pydantic = timeoutEvidence.targets.find((target) => target.name === "pydantic");
  assert(pydantic);
  assert.equal(pydantic.status, "product-or-protocol-failed");
  assert.equal(pydantic.trials.length, 0);
  assert.match(pydantic.failures.join("\n"), /ETIMEDOUT/);
});

test("keeps the harness create-only and limits retries to transient execution failures", () => {
  const source = readFileSync(
    path.join(projectRoot, "scripts", "verify-disclosed-routing-round-3.cjs"),
    "utf8"
  );
  assert.match(source, /flag:\s*"wx"/);
  assert.match(source, /new Set\(\["EAGAIN", "ENOMEM", "ETIMEDOUT"\]\)/);
  assert.match(source, /executionAttemptsPerCommand = 3/);
  assert.match(source, /if \(!transient \|\| attempt === executionAttemptsPerCommand\)/);
});

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}
