const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const evidence = (...parts) => path.join(projectRoot, "docs", "research", "evidence", ...parts);
const baselinePath = evidence("held-out-cross-repository-routing-0.4-alpha-round-7.json");
const resultPath = evidence("disclosed-routing-round-7-after-task-morphology-repair-0.4-alpha.json");
const harnessPath = path.join(projectRoot, "scripts", "verify-disclosed-routing-round-7-after-task-morphology-repair.cjs");
const englishReportPath = path.join(projectRoot, "docs", "research", "DISCLOSED_ROUND_7_TASK_MORPHOLOGY_REGRESSION_0_4_ALPHA.md");
const chineseReportPath = path.join(projectRoot, "docs", "zh-CN", "DISCLOSED_ROUND_7_TASK_MORPHOLOGY_REGRESSION_0_4_ALPHA.md");

test("preserves the failed disclosed morphology result and original held-out evidence", () => {
  assert.equal(sha256(baselinePath), "C53C9186853F1661158212604804261C8394781454A7C7B7DF15811D4E42D7B9");
  assert.equal(sha256(resultPath), "9779EBEC4A235008DF42B915073B87E93079CF8168B7FAFCA2D42C9CE439BF71");
  assert.equal(sha256(harnessPath), "1BF39F8CDDE361CF75150B798B812EB7600561EAB6679CB51513656D6ED21207");

  const baseline = readJson(baselinePath);
  const result = readJson(resultPath);
  assert.equal(baseline.heldOutAgainstCandidate, true);
  assert.equal(result.heldOutAgainstCandidate, false);
  assert.equal(result.evidenceClass, "seen-development-regression");
  assert.equal(result.status, "failed");
  assert.equal(result.aggregate.completedTrials, 16);
  assert.equal(result.aggregate.taskTypeMatchedTargets, 8);
  assert.equal(result.aggregate.passedTargets, 2);
  assert.equal(result.aggregate.macroChangedFileCoverage, 0.557);
  assert.equal(result.aggregate.macroRouteFocus, 0.48);
  assert.equal(result.aggregate.macroRoutePrecision, 0.481);
  assert.equal(result.aggregate.overconfidentTrials, 4);
});

test("shows classification-only improvement with identical routes", () => {
  const baseline = readJson(baselinePath);
  const result = readJson(resultPath);

  assert.equal(baseline.aggregate.taskTypeMatchedTargets, 6);
  for (const target of result.targets) {
    const original = baseline.targets.find((candidate) => candidate.name === target.name);
    assert.ok(original, target.name);
    assert.deepEqual(target.trials[0].routeFiles, original.trials[0].routeFiles, target.name);
    assert.deepEqual(target.trials[1].routeFiles, original.trials[1].routeFiles, target.name);
  }
  assert.equal(result.targets.find((target) => target.name === "execa").trials[0].taskType, "bugfix");
  assert.equal(result.targets.find((target) => target.name === "thiserror").trials[0].taskType, "bugfix");
});

test("keeps both reports explicit about the negative routing result", () => {
  const english = readFileSync(englishReportPath, "utf8");
  const chinese = readFileSync(chineseReportPath, "utf8");
  assert.match(english, /\*\*Failed\.\*\*/);
  assert.match(english, /did not change any route/);
  assert.match(english, /does not show that Vertex Palace saves Tokens or time/);
  assert.match(chinese, /\*\*失败。\*\*/);
  assert.match(chinese, /没有改变任何路线/);
  assert.match(chinese, /不能证明 Vertex Palace 节省 Token 或时间/);
});

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function sha256(filePath) {
  return createHash("sha256")
    .update(readFileSync(filePath))
    .digest("hex")
    .toUpperCase();
}
