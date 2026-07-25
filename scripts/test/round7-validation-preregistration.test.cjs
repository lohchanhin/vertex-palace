const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { classifyTaskType } = require("../lib/commit-task-classifier.cjs");

const projectRoot = path.resolve(__dirname, "..", "..");
const manifestPath = path.join(projectRoot, "docs", "research", "evidence", "held-out-routing-target-manifest-0.4-alpha-round-7.json");
const validatorPath = path.join(projectRoot, "scripts", "verify-held-out-cross-repository-routing-round-7.cjs");
const englishProtocolPath = path.join(projectRoot, "docs", "research", "HELD_OUT_CROSS_REPOSITORY_ROUTING_PROTOCOL_0_4_ALPHA_ROUND_7.md");
const chineseProtocolPath = path.join(projectRoot, "docs", "zh-CN", "HELD_OUT_CROSS_REPOSITORY_ROUTING_PROTOCOL_0_4_ALPHA_ROUND_7.md");
const manifestSha = "9234AAB3E64E6EEB5857B6376646078067AA0121CA593DEBBB3275037A307616";

test("freezes eight balanced Round 7 targets and the complete multi-surface oracle", () => {
  const bytes = readFileSync(manifestPath);
  const manifest = JSON.parse(bytes.toString("utf8"));

  assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), manifestSha);
  assert.equal(manifest.status, "selected");
  assert.equal(manifest.heldOutAgainstCandidate, true);
  assert.equal(manifest.selector.commit, "8dfe027063454baf5af915492849c4bcffe3ac6f");
  assert.equal(manifest.repositoryPool.sha256, "A5573635E28C7A7A4D10B8847297D2FDD2671D4B24645A35DAAE77AE49459149");
  assert.equal(manifest.rules.palaceCallsOnCandidateTasksDuringSelection, 0);
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

  assert.deepEqual(
    manifest.targets.filter((target) => target.auxiliaryFiles.length).map((target) => target.name),
    ["jinja", "httpcore"]
  );
  assert.equal(
    manifest.targets.reduce((sum, target) => sum + target.auxiliaryFiles.length, 0),
    2
  );
  assert.equal(
    manifest.repositoryReports.filter((report) => report.status === "reserved-fallback-not-inspected").length,
    8
  );
});

test("freezes the Round 7 validator without build or formal-trial retries", () => {
  const source = readFileSync(validatorPath, "utf8");

  assert.match(source, /flag:\s*"wx"/);
  assert.match(source, /candidateCommit = "f61207688badbe07818470a42441a3a966a8bdf0"/);
  assert.match(source, /manifestCommit = "3f1e3e349afc181690f7a7a5d0739cfb7f768aeb"/);
  assert.match(source, /manifestSha256 = "9234AAB3E64E6EEB5857B6376646078067AA0121CA593DEBBB3275037A307616"/);
  assert.match(source, /taskClassifierSha256 = "C3D787029C019FD64BFB079913F23B58082C38560448A9B9567954ECA9FE1254"/);
  assert.match(source, /const repetitions = 2/);
  assert.match(source, /const budget = 6_000/);
  assert.match(source, /const routeLimit = 9/);
  assert.match(source, /const maxDrawers = 4/);
  assert.match(source, /const requiredAuxiliarySurfaceCoverage = 1/);
  assert.match(source, /freshIndexAttempts = 2/);
  assert.match(source, /new Set\(\["EAGAIN", "ENOMEM", "ETIMEDOUT"\]\)/);
  assert.match(source, /evaluateAndContextRetries:\s*0/);
  assert.match(source, /rebuiltBeforeMeasurement:\s*false/);
  assert.match(source, /auxiliarySurfaceCoveragePerApplicableTarget/);
  assert.doesNotMatch(source, /runNpm\(\["run", "build"\]/);
});

test("keeps both Round 7 validation protocols aligned with the formal gates", () => {
  const english = readFileSync(englishProtocolPath, "utf8");
  const chinese = readFileSync(chineseProtocolPath, "utf8");

  for (const document of [english, chinese]) {
    assert.match(document, /f61207688badbe07818470a42441a3a966a8bdf0/);
    assert.match(document, /9234AAB3E64E6EEB5857B6376646078067AA0121CA593DEBBB3275037A307616/);
    assert.match(document, /held-out-cross-repository-routing-0\.4-alpha-round-7\.json/);
    assert.match(document, /16/);
    assert.match(document, /6,000/);
    assert.match(document, /0\.90/);
    assert.match(document, /0\.75/);
    assert.match(document, /0\.50/);
    assert.match(document, /EAGAIN/);
    assert.match(document, /ETIMEDOUT/);
  }
  assert.match(english, /cannot\s+support claims about Agent correctness/);
  assert.match(english, /auxiliary\s+coverage/);
  assert.match(chinese, /不能支持 Agent 正确率/);
  assert.match(chinese, /辅助面/);
});
