const assert = require("node:assert/strict");
const { readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");
const {
  assertCandidateFreeze,
  sha256Bytes
} = require("./lib/local-blind-freeze.cjs");

const root = path.resolve(__dirname, "..");
const selectionStudyId = "local-blind-routing-round-19-0.4-alpha";
const validationStudyId = "local-blind-routing-validation-round-19-attempt-1-0.4-alpha";
const candidateFreezeRelativePath = "docs/research/evidence/local-blind-candidate-freeze-0.4-alpha-round-19.json";
const validationFreezeRelativePath = "docs/research/evidence/local-blind-routing-validation-freeze-0.4-alpha-round-19.json";
const resultRelativePath = "docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-19-attempt-1.json";
const manifestRelativePath = "docs/research/evidence/local-blind-routing-target-manifest-0.4-alpha-round-19.json";
const outputRelativePath = "docs/research/evidence/local-blind-routing-validation-attempt-1-failure-record-0.4-alpha-round-19.json";

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});

async function main() {
  const outputPath = path.join(root, outputRelativePath);
  const candidateFreezePath = path.join(root, candidateFreezeRelativePath);
  const { freeze: candidateFreeze, freezeBytes: candidateFreezeBytes } = await assertCandidateFreeze({
    root,
    freezePath: candidateFreezePath,
    studyId: selectionStudyId
  });
  const [validationFreezeBytes, resultBytes, manifestBytes] = await Promise.all([
    readFile(path.join(root, validationFreezeRelativePath)),
    readFile(path.join(root, resultRelativePath)),
    readFile(path.join(root, manifestRelativePath))
  ]);
  const validationFreeze = JSON.parse(validationFreezeBytes.toString("utf8"));
  const result = JSON.parse(resultBytes.toString("utf8"));
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const failedTarget = result.targets.find(({ name }) => name === "iniconfig");

  assert.equal(validationFreeze.studyId, validationStudyId);
  assert.equal(validationFreeze.freezeAttempt, 1);
  assert.equal(result.studyId, validationStudyId);
  assert.equal(result.status, "invalid");
  assert.deepEqual(result.validityFailures, ["iniconfig: target materialization failed"]);
  assert.equal(result.comparison.completedPairedTargets, 7);
  assert.equal(result.aggregate.baseline.completedTrials, 14);
  assert.equal(result.aggregate.candidate.completedTrials, 14);
  assert.equal(failedTarget.failureCategory, "environment-or-setup");
  assert.equal(failedTarget.materializationAttempts.length, 3);
  assert.ok(failedTarget.materializationAttempts.every(({ error }) =>
    error.includes("fix test and code to follow the common convention")
    && error.includes("usually is a linenumber")
  ));
  assert.equal(sha256Bytes(candidateFreezeBytes), validationFreeze.inputs.candidateFreezeSha256);
  assert.equal(sha256Bytes(manifestBytes), validationFreeze.inputs.targetManifestSha256);

  const selectedTaskPalaceCalls = result.aggregate.baseline.staticPalaceCliCalls
    + result.aggregate.candidate.staticPalaceCliCalls;
  assert.equal(selectedTaskPalaceCalls, 98);

  const record = {
    schemaVersion: 1,
    studyId: validationStudyId,
    generatedAt: new Date().toISOString(),
    status: "invalid-after-partial-palace-observation",
    failureCategory: "validator-commit-message-subject-contract-harness-error",
    claimBoundary: "The create-only Round 19 attempt-1 result is preserved as invalid. Seven target pairs were observed before completion, so a corrected attempt is not a pristine first observation for those targets. No product code, candidate hash, target, oracle, gate, or condition order is changed before the corrected replay.",
    failedValidationFreeze: {
      path: validationFreezeRelativePath,
      sha256: sha256Bytes(validationFreezeBytes)
    },
    failedFormalResult: {
      path: resultRelativePath,
      sha256: sha256Bytes(resultBytes)
    },
    targetManifest: {
      path: manifestRelativePath,
      sha256: sha256Bytes(manifestBytes),
      targetsChanged: false,
      targetOrderChanged: false,
      oracleChanged: false
    },
    candidate: {
      freezePath: candidateFreezeRelativePath,
      freezeSha256: sha256Bytes(candidateFreezeBytes),
      cliSha256: candidateFreeze.candidate.cliSha256,
      sourceTree: candidateFreeze.candidate.sourceTree,
      changed: false
    },
    observationBoundary: {
      pairedTargetsObserved: 7,
      requiredPairedTargets: 8,
      baselineCompletedTrials: result.aggregate.baseline.completedTrials,
      candidateCompletedTrials: result.aggregate.candidate.completedTrials,
      selectedTaskPalaceCalls,
      productCommandsStarted: true,
      productTuningBeforeCorrection: false,
      partialAggregateIsNotAFormalProductConclusion: true
    },
    failedTarget: {
      name: failedTarget.name,
      candidateId: failedTarget.candidateId,
      task: failedTarget.task,
      materializationAttempts: failedTarget.materializationAttempts.length,
      attempt1ReportedCategory: failedTarget.failureCategory,
      correctedCategory: "harness-contract"
    },
    diagnosis: {
      selectorContract: "first-nonempty-line-of-git-format-B",
      attempt1ValidatorContract: "collapsed-git-format-s-subject",
      mismatch: "The iniconfig commit has a multi-line first paragraph. Git %s collapses that paragraph, while the frozen selector intentionally keeps only the first non-empty %B line.",
      secondaryHarnessError: "The materialization wrapper labeled every exception environment-or-setup and retried deterministic assertion failures three times."
    },
    correctionBoundary: {
      semanticProtocolChange: false,
      productChange: false,
      taskRemoval: false,
      outcomeDependentExclusion: false,
      compareFirstNonemptyFormatBLine: true,
      classifyNonNetworkMaterializationErrorsAsHarness: true,
      retryOnlyEnvironmentMaterializationFailures: true,
      correctedResultCreateOnly: true
    },
    competitionFreeze: candidateFreeze.competitionFreeze
  };

  await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  process.stdout.write(`${JSON.stringify({
    outputPath,
    status: record.status,
    failureCategory: record.failureCategory,
    pairedTargetsObserved: record.observationBoundary.pairedTargetsObserved,
    selectedTaskPalaceCalls,
    candidateChanged: false,
    semanticProtocolChange: false
  }, null, 2)}\n`);
}
