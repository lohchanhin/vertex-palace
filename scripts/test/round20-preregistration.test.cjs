const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const {
  collectObservedRepositories,
  normalizeRepositoryUrl,
  sha256Bytes
} = require("../lib/local-blind-freeze.cjs");

const root = path.resolve(__dirname, "..", "..");
const planPath = path.join(
  root,
  "docs/research/evidence/local-blind-routing-repository-plan-0.4-stable-round-20.json"
);

test("Round 20 preregisters a fresh balanced roster before remote HEAD queries", async () => {
  const plan = JSON.parse(await readFile(planPath, "utf8"));
  assert.equal(plan.studyId, "local-blind-routing-round-20-0.4-stable-candidate");
  assert.equal(plan.status, "preregistered-before-head-query");
  assert.equal(plan.publicPreregistration, true);
  assert.equal(plan.repositoryPlan.length, 48);
  assert.equal(new Set(plan.repositoryPlan.map(({ url }) => normalizeRepositoryUrl(url))).size, 48);

  for (const family of plan.rules.requiredLanguageFamilies) {
    assert.equal(plan.repositoryPlan.filter(({ languageFamily }) => languageFamily === family).length, 12);
  }

  const priorBytes = await readFile(path.join(root, plan.priorExclusionSource.path));
  assert.equal(sha256Bytes(priorBytes), plan.priorExclusionSource.sha256);
  const observed = await collectObservedRepositories({
    root,
    document: JSON.parse(priorBytes.toString("utf8"))
  });
  assert.equal(observed.size, plan.priorExclusionSource.expectedUniqueRepositoryCount);
  for (const repository of plan.repositoryPlan) {
    assert.equal(observed.has(normalizeRepositoryUrl(repository.url)), false, repository.name);
  }
});

test("Round 20 freezes the stable release decision before observation", async () => {
  const protocol = await readFile(
    path.join(root, "docs/research/LOCAL_BLIND_ROUTING_VALIDATION_PROTOCOL_0_4_STABLE_ROUND_20.md"),
    "utf8"
  );
  assert.match(protocol, /target-macro changed-file coverage is at least `0\.90`/);
  assert.match(protocol, /target-macro route focus is at least `0\.70`/);
  assert.match(protocol, /If the Round 20 gate fails, `0\.4\.0-alpha\.1` remains on npm `next`/);
  assert.match(protocol, /does not claim general Agent performance acceleration/);
});
