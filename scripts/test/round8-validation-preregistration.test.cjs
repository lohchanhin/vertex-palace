const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { classifyTaskType } = require("../lib/commit-task-classifier.cjs");
const {
  calibrationTolerance,
  classifyCalibrationFinding,
  conditionOrderForIndex,
  independentCalibration
} = require("../verify-held-out-confidence-calibration-round-8.cjs");

const projectRoot = path.resolve(__dirname, "..", "..");
const manifestPath = path.join(projectRoot, "docs", "research", "evidence", "held-out-routing-target-manifest-0.4-alpha-round-8.json");
const preflightPath = path.join(projectRoot, "docs", "research", "evidence", "held-out-confidence-calibration-round-8-preflight-attempt-1.json");
const validatorPath = path.join(projectRoot, "scripts", "verify-held-out-confidence-calibration-round-8.cjs");
const englishProtocolPath = path.join(projectRoot, "docs", "research", "HELD_OUT_CONFIDENCE_CALIBRATION_PROTOCOL_0_4_ALPHA_ROUND_8.md");
const chineseProtocolPath = path.join(projectRoot, "docs", "zh-CN", "HELD_OUT_CONFIDENCE_CALIBRATION_PROTOCOL_0_4_ALPHA_ROUND_8.md");
const manifestSha = "6678CE22935F938593C9F950636795E3295D18C9AC57D1C1E7A068B145214466";

test("freezes eight balanced Round 8 targets and both product artifacts", () => {
  const bytes = readFileSync(manifestPath);
  const manifest = JSON.parse(bytes.toString("utf8"));

  assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), manifestSha);
  assert.equal(manifest.status, "selected");
  assert.equal(manifest.heldOutAgainstCandidate, true);
  assert.equal(manifest.candidate.productCommit, "1a02d89269acb36473db3ad39badab9fe338a4a3");
  assert.equal(manifest.candidate.cliSha256, "49F44D09551222A2CB8D3BEEDBDA4E374A507C30DCA681D4D9CC0E57C6DB7747");
  assert.equal(manifest.comparisonBaseline.productCommit, "228c3bde47f6930023496fdd0a54d43dba10091f");
  assert.equal(manifest.comparisonBaseline.cliSha256, "E81774B89C3A6FAED83788335688EFCBC8B4D17DEA25CA002097FF1F9125318F");
  assert.equal(manifest.selector.commit, "56c006f36b1b83f1b5756d071ce6f0f3dcdd57e5");
  assert.equal(manifest.repositoryPool.sha256, "118644384D9E099E0833E36900ED5A7E10648827FF4C2DE5AF40CE11A0018158");
  assert.equal(manifest.rules.palaceCallsOnCandidateTasksDuringSelection, 0);
  assert.equal(manifest.rules.plannedPairedCalibrationComparison, true);
  assert.equal(manifest.rules.calibrationTolerance, 0.15);
  assert.equal(manifest.targets.length, 8);
  for (const family of manifest.rules.requiredLanguageFamilies) {
    assert.equal(manifest.rules.selectedPerLanguageFamily[family], 2, family);
  }

  for (const target of manifest.targets) {
    assert.equal(target.expectedTaskType, classifyTaskType(target.task), target.name);
    assert.ok(target.implementationFiles.length > 0, target.name);
    assert.ok(target.testFiles.length > 0, target.name);
    assert.ok(target.auxiliaryFiles.length <= 2, target.name);
    assert.deepEqual(
      [...target.implementationFiles, ...target.testFiles, ...target.auxiliaryFiles].sort(),
      [...target.changedFiles].sort(),
      target.name
    );
    assert.ok(target.changedFiles.length >= 2 && target.changedFiles.length <= 8, target.name);
  }

  assert.equal(manifest.targets.some((target) => target.auxiliaryFiles.length), false);
  assert.equal(
    manifest.repositoryReports.filter((report) => report.status === "selected").length,
    8
  );
  assert.deepEqual(
    manifest.repositoryReports
      .filter((report) => report.status === "no-eligible-commit")
      .map((report) => report.name),
    ["regex", "hashbrown"]
  );
  assert.equal(
    manifest.repositoryReports.filter(
      (report) => report.status === "family-quota-filled-not-inspected"
    ).length,
    6
  );
});

test("freezes sequential isolated AB/BA execution and an offline baseline build", () => {
  const source = readFileSync(validatorPath, "utf8");

  assert.match(source, /flag:\s*"wx"/);
  assert.match(source, /candidateCommit = "1a02d89269acb36473db3ad39badab9fe338a4a3"/);
  assert.match(source, /baselineCommit = "228c3bde47f6930023496fdd0a54d43dba10091f"/);
  assert.match(source, /manifestCommit = "93d9ae52ceb68f65dc69ec76cee96e8e752eb84a"/);
  assert.match(source, new RegExp(`manifestSha256 = "${manifestSha}"`));
  assert.match(source, /taskClassifierSha256 = "C3D787029C019FD64BFB079913F23B58082C38560448A9B9567954ECA9FE1254"/);
  assert.match(source, /const repetitions = 2/);
  assert.match(source, /const budget = 6_000/);
  assert.match(source, /const routeLimit = 9/);
  assert.match(source, /const maxDrawers = 4/);
  assert.match(source, /const calibrationTolerance = 0\.15/);
  assert.match(source, /freshIndexAttempts = 2/);
  assert.match(source, /new Set\(\["EAGAIN", "ENOMEM", "ETIMEDOUT"\]\)/);
  assert.match(source, /evaluateAndContextRetries:\s*0/);
  assert.match(source, /repetitionsAreDeterminismChecksNotIndependentSamples:\s*true/);
  assert.match(source, /separateRepositoryClonePerCondition:\s*true/);
  assert.match(source, /"clone", "--quiet", "--shared", "--no-checkout"/);
  assert.match(source, /"install",\s*"--offline",\s*"--frozen-lockfile",\s*"--ignore-scripts"/);
  assert.match(source, /rebuiltBeforeMeasurement:\s*true/);
  assert.match(source, /rebuiltBeforeMeasurement:\s*false/);
  assert.match(source, /\["M plugins\/vertex-palace\/mcp\/server\.cjs"\]/);
  assert.match(source, /"diff", "--quiet", baselineCommit, "--", "packages"/);
  assert.match(source, /status: validityFailures\.length \? "invalid" : "completed"/);
  assert.match(source, /contextCostFinding/);
  assert.doesNotMatch(source, /Promise\.all/);
  assert.ok(
    source.indexOf("const baselineBuild = await buildBaselineCli")
      < source.indexOf("for (const [targetIndex, target] of manifest.targets.entries()"),
    "Baseline must be hash-verified before any selected task is executed."
  );
});

test("preserves the failed preflight before any selected task exposure", () => {
  const preflight = JSON.parse(readFileSync(preflightPath, "utf8"));
  assert.equal(preflight.status, "preflight-failed-before-target-exposure");
  assert.equal(preflight.validationHarnessCommit, "e89378bb151e3566327624e4cb021e9ac8c8aa21");
  assert.equal(preflight.formalResultCreated, false);
  assert.equal(preflight.selectedTargetRepositoriesMaterialized, 0);
  assert.equal(preflight.palaceCallsOnSelectedTasks, 0);
  assert.equal(preflight.selectedTasksRemainCandidateHeldOut, true);
  assert.match(preflight.error, /plugins\/vertex-palace\/mcp\/server\.cjs/);
});

test("defines calibration boundaries and balanced condition order independently", () => {
  assert.equal(calibrationTolerance, 0.15);
  assert.equal(independentCalibration(0.65, 0.5).status, "well-calibrated");
  assert.equal(independentCalibration(0.66, 0.5).status, "overconfident");
  assert.equal(independentCalibration(0.34, 0.5).status, "underconfident");
  assert.deepEqual(conditionOrderForIndex(0), ["baseline", "candidate"]);
  assert.deepEqual(conditionOrderForIndex(1), ["candidate", "baseline"]);
  assert.deepEqual(
    Array.from({ length: 8 }, (_, index) => conditionOrderForIndex(index)[0]),
    ["baseline", "candidate", "baseline", "candidate", "baseline", "candidate", "baseline", "candidate"]
  );
});

test("classifies support, tradeoff, null, regression, and incomplete findings", () => {
  const base = {
    completedPairedTargets: 8,
    requiredTargets: 8,
    routeChangedTargets: 0,
    baselineUnsafeNarrowTargets: 1,
    candidateUnsafeNarrowTargets: 0,
    baselineOverconfidentTargets: 2,
    candidateOverconfidentTargets: 0,
    baselineUnderconfidentTargets: 0,
    candidateUnderconfidentTargets: 0,
    baselineMiscalibratedTargets: 2,
    candidateMiscalibratedTargets: 0,
    baselineMae: 0.2,
    candidateMae: 0.1
  };
  assert.equal(classifyCalibrationFinding(base), "supported");
  assert.equal(classifyCalibrationFinding({
    ...base,
    candidateUnderconfidentTargets: 2,
    candidateMiscalibratedTargets: 2
  }), "tradeoff");
  assert.equal(classifyCalibrationFinding({
    ...base,
    baselineOverconfidentTargets: 0,
    candidateOverconfidentTargets: 0,
    baselineMiscalibratedTargets: 0,
    candidateMiscalibratedTargets: 0,
    baselineMae: 0.1,
    candidateMae: 0.1
  }), "no-difference");
  assert.equal(classifyCalibrationFinding({ ...base, routeChangedTargets: 1 }), "regression");
  assert.equal(classifyCalibrationFinding({ ...base, completedPairedTargets: 7 }), "incomplete");
});

test("keeps both Round 8 protocols aligned with paired claims and status semantics", () => {
  const english = readFileSync(englishProtocolPath, "utf8");
  const chinese = readFileSync(chineseProtocolPath, "utf8");

  for (const document of [english, chinese]) {
    assert.match(document, /228c3bde47f6930023496fdd0a54d43dba10091f/);
    assert.match(document, /1a02d89269acb36473db3ad39badab9fe338a4a3/);
    assert.match(document, new RegExp(manifestSha));
    assert.match(document, /held-out-confidence-calibration-0\.4-alpha-round-8\.json/);
    assert.match(document, /32/);
    assert.match(document, /6,000/);
    assert.match(document, /0\.15/);
    assert.match(document, /0\.90/);
    assert.match(document, /0\.75/);
    assert.match(document, /0\.50/);
    assert.match(document, /EAGAIN/);
    assert.match(document, /ETIMEDOUT/);
    assert.match(document, /supported/);
    assert.match(document, /tradeoff/);
    assert.match(document, /no-difference/);
    assert.match(document, /regression/);
    assert.match(document, /invalid/);
    assert.match(document, /completed/);
    assert.match(document, /e89378bb151e3566327624e4cb021e9ac8c8aa21/);
    assert.match(document, /preflight-attempt-1\.json/);
  }
  assert.match(english, /cannot support claims about Agent correctness/);
  assert.match(english, /never concurrent/);
  assert.match(chinese, /不能证明 Agent 正确率/);
  assert.match(chinese, /禁止并发/);
});
