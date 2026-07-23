const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const originalEvidencePath = path.join(
  projectRoot,
  "docs",
  "research",
  "evidence",
  "held-out-cross-repository-routing-0.4-alpha-round-4.json"
);
const repairEvidencePath = path.join(
  projectRoot,
  "docs",
  "research",
  "evidence",
  "disclosed-cross-repository-routing-0.4-alpha-round-4-after-scoped-causal-repair.json"
);
const harnessPath = path.join(
  projectRoot,
  "scripts",
  "verify-disclosed-routing-round-4-after-scoped-causal-repair.cjs"
);
const englishReportPath = path.join(
  projectRoot,
  "docs",
  "research",
  "DISCLOSED_CROSS_REPOSITORY_ROUTING_REGRESSION_0_4_ALPHA_ROUND_4.md"
);
const chineseReportPath = path.join(
  projectRoot,
  "docs",
  "zh-CN",
  "DISCLOSED_CROSS_REPOSITORY_ROUTING_REGRESSION_0_4_ALPHA_ROUND_4.md"
);

test("preserves the disclosed Round 4 repair result and its claim boundary", () => {
  assert.equal(
    sha256(repairEvidencePath),
    "320F5C94234F0F7210ABC517422702AF169C052B2FA9138B4A7FF23F7092FA12"
  );
  const result = readJson(repairEvidencePath);
  assert.equal(result.status, "failed");
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
    "569f7c502fad06790784449e537223c9746e1312"
  );
  assert.equal(
    result.candidate.validationHarnessCommit,
    "62b74a91221a261e49a3c05c452e46a9a34da5e5"
  );
  assert.equal(result.aggregate.passedTargets, 3);
  assert.equal(result.aggregate.failedTargets, 5);
  assert.equal(result.aggregate.completedTrials, 16);
  assert.equal(result.aggregate.macroChangedFileCoverage, 0.584);
  assert.equal(result.aggregate.macroRouteFocus, 0.449);
  assert.equal(result.aggregate.macroRoutePrecision, 0.448);
  assert.equal(result.aggregate.overconfidentTrials, 6);
  assert.equal(result.aggregate.environmentOrSetupFailures, 0);
  assert.equal(result.aggregate.harnessContractFailures, 0);
  assert.deepEqual(
    result.targets.filter((target) => target.status === "passed").map((target) => target.name),
    ["undici", "validator", "uvicorn"]
  );
  for (const target of result.targets) {
    assert.equal(target.trials.length, 2, target.name);
    assert.equal(target.deterministicRoutes, true, target.name);
    assert.deepEqual(target.trials[0].routeFiles, target.trials[1].routeFiles, target.name);
  }
});

test("retains the original held-out failure and records the mixed repair outcome", () => {
  assert.equal(
    sha256(originalEvidencePath),
    "7B8E3833A71D60645DF134D8B87ADF49EAA5557EE59A6AB6D64A537C8A3BB5D3"
  );
  const original = readJson(originalEvidencePath);
  const repair = readJson(repairEvidencePath);
  const originalValidator = original.targets.find((target) => target.name === "validator");
  const repairValidator = repair.targets.find((target) => target.name === "validator");
  const originalAiohttp = original.targets.find((target) => target.name === "aiohttp");
  const repairAiohttp = repair.targets.find((target) => target.name === "aiohttp");

  assert.equal(original.heldOutAgainstCandidate, true);
  assert.equal(originalValidator.trials[0].changedFileCoverage, 0);
  assert.equal(repairValidator.trials[0].changedFileCoverage, 1);
  assert.equal(originalAiohttp.trials[0].changedFileCoverage, 1);
  assert.equal(repairAiohttp.trials[0].changedFileCoverage, 0.5);
});

test("locks the create-only repair harness and original-evidence protection", () => {
  assert.equal(
    sha256(harnessPath),
    "A61BB50908C57FA546A77FE59EE42A2A60FC9BC7E9056B5F896C5672BA608342"
  );
  const source = readFileSync(harnessPath, "utf8");
  assert.match(source, /flag:\s*"wx"/);
  assert.match(source, /heldOutAgainstCandidate:\s*false/);
  assert.match(source, /rebuiltBeforeMeasurement:\s*true/);
  assert.match(source, /tasksUsedDuringCandidateDevelopment:\s*true/);
  assert.match(source, /Output cannot overwrite the original Round 4 held-out observation/);
});

test("keeps both reports explicit about the failed gate and performance boundary", () => {
  const english = readFileSync(englishReportPath, "utf8");
  const chinese = readFileSync(chineseReportPath, "utf8");
  assert.match(english, /\*\*Failed\./);
  assert.match(english, /does not show that Vertex Palace saves Tokens/);
  assert.match(english, /aiohttp lost a required test/);
  assert.match(chinese, /\*\*失败。/);
  assert.match(chinese, /不能证明 Vertex Palace 节省 Token/);
  assert.match(chinese, /aiohttp.*必要测试/);
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
