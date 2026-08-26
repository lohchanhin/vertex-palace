const assert = require("node:assert/strict");
const {
  validateTaskDiffCoherencePacket,
  validateTaskDiffCoherenceReview
} = require("./task-diff-coherence.cjs");

function finalizeReviewedTargets({ pool, queue, reviewBundle }) {
  validateQueue(pool, queue);
  validateReviewBundle(queue, reviewBundle);

  const queueReports = new Map(queue.repositoryReports.map((report) => [report.name, report]));
  const reviewEntries = new Map();
  for (const entry of reviewBundle.reviews) {
    const key = reviewKey(entry.repository, entry.candidateId);
    assert.ok(!reviewEntries.has(key), `Duplicate review: ${key}`);
    reviewEntries.set(key, entry);
  }

  const usedReviews = new Set();
  const selectedTargets = [];
  const repositoryReports = [];
  const selectedPerLanguageFamily = new Map(
    pool.rules.requiredLanguageFamilies.map((family) => [family, 0])
  );
  let generatedArtifactTargets = 0;

  for (const repository of pool.repositoryPool) {
    const queueReport = queueReports.get(repository.name);
    const selectedInFamily = selectedPerLanguageFamily.get(repository.languageFamily) ?? 0;
    if (selectedInFamily >= pool.rules.targetsPerLanguageFamily) {
      assertNoReviewsForRepository(reviewEntries, repository.name);
      repositoryReports.push({
        name: repository.name,
        languageFamily: repository.languageFamily,
        status: "family-quota-filled-not-reviewed",
        reviewedCandidates: [],
        selectedCandidateId: null
      });
      continue;
    }

    const reviewedCandidates = [];
    let acceptedCandidate = null;
    for (const candidate of queueReport.candidates) {
      const key = reviewKey(repository.name, candidate.candidateId);
      const reviewEntry = reviewEntries.get(key);
      assert.ok(reviewEntry, `Missing newest-first review for ${key}`);
      usedReviews.add(key);
      assert.equal(reviewEntry.repository, repository.name);
      assert.equal(reviewEntry.candidateId, candidate.candidateId);

      const reviewSummary = validateTaskDiffCoherenceReview(
        candidate.coherencePacket,
        reviewEntry.review
      );
      const generatedArtifact = validateGeneratedArtifactAssessment(
        candidate.target,
        reviewEntry.generatedArtifactAssessment
      );
      reviewedCandidates.push({
        candidateId: candidate.candidateId,
        candidateRank: candidate.candidateRank,
        groundTruthCommit: candidate.target.groundTruthCommit,
        decision: reviewSummary.decision,
        reviewedFiles: reviewSummary.reviewedFiles,
        reviewedHunks: reviewSummary.reviewedHunks,
        unrelatedHunks: reviewSummary.unrelatedHunks,
        uncertainHunks: reviewSummary.uncertainHunks,
        packetSha256: candidate.coherencePacket.packetSha256,
        generatedArtifact
      });

      if (reviewSummary.decision === "accept") {
        acceptedCandidate = { candidate, generatedArtifact };
        break;
      }
    }

    if (acceptedCandidate) {
      assertNoLaterCandidateReviews({
        reviewEntries,
        repository: repository.name,
        candidates: queueReport.candidates,
        acceptedRank: acceptedCandidate.candidate.candidateRank
      });
      if (acceptedCandidate.generatedArtifact.isGeneratedArtifactTarget) {
        generatedArtifactTargets += 1;
      }
      selectedTargets.push({
        ...acceptedCandidate.candidate.target,
        candidateId: acceptedCandidate.candidate.candidateId,
        candidateRank: acceptedCandidate.candidate.candidateRank,
        coherencePacketSha256: acceptedCandidate.candidate.coherencePacket.packetSha256,
        generatedArtifactAssessment: acceptedCandidate.generatedArtifact
      });
      selectedPerLanguageFamily.set(repository.languageFamily, selectedInFamily + 1);
      repositoryReports.push({
        name: repository.name,
        languageFamily: repository.languageFamily,
        status: "selected-newest-coherent-candidate",
        reviewedCandidates,
        selectedCandidateId: acceptedCandidate.candidate.candidateId
      });
    } else {
      repositoryReports.push({
        name: repository.name,
        languageFamily: repository.languageFamily,
        status: queueReport.candidates.length
          ? "no-coherent-candidate"
          : "no-mechanical-candidate",
        reviewedCandidates,
        selectedCandidateId: null
      });
    }
  }

  assert.equal(usedReviews.size, reviewEntries.size, "Review bundle contains out-of-order or unused reviews");
  assert.ok(
    generatedArtifactTargets <= pool.rules.maximumGeneratedArtifactTargets,
    "Too many selected generated-artifact targets"
  );

  const selectedCounts = Object.fromEntries(selectedPerLanguageFamily);
  const languageDiversitySatisfied = pool.rules.requiredLanguageFamilies.every(
    (family) => selectedCounts[family] === pool.rules.targetsPerLanguageFamily
  );
  return {
    status: selectedTargets.length === pool.rules.desiredTargets && languageDiversitySatisfied
      ? "selected"
      : "selection-failed",
    selectedTargets,
    repositoryReports,
    rules: {
      newestCoherentCandidatePerRepositoryWins: true,
      repositoryOrderIsBinding: true,
      familyQuotaStopsLaterReviews: true,
      wholeTargetRejection: true,
      partialOraclePruningForbidden: true,
      selectedPerLanguageFamily: selectedCounts,
      languageDiversitySatisfied,
      generatedArtifactTargets,
      maximumGeneratedArtifactTargets: pool.rules.maximumGeneratedArtifactTargets,
      palaceCallsOnCandidateTasksBeforeFinalization: 0
    }
  };
}

function validateQueue(pool, queue) {
  assert.equal(queue.schemaVersion, 1);
  assert.equal(queue.studyId, pool.studyId);
  assert.equal(queue.status, "candidate-queue-ready");
  assert.equal(queue.palaceCallsOnCandidateTasks, 0);
  assert.equal(queue.repositoryReports.length, pool.repositoryPool.length);
  assert.deepEqual(
    queue.repositoryReports.map(({ name }) => name),
    pool.repositoryPool.map(({ name }) => name),
    "Queue repository order differs from the frozen pool"
  );

  const candidateIds = new Set();
  for (let repositoryIndex = 0; repositoryIndex < pool.repositoryPool.length; repositoryIndex += 1) {
    const repository = pool.repositoryPool[repositoryIndex];
    const report = queue.repositoryReports[repositoryIndex];
    assert.equal(report.languageFamily, repository.languageFamily);
    assert.equal(report.status, "inspected");
    assert.ok(Array.isArray(report.candidates));
    assert.ok(report.candidates.length <= pool.rules.maximumMechanicalCandidatesPerRepository);
    for (let candidateIndex = 0; candidateIndex < report.candidates.length; candidateIndex += 1) {
      const candidate = report.candidates[candidateIndex];
      assert.equal(candidate.candidateRank, candidateIndex + 1);
      assert.ok(!candidateIds.has(candidate.candidateId), `Duplicate candidate ID: ${candidate.candidateId}`);
      candidateIds.add(candidate.candidateId);
      assert.equal(candidate.target.name, repository.name);
      assert.equal(candidate.target.languageFamily, repository.languageFamily);
      assert.equal(candidate.coherencePacket.target.name, repository.name);
      assert.equal(candidate.coherencePacket.target.task, candidate.target.task);
      assert.equal(candidate.coherencePacket.target.routeCommit, candidate.target.routeCommit);
      assert.equal(candidate.coherencePacket.target.groundTruthCommit, candidate.target.groundTruthCommit);
      validateTaskDiffCoherencePacket(candidate.coherencePacket);
    }
  }
}

function validateReviewBundle(queue, reviewBundle) {
  assert.equal(reviewBundle.schemaVersion, 1);
  assert.equal(reviewBundle.studyId, queue.studyId);
  assert.equal(reviewBundle.status, "review-complete");
  assert.equal(reviewBundle.reviewBoundary, "single-developer-delegated-semantic-reviewer");
  assert.equal(reviewBundle.reviewer.independent, false);
  assert.equal(reviewBundle.reviewer.interRaterAgreementAvailable, false);
  assert.equal(reviewBundle.timing.candidateFrozenBeforeReview, true);
  assert.equal(reviewBundle.timing.reviewBeforeAnyPalaceCall, true);
  assert.equal(reviewBundle.timing.palaceCallsOnCandidateTasks, 0);
  assert.ok(Array.isArray(reviewBundle.reviews));
}

function validateGeneratedArtifactAssessment(target, assessment) {
  assert.ok(assessment && typeof assessment === "object", "Generated-artifact assessment is required");
  assert.equal(typeof assessment.isGeneratedArtifactTarget, "boolean");
  assertSpecificReason(assessment.reason, "generated-artifact assessment");
  if (!assessment.isGeneratedArtifactTarget) {
    assert.equal(assessment.ownerGeneratorPath, null);
    assert.deepEqual(assessment.generatedOutputPaths, []);
    return {
      isGeneratedArtifactTarget: false,
      reason: assessment.reason,
      ownerGeneratorPath: null,
      generatedOutputPaths: []
    };
  }

  assert.ok(target.changedFiles.includes(assessment.ownerGeneratorPath), "Generator owner is outside the target oracle");
  assert.ok(Array.isArray(assessment.generatedOutputPaths) && assessment.generatedOutputPaths.length > 0);
  assert.equal(new Set(assessment.generatedOutputPaths).size, assessment.generatedOutputPaths.length);
  assert.ok(!assessment.generatedOutputPaths.includes(assessment.ownerGeneratorPath));
  for (const outputPath of assessment.generatedOutputPaths) {
    assert.ok(target.changedFiles.includes(outputPath), `${outputPath} is outside the target oracle`);
  }
  return {
    isGeneratedArtifactTarget: true,
    reason: assessment.reason,
    ownerGeneratorPath: assessment.ownerGeneratorPath,
    generatedOutputPaths: [...assessment.generatedOutputPaths]
  };
}

function assertNoReviewsForRepository(reviewEntries, repository) {
  assert.ok(
    ![...reviewEntries.keys()].some((key) => key.startsWith(`${repository}:`)),
    `${repository} was reviewed after its language-family quota was filled`
  );
}

function assertNoLaterCandidateReviews({ reviewEntries, repository, candidates, acceptedRank }) {
  for (const candidate of candidates) {
    if (candidate.candidateRank <= acceptedRank) continue;
    assert.ok(
      !reviewEntries.has(reviewKey(repository, candidate.candidateId)),
      `${repository} contains a review after the newest accepted candidate`
    );
  }
}

function reviewKey(repository, candidateId) {
  return `${repository}:${candidateId}`;
}

function assertSpecificReason(reason, label) {
  assert.ok(typeof reason === "string" && reason.trim().length >= 12, `${label} requires a specific reason`);
}

module.exports = {
  finalizeReviewedTargets,
  reviewKey,
  validateGeneratedArtifactAssessment,
  validateQueue,
  validateReviewBundle
};


