const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const preregistrationPath = path.join(
  projectRoot,
  "docs",
  "research",
  "evidence",
  "disclosed-round-8-routing-repair-preregistration-0.4-alpha.json"
);
const manifestPath = path.join(
  projectRoot,
  "docs",
  "research",
  "evidence",
  "held-out-routing-target-manifest-0.4-alpha-round-8.json"
);
const combinedPath = path.join(
  projectRoot,
  "docs",
  "research",
  "evidence",
  "round-8-confidence-calibration-combined-analysis-0.4-alpha.json"
);
const englishPath = path.join(
  projectRoot,
  "docs",
  "research",
  "DISCLOSED_ROUND_8_ROUTING_REPAIR_PROTOCOL_0_4_ALPHA.md"
);
const chinesePath = path.join(
  projectRoot,
  "docs",
  "zh-CN",
  "DISCLOSED_ROUND_8_ROUTING_REPAIR_PROTOCOL_0_4_ALPHA.md"
);

const baselineCommit = "7496bef84e49264183cddbc48ce08d5e6665f2eb";
const baselineCliSha256 = "52A1876B00AF4AAA884A6C7EA47AC2E701E88C34FC8FEE65DD1B32BB6513B8AE";
const manifestSha256 = "6678CE22935F938593C9F950636795E3295D18C9AC57D1C1E7A068B145214466";
const combinedSha256 = "3653B738A46690BD51B021D0469D5B3B6F9B1A3E6C23A7EF89A7E430F81442A5";

test("freezes the five disclosed Round 8 routing failures without changing their oracles", () => {
  const preregistration = readJson(preregistrationPath);
  const manifest = readJson(manifestPath);
  const combined = readJson(combinedPath);

  assert.equal(preregistration.status, "preregistered");
  assert.equal(preregistration.baseline.productCommit, baselineCommit);
  assert.equal(preregistration.baseline.cliSha256, baselineCliSha256);
  assert.equal(sha256(manifestPath), manifestSha256);
  assert.equal(sha256(combinedPath), combinedSha256);
  assert.equal(preregistration.sourceEvidence.manifestSha256, manifestSha256);
  assert.equal(preregistration.sourceEvidence.combinedResultSha256, combinedSha256);

  const expectedNames = ["sqlalchemy", "sinon", "rich", "viper", "crossbeam"];
  assert.deepEqual(preregistration.targets.map((target) => target.name), expectedNames);
  for (const target of preregistration.targets) {
    const manifestTarget = manifest.targets.find((candidate) => candidate.name === target.name);
    const combinedTarget = combined.targets.find((candidate) => candidate.name === target.name);
    assert.ok(manifestTarget, target.name);
    assert.ok(combinedTarget, target.name);
    assert.equal(target.task, manifestTarget.task, target.name);
    assert.equal(target.url, manifestTarget.url, target.name);
    assert.equal(target.routeCommit, manifestTarget.routeCommit, target.name);
    assert.equal(target.groundTruthCommit, manifestTarget.groundTruthCommit, target.name);
    assert.deepEqual(target.oracleFiles, manifestTarget.changedFiles, target.name);
    assert.deepEqual(target.oracleFiles, combinedTarget.oracleFiles, target.name);
  }
});

test("keeps the disclosed repair strict while requiring a later unseen study", () => {
  const preregistration = readJson(preregistrationPath);

  assert.equal(preregistration.developmentPolicy.targetsAreDisclosed, true);
  assert.equal(preregistration.developmentPolicy.iterativeLocalRunsAllowed, true);
  assert.equal(preregistration.developmentPolicy.allFailedAndPartialAttemptsMustBePreserved, true);
  assert.equal(preregistration.developmentPolicy.targetRemovalReplacementOrTaskRewriteAllowed, false);
  assert.equal(preregistration.developmentPolicy.newHeldOutValidationRequiredForGeneralization, true);
  assert.equal(preregistration.execution.budget, 6000);
  assert.equal(preregistration.execution.routeLimit, 9);
  assert.equal(preregistration.execution.maxDrawers, 4);
  assert.equal(preregistration.execution.repetitions, 2);
  assert.equal(preregistration.execution.sequentialOnly, true);
  assert.equal(preregistration.gates.requiredTargets, 5);
  assert.equal(preregistration.gates.requiredCompletedTrialsPerCondition, 10);
  assert.equal(preregistration.gates.minimumTargetChangedFileCoverage, 1);
  assert.equal(preregistration.gates.minimumMacroChangedFileCoverage, 0.9);
  assert.equal(preregistration.gates.minimumMacroRouteFocus, 0.75);
  assert.equal(preregistration.gates.minimumMacroRoutePrecision, 0.75);
  assert.equal(preregistration.gates.maximumTotalRouteFiles, 18);
  assert.equal(preregistration.gates.maximumRichRouteFiles, 4);
  assert.equal(preregistration.gates.maximumSinonDocumentationFiles, 0);
  assert.equal(preregistration.gates.maximumUnsafeNarrowTargets, 0);
  assert.match(preregistration.candidateFreezeRule, /separate execution preregistration/i);
  assert.match(preregistration.claimBoundary, /not held-out evidence/i);
  assert.match(preregistration.claimBoundary, /cannot support Agent correctness, Token, tool-call, or wall-time claims/i);
});

test("keeps the English and Simplified Chinese protocols aligned", () => {
  const english = readFileSync(englishPath, "utf8");
  const chinese = readFileSync(chinesePath, "utf8");

  for (const document of [english, chinese]) {
    assert.match(document, new RegExp(baselineCommit));
    assert.match(document, new RegExp(baselineCliSha256));
    assert.match(document, new RegExp(manifestSha256));
    assert.match(document, new RegExp(combinedSha256));
    assert.match(document, /SQLAlchemy/);
    assert.match(document, /Sinon/);
    assert.match(document, /Rich/);
    assert.match(document, /Viper/);
    assert.match(document, /Crossbeam/);
    assert.match(document, /6,000|6000/);
    assert.match(document, /0\.90/);
    assert.match(document, /0\.75/);
    assert.match(document, /18/);
    assert.match(document, /Round 9|第九轮/);
  }
  assert.match(english, /not held-out evidence/i);
  assert.match(chinese, /不能当作未见测试证据/);
});

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex").toUpperCase();
}
