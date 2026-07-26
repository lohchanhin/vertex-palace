const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const evidence = (...parts) => path.join(projectRoot, "docs", "research", "evidence", ...parts);
const baselinePath = evidence("disclosed-routing-round-7-after-constrained-module-pair-repair-0.4-alpha.json");
const resultPath = evidence("disclosed-routing-round-7-after-independent-anchor-confidence-cap-0.4-alpha.json");
const harnessPath = path.join(projectRoot, "scripts", "verify-disclosed-routing-round-7-after-independent-anchor-confidence-cap.cjs");
const englishReportPath = path.join(projectRoot, "docs", "research", "DISCLOSED_ROUND_7_CONFIDENCE_CALIBRATION_0_4_ALPHA.md");
const chineseReportPath = path.join(projectRoot, "docs", "zh-CN", "DISCLOSED_ROUND_7_CONFIDENCE_CALIBRATION_0_4_ALPHA.md");

test("locks the disclosed Round 7 confidence evidence", () => {
  assert.equal(sha256(baselinePath), "7FBD82D10A99C65D4817349AD5E91C7A7237A712DADECD80E5707DBCA0386252");
  assert.equal(sha256(resultPath), "8258DF9B52703FE497CA5A0EDBD14A346F337E7FCF989EC31DFAB85BFA2CB744");
  assert.equal(sha256(harnessPath), "226A5D39CBBF2E3703C51B305352F6C6145E647DD08952F9F38EF7384CBC5BFC");
});

test("changes calibration without changing any ordered route", () => {
  const baseline = readJson(baselinePath);
  const result = readJson(resultPath);

  assert.equal(result.status, "failed");
  assert.equal(result.heldOutAgainstCandidate, false);
  assert.equal(result.evidenceClass, "seen-development-regression");
  assert.equal(result.aggregate.completedTrials, 16);
  assert.equal(result.aggregate.passedTargets, baseline.aggregate.passedTargets);
  assert.equal(result.aggregate.macroChangedFileCoverage, baseline.aggregate.macroChangedFileCoverage);
  assert.equal(result.aggregate.macroRouteFocus, baseline.aggregate.macroRouteFocus);
  assert.equal(result.aggregate.macroRoutePrecision, baseline.aggregate.macroRoutePrecision);
  assert.equal(result.aggregate.routeFileTotal, baseline.aggregate.routeFileTotal);
  assert.equal(result.aggregate.overconfidentTrials, 0);
  assert.equal(baseline.aggregate.overconfidentTrials, 4);
  assert.equal(result.aggregate.environmentOrSetupFailures, 0);
  assert.equal(result.aggregate.harnessContractFailures, 0);

  for (const current of result.targets) {
    const previous = target(baseline, current.name);
    assert.deepEqual(
      current.trials.map((trial) => trial.routeFiles),
      previous.trials.map((trial) => trial.routeFiles),
      current.name
    );
  }

  assert.deepEqual(confidences(baseline, "execa"), [0.75, 0.75]);
  assert.deepEqual(confidences(result, "execa"), [0.15, 0.15]);
  assert.deepEqual(confidences(baseline, "mio"), [0.86, 0.86]);
  assert.deepEqual(confidences(result, "mio"), [0.15, 0.15]);
  for (const name of ["jinja", "go-multierror", "thiserror", "node-glob", "httpcore", "httprouter"]) {
    assert.deepEqual(confidences(result, name), confidences(baseline, name), name);
  }
});

test("records the safety cost without making an efficiency claim", () => {
  const baseline = readJson(baselinePath);
  const result = readJson(resultPath);
  const beforeMio = target(baseline, "mio").trials[0];
  const afterMio = target(result, "mio").trials[0];
  assert.equal(beforeMio.mode, "route-lite");
  assert.equal(afterMio.mode, "full-palace");
  assert.ok(afterMio.contextEstimatedTokens > beforeMio.contextEstimatedTokens);

  const english = readFileSync(englishReportPath, "utf8");
  const chinese = readFileSync(chineseReportPath, "utf8");
  assert.match(english, /\*\*Calibration repair succeeded; the overall routing gate still failed\.\*\*/);
  assert.match(english, /does not demonstrate an efficiency gain/);
  assert.match(chinese, /\*\*置信度校准修复成功，但整体路由门槛仍失败。\*\*/);
  assert.match(chinese, /没有证明效率提升/);
});

function confidences(result, name) {
  return target(result, name).trials.map((trial) => trial.routeConfidence);
}

function target(result, name) {
  const value = result.targets.find((entry) => entry.name === name);
  assert.ok(value, name);
  return value;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function sha256(filePath) {
  return createHash("sha256")
    .update(readFileSync(filePath))
    .digest("hex")
    .toUpperCase();
}
