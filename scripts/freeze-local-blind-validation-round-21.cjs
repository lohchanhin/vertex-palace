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
const selectionStudyId = "local-blind-routing-round-21-0.4-stable-candidate";
const studyId = "local-blind-routing-validation-round-21-0.4-stable-candidate";
const manifestRelativePath = "docs/research/evidence/local-blind-routing-target-manifest-0.4-stable-round-21.json";
const candidateFreezeRelativePath = "docs/research/evidence/local-blind-candidate-freeze-0.4-stable-round-21.json";
const freezeRelativePath = "docs/research/evidence/local-blind-routing-validation-freeze-0.4-stable-round-21.json";
const artifactPaths = [
  "docs/research/LOCAL_BLIND_ROUTING_VALIDATION_PROTOCOL_0_4_STABLE_ROUND_21.md",
  "docs/zh-CN/LOCAL_BLIND_ROUTING_VALIDATION_PROTOCOL_0_4_STABLE_ROUND_21.md",
  "scripts/verify-local-blind-routing-round-21.cjs",
  "scripts/freeze-local-blind-validation-round-21.cjs",
  "scripts/lib/context-telemetry.cjs",
  "scripts/lib/commit-task-classifier.cjs",
  "scripts/lib/local-blind-freeze.cjs",
  "scripts/lib/task-diff-coherence.cjs",
  "scripts/lib/round21-target-selection.cjs",
  "scripts/create-round21-coherence-reviews.cjs",
  "scripts/finalize-local-blind-routing-targets-round-21.cjs"
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

  const artifacts = {};
  for (const relativePath of artifactPaths) {
    artifacts[relativePath] = await sha256File(path.join(projectRoot, relativePath));
  }

  const freeze = {
    schemaVersion: 1,
    studyId,
    status: "publicly-frozen-validation",
    freezeAttempt: 1,
    frozenAt: new Date().toISOString(),
    publicPreregistration: true,
    claimBoundary: "Publicly committed hash freeze for the Round 21 paired static-routing validator, created after whole-target task-coherence selection but before any Palace route, pack, confidence, mode, or evaluation result was observed for a selected task. It cannot establish Agent correctness, Token savings, tool-call reduction, or wall-time improvement.",
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
      noPalaceResultObservedBeforeValidatorFreeze: true,
      palaceCallsOnSelectedTasksBeforeFreeze: 0,
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
      productChangesForbiddenUntilFirstResult: true,
      taskRemovalAfterObservationForbidden: true,
      outcomeDependentExclusionForbidden: true,
      negativeProductResultRemainsCompleted: true,
      environmentHarnessAndProductFailuresSeparated: true,
      publicPreregistrationMustRemainImmutable: true
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
    protocol: freeze.protocol
  }, null, 2)}\n`);
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
  assert.equal(resolved, path.join(projectRoot, freezeRelativePath), "Round 21 validation freeze must use its canonical path");
  return resolved;
}

