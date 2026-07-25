const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const evidenceRoot = path.join(projectRoot, "docs", "research", "evidence");
const previousEvidencePath = path.join(
  evidenceRoot,
  "disclosed-cross-repository-routing-0.4-alpha-round-4-after-exact-causal-repair.json"
);
const finalEvidencePath = path.join(
  evidenceRoot,
  "disclosed-cross-repository-routing-0.4-alpha-round-4-after-commonjs-import-repair.json"
);
const harnessPath = path.join(
  projectRoot,
  "scripts",
  "verify-disclosed-routing-round-4-after-commonjs-import-repair.cjs"
);
const reportPath = path.join(
  projectRoot,
  "docs",
  "research",
  "ROUND_4_COMMONJS_IMPORT_REPAIR_RESULT_0_4_ALPHA.md"
);

test("preserves the passing disclosed Round 4 CommonJS repair result", () => {
  assert.equal(
    sha256(finalEvidencePath),
    "BDD9B8904B1DA23A3A30920C58066D000134F827EDE477EEC262DDE52A26DDEB"
  );
  const result = readJson(finalEvidencePath);

  assert.equal(result.status, "passed");
  assert.equal(result.heldOutAgainstCandidate, false);
  assert.equal(
    result.evidenceClass,
    "disclosed-development-regression-after-held-out-failure"
  );
  assert.equal(result.disclosure.tasksUsedDuringCandidateDevelopment, true);
  assert.match(result.claimBoundary, /not held-out or generalization evidence/);
  assert.match(result.claimBoundary, /cannot support Agent correctness/);
  assert.equal(
    result.candidate.productCommit,
    "f61207688badbe07818470a42441a3a966a8bdf0"
  );
  assert.equal(
    result.candidate.validationHarnessCommit,
    "a759aa0299f68622676a8086349d07c96432f55f"
  );
  assert.equal(result.aggregate.passedTargets, 8);
  assert.equal(result.aggregate.failedTargets, 0);
  assert.equal(result.aggregate.completedTrials, 16);
  assert.equal(result.aggregate.passedTrials, 16);
  assert.equal(result.aggregate.macroChangedFileCoverage, 1);
  assert.equal(result.aggregate.macroRouteFocus, 0.771);
  assert.equal(result.aggregate.macroRoutePrecision, 0.771);
  assert.equal(result.aggregate.minimumTargetRouteFocus, 0.5);
  assert.equal(result.aggregate.overconfidentTrials, 0);
  assert.equal(result.aggregate.environmentOrSetupFailures, 0);
  assert.equal(result.aggregate.harnessContractFailures, 0);
  assert.equal(result.aggregate.productOrContractFailures, 0);
  assert.ok(result.aggregate.maxContextEstimatedTokens <= result.protocol.budget);

  for (const target of result.targets) {
    assert.equal(target.status, "passed", target.name);
    assert.equal(target.trials.length, 2, target.name);
    assert.equal(target.deterministicRoutes, true, target.name);
    assert.deepEqual(target.trials[0].routeFiles, target.trials[1].routeFiles, target.name);
    assert.equal(target.trials[0].changedFileCoverage, 1, target.name);
  }
});

test("records the CommonJS recall and focus trade-off without changing other routes", () => {
  assert.equal(
    sha256(previousEvidencePath),
    "FCFA4451F5A94C8BB04CC21682127FEEF06FE3D121B57572AFAFFB8E4DDC799F"
  );
  const previous = readJson(previousEvidencePath);
  const final = readJson(finalEvidencePath);
  const previousUndici = previous.targets.find((target) => target.name === "undici");
  const finalUndici = final.targets.find((target) => target.name === "undici");

  assert.equal(previousUndici.trials[0].changedFileCoverage, 0.67);
  assert.equal(finalUndici.trials[0].changedFileCoverage, 1);
  assert.equal(previousUndici.trials[0].routeFocus, 1);
  assert.equal(finalUndici.trials[0].routeFocus, 0.5);
  assert.deepEqual(finalUndici.trials[0].missingTestFiles, []);

  for (const finalTarget of final.targets.filter((target) => target.name !== "undici")) {
    const previousTarget = previous.targets.find((target) => target.name === finalTarget.name);
    assert.deepEqual(
      finalTarget.trials[0].routeFiles,
      previousTarget.trials[0].routeFiles,
      finalTarget.name
    );
  }
});

test("locks the CommonJS follow-up harness and bilingual claim boundary", () => {
  assert.equal(
    sha256(harnessPath),
    "E34974E28326C50860253720B36342B98FC0971C11BE19EBCCCF5D0F176A431E"
  );
  const harness = readFileSync(harnessPath, "utf8");
  const report = readFileSync(reportPath, "utf8");

  assert.match(harness, /flag:\s*"wx"/);
  assert.match(harness, /heldOutAgainstCandidate:\s*false/);
  assert.match(harness, /tasksUsedDuringCandidateDevelopment:\s*true/);
  assert.match(harness, /Output cannot overwrite the original Round 4 held-out observation/);
  assert.match(report, /Passed as a disclosed development regression/);
  assert.match(report, /not new held-out or generalization evidence/);
  assert.match(report, /# 第四轮 CommonJS 导入修复结果/);
  assert.match(report, /不能证明 Agent 正确性/);
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
