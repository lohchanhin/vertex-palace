const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const {
  conditionOrderForIndex
} = require("../verify-disclosed-round-8-sqlalchemy-timeout-completion.cjs");

const projectRoot = path.resolve(__dirname, "..", "..");
const priorResultPath = path.join(projectRoot, "docs", "research", "evidence", "disclosed-round-8-after-condition-repository-repair-0.4-alpha.json");
const validatorPath = path.join(projectRoot, "scripts", "verify-disclosed-round-8-sqlalchemy-timeout-completion.cjs");
const englishProtocolPath = path.join(projectRoot, "docs", "research", "DISCLOSED_ROUND_8_SQLALCHEMY_TIMEOUT_COMPLETION_PROTOCOL_0_4_ALPHA.md");
const chineseProtocolPath = path.join(projectRoot, "docs", "zh-CN", "DISCLOSED_ROUND_8_SQLALCHEMY_TIMEOUT_COMPLETION_PROTOCOL_0_4_ALPHA.md");
const priorResultSha256 = "E6216E3F6F43BFC3CD42A2B5E640777349B1977250BB43A159AC5155FFF3A23D";

test("locks the seven completed pairs and the sole shared SQLAlchemy timeout", () => {
  const bytes = readFileSync(priorResultPath);
  const result = JSON.parse(bytes.toString("utf8"));
  assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), priorResultSha256);
  assert.equal(result.status, "invalid");
  assert.equal(result.aggregate.baseline.completedTrials, 14);
  assert.equal(result.aggregate.candidate.completedTrials, 14);
  assert.equal(result.comparison.completedPairedTargets, 7);
  assert.equal(result.comparison.completedPairedTrials, 14);
  assert.equal(result.comparison.routeChangedTargets, 0);
  assert.equal(result.comparison.baselineCalibrationMeanAbsoluteError, 0.314);
  assert.equal(result.comparison.candidateCalibrationMeanAbsoluteError, 0.521);

  const incomplete = result.targets.filter((target) =>
    target.conditions.baseline.failureCategory === "environment-or-setup"
      || target.conditions.candidate.failureCategory === "environment-or-setup"
  );
  assert.deepEqual(incomplete.map((target) => target.name), ["sqlalchemy"]);
  assert.deepEqual(incomplete[0].conditionOrder, ["candidate", "baseline"]);
  for (const condition of [
    incomplete[0].conditions.candidate,
    incomplete[0].conditions.baseline
  ]) {
    assert.equal(condition.trials.length, 0);
    assert.equal(condition.freshIndexAttempts.length, 2);
    assert.ok(condition.freshIndexAttempts.every((attempt) => attempt.errorCode === "ETIMEDOUT"));
  }
});

test("freezes a SQLAlchemy-only candidate-first completion with one 900-second index attempt", () => {
  const source = readFileSync(validatorPath, "utf8");
  assert.match(source, /studyId = "disclosed-round-8-sqlalchemy-timeout-completion-0\.4-alpha"/);
  assert.match(source, /priorResultCommit = "9eb29b4cdb639ccbb8db11df070fedb6498c49e6"/);
  assert.match(source, new RegExp(`priorResultSha256 = "${priorResultSha256}"`));
  assert.match(source, /const manifestTargetCount = 8/);
  assert.match(source, /const targetCount = 1/);
  assert.match(source, /const completionTargetName = "sqlalchemy"/);
  assert.match(source, /const completionManifestIndex = 1/);
  assert.match(source, /const freshIndexAttempts = 1/);
  assert.match(source, /const freshIndexTimeoutMs = 900_000/);
  assert.match(source, /\[\[completionManifestIndex, completionTarget\]\]/);
  assert.match(source, /timeout: freshIndexTimeoutMs/);
  assert.match(source, /balancedDeterministicOrder: false/);
  assert.match(source, /Preserve original manifest index 1: candidate then baseline/);
  assert.match(source, /formalTrialsPerCondition: targetCount \* repetitions/);
  assert.match(source, /totalFormalTrials: targetCount \* repetitions \* conditionIds\.length/);
  assert.match(source, /preservedWithoutModification:\s*true/);
  assert.match(source, /flag:\s*"wx"/);
  assert.doesNotMatch(source, /Promise\.all/);
  assert.deepEqual(conditionOrderForIndex(1), ["candidate", "baseline"]);
});

test("keeps both SQLAlchemy completion protocols aligned with the frozen evidence", () => {
  const english = readFileSync(englishProtocolPath, "utf8");
  const chinese = readFileSync(chineseProtocolPath, "utf8");
  for (const document of [english, chinese]) {
    assert.match(document, /ea3504b770b26bae1ceeb684efe835ad72b0c66e/);
    assert.match(document, /F8779C649DCA4350B4E22FBF3E423047371F74F03F6EFB6E3356C2B81083B733/);
    assert.match(document, /9eb29b4cdb639ccbb8db11df070fedb6498c49e6/);
    assert.match(document, new RegExp(priorResultSha256));
    assert.match(document, /SQLAlchemy/);
    assert.match(document, /14/);
    assert.match(document, /300/);
    assert.match(document, /900/);
    assert.match(document, /0\.15/);
    assert.match(document, /6,000/);
    assert.match(document, /disclosed-round-8-sqlalchemy-timeout-completion-0\.4-alpha\.json/);
  }
  assert.match(english, /candidate, then baseline/);
  assert.match(chinese, /先候选，再基线/);
  assert.match(english, /No completed target may be rerun/);
  assert.match(chinese, /不得重跑任何已经完成的目标/);
});
