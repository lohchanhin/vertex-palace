const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const poolPath = path.join(
  projectRoot,
  "docs",
  "research",
  "evidence",
  "held-out-routing-repository-pool-0.4-alpha-round-6.json"
);
const round5PoolPath = path.join(
  projectRoot,
  "docs",
  "research",
  "evidence",
  "held-out-routing-repository-pool-0.4-alpha-round-5.json"
);
const selectorPath = path.join(
  projectRoot,
  "scripts",
  "select-held-out-routing-targets-round-6.cjs"
);
const englishProtocolPath = path.join(
  projectRoot,
  "docs",
  "research",
  "HELD_OUT_ROUTING_TARGET_SELECTION_PROTOCOL_0_4_ALPHA_ROUND_6.md"
);
const chineseProtocolPath = path.join(
  projectRoot,
  "docs",
  "zh-CN",
  "HELD_OUT_ROUTING_TARGET_SELECTION_PROTOCOL_0_4_ALPHA_ROUND_6.md"
);

test("freezes a balanced Round 6 pool outside the complete Round 5 boundary", () => {
  const pool = readJson(poolPath);
  const round5 = readJson(round5PoolPath);

  assert.equal(pool.status, "preregistered");
  assert.equal(
    pool.candidate.productCommit,
    "f61207688badbe07818470a42441a3a966a8bdf0"
  );
  assert.equal(
    pool.candidate.cliSha256,
    "72E18636847227AD81D07132CCC47F1F0E62C279366221F1D2DF5CB04F2D0CFC"
  );
  assert.equal(pool.rules.desiredTargets, 8);
  assert.equal(pool.rules.targetsPerLanguageFamily, 2);
  assert.equal(pool.rules.repositoriesPerLanguageFamily, 3);
  assert.equal(pool.rules.taskClassifier, "inflected-behavioral-subject-v1");
  assert.equal(pool.rules.commitHistoryInspectedBeforePoolFreeze, false);
  assert.equal(pool.rules.palaceCallsOnCandidateTasksBeforePoolFreeze, 0);

  const expectedObserved = new Set([
    ...round5.previouslyObservedRepositories,
    ...round5.repositoryPool.map((repository) => repository.url)
  ].map(normalizeUrl));
  const declaredObserved = new Set(pool.previouslyObservedRepositories.map(normalizeUrl));
  assert.equal(expectedObserved.size, 53);
  assert.deepEqual([...declaredObserved].sort(), [...expectedObserved].sort());

  const poolUrls = pool.repositoryPool.map((repository) => normalizeUrl(repository.url));
  assert.equal(pool.repositoryPool.length, 12);
  assert.equal(new Set(poolUrls).size, pool.repositoryPool.length);
  for (const repository of pool.repositoryPool) {
    assert.equal(declaredObserved.has(normalizeUrl(repository.url)), false, repository.name);
    assert.match(repository.pinnedHead, /^[0-9a-f]{40}$/);
    assert.ok(repository.extensions.length > 0, repository.name);
  }
  for (const family of pool.rules.requiredLanguageFamilies) {
    assert.equal(
      pool.repositoryPool.filter((repository) => repository.languageFamily === family).length,
      3,
      family
    );
  }
});

test("keeps Round 6 selection create-only and unable to invoke Palace", () => {
  const source = readFileSync(selectorPath, "utf8");

  assert.match(source, /flag:\s*"wx"/);
  assert.match(source, /palaceCallsOnCandidateTasksDuringSelection:\s*0/);
  assert.match(source, /candidateCommit = "f61207688badbe07818470a42441a3a966a8bdf0"/);
  assert.match(source, /held-out-routing-repository-pool-0\.4-alpha-round-6\.json/);
  assert.match(source, /select-held-out-routing-targets-round-6\.cjs/);
  assert.match(source, /inflected-behavioral-subject-v1/);
  assert.match(source, /require\("\.\/lib\/commit-task-classifier\.cjs"\)/);
  assert.doesNotMatch(source, /\brunPalace\b/);
  assert.doesNotMatch(source, /\brunNode\b/);
  assert.doesNotMatch(source, /\b(?:context|evaluate|index|init|pack|route)\b.*--root/);
});

test("keeps the English and Simplified Chinese Round 6 protocols aligned", () => {
  const english = readFileSync(englishProtocolPath, "utf8");
  const chinese = readFileSync(chineseProtocolPath, "utf8");

  for (const document of [english, chinese]) {
    assert.match(document, /f61207688badbe07818470a42441a3a966a8bdf0/);
    assert.match(document, /72E18636847227AD81D07132CCC47F1F0E62C279366221F1D2DF5CB04F2D0CFC/);
    assert.match(document, /held-out-routing-target-manifest-0\.4-alpha-round-6\.json/);
    assert.match(document, /inflected-behavioral-subject-v1/);
    assert.match(document, /git ls-remote <url> HEAD/);
    assert.match(document, /53/);
  }
  assert.match(english, /selection-failed/);
  assert.match(chinese, /selection-failed/);
  assert.match(chinese, /未见路由目标选择协议/);
});

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function normalizeUrl(value) {
  return value.toLowerCase().replace(/\.git$/, "").replace(/\/$/, "");
}
