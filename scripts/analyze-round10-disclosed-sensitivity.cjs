const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { mkdir, readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const evidenceRoot = path.join(projectRoot, "docs", "research", "evidence");
const formalRelativePath = "docs/research/evidence/disclosed-routing-round-10-after-generic-causal-repair-attempt-3-0.4-alpha.json";
const auditRelativePath = "docs/research/evidence/round10-task-diff-coherence-audit-0.4-alpha.json";
const formalPath = path.join(projectRoot, formalRelativePath);
const auditPath = path.join(projectRoot, auditRelativePath);

async function main(args) {
  const outputPath = outputArgument(args);
  const [formalBytes, auditBytes] = await Promise.all([
    readFile(formalPath),
    readFile(auditPath)
  ]);
  const formal = JSON.parse(formalBytes.toString("utf8"));
  const audit = JSON.parse(auditBytes.toString("utf8"));
  const excludedNames = new Set(
    audit.auditedTargets
      .filter((target) => target.status === "mixed-semantic-commit")
      .map((target) => target.name)
  );
  assert.deepEqual([...excludedNames], ["itsdangerous"]);
  assert.equal(formal.status, "completed");
  assert.equal(formal.gateStatus, "failed");

  const included = formal.targets.filter((target) => !excludedNames.has(target.name));
  const targetResults = included.map(summarizeTarget);
  const aggregate = aggregateTargets(included, formal.protocol.budget);
  const gateFailures = sensitivityGateFailures(aggregate, targetResults, formal.protocol.budget);
  const report = {
    schemaVersion: "1.0",
    analysisId: "disclosed-routing-round-10-attempt-3-task-coherent-sensitivity-0.4-alpha",
    generatedAt: new Date().toISOString(),
    analysisTiming: "post-hoc-after-round-10-disclosure",
    evidenceClass: "diagnostic-sensitivity-analysis",
    heldOutAgainstCandidate: false,
    targetTestsExecuted: false,
    formalGateStatus: formal.gateStatus,
    sensitivityGateStatus: gateFailures.length ? "failed" : "passed",
    gateFailures,
    sourceEvidence: {
      path: formalRelativePath,
      sha256: sha256(formalBytes),
      preservedWithoutModification: true
    },
    coherenceAudit: {
      path: auditRelativePath,
      sha256: sha256(auditBytes),
      timing: audit.auditTiming
    },
    excludedTargets: audit.auditedTargets.map((target) => ({
      name: target.name,
      status: target.status,
      decision: target.decision
    })),
    includedTargets: included.map((target) => target.name),
    protocol: {
      ...formal.protocol,
      taskDiffCoherenceRule: "Exclude an entire target only when a separately preserved semantic audit identifies unrelated changed hunks."
    },
    aggregate,
    targets: targetResults,
    claimBoundary: "The preregistered Round 10 gate remains failed. This post-hoc result only estimates the task-coherent subset and cannot authorize Agent A/B advancement or replace a fresh held-out Round 11."
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  process.stdout.write(`${JSON.stringify({ outputPath, formalGateStatus: report.formalGateStatus, sensitivityGateStatus: report.sensitivityGateStatus, aggregate }, null, 2)}\n`);
}

function summarizeTarget(target) {
  const trial = target.repairedCandidate.trials[0];
  return {
    name: target.name,
    status: target.repairedCandidate.status,
    routeFiles: trial.routeFiles,
    changedFileCoverage: trial.changedFileCoverage,
    coreSurfaceCoverage: trial.coreSurfaceCoverage,
    routeFocus: trial.routeFocus,
    coreRouteFocus: trial.coreRouteFocus,
    routeConfidence: trial.routeConfidence,
    deterministicRoutes: target.repairedCandidate.deterministicRoutes,
    trackedTargetWorktreeClean: target.repairedCandidate.trackedTargetWorktreeClean
  };
}

function aggregateTargets(targets, budget) {
  const rows = targets.map(summarizeTarget);
  const trials = targets.flatMap((target) => target.repairedCandidate.trials);
  const auxiliaryTargets = targets.filter((target) => target.auxiliaryFiles.length > 0);
  return {
    targetCount: targets.length,
    completedTargets: targets.filter((target) => target.repairedCandidate.trials.every((trial) => trial.status === "completed")).length,
    passedTargets: rows.filter((target) => target.status === "passed").length,
    failedTargets: rows.filter((target) => target.status !== "passed").length,
    deterministicTargets: rows.filter((target) => target.deterministicRoutes).length,
    taskTypeMatchedTargets: targets.filter((target) => target.repairedCandidate.trials.every((trial) => trial.taskType === target.expectedTaskType)).length,
    coreSurfaceCompleteTargets: rows.filter((target) => target.coreSurfaceCoverage === 1).length,
    auxiliarySurfaceCompleteTargets: auxiliaryTargets.filter((target) => target.repairedCandidate.trials[0].auxiliarySurfaceCoverage === 1).length,
    auxiliarySurfaceTargetCount: auxiliaryTargets.length,
    targetMacroChangedFileCoverage: mean(rows.map((target) => target.changedFileCoverage)),
    targetMacroCoreSurfaceCoverage: mean(rows.map((target) => target.coreSurfaceCoverage)),
    targetMacroRouteFocus: mean(rows.map((target) => target.routeFocus)),
    targetMacroCoreRouteFocus: mean(rows.map((target) => target.coreRouteFocus)),
    minimumTargetChangedFileCoverage: Math.min(...rows.map((target) => target.changedFileCoverage)),
    minimumTargetRouteFocus: Math.min(...rows.map((target) => target.routeFocus)),
    calibrationCoreMeanAbsoluteError: mean(trials.map((trial) => trial.calibrationAgainstCore.absoluteError)),
    calibrationFullDiffMeanAbsoluteError: mean(trials.map((trial) => trial.calibrationAgainstFullDiff.absoluteError)),
    overconfidentAgainstCoreTrials: trials.filter((trial) => trial.calibrationAgainstCore.status === "overconfident").length,
    unsafeNarrowAgainstCoreTrials: trials.filter((trial) => trial.unsafeNarrowAgainstCore).length,
    unsafeNarrowAgainstFullDiffTrials: trials.filter((trial) => trial.unsafeNarrowAgainstFullDiff).length,
    unsafeEnforcedStopAgainstCoreTrials: trials.filter((trial) => trial.unsafeEnforcedStopAgainstCore).length,
    metricDisagreementTrials: trials.filter((trial) => !trial.coverageMetricAgreement || !trial.focusMetricAgreement).length,
    evaluationContextRouteDisagreementTrials: trials.filter((trial) => !trial.evaluationContextRouteAgreement).length,
    maxContextEstimatedTokens: Math.max(...trials.map((trial) => trial.contextEstimatedTokens)),
    contextBudget: budget,
    trackedTargetWorktreeChanges: rows.filter((target) => !target.trackedTargetWorktreeClean).length
  };
}

function sensitivityGateFailures(aggregate, targets, budget) {
  const failures = [];
  if (aggregate.completedTargets !== aggregate.targetCount) failures.push("not all included targets completed");
  if (aggregate.passedTargets !== aggregate.targetCount) failures.push("not all included targets passed");
  if (aggregate.deterministicTargets !== aggregate.targetCount) failures.push("included routes were not deterministic");
  if (aggregate.taskTypeMatchedTargets !== aggregate.targetCount) failures.push("task type mismatch");
  if (aggregate.coreSurfaceCompleteTargets !== aggregate.targetCount) failures.push("core implementation/test coverage incomplete");
  if (aggregate.auxiliarySurfaceCompleteTargets !== aggregate.auxiliarySurfaceTargetCount) failures.push("auxiliary coverage incomplete");
  if (aggregate.targetMacroChangedFileCoverage < 0.9) failures.push("target-macro changed-file coverage below threshold");
  if (aggregate.targetMacroRouteFocus < 0.7) failures.push("target-macro route focus below threshold");
  if (targets.some((target) => target.changedFileCoverage < 0.5)) failures.push("changed-file coverage below threshold");
  if (targets.some((target) => target.routeFocus < 0.4)) failures.push("route focus below threshold");
  if (aggregate.overconfidentAgainstCoreTrials > 0) failures.push("overconfident trials against core oracle");
  if (aggregate.unsafeNarrowAgainstCoreTrials > 0 || aggregate.unsafeNarrowAgainstFullDiffTrials > 0) failures.push("unsafe narrow mode");
  if (aggregate.unsafeEnforcedStopAgainstCoreTrials > 0) failures.push("unsafe enforced stop");
  if (aggregate.metricDisagreementTrials > 0) failures.push("metric disagreement");
  if (aggregate.evaluationContextRouteDisagreementTrials > 0) failures.push("evaluation/context route disagreement");
  if (aggregate.maxContextEstimatedTokens > budget) failures.push("context budget exceeded");
  if (aggregate.trackedTargetWorktreeChanges > 0) failures.push("target worktree changed");
  return failures;
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  assert.ok(index >= 0 && args[index + 1], "--out is required");
  const outputPath = path.resolve(projectRoot, args[index + 1]);
  assert.ok(outputPath.startsWith(`${evidenceRoot}${path.sep}`), "output must stay under docs/research/evidence");
  return outputPath;
}

function mean(values) {
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { aggregateTargets, sensitivityGateFailures };
