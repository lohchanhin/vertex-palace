const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const resultPath = path.join(projectRoot, "docs", "research", "evidence", "disclosed-round-8-after-condition-repository-repair-0.4-alpha.json");
const resultSha256 = "E6216E3F6F43BFC3CD42A2B5E640777349B1977250BB43A159AC5155FFF3A23D";

test("preserves the invalid disclosed repair result and its one shared timeout", () => {
  const bytes = readFileSync(resultPath);
  const result = JSON.parse(bytes.toString("utf8"));
  assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), resultSha256);
  assert.equal(result.status, "invalid");
  assert.equal(result.originalInvalidResult.preservedWithoutModification, true);
  assert.equal(result.aggregate.baseline.completedTrials, 14);
  assert.equal(result.aggregate.candidate.completedTrials, 14);
  assert.equal(result.aggregate.baseline.environmentOrSetupFailures, 1);
  assert.equal(result.aggregate.candidate.environmentOrSetupFailures, 1);
  const timedOutTargets = result.targets.filter((target) =>
    target.conditions.baseline.failureCategory === "environment-or-setup"
      || target.conditions.candidate.failureCategory === "environment-or-setup"
  );
  assert.deepEqual(timedOutTargets.map((target) => target.name), ["sqlalchemy"]);
  for (const condition of [
    timedOutTargets[0].conditions.baseline,
    timedOutTargets[0].conditions.candidate
  ]) {
    assert.equal(condition.trials.length, 0);
    assert.equal(condition.freshIndexAttempts.length, 2);
    assert.ok(condition.freshIndexAttempts.every((attempt) => attempt.errorCode === "ETIMEDOUT"));
  }
});

test("records identical seven-target routes but worse candidate calibration", () => {
  const result = JSON.parse(readFileSync(resultPath, "utf8"));
  assert.equal(result.comparison.completedPairedTargets, 7);
  assert.equal(result.comparison.completedPairedTrials, 14);
  assert.equal(result.comparison.calibrationFinding, "incomplete");
  assert.equal(result.comparison.routeChangedTargets, 0);
  assert.equal(result.comparison.modeChangedTargets, 2);
  assert.equal(result.aggregate.baseline.targetMacroChangedFileCoverage, 0.774);
  assert.equal(result.aggregate.candidate.targetMacroChangedFileCoverage, 0.774);
  assert.equal(result.aggregate.baseline.targetMacroRouteFocus, 0.643);
  assert.equal(result.aggregate.candidate.targetMacroRouteFocus, 0.643);
  assert.equal(result.comparison.baselineUnderconfidentTargets, 4);
  assert.equal(result.comparison.candidateUnderconfidentTargets, 5);
  assert.equal(result.comparison.baselineCalibrationMeanAbsoluteError, 0.314);
  assert.equal(result.comparison.candidateCalibrationMeanAbsoluteError, 0.521);
  assert.equal(result.comparison.baselineUnsafeNarrowTargets, 1);
  assert.equal(result.comparison.candidateUnsafeNarrowTargets, 0);
  assert.deepEqual(result.comparison.modeShifts, { "route-lite->full-palace": 2 });
  assert.equal(result.comparison.medianContextEstimatedTokenDelta, 0);
  assert.equal(result.comparison.meanContextEstimatedTokenDelta, 56.571);
  assert.equal(result.candidateGateStatus, "failed");
});
