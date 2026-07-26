const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdir, readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const priorResultRelativePath = "docs/research/evidence/disclosed-round-8-after-condition-repository-repair-0.4-alpha.json";
const priorResultPath = path.join(projectRoot, priorResultRelativePath);
const priorResultCommit = "9eb29b4cdb639ccbb8db11df070fedb6498c49e6";
const priorResultSha256 = "E6216E3F6F43BFC3CD42A2B5E640777349B1977250BB43A159AC5155FFF3A23D";
const completionResultRelativePath = "docs/research/evidence/disclosed-round-8-sqlalchemy-timeout-completion-0.4-alpha.json";
const completionResultPath = path.join(projectRoot, completionResultRelativePath);
const completionResultCommit = "22f022239716c1402b3fc59fc9686fef787e64f3";
const completionResultSha256 = "97EAA94336880CF6309A565E06DA7C9B5E3E33203709259061F5589598DA475F";
const outputPath = require.main === module ? outputArgument(process.argv.slice(2)) : null;
const studyId = "round-8-confidence-calibration-combined-analysis-0.4-alpha";
const targetCount = 8;
const repetitions = 2;
const calibrationTolerance = 0.15;
const minimumMacroCoverage = 0.90;
const minimumMacroFocus = 0.75;
const minimumMacroPrecision = 0.75;
const budget = 6_000;
const conditionIds = ["baseline", "candidate"];

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}

async function main() {
  const inputs = await readFrozenInputs();
  const targets = combineTargets(inputs.prior, inputs.completion);
  const aggregate = {
    baseline: aggregateCondition(targets, "baseline"),
    candidate: aggregateCondition(targets, "candidate")
  };
  const comparison = compareConditions(targets, aggregate);
  const report = {
    schemaVersion: 1,
    studyId,
    generatedAt: new Date().toISOString(),
    status: "completed",
    claimBoundary: "Mechanical descriptive combination of seven paired targets from the immutable disclosed condition-repair result and the separately preregistered immutable SQLAlchemy environment completion. It evaluates static routes, confidence calibration, mode selection, and delivered context estimates only. It does not execute target tests or an Agent and cannot support Agent correctness, reported Token, tool-call, wall-time, or efficiency claims.",
    evidenceClass: "disclosed-frozen-eight-target-paired-static-calibration-analysis",
    sources: [
      sourceDescriptor(
        priorResultRelativePath,
        priorResultCommit,
        priorResultSha256,
        "invalid-with-seven-completed-pairs-and-one-shared-environment-timeout"
      ),
      sourceDescriptor(
        completionResultRelativePath,
        completionResultCommit,
        completionResultSha256,
        "completed-sqlalchemy-only-environment-completion"
      )
    ],
    combination: {
      rule: "Preserve the original eight-target manifest order; take the seven completed target pairs from the condition-repair result and SQLAlchemy from the separately preregistered completion. Use repetition 1 for target-level inference and both repetitions only for determinism and descriptive trial totals.",
      originalTargetOrder: targets.map((target) => target.name),
      targetCount,
      repetitionsPerTargetAndCondition: repetitions,
      pairedTargetObservations: targetCount,
      pairedTrialObservations: targetCount * repetitions,
      overlappingCompletedTargetsBetweenSources: 0,
      missingTargetsAfterCombination: 0,
      sequentialSourceRuns: true,
      concurrentSourceRuns: false
    },
    frozenProducts: {
      baseline: {
        commit: inputs.prior.comparisonBaseline.productCommit,
        cliSha256: inputs.prior.comparisonBaseline.cliSha256
      },
      candidate: {
        commit: inputs.prior.candidate.productCommit,
        cliSha256: inputs.prior.candidate.cliSha256
      }
    },
    thresholds: {
      calibrationTolerance,
      minimumMacroCoverage,
      minimumMacroFocus,
      minimumMacroPrecision,
      contextEstimatedTokenCeiling: budget
    },
    aggregate,
    comparison,
    decision: confidenceCapDecision(comparison),
    targets: targets.map(targetSummary)
  };

  await readFrozenInputs();
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  process.stdout.write(`${JSON.stringify({
    outputPath,
    status: report.status,
    aggregate: report.aggregate,
    comparison: report.comparison,
    decision: report.decision
  }, null, 2)}\n`);
}

async function readFrozenInputs() {
  assertGitCommitAndPath(priorResultCommit, priorResultRelativePath);
  assertGitCommitAndPath(completionResultCommit, completionResultRelativePath);
  const prior = await readHashLockedJson(priorResultPath, priorResultSha256);
  const completion = await readHashLockedJson(
    completionResultPath,
    completionResultSha256
  );

  assert.equal(prior.status, "invalid");
  assert.equal(prior.aggregate.baseline.completedTrials, 14);
  assert.equal(prior.aggregate.candidate.completedTrials, 14);
  assert.equal(prior.comparison.completedPairedTargets, 7);
  assert.equal(prior.comparison.completedPairedTrials, 14);
  assert.deepEqual(
    prior.targets.filter(hasEnvironmentFailure).map((target) => target.name),
    ["sqlalchemy"]
  );

  assert.equal(completion.status, "completed");
  assert.deepEqual(completion.validityFailures, []);
  assert.deepEqual(completion.targets.map((target) => target.name), ["sqlalchemy"]);
  assert.equal(completion.aggregate.baseline.completedTrials, 2);
  assert.equal(completion.aggregate.candidate.completedTrials, 2);
  assert.equal(completion.comparison.completedPairedTargets, 1);
  assert.equal(completion.comparison.completedPairedTrials, 2);
  assert.equal(completion.aggregate.baseline.environmentOrSetupFailures, 0);
  assert.equal(completion.aggregate.candidate.environmentOrSetupFailures, 0);
  assert.equal(completion.priorConditionRepairResult.sha256, priorResultSha256);
  return { prior, completion };
}

function combineTargets(prior, completion) {
  const completionTarget = completion.targets[0];
  const completedPriorNames = new Set(
    prior.targets.filter((target) => !hasEnvironmentFailure(target)).map((target) => target.name)
  );
  assert.equal(completedPriorNames.has(completionTarget.name), false);
  assert.equal(completedPriorNames.size, 7);

  const targets = prior.targets.map((target) =>
    target.name === completionTarget.name ? completionTarget : target
  );
  assert.equal(targets.length, targetCount);
  assert.equal(new Set(targets.map((target) => target.name)).size, targetCount);
  assert.deepEqual(targets.map((target) => target.name), [
    "yargs",
    "sqlalchemy",
    "zap",
    "sinon",
    "rich",
    "viper",
    "crossbeam",
    "http"
  ]);

  for (const target of targets) {
    for (const conditionId of conditionIds) {
      const condition = target.conditions[conditionId];
      assert.ok(condition, `${target.name} ${conditionId}`);
      assert.equal(condition.trials.length, repetitions);
      assert.ok(condition.trials.every((trial) => trial.status === "completed"));
      assert.equal(condition.deterministicRoutes, true);
      assert.deepEqual(condition.trials[0].routeFiles, condition.trials[1].routeFiles);
    }
  }
  return targets;
}

function aggregateCondition(targets, conditionId) {
  const targetTrials = targets.map((target) => ({
    target,
    condition: target.conditions[conditionId],
    trial: target.conditions[conditionId].trials[0]
  }));
  const allTrials = targets.flatMap((target) => target.conditions[conditionId].trials);
  const contextTokens = allTrials.map((trial) => trial.contextEstimatedTokens);
  const targetContextTokens = targetTrials.map(({ trial }) => trial.contextEstimatedTokens);
  const calibrationErrors = allTrials.map((trial) => trial.calibration.absoluteError);
  const targetCalibrationErrors = targetTrials.map(
    ({ trial }) => trial.calibration.absoluteError
  );

  return {
    condition: conditionId,
    targetCount: targets.length,
    passedTargets: targetTrials.filter(({ condition }) => condition.status === "passed").length,
    failedTargets: targetTrials.filter(({ condition }) => condition.status === "failed").length,
    completedTrials: allTrials.length,
    deterministicTargets: targetTrials.filter(
      ({ condition }) => condition.deterministicRoutes
    ).length,
    taskTypeMatchedTargets: targetTrials.filter(({ target, trial }) =>
      trial.taskType === target.expectedTaskType
    ).length,
    coreSurfaceCompleteTargets: targetTrials.filter(
      ({ trial }) => trial.coreSurfaceCoverage === 1
    ).length,
    exactOracleTargets: targetTrials.filter(({ target, trial }) =>
      sameValues(trial.routeFiles, target.changedFiles)
    ).length,
    oracleFileTotal: targets.reduce((sum, target) => sum + target.changedFiles.length, 0),
    routeFileTotal: targetTrials.reduce((sum, { trial }) => sum + trial.routeFileCount, 0),
    targetMacroChangedFileCoverage: average(
      targetTrials.map(({ trial }) => trial.changedFileCoverage)
    ),
    targetMacroRouteFocus: average(targetTrials.map(({ trial }) => trial.routeFocus)),
    targetMacroRoutePrecision: average(
      targetTrials.map(({ trial }) => trial.routePrecision)
    ),
    minimumTargetRouteFocus: Math.min(...targetTrials.map(({ trial }) => trial.routeFocus)),
    minimumTargetRoutePrecision: Math.min(
      ...targetTrials.map(({ trial }) => trial.routePrecision)
    ),
    targetCalibrationMeanAbsoluteError: average(targetCalibrationErrors),
    calibrationMeanAbsoluteError: average(calibrationErrors),
    overconfidentTargets: countCalibration(targetTrials.map(({ trial }) => trial), "overconfident"),
    underconfidentTargets: countCalibration(targetTrials.map(({ trial }) => trial), "underconfident"),
    wellCalibratedTargets: countCalibration(targetTrials.map(({ trial }) => trial), "well-calibrated"),
    overconfidentTrials: countCalibration(allTrials, "overconfident"),
    underconfidentTrials: countCalibration(allTrials, "underconfident"),
    wellCalibratedTrials: countCalibration(allTrials, "well-calibrated"),
    unsafeNarrowModeTargets: targetTrials.filter(({ trial }) => trial.unsafeNarrowMode).length,
    unsafeNarrowModeTrials: allTrials.filter((trial) => trial.unsafeNarrowMode).length,
    targetModeCounts: countValues(targetTrials.map(({ trial }) => trial.mode)),
    contextEstimatedTokensTotal: contextTokens.reduce((sum, value) => sum + value, 0),
    contextEstimatedTokensMean: average(contextTokens),
    contextEstimatedTokensMedian: median(contextTokens),
    targetContextEstimatedTokensMean: average(targetContextTokens),
    targetContextEstimatedTokensMedian: median(targetContextTokens),
    maxContextEstimatedTokens: Math.max(...contextTokens),
    environmentOrSetupFailures: 0,
    harnessContractFailures: 0,
    staticRoutingGateStatus: staticGateFailures(targetTrials.map(({ trial }) => trial)).length
      ? "failed"
      : "passed",
    staticRoutingGateFailures: staticGateFailures(
      targetTrials.map(({ trial }) => trial)
    )
  };
}

function compareConditions(targets, aggregate) {
  const targetPairs = targets.map((target) => pairedObservation(
    target,
    target.conditions.baseline.trials[0],
    target.conditions.candidate.trials[0]
  ));
  const trialPairs = targets.flatMap((target) =>
    Array.from({ length: repetitions }, (_, index) => pairedObservation(
      target,
      target.conditions.baseline.trials[index],
      target.conditions.candidate.trials[index]
    ))
  );
  const contextDeltas = trialPairs.map((pair) => pair.delta.contextEstimatedTokens);
  const targetContextDeltas = targetPairs.map(
    (pair) => pair.delta.contextEstimatedTokens
  );
  const routeChangedTargets = targetPairs.filter((pair) => pair.routeChanged).length;
  const modeChangedTargets = targetPairs.filter((pair) => pair.modeChanged).length;

  return {
    completedPairedTargets: targetPairs.length,
    completedPairedTrials: trialPairs.length,
    repetitionsUsedForInference: 1,
    routeChangedTargets,
    modeChangedTargets,
    confidenceLoweredTargets: targetPairs.filter((pair) => pair.delta.confidence < 0).length,
    confidenceRaisedTargets: targetPairs.filter((pair) => pair.delta.confidence > 0).length,
    confidenceUnchangedTargets: targetPairs.filter((pair) => pair.delta.confidence === 0).length,
    baselineOverconfidentTargets: aggregate.baseline.overconfidentTargets,
    candidateOverconfidentTargets: aggregate.candidate.overconfidentTargets,
    baselineUnderconfidentTargets: aggregate.baseline.underconfidentTargets,
    candidateUnderconfidentTargets: aggregate.candidate.underconfidentTargets,
    baselineCalibrationMeanAbsoluteError:
      aggregate.baseline.targetCalibrationMeanAbsoluteError,
    candidateCalibrationMeanAbsoluteError:
      aggregate.candidate.targetCalibrationMeanAbsoluteError,
    baselineUnsafeNarrowTargets: aggregate.baseline.unsafeNarrowModeTargets,
    candidateUnsafeNarrowTargets: aggregate.candidate.unsafeNarrowModeTargets,
    calibrationFinding: classifyCalibrationFinding(aggregate, routeChangedTargets),
    routingFinding: routeChangedTargets === 0 ? "unchanged" : "changed",
    narrowModeSafetyFinding:
      aggregate.candidate.unsafeNarrowModeTargets <= aggregate.baseline.unsafeNarrowModeTargets
        ? "non-inferior"
        : "regression",
    contextCostFinding: average(contextDeltas) > 0
      ? "candidate-higher-mean"
      : average(contextDeltas) < 0 ? "candidate-lower-mean" : "same",
    contextEstimatedTokenDeltaTotal: contextDeltas.reduce((sum, value) => sum + value, 0),
    contextEstimatedTokenDeltaMean: average(contextDeltas),
    contextEstimatedTokenDeltaMedian: median(contextDeltas),
    targetContextEstimatedTokenDeltaMean: average(targetContextDeltas),
    targetContextEstimatedTokenDeltaMedian: median(targetContextDeltas),
    aggregateDelta: {
      changedFileCoverage: difference(
        aggregate.candidate.targetMacroChangedFileCoverage,
        aggregate.baseline.targetMacroChangedFileCoverage
      ),
      routeFocus: difference(
        aggregate.candidate.targetMacroRouteFocus,
        aggregate.baseline.targetMacroRouteFocus
      ),
      routePrecision: difference(
        aggregate.candidate.targetMacroRoutePrecision,
        aggregate.baseline.targetMacroRoutePrecision
      ),
      calibrationMeanAbsoluteError: difference(
        aggregate.candidate.targetCalibrationMeanAbsoluteError,
        aggregate.baseline.targetCalibrationMeanAbsoluteError
      ),
      overconfidentTargets:
        aggregate.candidate.overconfidentTargets - aggregate.baseline.overconfidentTargets,
      underconfidentTargets:
        aggregate.candidate.underconfidentTargets - aggregate.baseline.underconfidentTargets,
      unsafeNarrowTargets:
        aggregate.candidate.unsafeNarrowModeTargets - aggregate.baseline.unsafeNarrowModeTargets
    },
    modeShifts: countValues(
      targetPairs.filter((pair) => pair.modeChanged).map(
        (pair) => `${pair.baseline.mode}->${pair.candidate.mode}`
      )
    ),
    targetPairs,
    trialPairs
  };
}

function confidenceCapDecision(comparison) {
  assert.equal(comparison.calibrationFinding, "regression");
  return {
    hardConfidenceScoreCap: "revert",
    safetyIntent: "retain-with-separate-evidence-sufficiency-and-narrow-mode-authorization",
    rationale: [
      "The candidate changed no route on all eight frozen targets.",
      "Overconfident targets remained 0, so the hard cap produced no held-out false-high reduction.",
      "Underconfident targets increased from 4 to 5 and target calibration MAE increased from 0.284 to 0.465.",
      "The cap removed one unsafe narrow-mode target but increased delivered context by 792 estimated tokens across 16 paired trial observations."
    ],
    implementationConstraint: "Do not restore unsafe narrow-context authorization. Decouple displayed route confidence from the independent-anchor safety check so unsupported routes remain advisory/full-context without forcing the calibrated score to 0.15.",
    efficiencyClaimAllowed: false
  };
}

function targetSummary(target) {
  return {
    name: target.name,
    languageFamily: target.languageFamily,
    task: target.task,
    oracleFiles: target.changedFiles,
    baseline: compactTrial(target.conditions.baseline.trials[0]),
    candidate: compactTrial(target.conditions.candidate.trials[0])
  };
}

function pairedObservation(target, baseline, candidate) {
  return {
    target: target.name,
    routeChanged: JSON.stringify(baseline.routeFiles) !== JSON.stringify(candidate.routeFiles),
    modeChanged: baseline.mode !== candidate.mode,
    baseline: compactTrial(baseline),
    candidate: compactTrial(candidate),
    delta: {
      confidence: difference(candidate.routeConfidence, baseline.routeConfidence),
      changedFileCoverage: difference(candidate.changedFileCoverage, baseline.changedFileCoverage),
      routeFocus: difference(candidate.routeFocus, baseline.routeFocus),
      routePrecision: difference(candidate.routePrecision, baseline.routePrecision),
      contextEstimatedTokens: candidate.contextEstimatedTokens - baseline.contextEstimatedTokens
    }
  };
}

function compactTrial(trial) {
  return {
    routeFiles: trial.routeFiles,
    routeFileCount: trial.routeFileCount,
    routeConfidence: trial.routeConfidence,
    changedFileCoverage: trial.changedFileCoverage,
    coreSurfaceCoverage: trial.coreSurfaceCoverage,
    routeFocus: trial.routeFocus,
    routePrecision: trial.routePrecision,
    calibrationStatus: trial.calibration.status,
    calibrationAbsoluteError: trial.calibration.absoluteError,
    mode: trial.mode,
    unsafeNarrowMode: trial.unsafeNarrowMode,
    contextEstimatedTokens: trial.contextEstimatedTokens
  };
}

function classifyCalibrationFinding(aggregate, routeChangedTargets) {
  if (routeChangedTargets > 0) return "regression";
  const baseline = aggregate.baseline;
  const candidate = aggregate.candidate;
  const overconfidenceImproved = candidate.overconfidentTargets < baseline.overconfidentTargets;
  const underconfidenceNonInferior = candidate.underconfidentTargets <= baseline.underconfidentTargets;
  const maeNonInferior = candidate.targetCalibrationMeanAbsoluteError
    <= baseline.targetCalibrationMeanAbsoluteError + 0.001;
  if (overconfidenceImproved && underconfidenceNonInferior && maeNonInferior) return "supported";
  if (overconfidenceImproved) return "tradeoff";
  if (
    candidate.overconfidentTargets === baseline.overconfidentTargets
    && candidate.underconfidentTargets === baseline.underconfidentTargets
    && Math.abs(
      candidate.targetCalibrationMeanAbsoluteError
        - baseline.targetCalibrationMeanAbsoluteError
    ) <= 0.001
  ) return "no-difference";
  if (!underconfidenceNonInferior || !maeNonInferior) return "regression";
  return "mixed";
}

function staticGateFailures(trials) {
  const failures = [];
  if (average(trials.map((trial) => trial.changedFileCoverage)) < minimumMacroCoverage) {
    failures.push(`changed-file coverage below ${minimumMacroCoverage.toFixed(2)}`);
  }
  if (average(trials.map((trial) => trial.routeFocus)) < minimumMacroFocus) {
    failures.push(`route focus below ${minimumMacroFocus.toFixed(2)}`);
  }
  if (average(trials.map((trial) => trial.routePrecision)) < minimumMacroPrecision) {
    failures.push(`route precision below ${minimumMacroPrecision.toFixed(2)}`);
  }
  if (trials.some((trial) => trial.contextEstimatedTokens > budget)) {
    failures.push(`context exceeded ${budget}`);
  }
  return failures;
}

function hasEnvironmentFailure(target) {
  return conditionIds.some(
    (conditionId) => target.conditions?.[conditionId]?.failureCategory === "environment-or-setup"
  );
}

function countCalibration(trials, status) {
  return trials.filter((trial) => trial.calibration.status === status).length;
}

function countValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Object.fromEntries([...counts].sort(([left], [right]) => left.localeCompare(right)));
}

function sourceDescriptor(sourcePath, commit, sha256, status) {
  return { path: sourcePath, commit, sha256, status, preservedWithoutModification: true };
}

function sameValues(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function average(values) {
  assert.ok(values.length > 0);
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function median(values) {
  assert.ok(values.length > 0);
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? round(sorted[middle])
    : round((sorted[middle - 1] + sorted[middle]) / 2);
}

function difference(left, right) {
  return round(left - right);
}

function round(value) {
  return Number(value.toFixed(3));
}

async function readHashLockedJson(filePath, expectedSha256) {
  const bytes = await readFile(filePath);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex").toUpperCase(),
    expectedSha256
  );
  return JSON.parse(bytes.toString("utf8"));
}

function assertGitCommitAndPath(commit, sourcePath) {
  runGit(["cat-file", "-e", `${commit}^{commit}`]);
  runGit(["diff", "--quiet", commit, "--", sourcePath]);
}

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    env: process.env,
    windowsHide: true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error([`git ${args.join(" ")}`, result.stdout, result.stderr]
      .filter(Boolean).join("\n"));
  }
  return result;
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  assert.ok(index >= 0, "--out is required.");
  assert.ok(args[index + 1], "--out requires a repository-relative path.");
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.ok(resolved.startsWith(`${projectRoot}${path.sep}`));
  return resolved;
}

module.exports = {
  classifyCalibrationFinding,
  combineTargets,
  confidenceCapDecision
};
