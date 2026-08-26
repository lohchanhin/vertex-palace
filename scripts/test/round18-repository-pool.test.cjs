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
const studyId = "local-blind-routing-round-18-0.4-alpha";
const planRelativePath =
  "docs/research/evidence/local-blind-routing-repository-plan-0.4-alpha-round-18.json";
const round17PlanRelativePath =
  "docs/research/evidence/local-blind-routing-repository-plan-0.4-alpha-round-17.json";
const poolRelativePath =
  "docs/research/evidence/local-blind-routing-repository-pool-0.4-alpha-round-18.json";
const headEvidenceRelativePath =
  "docs/research/evidence/local-blind-routing-repository-head-verification-0.4-alpha-round-18.json";
const failureEvidenceRelativePath =
  "docs/research/evidence/local-blind-routing-repository-pool-freeze-round-18-attempt-1-failure.json";
const freezeRelativePath =
  "docs/research/evidence/local-blind-candidate-freeze-0.4-alpha-round-18.json";

test("Round 18 plan excludes 190 observed identities and reuses only unqueried Round 17 entries", async () => {
  const [plan, round17Plan] = await Promise.all([
    readJson(planRelativePath),
    readJson(round17PlanRelativePath)
  ]);
  const priorBytes = await readFile(path.join(root, plan.priorExclusionSource.path));
  assert.equal(sha256Bytes(priorBytes), plan.priorExclusionSource.sha256);
  const prior = JSON.parse(priorBytes.toString("utf8"));
  const observed = await collectObservedRepositories({ root, document: prior });
  assert.equal(observed.size, 190);

  const planned = new Set(plan.repositoryPlan.map(({ url }) => normalizeRepositoryUrl(url)));
  assert.equal(plan.repositoryPlan.length, 32);
  assert.equal(planned.size, 32);
  for (const repository of plan.repositoryPlan) assert.ok(!observed.has(normalizeRepositoryUrl(repository.url)));

  const unqueriedRound17 = round17Plan.repositoryPlan
    .slice(12)
    .map(({ url }) => normalizeRepositoryUrl(url));
  assert.equal(unqueriedRound17.length, 20);
  assert.ok(unqueriedRound17.every((url) => planned.has(url)));
  assert.equal([...planned].filter((url) => unqueriedRound17.includes(url)).length, 20);

  assert.deepEqual(
    plan.repositoryPlan.map(({ languageFamily }) => languageFamily),
    Array.from({ length: 8 }, () => plan.rules.requiredLanguageFamilies).flat()
  );
  for (const family of plan.rules.requiredLanguageFamilies) {
    assert.equal(plan.repositoryPlan.filter(({ languageFamily }) => languageFamily === family).length, 8);
  }
});

test.skip("Round 18 canonical pool is not applicable after the preserved invalid-URL failure", async () => {
  const [planBytes, pool, headEvidence] = await Promise.all([
    readFile(path.join(root, planRelativePath)),
    readJson(poolRelativePath),
    readJson(headEvidenceRelativePath)
  ]);
  await validateRepositoryPool({ root, pool, studyId, freezeRelativePath });

  assert.equal(pool.plan.path, planRelativePath);
  assert.equal(pool.plan.sha256, sha256Bytes(planBytes));
  assert.deepEqual(pool.previouslyObservedRepositories, []);
  assert.equal(pool.rules.repositoriesPerLanguageFamily, 8);
  assert.equal(headEvidence.status, "verified");
  assert.equal(headEvidence.commandContract, "git ls-remote <url> HEAD");
  assert.equal(headEvidence.commitHistoryInspected, false);
  assert.equal(headEvidence.candidateTaskInspected, false);
  assert.equal(headEvidence.palaceCallsOnCandidateTasks, 0);
  assert.equal(headEvidence.repositories.length, 32);
  assert.ok(headEvidence.repositories.every(({ attempts }) => attempts >= 1 && attempts <= 3));
  assert.deepEqual(
    headEvidence.repositories.map(({ name, observedHead }) => ({ name, observedHead })),
    pool.repositoryPool.map(({ name, pinnedHead }) => ({ name, observedHead: pinnedHead }))
  );
  assert.ok(pool.repositoryPool.every(({ pinnedHead }) => /^[0-9a-f]{40}$/.test(pinnedHead)));
  await assert.rejects(readFile(path.join(root, failureEvidenceRelativePath)), { code: "ENOENT" });
});

test("Round 18 freezer is create-only, HEAD-only, and records failures without substitution", async () => {
  const source = await readFile(
    path.join(root, "scripts/freeze-local-blind-repository-pool-round-18.cjs"),
    "utf8"
  );
  assert.equal((source.match(/spawnSync\("git"/g) ?? []).length, 1);
  assert.match(source, /spawnSync\("git", \["ls-remote", url, "HEAD"\]/);
  assert.doesNotMatch(source, /spawnSync\("palace"|execFileSync\("palace"/);
  assert.doesNotMatch(source, /\["(?:clone|fetch|log|show|rev-list|diff)"/);
  assert.equal((source.match(/flag: "wx"/g) ?? []).length, 3);
  assert.match(source, /writePoolFailure/);
  assert.match(source, /previouslyObservedRepositories: attemptedRepositories/);
  assert.match(source, /expectedUniqueRepositoryCount, 190/);
  assert.match(source, /repositoryPlan\.length, 32/);
  assert.match(source, /repositoriesPerLanguageFamily, 8/);
});

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}
