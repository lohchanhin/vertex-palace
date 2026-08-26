const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const {
  collectObservedRepositories,
  normalizeRepositoryUrl
} = require("../lib/local-blind-freeze.cjs");

const root = path.resolve(__dirname, "../..");
const poolPath = path.join(
  root,
  "docs/research/evidence/local-blind-routing-repository-pool-0.4-alpha-round-12.json"
);

test("Round 12 pool is balanced and recursively excludes all 145 observed repositories", async () => {
  const pool = JSON.parse(await readFile(poolPath, "utf8"));
  const priorBytes = await readFile(path.join(root, pool.priorExclusionSource.path));
  const prior = JSON.parse(priorBytes.toString("utf8"));

  assert.equal(pool.schemaVersion, 1);
  assert.equal(pool.studyId, "local-blind-routing-round-12-0.4-alpha");
  assert.equal(pool.status, "locally-frozen");
  assert.equal(pool.rules.commitHistoryInspectedBeforePoolFreeze, false);
  assert.equal(pool.rules.palaceCallsOnCandidateTasksBeforePoolFreeze, 0);
  assert.equal(pool.rules.maximumMechanicalCandidatesPerRepository, 5);
  assert.equal(pool.rules.partialOraclePruningForbidden, true);
  assert.equal(sha256(priorBytes), pool.priorExclusionSource.sha256);

  const observed = await collectObservedRepositories({ root, document: prior });
  assert.equal(observed.size, 145);
  assert.equal(pool.repositoryPool.length, 16);
  assert.equal(new Set(pool.repositoryPool.map(({ url }) => normalizeRepositoryUrl(url))).size, 16);
  for (const repository of pool.repositoryPool) {
    assert.ok(!observed.has(normalizeRepositoryUrl(repository.url)));
    assert.match(repository.pinnedHead, /^[0-9a-f]{40}$/);
  }
});

test("Round 12 pool keeps the preregistered interleaved family order", async () => {
  const pool = JSON.parse(await readFile(poolPath, "utf8"));
  const expectedCycle = ["javascript-typescript", "python", "go", "rust"];
  assert.deepEqual(
    pool.repositoryPool.map(({ languageFamily }) => languageFamily),
    [...expectedCycle, ...expectedCycle, ...expectedCycle, ...expectedCycle]
  );
  for (const family of expectedCycle) {
    assert.equal(pool.repositoryPool.filter(({ languageFamily }) => languageFamily === family).length, 4);
  }
});

test("Round 12 queue and finalizer are create-only and contain no Palace execution path", async () => {
  const [queueSource, finalizerSource] = await Promise.all([
    readFile(path.join(root, "scripts/prepare-local-blind-routing-candidates-round-12.cjs"), "utf8"),
    readFile(path.join(root, "scripts/finalize-local-blind-routing-targets-round-12.cjs"), "utf8")
  ]);
  for (const source of [queueSource, finalizerSource]) {
    assert.match(source, /flag:\s*"wx"/);
    assert.doesNotMatch(source, /spawnSync\(\s*["']palace["']/i);
    assert.doesNotMatch(source, /run\(\s*["']palace["']/i);
    assert.doesNotMatch(source, /dist[\\/]palace\.cjs["']\s*,\s*\[["'](?:route|context|evaluate|pack)/i);
  }
  assert.match(queueSource, /maximumMechanicalCandidatesPerRepository/);
  assert.match(queueSource, /--unified=0/);
  assert.match(finalizerSource, /finalizeReviewedTargets/);
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}
