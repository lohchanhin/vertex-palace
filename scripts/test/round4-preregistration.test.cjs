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
  "held-out-routing-repository-pool-0.4-alpha-round-4.json"
);
const round3ManifestPath = path.join(
  projectRoot,
  "docs",
  "research",
  "evidence",
  "held-out-routing-target-manifest-0.4-alpha-round-3.json"
);
const selectorPath = path.join(
  projectRoot,
  "scripts",
  "select-held-out-routing-targets-round-4.cjs"
);

test("freezes a balanced Round 4 pool outside the complete Round 3 boundary", () => {
  const pool = readJson(poolPath);
  const round3 = readJson(round3ManifestPath);
  assert.equal(pool.status, "preregistered");
  assert.equal(pool.candidate.productCommit, "efd53274e42fb8123745f2b8bb09a24e4fa384b7");
  assert.equal(
    pool.candidate.cliSha256,
    "E0A2F54C826E742DF03BA0BC965C89AF834B3BBA199C1E135E63E21B291011D0"
  );
  assert.equal(pool.rules.desiredTargets, 8);
  assert.equal(pool.rules.targetsPerLanguageFamily, 2);
  assert.equal(pool.rules.repositoriesPerLanguageFamily, 3);
  assert.equal(pool.rules.commitHistoryInspectedBeforePoolFreeze, false);
  assert.equal(pool.rules.palaceCallsOnCandidateTasksBeforePoolFreeze, 0);

  const expectedObserved = new Set([
    ...round3.previouslyObservedRepositories,
    ...round3.repositoryPool.map((repository) => repository.url)
  ].map(normalizeUrl));
  const declaredObserved = new Set(pool.previouslyObservedRepositories.map(normalizeUrl));
  assert.deepEqual([...declaredObserved].sort(), [...expectedObserved].sort());

  const poolUrls = pool.repositoryPool.map((repository) => normalizeUrl(repository.url));
  assert.equal(new Set(poolUrls).size, pool.repositoryPool.length);
  assert.equal(pool.repositoryPool.length, 12);
  for (const repository of pool.repositoryPool) {
    assert.equal(declaredObserved.has(normalizeUrl(repository.url)), false, repository.name);
    assert.match(repository.pinnedHead, /^[0-9a-f]{40}$/);
  }
  for (const family of pool.rules.requiredLanguageFamilies) {
    assert.equal(
      pool.repositoryPool.filter((repository) => repository.languageFamily === family).length,
      3,
      family
    );
  }
});

test("keeps Round 4 selection create-only and unable to invoke Palace", () => {
  const source = readFileSync(selectorPath, "utf8");
  assert.match(source, /flag:\s*"wx"/);
  assert.match(source, /palaceCallsOnCandidateTasksDuringSelection:\s*0/);
  assert.match(source, /candidateCommit = "efd53274e42fb8123745f2b8bb09a24e4fa384b7"/);
  assert.doesNotMatch(source, /\brunPalace\b/);
  assert.doesNotMatch(source, /\brunNode\b/);
  assert.doesNotMatch(source, /\b(?:context|evaluate|index|init|pack|route)\b.*--root/);
});

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function normalizeUrl(value) {
  return value.toLowerCase().replace(/\.git$/, "").replace(/\/$/, "");
}
