const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const poolPath = path.join(projectRoot, "docs", "research", "evidence", "held-out-routing-repository-pool-0.4-alpha-round-8.json");
const round7PoolPath = path.join(projectRoot, "docs", "research", "evidence", "held-out-routing-repository-pool-0.4-alpha-round-7.json");
const selectorPath = path.join(projectRoot, "scripts", "select-held-out-routing-targets-round-8.cjs");
const englishProtocolPath = path.join(projectRoot, "docs", "research", "HELD_OUT_ROUTING_TARGET_SELECTION_PROTOCOL_0_4_ALPHA_ROUND_8.md");
const chineseProtocolPath = path.join(projectRoot, "docs", "zh-CN", "HELD_OUT_ROUTING_TARGET_SELECTION_PROTOCOL_0_4_ALPHA_ROUND_8.md");

const candidateCommit = "1a02d89269acb36473db3ad39badab9fe338a4a3";
const candidateCliSha256 = "49F44D09551222A2CB8D3BEEDBDA4E374A507C30DCA681D4D9CC0E57C6DB7747";
const baselineCommit = "228c3bde47f6930023496fdd0a54d43dba10091f";
const baselineCliSha256 = "E81774B89C3A6FAED83788335688EFCBC8B4D17DEA25CA002097FF1F9125318F";

test("freezes a four-repository-per-family Round 8 pool outside the complete Round 7 boundary", () => {
  const pool = readJson(poolPath);
  const round7 = readJson(round7PoolPath);

  assert.equal(pool.status, "preregistered");
  assert.equal(pool.studyId, "held-out-confidence-calibration-round-8-0.4-alpha");
  assert.equal(pool.candidate.productCommit, candidateCommit);
  assert.equal(pool.candidate.cliSha256, candidateCliSha256);
  assert.equal(pool.comparisonBaseline.productCommit, baselineCommit);
  assert.equal(pool.comparisonBaseline.cliSha256, baselineCliSha256);
  assert.equal(pool.comparisonBaseline.role, "pre-independent-anchor-confidence-cap");
  assert.equal(pool.rules.desiredTargets, 8);
  assert.equal(pool.rules.targetsPerLanguageFamily, 2);
  assert.equal(pool.rules.repositoriesPerLanguageFamily, 4);
  assert.equal(pool.rules.taskClassifier, "inflected-behavioral-subject-v1");
  assert.equal(pool.rules.maximumFiles, 8);
  assert.equal(pool.rules.maximumAuxiliaryFiles, 2);
  assert.equal(pool.rules.commitHistoryInspectedBeforePoolFreeze, false);
  assert.equal(pool.rules.palaceCallsOnCandidateTasksBeforePoolFreeze, 0);
  assert.equal(pool.rules.plannedPairedCalibrationComparison, true);
  assert.equal(pool.rules.baselineAndCandidateFrozenBeforeTargetSelection, true);
  assert.equal(pool.rules.calibrationTolerance, 0.15);

  const expectedObserved = new Set([
    ...round7.previouslyObservedRepositories,
    ...round7.repositoryPool.map((repository) => repository.url)
  ].map(normalizeUrl));
  const declaredObserved = new Set(pool.previouslyObservedRepositories.map(normalizeUrl));
  assert.equal(expectedObserved.size, 81);
  assert.equal(declaredObserved.size, 81);
  assert.deepEqual([...declaredObserved].sort(), [...expectedObserved].sort());

  const poolUrls = pool.repositoryPool.map((repository) => normalizeUrl(repository.url));
  assert.equal(pool.repositoryPool.length, 16);
  assert.equal(new Set(poolUrls).size, pool.repositoryPool.length);
  for (const repository of pool.repositoryPool) {
    assert.equal(declaredObserved.has(normalizeUrl(repository.url)), false, repository.name);
    assert.match(repository.pinnedHead, /^[0-9a-f]{40}$/);
    assert.ok(repository.extensions.length > 0, repository.name);
  }
  for (const family of pool.rules.requiredLanguageFamilies) {
    assert.equal(pool.repositoryPool.filter((repository) => repository.languageFamily === family).length, 4, family);
  }
});

test("keeps Round 8 selection create-only, bounded, paired, and unable to invoke Palace", () => {
  const source = readFileSync(selectorPath, "utf8");

  assert.match(source, /flag:\s*"wx"/);
  assert.match(source, /palaceCallsOnCandidateTasksDuringSelection:\s*0/);
  assert.match(source, /candidateCommit = "1a02d89269acb36473db3ad39badab9fe338a4a3"/);
  assert.match(source, /baselineCommit = "228c3bde47f6930023496fdd0a54d43dba10091f"/);
  assert.match(source, /held-out-routing-repository-pool-0\.4-alpha-round-8\.json/);
  assert.match(source, /select-held-out-routing-targets-round-8\.cjs/);
  assert.match(source, /maximumAuxiliaryFiles = 2/);
  assert.match(source, /maximumFiles = 8/);
  assert.match(source, /plannedPairedCalibrationComparison:\s*true/);
  assert.match(source, /baselineAndCandidateFrozenBeforeTargetSelection:\s*true/);
  assert.match(source, /calibrationTolerance:\s*0\.15/);
  assert.match(
    source,
    /requiredLanguageFamilies\.length \* pool\.rules\.repositoriesPerLanguageFamily/
  );
  assert.doesNotMatch(source, /repositoryPool\.length, 12/);
  assert.match(source, /require\("\.\/lib\/held-out-file-surfaces\.cjs"\)/);
  assert.doesNotMatch(source, /\brunPalace\b/);
  assert.doesNotMatch(source, /\brunNode\b/);
  assert.doesNotMatch(source, /\b(?:context|evaluate|index|init|pack|route)\b.*--root/);
});

test("keeps the English and Simplified Chinese Round 8 protocols aligned", () => {
  const english = readFileSync(englishProtocolPath, "utf8");
  const chinese = readFileSync(chineseProtocolPath, "utf8");

  for (const document of [english, chinese]) {
    assert.match(document, new RegExp(candidateCommit));
    assert.match(document, new RegExp(candidateCliSha256));
    assert.match(document, new RegExp(baselineCommit));
    assert.match(document, new RegExp(baselineCliSha256));
    assert.match(document, /held-out-routing-target-manifest-0\.4-alpha-round-8\.json/);
    assert.match(document, /inflected-behavioral-subject-v1/);
    assert.match(document, /git ls-remote <url> HEAD/);
    assert.match(document, /81/);
    assert.match(document, /0\.15/);
    assert.match(document, /\.flake8/);
    assert.match(document, /go\.mod/);
  }
  assert.match(english, /paired baseline-versus-candidate calibration comparison/);
  assert.match(english, /at most two modified documentation or configuration/i);
  assert.match(chinese, /最多 2 个已修改的/);
  assert.match(chinese, /未见置信度校准目标选择协议/);
});

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function normalizeUrl(value) {
  return value.toLowerCase().replace(/\.git$/, "").replace(/\/$/, "");
}
