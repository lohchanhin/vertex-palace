const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const {
  collectObservedRepositories,
  normalizeRepositoryUrl,
  sha256Bytes,
  validateRepositoryPool
} = require("../lib/local-blind-freeze.cjs");

const root = path.resolve(__dirname, "..", "..");
const studyId = "local-blind-routing-round-16-0.4-alpha";
const planRelativePath =
  "docs/research/evidence/local-blind-routing-repository-plan-0.4-alpha-round-16.json";
const poolRelativePath =
  "docs/research/evidence/local-blind-routing-repository-pool-0.4-alpha-round-16.json";
const headEvidenceRelativePath =
  "docs/research/evidence/local-blind-routing-repository-head-verification-0.4-alpha-round-16.json";
const failedHeadEvidenceRelativePath =
  "docs/research/evidence/local-blind-routing-repository-head-verification-attempt-1-failure-0.4-alpha-round-16.json";
const freezeRelativePath =
  "docs/research/evidence/local-blind-candidate-freeze-0.4-alpha-round-16.json";

test("Round 16 pool plan recursively excludes every previously observed repository", async () => {
  const plan = await readJson(planRelativePath);
  const priorBytes = await readFile(path.join(root, plan.priorExclusionSource.path));
  assert.equal(sha256Bytes(priorBytes), plan.priorExclusionSource.sha256);
  const prior = JSON.parse(priorBytes.toString("utf8"));
  const observed = await collectObservedRepositories({ root, document: prior });
  assert.equal(observed.size, 161);
  for (const repository of plan.priorExclusionSource.additionalPreviouslyObservedRepositories) {
    observed.add(normalizeRepositoryUrl(repository));
  }
  assert.equal(observed.size, 162);

  assert.equal(plan.repositoryPlan.length, 16);
  assert.equal(new Set(plan.repositoryPlan.map(({ url }) => normalizeRepositoryUrl(url))).size, 16);
  for (const repository of plan.repositoryPlan) {
    assert.ok(!observed.has(normalizeRepositoryUrl(repository.url)));
  }
  for (const family of plan.rules.requiredLanguageFamilies) {
    assert.equal(
      plan.repositoryPlan.filter(({ languageFamily }) => languageFamily === family).length,
      4
    );
  }
});

test("Round 16 frozen pool binds 16 URL-and-HEAD-only repositories without task exposure", async () => {
  const [planBytes, pool, headEvidence] = await Promise.all([
    readFile(path.join(root, planRelativePath)),
    readJson(poolRelativePath),
    readJson(headEvidenceRelativePath)
  ]);
  await validateRepositoryPool({
    root,
    pool,
    studyId,
    freezeRelativePath
  });

  assert.equal(pool.plan.path, planRelativePath);
  assert.equal(pool.plan.sha256, sha256Bytes(planBytes));
  assert.deepEqual(pool.previouslyObservedRepositories, [
    "https://github.com/open-webui/open-webui.git"
  ]);
  assert.equal(headEvidence.status, "verified");
  assert.equal(headEvidence.commandContract, "git ls-remote <url> HEAD");
  assert.deepEqual(headEvidence.retryPolicy, {
    maximumAttemptsPerRepository: 3,
    delayMs: 5000,
    transientNetworkFailuresOnly: true,
    repositoryPlanChangedAfterFailure: false
  });
  assert.equal(headEvidence.commitHistoryInspected, false);
  assert.equal(headEvidence.candidateTaskInspected, false);
  assert.equal(headEvidence.palaceCallsOnCandidateTasks, 0);
  assert.equal(headEvidence.repositories.length, 16);
  assert.ok(headEvidence.repositories.every(({ attempts }) => attempts >= 1 && attempts <= 3));
  assert.deepEqual(
    headEvidence.repositories.map(({ name, observedHead }) => ({ name, observedHead })),
    pool.repositoryPool.map(({ name, pinnedHead }) => ({ name, observedHead: pinnedHead }))
  );
  assert.ok(pool.repositoryPool.every(({ pinnedHead }) => /^[0-9a-f]{40}$/.test(pinnedHead)));
});

test("Round 16 pool freezer is create-only and cannot inspect repository history", async () => {
  const [source, failedAttempt] = await Promise.all([
    readFile(path.join(root, "scripts/freeze-local-blind-repository-pool-round-16.cjs"), "utf8"),
    readJson(failedHeadEvidenceRelativePath)
  ]);
  assert.equal((source.match(/spawnSync\("git"/g) ?? []).length, 1);
  assert.match(source, /spawnSync\("git", \["ls-remote", url, "HEAD"\]/);
  assert.doesNotMatch(source, /spawnSync\("palace"|execFileSync\("palace"/);
  assert.doesNotMatch(source, /\["(?:clone|fetch|log|show|rev-list|diff)"/);
  assert.equal((source.match(/flag: "wx"/g) ?? []).length, 2);
  assert.match(source, /maximumHeadAttempts = 3/);
  assert.equal(failedAttempt.status, "verification-failed");
  assert.equal(failedAttempt.category, "transient-github-connectivity-failure");
  assert.equal(failedAttempt.canonicalPoolWritten, false);
  assert.equal(failedAttempt.canonicalHeadEvidenceWritten, false);
  assert.equal(failedAttempt.commitHistoryInspected, false);
  assert.equal(failedAttempt.candidateTaskInspected, false);
  assert.equal(failedAttempt.palaceCallsOnCandidateTasks, 0);
});

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}
