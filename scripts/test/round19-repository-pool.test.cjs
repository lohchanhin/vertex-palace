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
const studyId = "local-blind-routing-round-19-0.4-alpha";
const planRelativePath =
  "docs/research/evidence/local-blind-routing-repository-plan-0.4-alpha-round-19.json";
const round18PlanRelativePath =
  "docs/research/evidence/local-blind-routing-repository-plan-0.4-alpha-round-18.json";
const poolRelativePath =
  "docs/research/evidence/local-blind-routing-repository-pool-0.4-alpha-round-19.json";
const headEvidenceRelativePath =
  "docs/research/evidence/local-blind-routing-repository-head-verification-0.4-alpha-round-19.json";
const failureEvidenceRelativePath =
  "docs/research/evidence/local-blind-routing-repository-pool-freeze-round-19-attempt-1-failure.json";
const freezeRelativePath =
  "docs/research/evidence/local-blind-candidate-freeze-0.4-alpha-round-19.json";

test("Round 19 roster excludes 194 observed identities and reuses only unqueried Round 18 entries", async () => {
  const [plan, round18Plan] = await Promise.all([
    readJson(planRelativePath),
    readJson(round18PlanRelativePath)
  ]);
  const priorBytes = await readFile(path.join(root, plan.priorExclusionSource.path));
  assert.equal(sha256Bytes(priorBytes), plan.priorExclusionSource.sha256);
  const observed = await collectObservedRepositories({
    root,
    document: JSON.parse(priorBytes.toString("utf8"))
  });
  assert.equal(observed.size, 194);

  const planned = new Set(plan.repositoryPlan.map(({ url }) => normalizeRepositoryUrl(url)));
  assert.equal(plan.repositoryPlan.length, 48);
  assert.equal(planned.size, 48);
  for (const repository of plan.repositoryPlan) assert.ok(!observed.has(normalizeRepositoryUrl(repository.url)));

  const unqueriedRound18 = round18Plan.repositoryPlan
    .slice(4)
    .map(({ url }) => normalizeRepositoryUrl(url));
  assert.equal(unqueriedRound18.length, 28);
  assert.ok(unqueriedRound18.every((url) => planned.has(url)));
  assert.equal([...planned].filter((url) => unqueriedRound18.includes(url)).length, 28);

  assert.deepEqual(
    plan.repositoryPlan.map(({ languageFamily }) => languageFamily),
    Array.from({ length: 12 }, () => plan.rules.requiredLanguageFamilies).flat()
  );
  for (const family of plan.rules.requiredLanguageFamilies) {
    assert.equal(plan.repositoryPlan.filter(({ languageFamily }) => languageFamily === family).length, 12);
  }
});

test("Round 19 canonical pool is the first eight reachable repositories per family", async () => {
  const [planBytes, pool, headEvidence] = await Promise.all([
    readFile(path.join(root, planRelativePath)),
    readJson(poolRelativePath),
    readJson(headEvidenceRelativePath)
  ]);
  await validateRepositoryPool({ root, pool, studyId, freezeRelativePath });

  assert.equal(pool.plan.sha256, sha256Bytes(planBytes));
  assert.equal(pool.repositoryPool.length, 32);
  assert.equal(pool.rules.repositoriesPerLanguageFamily, 8);
  assert.equal(pool.rules.rosterRepositoriesPerLanguageFamily, 12);
  assert.equal(headEvidence.status, "verified");
  assert.equal(headEvidence.commandContract, "git ls-remote <url> HEAD");
  assert.equal(headEvidence.selectionContract, "first-eight-reachable-per-family-v1");
  assert.equal(headEvidence.repositories.length, 48);
  assert.equal(headEvidence.commitHistoryInspected, false);
  assert.equal(headEvidence.candidateTaskInspected, false);
  assert.equal(headEvidence.palaceCallsOnCandidateTasks, 0);

  for (const family of pool.rules.requiredLanguageFamilies) {
    const expected = headEvidence.repositories
      .filter((entry) => entry.languageFamily === family && entry.status === "reachable")
      .slice(0, 8)
      .map(({ url }) => normalizeRepositoryUrl(url));
    const actual = pool.repositoryPool
      .filter((entry) => entry.languageFamily === family)
      .map(({ url }) => normalizeRepositoryUrl(url));
    assert.deepEqual(actual, expected);
    assert.equal(actual.length, 8);
  }
  assert.equal(headEvidence.repositories.filter(({ selectedForCanonicalPool }) => selectedForCanonicalPool).length, 32);
  assert.ok(headEvidence.repositories
    .filter(({ status }) => status === "definitively-missing")
    .every(({ diagnostic, selectedForCanonicalPool }) => /Repository not found/i.test(diagnostic) && !selectedForCanonicalPool));
  await assert.rejects(readFile(path.join(root, failureEvidenceRelativePath)), { code: "ENOENT" });
});

test("Round 19 freezer is create-only and separates missing URLs from transient failures", async () => {
  const source = await readFile(
    path.join(root, "scripts/freeze-local-blind-repository-pool-round-19.cjs"),
    "utf8"
  );
  assert.equal((source.match(/spawnSync\("git"/g) ?? []).length, 1);
  assert.match(source, /spawnSync\("git", \["ls-remote", url, "HEAD"\]/);
  assert.doesNotMatch(source, /spawnSync\("palace"|execFileSync\("palace"/);
  assert.doesNotMatch(source, /\["(?:clone|fetch|log|show|rev-list|diff)"/);
  assert.equal((source.match(/flag: "wx"/g) ?? []).length, 3);
  assert.match(source, /isDefinitivelyMissing/);
  assert.match(source, /transientNetworkExhaustionAbortsRound/);
  assert.match(source, /reachable\.slice\(0, plan\.rules\.repositoriesPerLanguageFamily\)/);
  assert.match(source, /expectedUniqueRepositoryCount, 194/);
  assert.match(source, /repositoryPlan\.length, 48/);
  assert.match(source, /rosterRepositoriesPerLanguageFamily, 12/);
  assert.match(source, /repositoriesPerLanguageFamily, 8/);
});

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}
