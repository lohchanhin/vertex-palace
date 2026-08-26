const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const {
  assertCandidateFreeze,
  sha256Bytes
} = require("../lib/local-blind-freeze.cjs");

const root = path.resolve(__dirname, "../..");
const studyId = "local-blind-routing-round-16-0.4-alpha";
const freezePath = path.join(
  root,
  "docs/research/evidence/local-blind-candidate-freeze-0.4-alpha-round-16.json"
);

test("Round 16 candidate freeze binds the verified candidate and all selection machinery", async () => {
  const { freeze } = await assertCandidateFreeze({ root, freezePath, studyId });
  const requiredArtifacts = [
    "docs/research/LOCAL_BLIND_ROUTING_TARGET_SELECTION_PROTOCOL_0_4_ALPHA_ROUND_16.md",
    "docs/zh-CN/LOCAL_BLIND_ROUTING_TARGET_SELECTION_PROTOCOL_0_4_ALPHA_ROUND_16.md",
    "docs/research/evidence/local-blind-routing-repository-plan-0.4-alpha-round-16.json",
    "docs/research/evidence/local-blind-routing-repository-pool-0.4-alpha-round-16.json",
    "docs/research/evidence/local-blind-routing-repository-head-verification-0.4-alpha-round-16.json",
    "docs/research/evidence/local-blind-routing-repository-head-verification-attempt-1-failure-0.4-alpha-round-16.json",
    "docs/research/evidence/local-blind-routing-repository-head-verification-attempt-2-failure-0.4-alpha-round-16.json",
    "docs/research/evidence/local-blind-routing-prefreeze-verification-0.4-alpha-round-16.json",
    "scripts/freeze-local-blind-repository-pool-round-16.cjs",
    "scripts/prepare-local-blind-routing-candidates-round-16.cjs",
    "scripts/finalize-local-blind-routing-targets-round-16.cjs",
    "scripts/lib/task-diff-coherence.cjs",
    "scripts/lib/round16-target-selection.cjs",
    "scripts/lib/local-blind-freeze.cjs",
    "scripts/test/round16-local-blind-selection-freeze.test.cjs"
  ];
  for (const artifact of requiredArtifacts) {
    assert.match(freeze.artifacts[artifact], /^[0-9A-F]{64}$/, `${artifact} is not frozen`);
  }
  assert.equal(freeze.candidate.role, "post-round-15-evidence-closure-candidate");
  assert.equal(freeze.selectionRules.candidateTaskHistoryObservedBeforeFreeze, false);
  assert.equal(freeze.selectionRules.candidateTaskDiffObservedBeforeFreeze, false);
  assert.equal(freeze.selectionRules.palaceCallsOnCandidateTasksBeforeFreeze, 0);
  assert.equal(freeze.selectionRules.wholeTargetSemanticReviewRequired, true);
  assert.equal(freeze.selectionRules.partialOraclePruningForbidden, true);
  assert.equal(freeze.selectionRules.productChangesForbiddenUntilFirstResultPreserved, true);
});

test("Round 16 freeze binds the 16-of-16 HEAD check and passing pre-freeze suite", async () => {
  const freeze = JSON.parse(await readFile(freezePath, "utf8"));
  const headBytes = await readFile(path.join(root, freeze.preFreezeEvidence.repositoryHeads.path));
  const headEvidence = JSON.parse(headBytes.toString("utf8"));
  const verificationBytes = await readFile(path.join(root, freeze.preFreezeEvidence.verification.path));
  const verification = JSON.parse(verificationBytes.toString("utf8"));

  assert.equal(sha256Bytes(headBytes), freeze.preFreezeEvidence.repositoryHeads.sha256);
  assert.equal(headEvidence.status, "verified");
  assert.equal(headEvidence.repositories.length, 16);
  assert.ok(headEvidence.repositories.every(({ matchedFrozenPool }) => matchedFrozenPool));
  assert.ok(headEvidence.repositories.every(({ attempts }) => attempts >= 1 && attempts <= 3));
  assert.equal(headEvidence.commitHistoryInspected, false);
  assert.equal(headEvidence.candidateTaskInspected, false);
  assert.equal(freeze.preFreezeEvidence.repositoryHeads.failedAttempts.length, 2);
  const failedHeadAttempts = [];
  for (const failedHeadAttempt of freeze.preFreezeEvidence.repositoryHeads.failedAttempts) {
    const failedHeadBytes = await readFile(path.join(root, failedHeadAttempt.path));
    const failedHead = JSON.parse(failedHeadBytes.toString("utf8"));
    assert.equal(sha256Bytes(failedHeadBytes), failedHeadAttempt.sha256);
    assert.equal(failedHead.status, "verification-failed");
    assert.equal(failedHead.commitHistoryInspected, false);
    assert.equal(failedHead.candidateTaskInspected, false);
    failedHeadAttempts.push(failedHeadAttempt.category);
  }
  assert.deepEqual(failedHeadAttempts, [
    "transient-github-connectivity-failure",
    "post-head-pool-validation-harness-contract-failure"
  ]);

  assert.equal(sha256Bytes(verificationBytes), freeze.preFreezeEvidence.verification.sha256);
  assert.equal(verification.status, "passed");
  assert.equal(verification.results.length, 6);
  assert.ok(verification.results.every(({ status }) => status === "passed"));
  assert.deepEqual(verification.candidate.sourceTree, freeze.candidate.sourceTree);
  assert.equal(verification.candidate.cliSha256, freeze.candidate.cliSha256);
  assert.equal(verification.candidate.generatedMcpSha256, freeze.candidate.generatedMcpSha256);

  assert.deepEqual(freeze.preFreezeEvidence.failedAttempts, []);
});

test("Round 16 freeze preserves the competition and claim boundaries", async () => {
  const freeze = JSON.parse(await readFile(freezePath, "utf8"));
  assert.equal(freeze.publicPreregistration, false);
  assert.equal(freeze.competitionFreeze.noCommit, true);
  assert.equal(freeze.competitionFreeze.noPush, true);
  assert.equal(freeze.competitionFreeze.noTag, true);
  assert.equal(freeze.competitionFreeze.noNpmPublish, true);
  assert.equal(freeze.amendment, undefined);
  assert.match(freeze.claimBoundary, /not public preregistration/i);
  assert.match(freeze.claimBoundary, /cannot establish Agent correctness/i);
});

