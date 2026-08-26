const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { normalizeContextTelemetry } = require("./lib/context-telemetry.cjs");

const projectRoot = path.resolve(__dirname, "..");
const candidateCliPath = path.join(projectRoot, "dist", "palace.cjs");
const manifestRelativePath = "docs/research/evidence/local-blind-routing-target-manifest-0.4-alpha-round-12.json";
const originalRelativePath = "docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-12-attempt-2.json";
const manifestPath = path.join(projectRoot, manifestRelativePath);
const originalPath = path.join(projectRoot, originalRelativePath);
const outputPath = require.main === module ? outputArgument(process.argv.slice(2)) : null;
const studyId = "disclosed-routing-round-12-after-subject-owner-closure-repair-0.4-alpha";
const targetCount = 8;
const repetitions = 2;
const budget = 6_000;
const routeLimit = 10;
const maxDrawers = 4;
const fetchDepth = 400;
const commandTimeoutMs = 300_000;
const indexTimeoutMs = 900_000;
const metricAgreementTolerance = 0.005;
const calibrationTolerance = 0.15;
const minimumMacroChangedFileCoverage = 0.90;
const minimumMacroRouteFocus = 0.70;
const minimumTargetChangedFileCoverage = 0.50;
const minimumTargetRouteFocus = 0.40;
const narrowModes = new Set(["bypass", "route-lite"]);
const candidateSourceRoots = [
  "packages/core/src",
  "packages/shared/src",
  "packages/cli/src",
  "packages/mcp/src",
  "plugins/vertex-palace/mcp/server.cjs"
];

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

async function main() {
  const [manifest, original] = await Promise.all([
    readJson(manifestPath),
    readJson(originalPath)
  ]);
  assert.equal(manifest.targets.length, targetCount);
  assert.equal(original.candidateGateStatus, "failed");
  assert.equal(original.status, "completed");

  const originalSha256 = await sha256File(originalPath);
  const manifestSha256 = await sha256File(manifestPath);
  const candidateCliSha256 = await sha256File(candidateCliPath);
  const candidateSourceTreeBefore = await hashSourceTree();
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-round-12-disclosed-subject-owner-closure-repair-"));
  const targets = [];

  try {
    for (const target of manifest.targets) {
      const root = path.join(temporaryRoot, safeSegment(target.name));
      const originalTarget = original.targets.find((entry) => entry.name === target.name);
        assert.ok(originalTarget, `Original Round 12 target is missing: ${target.name}`);

      try {
        await materializeTarget(target, root);
        const result = await validateTarget(target, root);
        targets.push({
          ...publicTargetIdentity(target),
          originalCandidate: compactOriginalCandidate(originalTarget),
          repairedCandidate: result,
          comparison: compareTarget(originalTarget, result)
        });
        process.stdout.write(`${target.name}: ${result.status} (${result.trials[0]?.routeFiles.length ?? 0} routed files)\n`);
      } catch (error) {
        targets.push({
          ...publicTargetIdentity(target),
          originalCandidate: compactOriginalCandidate(originalTarget),
          repairedCandidate: {
            status: "execution-error",
            failures: [summarizeError(error)],
            trials: []
          },
          comparison: null
        });
        process.stdout.write(`${target.name}: execution-error\n`);
      }
    }

    const aggregate = aggregateTargets(targets);
    const gateFailures = disclosedGateFailures(aggregate);
    const candidateSourceTreeAfter = await hashSourceTree();
    const candidateCliSha256After = await sha256File(candidateCliPath);
    const originalSha256After = await sha256File(originalPath);
    assert.equal(candidateSourceTreeAfter.sha256, candidateSourceTreeBefore.sha256);
    assert.equal(candidateCliSha256After, candidateCliSha256);
    assert.equal(originalSha256After, originalSha256);

    const report = {
      schemaVersion: 1,
      studyId,
      generatedAt: new Date().toISOString(),
      status: aggregate.completedTargets === targetCount ? "completed" : "invalid",
      gateStatus: gateFailures.length ? "failed" : "passed",
      gateFailures,
      evidenceClass: "disclosed-post-observation-static-routing-regression",
      heldOutAgainstCandidate: false,
      claimBoundary: "Disclosed post-observation regression on the eight already observed Round 12 tasks after generic task-subject parsing, subject-owner routing, owner-local verification closure, and confidence calibration repairs. The immutable formal Round 12 candidate gate remains failed. This result is not held out, does not execute target tests or an Agent, and supports no Agent correctness, Token, tool-call, or wall-time claim. A fresh frozen round is required for new generalization evidence.",
      originalFormalEvidence: {
        path: originalRelativePath,
        sha256: originalSha256,
        status: original.status,
        candidateGateStatus: original.candidateGateStatus,
        preservedWithoutModification: true
      },
      targetSelection: {
        manifestPath: manifestRelativePath,
        manifestSha256,
        targetCount,
        reusedAfterObservation: true,
        replacementOrExclusionAllowed: false
      },
      candidate: {
        gitHead: run("git", ["rev-parse", "HEAD"], { cwd: projectRoot }).stdout.trim(),
        sourceState: "local uncommitted disclosed repair worktree",
        cliPath: "dist/palace.cjs",
        cliSha256: candidateCliSha256,
        sourceTree: candidateSourceTreeBefore,
        rebuiltBeforeMeasurement: true,
        unchangedDuringMeasurement: true
      },
      protocol: {
        pairedWithOriginalFormalObservation: false,
        repetitions,
        repetitionsAreDeterminismChecksNotIndependentSamples: true,
        sequential: true,
        concurrent: false,
        freshPalacePerTarget: true,
        targetTestsExecuted: false,
        budget,
        routeLimit,
        maxDrawers,
        fetchDepth,
        metricAgreementTolerance,
        calibrationTolerance,
        oraclePolicy: {
          core: "Frozen implementationFiles plus testFiles; required for the disclosed repair gate.",
          auxiliary: "Frozen changelog or package/config files; reported separately as task-diff bookkeeping and not allowed to substitute for implementation or test evidence.",
          fullChangedFiles: "Retained for comparability with the immutable formal Round 12 result."
        },
        gates: {
          completedTargets: targetCount,
          deterministicRoutes: targetCount,
          taskTypeMatchedTargets: targetCount,
          coreSurfaceCompleteTargets: targetCount,
          auxiliarySurfaceCompleteTargets: "all frozen targets with auxiliary files",
          minimumMacroChangedFileCoverage,
          minimumMacroRouteFocus,
          minimumTargetChangedFileCoverage,
          minimumTargetRouteFocus,
          overconfidentAgainstCoreTrials: 0,
          unsafeNarrowAgainstCoreTrials: 0,
          unsafeEnforcedStopAgainstCoreTrials: 0,
          metricDisagreementTrials: 0,
          contextWithinBudget: true,
          trackedTargetWorktreeChanges: 0
        }
      },
      aggregate,
      targets
    };

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    process.stdout.write(`${JSON.stringify({ outputPath, status: report.status, gateStatus: report.gateStatus, aggregate }, null, 2)}\n`);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function materializeTarget(target, root) {
  await mkdir(root, { recursive: true });
  run("git", ["init", "--quiet"], { cwd: root });
  run("git", ["remote", "add", "origin", target.url], { cwd: root });
  run("git", ["fetch", "--quiet", `--depth=${fetchDepth}`, "origin", target.pinnedHead], {
    cwd: root,
    timeout: commandTimeoutMs
  });
  assert.ok(gitObjectExists(root, `${target.routeCommit}^{commit}`));
  assert.ok(gitObjectExists(root, `${target.groundTruthCommit}^{commit}`));
  run("git", ["-c", "advice.detachedHead=false", "checkout", "--detach", target.routeCommit], { cwd: root });
  assert.equal(run("git", ["rev-parse", "HEAD"], { cwd: root }).stdout.trim(), target.routeCommit);
  const changedFiles = lines(run("git", [
    "diff", "--name-only", "--find-renames", target.routeCommit, target.groundTruthCommit, "--"
  ], { cwd: root }).stdout).sort();
  assert.deepEqual(changedFiles, [...target.changedFiles].sort());
}

async function validateTarget(target, root) {
  const indexStartedAt = performance.now();
  parseJsonOutput(runNode([
    candidateCliPath, "index", "--root", root
  ], { cwd: root, timeout: indexTimeoutMs }).stdout, `${target.name} index`);
  const status = parseJsonOutput(runNode([
    candidateCliPath, "status", "--root", root
  ], { cwd: root, timeout: commandTimeoutMs }).stdout, `${target.name} status`);
  const indexElapsedMs = Math.round(performance.now() - indexStartedAt);
  const trials = [];

  for (let trial = 1; trial <= repetitions; trial += 1) {
    const evaluateStartedAt = performance.now();
    const evaluation = parseJsonOutput(runNode([
      candidateCliPath,
      "evaluate",
      target.task,
      ...target.changedFiles.flatMap((file) => ["--changed-file", file]),
      "--budget", String(budget),
      "--route-limit", String(routeLimit),
      "--max-drawers", String(maxDrawers),
      "--json"
    ], { cwd: root, timeout: commandTimeoutMs }).stdout, `${target.name} evaluate ${trial}`);
    const evaluationElapsedMs = Math.round(performance.now() - evaluateStartedAt);

    const contextStartedAt = performance.now();
    const contextResult = runNode([
      candidateCliPath,
      "context",
      target.task,
      "--auto",
      "--format", "json",
      "--budget", String(budget),
      "--route-limit", String(routeLimit),
      "--max-drawers", String(maxDrawers)
    ], { cwd: root, timeout: commandTimeoutMs });
    const context = parseJsonOutput(contextResult.stdout, `${target.name} context ${trial}`);
    const telemetry = normalizeContextTelemetry(context, contextResult.stdout);
    const contextElapsedMs = Math.round(performance.now() - contextStartedAt);
    trials.push(buildTrial(target, trial, evaluation, context, telemetry, {
      evaluationElapsedMs,
      contextElapsedMs
    }));
  }

  const failures = [];
  const deterministicRoutes = trials.every((trial) =>
    JSON.stringify(trial.routeFiles) === JSON.stringify(trials[0].routeFiles)
  );
  if (!deterministicRoutes) failures.push("route order or membership differed across repetitions");
  if (trials.some((trial) => trial.taskType !== target.expectedTaskType)) failures.push("task type mismatch");
  if (trials.some((trial) => trial.coreSurfaceCoverage !== 1)) failures.push("core implementation/test coverage incomplete");
  if (trials.some((trial) => trial.changedFileCoverage < minimumTargetChangedFileCoverage)) {
    failures.push("full changed-file coverage below disclosed threshold");
  }
  if (trials.some((trial) => trial.routeFocus < minimumTargetRouteFocus)) failures.push("route focus below disclosed threshold");
  if (trials.some((trial) => trial.calibrationAgainstCore.status === "overconfident")) {
    failures.push("overconfident against core oracle");
  }
  if (trials.some((trial) => trial.unsafeNarrowAgainstCore)) failures.push("unsafe narrow mode against core oracle");
  if (trials.some((trial) => trial.unsafeEnforcedStopAgainstCore)) failures.push("unsafe enforced stop against core oracle");
  if (trials.some((trial) => !trial.coverageMetricAgreement || !trial.focusMetricAgreement)) {
    failures.push("reported metrics differ from independent recomputation beyond display-rounding tolerance");
  }
  if (trials.some((trial) => !trial.evaluationContextRouteAgreement)) {
    failures.push("evaluate route and context boundaries differ");
  }
  if (trials.some((trial) => trial.contextEstimatedTokens > budget)) failures.push("context token ceiling exceeded");
  if (status.stale !== false) failures.push("index stale immediately after explicit index");
  const trackedStatus = run("git", ["status", "--short", "--untracked-files=no"], { cwd: root }).stdout.trim();
  if (trackedStatus) failures.push("Palace modified tracked target files");

  return {
    status: failures.length ? "failed" : "passed",
    failures,
    index: { elapsedMs: indexElapsedMs, staleAfterIndex: status.stale },
    deterministicRoutes,
    trackedTargetWorktreeClean: !trackedStatus,
    trials
  };
}

function buildTrial(target, trial, evaluation, context, telemetry, timing) {
  const routeFiles = unique(evaluation.route.files.map(stripLocation));
  const routeSet = new Set(routeFiles.map(normalizePath));
  const changedSet = new Set(target.changedFiles.map(normalizePath));
  const coreFiles = [...target.implementationFiles, ...target.testFiles];
  const coreSet = new Set(coreFiles.map(normalizePath));
  const matchedChangedFiles = target.changedFiles.filter((file) => routeSet.has(normalizePath(file)));
  const matchedCoreFiles = coreFiles.filter((file) => routeSet.has(normalizePath(file)));
  const routeOnlyFiles = routeFiles.filter((file) => !changedSet.has(normalizePath(file)));
  const changedFileCoverage = round(matchedChangedFiles.length / target.changedFiles.length);
  const coreSurfaceCoverage = round(matchedCoreFiles.length / coreFiles.length);
  const routeFocus = routeFiles.length ? round(matchedChangedFiles.length / routeFiles.length) : 0;
  const coreRouteFocus = routeFiles.length ? round(matchedCoreFiles.length / routeFiles.length) : 0;
  const auxiliarySurfaceCoverage = target.auxiliaryFiles.length
    ? round(target.auxiliaryFiles.filter((file) => routeSet.has(normalizePath(file))).length / target.auxiliaryFiles.length)
    : null;
  const selectedFiles = unique([
    ...telemetry.executionBoundaries.primary,
    ...telemetry.executionBoundaries.support,
    ...telemetry.executionBoundaries.deferred
  ].map(stripLocation));
  const reportedCoverage = finiteNumber(evaluation.coverage?.changedFileCoverage);
  const reportedFocus = finiteNumber(evaluation.coverage?.routeFocus);
  const stopEnforced = context.executionBoundaries?.stopEnforced === true;
  const evidenceStatus = context.selection?.evidenceStatus ?? telemetry.evidenceStatus ?? null;
  const interventionPolicy = context.selection?.interventionPolicy ?? null;

  return {
    trial,
    status: "completed",
    expectedTaskType: target.expectedTaskType,
    taskType: evaluation.taskType,
    routeFiles,
    routeFileCount: routeFiles.length,
    matchedChangedFiles,
    matchedCoreFiles,
    routeOnlyFiles,
    changedFileCoverage,
    coreSurfaceCoverage,
    routeFocus,
    coreRouteFocus,
    auxiliarySurfaceCoverage,
    missingImplementationFiles: target.implementationFiles.filter((file) => !routeSet.has(normalizePath(file))),
    missingTestFiles: target.testFiles.filter((file) => !routeSet.has(normalizePath(file))),
    missingAuxiliaryFiles: target.auxiliaryFiles.filter((file) => !routeSet.has(normalizePath(file))),
    routeConfidence: evaluation.route.confidence,
    calibrationAgainstCore: independentCalibration(evaluation.route.confidence, coreSurfaceCoverage),
    calibrationAgainstFullDiff: independentCalibration(evaluation.route.confidence, changedFileCoverage),
    reportedChangedFileCoverage: reportedCoverage,
    reportedRouteFocus: reportedFocus,
    coverageMetricAgreement: reportedCoverage !== null
      && Math.abs(reportedCoverage - changedFileCoverage) <= metricAgreementTolerance,
    focusMetricAgreement: reportedFocus !== null
      && Math.abs(reportedFocus - routeFocus) <= metricAgreementTolerance,
    mode: telemetry.mode,
    evidenceStatus,
    interventionPolicy,
    stopEnforced,
    unsafeNarrowAgainstCore: narrowModes.has(telemetry.mode) && coreSurfaceCoverage < 1,
    unsafeNarrowAgainstFullDiff: narrowModes.has(telemetry.mode) && changedFileCoverage < 1,
    unsafeEnforcedStopAgainstCore: stopEnforced && coreSurfaceCoverage < 1,
    contextSelectedFiles: selectedFiles,
    evaluationContextRouteAgreement: sameValues(routeFiles, selectedFiles),
    contextEstimatedTokens: telemetry.payload.contextEstimatedTokens,
    contextBytes: telemetry.payload.contextBytes,
    contextMetricSource: telemetry.payload.source,
    evaluationElapsedMs: timing.evaluationElapsedMs,
    contextElapsedMs: timing.contextElapsedMs,
    staticPalaceCliCalls: 2,
    incidentalCoreOverlap: routeFiles.filter((file) => coreSet.has(normalizePath(file))).length
  };
}

function aggregateTargets(targets) {
  const results = targets.map((target) => target.repairedCandidate);
  const completed = results.filter((result) => result.trials.length === repetitions);
  const firstTrials = completed.map((result) => result.trials[0]);
  return {
    targetCount: targets.length,
    completedTargets: completed.length,
    passedTargets: results.filter((result) => result.status === "passed").length,
    failedTargets: results.filter((result) => result.status === "failed").length,
    executionErrorTargets: results.filter((result) => result.status === "execution-error").length,
    deterministicTargets: completed.filter((result) => result.deterministicRoutes).length,
    taskTypeMatchedTargets: firstTrials.filter((trial) => trial.taskType === trial.expectedTaskType).length,
    coreSurfaceCompleteTargets: firstTrials.filter((trial) => trial.coreSurfaceCoverage === 1).length,
    auxiliarySurfaceCompleteTargets: targets.filter((target) => {
      const trial = target.repairedCandidate.trials[0];
      return target.auxiliaryFiles.length > 0 && trial?.auxiliarySurfaceCoverage === 1;
    }).length,
    auxiliarySurfaceTargetCount: targets.filter((target) => target.auxiliaryFiles.length > 0).length,
    targetMacroChangedFileCoverage: average(firstTrials.map((trial) => trial.changedFileCoverage)),
    targetMacroCoreSurfaceCoverage: average(firstTrials.map((trial) => trial.coreSurfaceCoverage)),
    targetMacroRouteFocus: average(firstTrials.map((trial) => trial.routeFocus)),
    targetMacroCoreRouteFocus: average(firstTrials.map((trial) => trial.coreRouteFocus)),
    minimumTargetChangedFileCoverage: minimum(firstTrials.map((trial) => trial.changedFileCoverage)),
    minimumTargetRouteFocus: minimum(firstTrials.map((trial) => trial.routeFocus)),
    calibrationCoreMeanAbsoluteError: average(firstTrials.map((trial) => trial.calibrationAgainstCore.absoluteError)),
    calibrationFullDiffMeanAbsoluteError: average(firstTrials.map((trial) => trial.calibrationAgainstFullDiff.absoluteError)),
    overconfidentAgainstCoreTrials: completed.flatMap((result) => result.trials)
      .filter((trial) => trial.calibrationAgainstCore.status === "overconfident").length,
    unsafeNarrowAgainstCoreTrials: completed.flatMap((result) => result.trials)
      .filter((trial) => trial.unsafeNarrowAgainstCore).length,
    unsafeNarrowAgainstFullDiffTrials: completed.flatMap((result) => result.trials)
      .filter((trial) => trial.unsafeNarrowAgainstFullDiff).length,
    unsafeEnforcedStopAgainstCoreTrials: completed.flatMap((result) => result.trials)
      .filter((trial) => trial.unsafeEnforcedStopAgainstCore).length,
    metricDisagreementTrials: completed.flatMap((result) => result.trials)
      .filter((trial) => !trial.coverageMetricAgreement || !trial.focusMetricAgreement).length,
    evaluationContextRouteDisagreementTrials: completed.flatMap((result) => result.trials)
      .filter((trial) => !trial.evaluationContextRouteAgreement).length,
    maxContextEstimatedTokens: maximum(firstTrials.map((trial) => trial.contextEstimatedTokens)),
    trackedTargetWorktreeChanges: results.filter((result) => result.trackedTargetWorktreeClean === false).length,
    repairedRouteChangedTargets: targets.filter((target) => target.comparison?.routeChanged).length,
    repairedModeChangedTargets: targets.filter((target) => target.comparison?.modeChanged).length
  };
}

function disclosedGateFailures(aggregate) {
  const failures = [];
  if (aggregate.completedTargets !== targetCount) failures.push("not all targets completed");
  if (aggregate.deterministicTargets !== targetCount) failures.push("not all routes were deterministic");
  if (aggregate.taskTypeMatchedTargets !== targetCount) failures.push("task-type mapping incomplete");
  if (aggregate.coreSurfaceCompleteTargets !== targetCount) failures.push("core implementation/test coverage incomplete");
  if (
    aggregate.auxiliarySurfaceCompleteTargets !== aggregate.auxiliarySurfaceTargetCount
  ) failures.push("bounded auxiliary coverage incomplete");
  if (
    aggregate.targetMacroChangedFileCoverage < minimumMacroChangedFileCoverage
  ) failures.push("target-macro changed-file coverage below threshold");
  if (
    aggregate.targetMacroRouteFocus < minimumMacroRouteFocus
  ) failures.push("target-macro route focus below threshold");
  if (aggregate.minimumTargetChangedFileCoverage < minimumTargetChangedFileCoverage) failures.push("changed-file coverage below threshold");
  if (aggregate.minimumTargetRouteFocus < minimumTargetRouteFocus) failures.push("route focus below threshold");
  if (aggregate.overconfidentAgainstCoreTrials !== 0) failures.push("overconfident trials against core oracle");
  if (aggregate.unsafeNarrowAgainstCoreTrials !== 0) failures.push("unsafe narrow trials against core oracle");
  if (aggregate.unsafeEnforcedStopAgainstCoreTrials !== 0) failures.push("unsafe enforced stops against core oracle");
  if (aggregate.metricDisagreementTrials !== 0) failures.push("reported metric disagreements beyond rounding tolerance");
  if (aggregate.evaluationContextRouteDisagreementTrials !== 0) failures.push("evaluate/context route disagreement");
  if (aggregate.maxContextEstimatedTokens > budget) failures.push("context token ceiling exceeded");
  if (aggregate.trackedTargetWorktreeChanges !== 0) failures.push("tracked target worktree changed");
  return failures;
}

function compactOriginalCandidate(target) {
  const condition = target.conditions?.candidate;
  const trial = condition?.trials?.find((entry) => entry.status === "completed") ?? null;
  return {
    conditionStatus: condition?.status ?? null,
    failures: condition?.failures ?? [],
    trial: trial ? {
      routeFiles: trial.routeFiles,
      changedFileCoverage: trial.changedFileCoverage,
      coreSurfaceCoverage: trial.coreSurfaceCoverage,
      routeFocus: trial.routeFocus,
      routeConfidence: trial.routeConfidence,
      mode: trial.mode,
      evidenceStatus: trial.evidenceStatus,
      unsafeNarrowMode: trial.unsafeNarrowMode
    } : null
  };
}

function compareTarget(originalTarget, repaired) {
  const before = compactOriginalCandidate(originalTarget).trial;
  const after = repaired.trials[0];
  if (!before || !after) return null;
  return {
    routeChanged: !sameValues(before.routeFiles, after.routeFiles),
    modeChanged: before.mode !== after.mode,
    coreSurfaceCoverageDelta: round(after.coreSurfaceCoverage - before.coreSurfaceCoverage),
    changedFileCoverageDelta: round(after.changedFileCoverage - before.changedFileCoverage),
    routeFocusDelta: round(after.routeFocus - before.routeFocus),
    routeConfidenceDelta: round(after.routeConfidence - before.routeConfidence)
  };
}

function publicTargetIdentity(target) {
  return {
    name: target.name,
    language: target.language,
    languageFamily: target.languageFamily,
    url: target.url,
    routeCommit: target.routeCommit,
    groundTruthCommit: target.groundTruthCommit,
    task: target.task,
    expectedTaskType: target.expectedTaskType,
    changedFiles: target.changedFiles,
    implementationFiles: target.implementationFiles,
    testFiles: target.testFiles,
    auxiliaryFiles: target.auxiliaryFiles
  };
}

function independentCalibration(confidence, coverage) {
  const signedError = round(confidence - coverage);
  return {
    confidence,
    coverage,
    signedError,
    absoluteError: round(Math.abs(signedError)),
    status: signedError > calibrationTolerance
      ? "overconfident"
      : signedError < -calibrationTolerance
        ? "underconfident"
        : "aligned"
  };
}

async function hashSourceTree() {
  const files = [];
  for (const relativeRoot of candidateSourceRoots) {
    const absoluteRoot = path.join(projectRoot, relativeRoot);
    const info = await stat(absoluteRoot);
    if (info.isFile()) files.push(absoluteRoot);
    else await collectFiles(absoluteRoot, files);
  }
  files.sort((left, right) => left.localeCompare(right));
  const hash = createHash("sha256");
  for (const file of files) {
    const relative = normalizePath(path.relative(projectRoot, file));
    hash.update(relative);
    hash.update("\0");
    hash.update(await readFile(file));
    hash.update("\0");
  }
  return { roots: candidateSourceRoots, fileCount: files.length, sha256: hash.digest("hex").toUpperCase() };
}

async function collectFiles(root, files) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) await collectFiles(absolute, files);
    else if (entry.isFile()) files.push(absolute);
  }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function sha256File(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex").toUpperCase();
}

function gitObjectExists(root, object) {
  return spawnSync("git", ["cat-file", "-e", object], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true
  }).status === 0;
}

function parseJsonOutput(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} did not produce JSON: ${summarizeError(error)}\n${truncate(value)}`);
  }
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  assert.ok(index >= 0 && args[index + 1], "--out is required");
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.ok(resolved.startsWith(`${path.join(projectRoot, "docs", "research", "evidence")}${path.sep}`));
  return resolved;
}

function runNode(args, options = {}) {
  return run(process.execPath, args, options);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 64 * 1024 * 1024,
    timeout: options.timeout ?? 120_000,
    windowsHide: true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error([
      `Command failed (${result.status}): ${command} ${args.join(" ")}`,
      truncate(result.stdout),
      truncate(result.stderr)
    ].filter(Boolean).join("\n"));
  }
  return result;
}

function stripLocation(value) {
  return String(value).replace(/:\d+(?:-\d+)?$/, "");
}

function normalizePath(value) {
  return String(value).replaceAll("\\", "/").replace(/^\.\//, "");
}

function sameValues(left, right) {
  return JSON.stringify(unique(left).sort()) === JSON.stringify(unique(right).sort());
}

function unique(values) {
  return [...new Set(values)];
}

function lines(value) {
  return String(value).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function finiteNumber(value) {
  return Number.isFinite(value) ? value : null;
}

function average(values) {
  return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function minimum(values) {
  return values.length ? Math.min(...values) : null;
}

function maximum(values) {
  return values.length ? Math.max(...values) : null;
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function safeSegment(value) {
  return String(value).replace(/[^a-z0-9._-]+/gi, "-");
}

function summarizeError(error) {
  return truncate(error instanceof Error ? error.stack ?? error.message : String(error));
}

function truncate(value, limit = 4_000) {
  const text = String(value ?? "").trim();
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

module.exports = {
  disclosedGateFailures,
  independentCalibration,
  normalizePath,
  stripLocation
};
