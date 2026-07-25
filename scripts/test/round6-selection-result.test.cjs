const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const manifestPath = path.join(
  projectRoot,
  "docs",
  "research",
  "evidence",
  "held-out-routing-target-manifest-0.4-alpha-round-6.json"
);
const englishReportPath = path.join(projectRoot, "docs", "research", "ROUND_6_TARGET_SELECTION_FAILURE_0_4_ALPHA.md");
const chineseReportPath = path.join(projectRoot, "docs", "zh-CN", "ROUND_6_TARGET_SELECTION_FAILURE_0_4_ALPHA.md");
const expectedManifestSha = "C02BAB99B8148C861EFA01D37EECA01C024340B10EA321A6A3A6DCB41B146726";

test("preserves the failed Round 6 selection and its Python quota", () => {
  const bytes = readFileSync(manifestPath);
  const manifest = JSON.parse(bytes.toString("utf8"));

  assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), expectedManifestSha);
  assert.equal(manifest.status, "selection-failed");
  assert.equal(manifest.rules.languageDiversitySatisfied, false);
  assert.equal(manifest.rules.palaceCallsOnCandidateTasksDuringSelection, 0);
  assert.equal(manifest.rules.taskClassifier, "inflected-behavioral-subject-v1");
  assert.equal(manifest.targets.length, 7);
  assert.deepEqual(manifest.rules.selectedPerLanguageFamily, {
    "javascript-typescript": 2,
    python: 1,
    go: 2,
    rust: 2
  });

  const inspected = manifest.repositoryReports.filter((report) => report.materializationAttempts);
  for (const report of inspected) {
    assert.deepEqual(report.materializationAttempts.map((attempt) => attempt.status), ["completed"], report.name);
  }

  const werkzeug = manifest.repositoryReports.find((report) => report.name === "werkzeug");
  const black = manifest.repositoryReports.find((report) => report.name === "black");
  const attrs = manifest.repositoryReports.find((report) => report.name === "attrs");
  assert.equal(werkzeug.status, "no-eligible-commit");
  assert.equal(werkzeug.scannedCommits, 300);
  assert.equal(black.status, "no-eligible-commit");
  assert.equal(black.scannedCommits, 300);
  assert.equal(attrs.status, "selected");
  assert.equal(attrs.scannedCommits, 36);
});

test("keeps the Round 6 interpretation bilingual and bounded", () => {
  const english = readFileSync(englishReportPath, "utf8");
  const chinese = readFileSync(chineseReportPath, "utf8");

  for (const report of [english, chinese]) {
    assert.match(report, /C02BAB99B8148C861EFA01D37EECA01C024340B10EA321A6A3A6DCB41B146726/);
    assert.match(report, /selection-failed/);
    assert.match(report, /inflected-behavioral-subject-v1/);
  }
  assert.match(english, /target-selection protocol failure/);
  assert.match(english, /configuration/);
  assert.match(chinese, /目标选择协议失败/);
  assert.match(chinese, /配置/);
});
