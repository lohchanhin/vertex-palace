const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const analyzerPath = path.join(projectRoot, "scripts", "analyze-round-8-confidence-calibration.cjs");
const completionPath = path.join(projectRoot, "docs", "research", "evidence", "disclosed-round-8-sqlalchemy-timeout-completion-0.4-alpha.json");
const combinedResultPath = path.join(projectRoot, "docs", "research", "evidence", "round-8-confidence-calibration-combined-analysis-0.4-alpha.json");
const englishReportPath = path.join(projectRoot, "docs", "research", "ROUND_8_CONFIDENCE_CALIBRATION_RESULT_0_4_ALPHA.md");
const chineseReportPath = path.join(projectRoot, "docs", "zh-CN", "ROUND_8_CONFIDENCE_CALIBRATION_RESULT_0_4_ALPHA.md");
const completionSha256 = "97EAA94336880CF6309A565E06DA7C9B5E3E33203709259061F5589598DA475F";
const combinedResultSha256 = "3653B738A46690BD51B021D0469D5B3B6F9B1A3E6C23A7EF89A7E430F81442A5";

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

test("locks the eight-target regression verdict and safety trade-off", () => {
  const bytes = readFileSync(combinedResultPath);
  const result = JSON.parse(bytes.toString("utf8"));
  assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), combinedResultSha256);
  assert.equal(result.status, "completed");
  assert.equal(result.comparison.completedPairedTargets, 8);
  assert.equal(result.comparison.completedPairedTrials, 16);
  assert.equal(result.comparison.routeChangedTargets, 0);
  assert.equal(result.aggregate.baseline.targetMacroChangedFileCoverage, 0.719);
  assert.equal(result.aggregate.candidate.targetMacroChangedFileCoverage, 0.719);
  assert.equal(result.aggregate.baseline.targetMacroRouteFocus, 0.625);
  assert.equal(result.aggregate.candidate.targetMacroRouteFocus, 0.625);
  assert.equal(result.comparison.baselineCalibrationMeanAbsoluteError, 0.284);
  assert.equal(result.comparison.candidateCalibrationMeanAbsoluteError, 0.465);
  assert.equal(result.comparison.baselineUnderconfidentTargets, 4);
  assert.equal(result.comparison.candidateUnderconfidentTargets, 5);
  assert.equal(result.comparison.baselineUnsafeNarrowTargets, 1);
  assert.equal(result.comparison.candidateUnsafeNarrowTargets, 0);
  assert.equal(result.comparison.contextEstimatedTokenDeltaTotal, 792);
  assert.equal(result.comparison.calibrationFinding, "regression");
  assert.equal(result.decision.hardConfidenceScoreCap, "revert");
  assert.equal(result.decision.efficiencyClaimAllowed, false);
});

test("keeps the English and Simplified Chinese Round 8 result reports aligned", () => {
  const english = readFileSync(englishReportPath, "utf8");
  const chinese = readFileSync(chineseReportPath, "utf8");
  for (const report of [english, chinese]) {
    assert.match(report, new RegExp(combinedResultSha256));
    assert.match(report, /0\.719/);
    assert.match(report, /0\.625/);
    assert.match(report, /0\.284/);
    assert.match(report, /0\.465/);
    assert.match(report, /792/);
    assert.match(report, /0\.90/);
    assert.match(report, /0\.75/);
    assert.match(report, /SQLAlchemy/);
  }
  assert.match(english, /must not be retained as a score rule/);
  assert.match(chinese, /不能继续作为分数规则/);
  assert.match(english, /does not establish Agent\s+correctness/);
  assert.match(chinese, /不能证明 Agent/);
});
