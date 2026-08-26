const assert = require("node:assert/strict");
const test = require("node:test");
const { buildTaskDiffCoherencePacket } = require("../lib/task-diff-coherence.cjs");
const {
  finalizeReviewedTargets,
  validateGeneratedArtifactAssessment
} = require("../lib/round19-target-selection.cjs");

test("selects the newest coherent candidate and stops later review deterministically", () => {
  const pool = fixturePool();
  const first = fixtureCandidate("repo-a", "candidate_first", 1, "a1");
  const second = fixtureCandidate("repo-a", "candidate_second", 2, "a2");
  const older = fixtureCandidate("repo-a", "candidate_older", 3, "a3");
  const fallback = fixtureCandidate("repo-b", "candidate_fallback", 1, "b1");
  const queue = fixtureQueue([
    fixtureRepositoryReport("repo-a", [first, second, older]),
    fixtureRepositoryReport("repo-b", [fallback])
  ]);
  const reviewBundle = fixtureReviewBundle(queue, [
    fixtureReviewEntry("repo-a", first, "reject"),
    fixtureReviewEntry("repo-a", second, "accept")
  ]);

  const result = finalizeReviewedTargets({ pool, queue, reviewBundle });

  assert.equal(result.status, "selected");
  assert.equal(result.selectedTargets.length, 1);
  assert.equal(result.selectedTargets[0].candidateId, "candidate_second");
  assert.equal(result.repositoryReports[0].reviewedCandidates.length, 2);
  assert.equal(result.repositoryReports[1].status, "family-quota-filled-not-reviewed");
  assert.equal(result.rules.palaceCallsOnCandidateTasksBeforeFinalization, 0);
});

test("requires every newest candidate before an accepted older candidate", () => {
  const pool = fixturePool();
  const first = fixtureCandidate("repo-a", "candidate_first", 1, "a1");
  const second = fixtureCandidate("repo-a", "candidate_second", 2, "a2");
  const queue = fixtureQueue([
    fixtureRepositoryReport("repo-a", [first, second]),
    fixtureRepositoryReport("repo-b", [])
  ]);
  const reviewBundle = fixtureReviewBundle(queue, [
    fixtureReviewEntry("repo-a", first, "reject")
  ]);

  assert.throws(
    () => finalizeReviewedTargets({ pool, queue, reviewBundle }),
    /Missing newest-first review for repo-a:candidate_second/
  );
});

test("rejects discretionary reviews after the first accepted candidate", () => {
  const pool = fixturePool();
  const first = fixtureCandidate("repo-a", "candidate_first", 1, "a1");
  const second = fixtureCandidate("repo-a", "candidate_second", 2, "a2");
  const queue = fixtureQueue([
    fixtureRepositoryReport("repo-a", [first, second]),
    fixtureRepositoryReport("repo-b", [])
  ]);
  const reviewBundle = fixtureReviewBundle(queue, [
    fixtureReviewEntry("repo-a", first, "accept"),
    fixtureReviewEntry("repo-a", second, "accept")
  ]);

  assert.throws(
    () => finalizeReviewedTargets({ pool, queue, reviewBundle }),
    /contains a review after the newest accepted candidate/
  );
});

test("requires generated outputs and their owning generator to remain in the whole oracle", () => {
  const target = {
    changedFiles: ["codegen/generate.rs", "tests/generated/output.rs"]
  };
  const valid = validateGeneratedArtifactAssessment(target, {
    isGeneratedArtifactTarget: true,
    reason: "The generator writes the reviewed output used by the focused test.",
    ownerGeneratorPath: "codegen/generate.rs",
    generatedOutputPaths: ["tests/generated/output.rs"]
  });
  assert.equal(valid.isGeneratedArtifactTarget, true);

  assert.throws(
    () => validateGeneratedArtifactAssessment(target, {
      isGeneratedArtifactTarget: true,
      reason: "The claimed owner is not part of this frozen whole target oracle.",
      ownerGeneratorPath: "codegen/missing.rs",
      generatedOutputPaths: ["tests/generated/output.rs"]
    }),
    /Generator owner is outside the target oracle/
  );
});

function fixturePool() {
  return {
    studyId: "round19-fixture",
    rules: {
      desiredTargets: 1,
      requiredLanguageFamilies: ["javascript-typescript"],
      targetsPerLanguageFamily: 1,
      maximumMechanicalCandidatesPerRepository: 5,
      maximumGeneratedArtifactTargets: 1
    },
    repositoryPool: [
      { name: "repo-a", languageFamily: "javascript-typescript" },
      { name: "repo-b", languageFamily: "javascript-typescript" }
    ]
  };
}

function fixtureQueue(repositoryReports) {
  return {
    schemaVersion: 1,
    studyId: "round19-fixture",
    status: "candidate-queue-ready",
    palaceCallsOnCandidateTasks: 0,
    repositoryReports
  };
}

function fixtureRepositoryReport(name, candidates) {
  return {
    name,
    languageFamily: "javascript-typescript",
    status: "inspected",
    candidates
  };
}

function fixtureCandidate(repository, candidateId, candidateRank, suffix) {
  const target = {
    name: repository,
    language: "JavaScript/TypeScript",
    languageFamily: "javascript-typescript",
    url: `https://example.test/${repository}.git`,
    pinnedHead: suffix.padEnd(40, "0"),
    routeCommit: suffix.padEnd(40, "1"),
    groundTruthCommit: suffix.padEnd(40, "2"),
    task: "Fix the parser behavior for a focused edge case",
    expectedTaskType: "bugfix",
    changedFiles: ["src/parser.js", "test/parser.test.js"],
    implementationFiles: ["src/parser.js"],
    testFiles: ["test/parser.test.js"],
    auxiliaryFiles: []
  };
  const diffText = [
    "diff --git a/src/parser.js b/src/parser.js",
    "--- a/src/parser.js",
    "+++ b/src/parser.js",
    "@@ -1 +1 @@",
    "-return oldValue;",
    "+return newValue;",
    "diff --git a/test/parser.test.js b/test/parser.test.js",
    "--- a/test/parser.test.js",
    "+++ b/test/parser.test.js",
    "@@ -1 +1 @@",
    "-expect(oldValue);",
    "+expect(newValue);"
  ].join("\n");
  return {
    candidateId,
    candidateRank,
    target,
    coherencePacket: buildTaskDiffCoherencePacket({
      target,
      diffText,
      generatedAt: "2026-08-10T00:00:00.000Z"
    })
  };
}

function fixtureReviewBundle(queue, reviews) {
  return {
    schemaVersion: 1,
    studyId: queue.studyId,
    status: "review-complete",
    reviewBoundary: "single-developer-delegated-semantic-reviewer",
    reviewer: {
      independent: false,
      interRaterAgreementAvailable: false
    },
    timing: {
      candidateFrozenBeforeReview: true,
      reviewBeforeAnyPalaceCall: true,
      palaceCallsOnCandidateTasks: 0
    },
    reviews
  };
}

function fixtureReviewEntry(repository, candidate, targetDecision) {
  const rejectHunkId = candidate.coherencePacket.files[0].hunks[0].id;
  return {
    repository,
    candidateId: candidate.candidateId,
    generatedArtifactAssessment: {
      isGeneratedArtifactTarget: false,
      reason: "No generated artifact relationship appears in this candidate.",
      ownerGeneratorPath: null,
      generatedOutputPaths: []
    },
    review: {
      schemaVersion: 1,
      packetSha256: candidate.coherencePacket.packetSha256,
      reviewTiming: "pre-route",
      reviewPerformedAfterCandidateFreeze: true,
      reviewedWithoutPalaceOutput: true,
      palaceCallsOnCandidateTask: 0,
      targetDecision,
      files: candidate.coherencePacket.files.map((file) => {
        const rejectedFile = targetDecision === "reject"
          && file.hunks.some(({ id }) => id === rejectHunkId);
        return {
          path: file.path,
          decision: rejectedFile ? "uncertain" : "task-aligned",
          reason: rejectedFile
            ? "The first hunk cannot be tied confidently to the frozen task."
            : "Every hunk in this file directly supports the frozen task behavior.",
          hunks: file.hunks.map((hunk) => ({
            id: hunk.id,
            decision: targetDecision === "reject" && hunk.id === rejectHunkId
              ? "uncertain"
              : "task-aligned",
            reason: targetDecision === "reject" && hunk.id === rejectHunkId
              ? "This hunk has an ambiguous relationship to the stated behavior."
              : "This hunk directly implements or verifies the stated behavior."
          }))
        };
      })
    }
  };
}



