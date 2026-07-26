const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const analyzerPath = path.join(projectRoot, "scripts", "analyze-round-8-confidence-calibration.cjs");
const completionPath = path.join(projectRoot, "docs", "research", "evidence", "disclosed-round-8-sqlalchemy-timeout-completion-0.4-alpha.json");
const completionSha256 = "97EAA94336880CF6309A565E06DA7C9B5E3E33203709259061F5589598DA475F";

test("locks the completed SQLAlchemy observation before combined analysis", () => {
  const bytes = readFileSync(completionPath);
  const result = JSON.parse(bytes.toString("utf8"));
  assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), completionSha256);
  assert.equal(result.status, "completed");
  assert.deepEqual(result.validityFailures, []);
  assert.equal(result.aggregate.baseline.completedTrials, 2);
  assert.equal(result.aggregate.candidate.completedTrials, 2);
  assert.equal(result.aggregate.baseline.environmentOrSetupFailures, 0);
  assert.equal(result.aggregate.candidate.environmentOrSetupFailures, 0);
  assert.equal(result.comparison.completedPairedTargets, 1);
  assert.equal(result.comparison.routeChangedTargets, 0);
  assert.equal(result.aggregate.baseline.targetMacroChangedFileCoverage, 0.33);
  assert.equal(result.aggregate.candidate.targetMacroChangedFileCoverage, 0.33);
  assert.equal(result.comparison.calibrationFinding, "no-difference");
  for (const conditionId of ["candidate", "baseline"]) {
    const condition = result.targets[0].conditions[conditionId];
    assert.equal(condition.freshIndexAttempts.length, 1);
    assert.equal(condition.freshIndexAttempts[0].status, "completed");
    assert.ok(condition.freshIndexAttempts[0].elapsedMs > 600_000);
  }
});

test("freezes a mechanical non-overlapping eight-target combination", () => {
  const source = readFileSync(analyzerPath, "utf8");
  assert.match(source, /priorResultCommit = "9eb29b4cdb639ccbb8db11df070fedb6498c49e6"/);
  assert.match(source, /completionResultCommit = "22f022239716c1402b3fc59fc9686fef787e64f3"/);
  assert.match(source, /completionResultSha256 = "97EAA94336880CF6309A565E06DA7C9B5E3E33203709259061F5589598DA475F"/);
  assert.match(source, /const targetCount = 8/);
  assert.match(source, /const repetitions = 2/);
  assert.match(source, /completedPriorNames\.has\(completionTarget\.name\), false/);
  assert.match(source, /Use repetition 1 for target-level inference/);
  assert.match(source, /hardConfidenceScoreCap: "revert"/);
  assert.match(source, /safetyIntent: "retain-with-separate-evidence-sufficiency-and-narrow-mode-authorization"/);
  assert.match(source, /flag: "wx"/);
  assert.doesNotMatch(source, /Promise\.all/);
});
