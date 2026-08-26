const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const { collectObservedRepositories, sha256Bytes } = require("../lib/local-blind-freeze.cjs");

const root = path.resolve(__dirname, "..", "..");
const failureRelativePath =
  "docs/research/evidence/local-blind-routing-repository-pool-freeze-round-17-attempt-1-failure.json";

test("Round 17 preserves the invalid-URL pool-freeze failure before product exposure", async () => {
  const failure = await readJson(failureRelativePath);
  const planBytes = await readFile(path.join(root, failure.plan.path));
  const plan = JSON.parse(planBytes.toString("utf8"));

  assert.equal(failure.status, "repository-pool-freeze-failed");
  assert.equal(sha256Bytes(planBytes), failure.plan.sha256);
  assert.equal(failure.failure.category, "invalid-planned-repository-url");
  assert.equal(failure.failure.repositoryOrdinal, 12);
  assert.equal(failure.failure.url, plan.repositoryPlan[11].url);
  assert.match(failure.failure.diagnostic, /Repository not found/);
  assert.deepEqual(
    failure.execution.attemptedRepositories,
    plan.repositoryPlan.slice(0, 12).map(({ url }) => url)
  );
  assert.deepEqual(failure.previouslyObservedRepositories, failure.execution.attemptedRepositories);
  assert.equal(failure.execution.completedHeadQueriesBeforeFailure, 11);
  assert.equal(failure.execution.unqueriedRepositories, 20);
  assert.equal(failure.execution.commitHistoryInspected, false);
  assert.equal(failure.execution.candidateTaskInspected, false);
  assert.equal(failure.execution.candidateDiffInspected, false);
  assert.equal(failure.execution.palaceCallsOnCandidateTasks, 0);
  const recursiveObserved = await collectObservedRepositories({ root, document: failure });
  assert.equal(recursiveObserved.size, 190);
});

test("Round 17 failure did not produce canonical pool artifacts or authorize validation", async () => {
  const failure = await readJson(failureRelativePath);
  await assertMissing(failure.outputs.canonicalPoolPath);
  await assertMissing(failure.outputs.canonicalHeadEvidencePath);
  assert.equal(failure.outputs.canonicalPoolWritten, false);
  assert.equal(failure.outputs.canonicalHeadEvidenceWritten, false);
  assert.equal(failure.outputs.candidateFreezeWritten, false);
  assert.equal(failure.outputs.targetSelectionStarted, false);
  assert.equal(failure.outputs.staticValidationAuthorized, false);
  assert.equal(failure.outputs.agentStudyAuthorized, false);
  assert.equal(failure.nextRoundExclusion.expectedAttemptedRepositoryCount, 12);
});

async function assertMissing(relativePath) {
  await assert.rejects(readFile(path.join(root, relativePath)), { code: "ENOENT" });
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}
