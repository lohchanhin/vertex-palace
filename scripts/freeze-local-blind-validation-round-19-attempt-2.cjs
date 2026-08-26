const assert = require("node:assert/strict");
const { mkdir, readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");
const {
  assertCandidateFreeze,
  sha256Bytes,
  sha256File
} = require("./lib/local-blind-freeze.cjs");
const { classifyTaskType } = require("./lib/commit-task-classifier.cjs");

const projectRoot = path.resolve(__dirname, "..");
const selectionStudyId = "local-blind-routing-round-19-0.4-alpha";
const studyId = "local-blind-routing-validation-round-19-attempt-2-0.4-alpha";
const manifestRelativePath = "docs/research/evidence/local-blind-routing-target-manifest-0.4-alpha-round-19.json";
const candidateFreezeRelativePath = "docs/research/evidence/local-blind-candidate-freeze-0.4-alpha-round-19.json";
const freezeRelativePath = "docs/research/evidence/local-blind-routing-validation-freeze-attempt-2-0.4-alpha-round-19.json";
const attempt1FreezeRelativePath = "docs/research/evidence/local-blind-routing-validation-freeze-0.4-alpha-round-19.json";
const attempt1ResultRelativePath = "docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-19-attempt-1.json";
const failureRecordRelativePath = "docs/research/evidence/local-blind-routing-validation-attempt-1-failure-record-0.4-alpha-round-19.json";
const artifactPaths = [
  "docs/research/LOCAL_BLIND_ROUTING_VALIDATION_PROTOCOL_0_4_ALPHA_ROUND_19.md",
  "docs/zh-CN/LOCAL_BLIND_ROUTING_VALIDATION_PROTOCOL_0_4_ALPHA_ROUND_19.md",
  "docs/research/LOCAL_BLIND_ROUTING_VALIDATION_PROTOCOL_0_4_ALPHA_ROUND_19_ATTEMPT_2_AMENDMENT.md",
  "docs/zh-CN/LOCAL_BLIND_ROUTING_VALIDATION_PROTOCOL_0_4_ALPHA_ROUND_19_ATTEMPT_2_AMENDMENT.md",
  "scripts/verify-local-blind-routing-round-19-attempt-2.cjs",
  "scripts/freeze-local-blind-validation-round-19-attempt-2.cjs",
  "scripts/test/round19-local-blind-validation-attempt-2.test.cjs",
  "scripts/lib/context-telemetry.cjs",
  "scripts/lib/commit-task-classifier.cjs",
  "scripts/lib/local-blind-freeze.cjs",
  "scripts/lib/task-diff-coherence.cjs",
  "scripts/lib/round19-target-selection.cjs",
  "scripts/create-round19-coherence-reviews.cjs",
  "scripts/finalize-local-blind-routing-targets-round-19.cjs",
  "scripts/test/round19-coherence-reviews.test.cjs",
  "scripts/create-round19-attempt1-failure-record.cjs",
  "scripts/test/round19-attempt1-failure-record.test.cjs",
  attempt1FreezeRelativePath,
  attempt1ResultRelativePath,
  failureRecordRelativePath
];

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  const outputPath = outputArgument(process.argv.slice(2));
  const candidateFreezePath = path.join(projectRoot, candidateFreezeRelativePath);
  const { freeze: candidateFreeze, freezeBytes: candidateFreezeBytes } = await assertCandidateFreeze({
    root: projectRoot,
    freezePath: candidateFreezePath,
    studyId: selectionStudyId
  });

  const manifestPath = path.join(projectRoot, manifestRelativePath);
  const manifestBytes = await readFile(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  assertManifest(manifest, candidateFreezeBytes);
  await assertBoundSelectionEvidence(manifest);
  const amendment = await assertAttempt1Provenance(candidateFreeze, candidateFreezeBytes);

  const artifacts = {};
  for (const relativePath of artifactPaths) {
    artifacts[relativePath] = await sha256File(path.join(projectRoot, relativePath));
  }

  const freeze = {
    schemaVersion: 1,
    studyId,
    status: "locally-frozen",
    freezeAttempt: 2,
    frozenAt: new Date().toISOString(),
    publicPreregistration: false,
    claimBoundary: "Local hash freeze for the corrected Round 19 paired static-routing replay. Attempt 1 is preserved as invalid after a generic commit-message-contract harness error exposed seven target pairs. The candidate, baseline, targets, oracles, gates, and condition order remain unchanged and no product tuning occurred. This is not a pristine first observation for those seven targets, is not public preregistration, and cannot establish Agent correctness, Token savings, tool-call reduction, or wall-time improvement.",
    competitionFreeze: candidateFreeze.competitionFreeze,
    amendment,
    inputs: {
      targetManifestPath: manifestRelativePath,
      targetManifestSha256: sha256Bytes(manifestBytes),
      candidateFreezePath: candidateFreezeRelativePath,
      candidateFreezeSha256: sha256Bytes(candidateFreezeBytes),
      candidateCliSha256: candidateFreeze.candidate.cliSha256,
      baselineCommit: candidateFreeze.comparisonBaseline.productCommit,
      baselineCliSha256: candidateFreeze.comparisonBaseline.cliSha256,
      candidateQueuePath: manifest.candidateQueue.path,
      candidateQueueSha256: manifest.candidateQueue.sha256,
      coherenceReviewsPath: manifest.semanticReview.path,
      coherenceReviewsSha256: manifest.semanticReview.sha256
    },
    protocol: {
      noPalaceResultObservedBeforeValidatorFreeze: false,
      palaceCallsOnSelectedTasksBeforeFreeze: 98,
      pairedTargetsObservedBeforeFreeze: 7,
      attempt1PartialObservationPreserved: true,
      productTuningBeforeFreeze: false,
      harnessCorrectionOnly: true,
      wholeTargetTaskCoherenceReviewedBeforeFreeze: true,
      targets: 8,
      conditions: ["baseline", "candidate"],
      repetitions: 2,
      formalObservationsPerCondition: 16,
      totalFormalObservations: 32,
      budget: 6000,
      routeLimit: 10,
      maxDrawers: 4,
      fetchDepth: 400,
      fetchMode: "complete-shallow-history-no-promisor",
      materializationAttempts: 3,
      indexAttempts: 1,
      indexTimeoutMs: 900000,
      evaluateRetries: 0,
      contextRetries: 0,
      calibrationTolerance: 0.15,
      minimumMacroCoverage: 0.9,
      minimumMacroFocus: 0.7,
      minimumTargetCoverage: 0.5,
      minimumTargetFocus: 0.4,
      pairedNonInferiorityMargin: 0.05,
      conditionOrder: "balanced-ab-ba-by-manifest-index",
      execution: "sequential-never-concurrent",
      resultCreateOnly: true,
      agentExecuted: false,
      agentToolCallsMeasured: false
    },
    artifacts,
    preservation: {
      productChangesForbiddenUntilCorrectedResult: true,
      taskRemovalAfterObservationForbidden: true,
      outcomeDependentExclusionForbidden: true,
      negativeProductResultRemainsCompleted: true,
      environmentHarnessAndProductFailuresSeparated: true,
      competitionRemoteFreezeRemainsActive: true
    }
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(freeze, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  process.stdout.write(`${JSON.stringify({
    outputPath,
    status: freeze.status,
    frozenAt: freeze.frozenAt,
    targetManifestSha256: freeze.inputs.targetManifestSha256,
    candidateFreezeSha256: freeze.inputs.candidateFreezeSha256,
    artifactCount: Object.keys(artifacts).length,
    protocol: freeze.protocol,
    competitionFreeze: freeze.competitionFreeze
  }, null, 2)}\n`);
}

async function assertAttempt1Provenance(candidateFreeze, candidateFreezeBytes) {
  const [attempt1FreezeBytes, attempt1ResultBytes, failureRecordBytes] = await Promise.all([
    readFile(path.join(projectRoot, attempt1FreezeRelativePath)),
    readFile(path.join(projectRoot, attempt1ResultRelativePath)),
    readFile(path.join(projectRoot, failureRecordRelativePath))
  ]);
  const attempt1Freeze = JSON.parse(attempt1FreezeBytes.toString("utf8"));
  const attempt1Result = JSON.parse(attempt1ResultBytes.toString("utf8"));
  const failureRecord = JSON.parse(failureRecordBytes.toString("utf8"));

  assert.equal(attempt1Freeze.freezeAttempt, 1);
  assert.equal(attempt1Result.status, "invalid");
  assert.deepEqual(attempt1Result.validityFailures, ["iniconfig: target materialization failed"]);
  assert.equal(attempt1Result.comparison.completedPairedTargets, 7);
  assert.equal(failureRecord.status, "invalid-after-partial-palace-observation");
  assert.equal(failureRecord.failureCategory, "validator-commit-message-subject-contract-harness-error");
  assert.equal(failureRecord.observationBoundary.selectedTaskPalaceCalls, 98);
  assert.equal(failureRecord.observationBoundary.productTuningBeforeCorrection, false);
  assert.equal(failureRecord.correctionBoundary.semanticProtocolChange, false);
  assert.equal(failureRecord.correctionBoundary.productChange, false);
  assert.equal(failureRecord.failedValidationFreeze.sha256, sha256Bytes(attempt1FreezeBytes));
  assert.equal(failureRecord.failedFormalResult.sha256, sha256Bytes(attempt1ResultBytes));
  assert.equal(failureRecord.candidate.freezeSha256, sha256Bytes(candidateFreezeBytes));
  assert.equal(failureRecord.candidate.cliSha256, candidateFreeze.candidate.cliSha256);
  assert.deepEqual(failureRecord.candidate.sourceTree, candidateFreeze.candidate.sourceTree);

  return {
    reason: failureRecord.failureCategory,
    attempt1FreezePath: attempt1FreezeRelativePath,
    attempt1FreezeSha256: sha256Bytes(attempt1FreezeBytes),
    attempt1ResultPath: attempt1ResultRelativePath,
    attempt1ResultSha256: sha256Bytes(attempt1ResultBytes),
    failureRecordPath: failureRecordRelativePath,
    failureRecordSha256: sha256Bytes(failureRecordBytes),
    pairedTargetsObserved: 7,
    selectedTaskPalaceCallsBeforeAttempt2: 98,
    semanticProtocolChange: false,
    productChange: false,
    targetOrOracleChange: false
  };
}

function assertManifest(manifest, candidateFreezeBytes) {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.studyId, selectionStudyId);
  assert.equal(manifest.status, "selected");
  assert.equal(manifest.heldOutAgainstCandidate, true);
  assert.equal(manifest.localFreeze.path, candidateFreezeRelativePath);
  assert.equal(manifest.localFreeze.sha256, sha256Bytes(candidateFreezeBytes));
  assert.equal(manifest.rules.palaceCallsOnCandidateTasksBeforeFinalization, 0);
  assert.equal(manifest.rules.taskDiffCoherenceReviewRequired, true);
  assert.equal(manifest.rules.wholeTargetRejectionForUnrelatedOrUncertainHunk, true);
  assert.equal(manifest.rules.partialOraclePruningForbidden, true);
  assert.equal(manifest.rules.languageDiversitySatisfied, true);
  assert.equal(manifest.rules.taskClassifier, "inflected-behavioral-subject-v1");
  assert.equal(manifest.targets.length, 8);

  for (const family of manifest.rules.requiredLanguageFamilies) {
    assert.equal(manifest.rules.selectedPerLanguageFamily[family], 2);
  }
  for (const target of manifest.targets) {
    assert.equal(target.expectedTaskType, classifyTaskType(target.task));
    assert.ok(target.changedFiles.length >= 2 && target.changedFiles.length <= 8);
    assert.ok(target.implementationFiles.length >= 1);
    assert.ok(target.testFiles.length >= 1);
    assert.ok(target.auxiliaryFiles.length <= 2);
    assert.deepEqual(
      [...target.changedFiles].sort(),
      [...target.implementationFiles, ...target.testFiles, ...target.auxiliaryFiles].sort()
    );
    assert.match(target.coherencePacketSha256, /^[0-9A-F]{64}$/);
  }
}

async function assertBoundSelectionEvidence(manifest) {
  const queueBytes = await readFile(path.join(projectRoot, manifest.candidateQueue.path));
  const reviewBytes = await readFile(path.join(projectRoot, manifest.semanticReview.path));
  assert.equal(sha256Bytes(queueBytes), manifest.candidateQueue.sha256);
  assert.equal(sha256Bytes(reviewBytes), manifest.semanticReview.sha256);
  assert.equal(manifest.candidateQueue.palaceCallsOnCandidateTasks, 0);
  assert.equal(manifest.semanticReview.palaceCallsOnCandidateTasks, 0);
  assert.equal(manifest.semanticReview.independent, false);
  assert.equal(manifest.semanticReview.interRaterAgreementAvailable, false);
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  assert.ok(index >= 0, "--out is required");
  assert.ok(args[index + 1], "--out requires a repository-relative path");
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.equal(resolved, path.join(projectRoot, freezeRelativePath), "Round 19 attempt-2 validation freeze must use its canonical path");
  return resolved;
}
