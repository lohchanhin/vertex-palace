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
  "held-out-routing-target-manifest-0.4-alpha-round-5.json"
);
const englishReportPath = path.join(
  projectRoot,
  "docs",
  "research",
  "ROUND_5_TARGET_SELECTION_FAILURE_0_4_ALPHA.md"
);
const chineseReportPath = path.join(
  projectRoot,
  "docs",
  "zh-CN",
  "ROUND_5_TARGET_SELECTION_FAILURE_0_4_ALPHA.md"
);
const expectedManifestSha = "73B12E699DA29F86F7AF31D6483549D15F94AE1353B14F566053AE8D7B7633D6";

test("preserves the failed Round 5 selection without filling the missing target", () => {
  const bytes = readFileSync(manifestPath);
  const manifest = JSON.parse(bytes.toString("utf8"));

  assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), expectedManifestSha);
  assert.equal(manifest.status, "selection-failed");
  assert.equal(manifest.rules.languageDiversitySatisfied, false);
  assert.equal(manifest.rules.palaceCallsOnCandidateTasksDuringSelection, 0);
  assert.equal(manifest.targets.length, 7);
  assert.deepEqual(manifest.rules.selectedPerLanguageFamily, {
    "javascript-typescript": 2,
    python: 1,
    go: 2,
    rust: 2
  });

  const inspected = manifest.repositoryReports.filter((report) => report.materializationAttempts);
  assert.ok(inspected.length > 0);
  for (const report of inspected) {
    assert.deepEqual(
      report.materializationAttempts.map((attempt) => attempt.status),
      ["completed"],
      report.name
    );
  }

  const django = manifest.repositoryReports.find((report) => report.name === "django");
  const anyio = manifest.repositoryReports.find((report) => report.name === "anyio");
  assert.equal(django.status, "no-eligible-commit");
  assert.equal(django.scannedCommits, 300);
  assert.equal(django.rejectionCounts["non-behavioral-or-ambiguous-subject"], 300);
  assert.equal(anyio.status, "no-eligible-commit");
  assert.equal(anyio.scannedCommits, 300);
  assert.equal(anyio.rejectionCounts["non-behavioral-or-ambiguous-subject"], 283);
});

test("states the Round 5 failure and next claim boundary in both languages", () => {
  const english = readFileSync(englishReportPath, "utf8");
  const chinese = readFileSync(chineseReportPath, "utf8");

  for (const report of [english, chinese]) {
    assert.match(report, /73B12E699DA29F86F7AF31D6483549D15F94AE1353B14F566053AE8D7B7633D6/);
    assert.match(report, /selection-failed/);
    assert.match(report, /53/);
    assert.match(report, /Fixed/);
    assert.match(report, /Added/);
  }
  assert.match(english, /target-selection protocol failure/);
  assert.match(chinese, /目标选择协议失败/);
});
