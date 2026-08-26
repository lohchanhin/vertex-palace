const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { normalizeContextTelemetry } = require("./lib/context-telemetry.cjs");
const { classifyTaskType } = require("./lib/commit-task-classifier.cjs");

const projectRoot = path.resolve(__dirname, "..");
const studyId = "local-blind-routing-validation-round-12-attempt-2-0.4-alpha";
const selectionStudyId = "local-blind-routing-round-12-0.4-alpha";
const manifestRelativePath = "docs/research/evidence/local-blind-routing-target-manifest-0.4-alpha-round-12.json";
const candidateFreezeRelativePath = "docs/research/evidence/local-blind-candidate-freeze-0.4-alpha-round-12.json";
const validationFreezeRelativePath = "docs/research/evidence/local-blind-routing-validation-freeze-attempt-2-0.4-alpha-round-12.json";
const manifestPath = path.join(projectRoot, manifestRelativePath);
const candidateFreezePath = path.join(projectRoot, candidateFreezeRelativePath);
const validationFreezePath = path.join(projectRoot, validationFreezeRelativePath);
const outputPath = require.main === module ? outputArgument(process.argv.slice(2)) : null;
const targetCount = 8;
const repetitions = 2;
const budget = 6_000;
const routeLimit = 10;
const maxDrawers = 4;
const fetchDepth = 400;
const materializationAttempts = 3;
const retryDelayMs = 5_000;
const indexTimeoutMs = 900_000;
const commandTimeoutMs = 300_000;
const calibrationTolerance = 0.15;
const minimumMacroCoverage = 0.90;
const minimumMacroFocus = 0.70;
const minimumTargetCoverage = 0.50;
const minimumTargetFocus = 0.40;
const pairedNonInferiorityMargin = 0.05;
const conditionIds = ["baseline", "candidate"];
const narrowModes = new Set(["bypass", "route-lite"]);
const sourceHashSeeds = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "tsconfig.json",
  "tsup.package-cli.config.ts",
  "tsup.plugin-mcp.config.ts",
  "packages"
];

if (require.main === module) {
  main().catch(async (error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    try {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, `${JSON.stringify({
        schemaVersion: 1,
        studyId,
        generatedAt: new Date().toISOString(),
        status: "invalid",
        evidenceClass: "local-hash-frozen-candidate-held-out-paired-static-routing",
        publicPreregistration: false,
        validityFailures: ["unexpected validator failure before a complete paired result was produced"],
        failureCategory: "unexpected-validator-failure",
        error: summarizeError(error)
      }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    } catch (preservationError) {
      process.stderr.write(`Could not preserve validator failure: ${summarizeError(preservationError)}\n`);
    }
    process.exitCode = 1;
  });
}

async function main() {
  const { manifest, candidateFreeze, validationFreeze } = await assertFrozenInputs();
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-local-blind-round-12-validation-"));
  assertInsideTemporaryRoot(temporaryRoot);
  let report;

  try {
    const baselineBuild = await buildBaselineCli(temporaryRoot, candidateFreeze.comparisonBaseline);
    const conditions = {
      baseline: {
        id: "baseline",
        role: candidateFreeze.comparisonBaseline.role,
        productCommit: candidateFreeze.comparisonBaseline.productCommit,
        cliPath: baselineBuild.cliPath,
        cliSha256: candidateFreeze.comparisonBaseline.cliSha256
      },
      candidate: {
        id: "candidate",
        role: candidateFreeze.candidate.role,
        productCommit: candidateFreeze.candidate.baseCommit,
        sourceState: candidateFreeze.candidate.sourceState,
        cliPath: path.join(projectRoot, candidateFreeze.candidate.cliPath),
        cliSha256: candidateFreeze.candidate.cliSha256
      }
    };

    const targets = [];
    for (const [targetIndex, target] of manifest.targets.entries()) {
      const targetContainer = path.join(temporaryRoot, safeSegment(target.name));
      const sourceRoot = path.join(targetContainer, "source");
      const materialization = await materializeTarget(target, sourceRoot, temporaryRoot);
      if (!materialization.completed) {
        targets.push(materializationFailureTarget(target, targetIndex, materialization));
        continue;
      }

      const order = conditionOrderForIndex(targetIndex);
      const conditionResults = {};
      for (const conditionId of order) {
        const conditionRoot = path.join(targetContainer, conditionId);
        try {
          await cloneConditionTarget(target, sourceRoot, conditionRoot, targetContainer);
          conditionResults[conditionId] = await validateCondition(
            target,
            conditionRoot,
            conditions[conditionId]
          );
        } catch (error) {
          conditionResults[conditionId] = conditionFailure(
            conditions[conditionId],
            isEnvironmentFailure(error) ? "environment-or-setup" : "harness-contract",
            error
          );
        }
      }
      targets.push({
        ...publicTargetIdentity(target),
        conditionOrder: order,
        materializationAttempts: materialization.attempts,
        conditions: conditionResults
      });
    }

    const aggregate = {
      baseline: aggregateCondition(targets, "baseline"),
      candidate: aggregateCondition(targets, "candidate")
    };
    const baselineGateFailures = conditionGateFailures(aggregate.baseline);
    const candidateGateFailures = conditionGateFailures(aggregate.candidate);
    const comparison = compareConditions(targets, aggregate);
    const validityFailures = studyValidityFailures(targets, baselineBuild);
    const status = validityFailures.length ? "invalid" : "completed";
    const advancementEligible = status === "completed"
      && candidateGateFailures.length === 0
      && comparison.coverageNonInferior
      && comparison.focusNonInferior
      && comparison.narrowModeSafetyNonInferior
      && comparison.enforcedStopSafetyNonInferior;

    report = {
      schemaVersion: 1,
      studyId,
      generatedAt: new Date().toISOString(),
      status,
      evidenceClass: "local-hash-frozen-candidate-held-out-paired-static-routing",
      publicPreregistration: false,
      claimBoundary: "First paired static-routing observation after a preserved pre-observation harness failure, for the locally frozen 0.4 candidate and its pre-repair baseline on eight task-coherent, real-history Round 12 targets selected before any Palace result was observed. It does not execute target tests or an Agent and cannot support Agent correctness, end-to-end reported Token, Agent tool-call, or Agent wall-time claims.",
      validityFailures,
      candidateGateStatus: candidateGateFailures.length ? "failed" : "passed",
      candidateGateFailures,
      baselineGateStatus: baselineGateFailures.length ? "failed" : "passed",
      baselineGateFailures,
      advancementStatus: advancementEligible
        ? "eligible-for-separately-frozen-agent-protocol"
        : "not-eligible-for-agent-protocol",
      frozenInputs: {
        manifestPath: manifestRelativePath,
        manifestSha256: validationFreeze.inputs.targetManifestSha256,
        candidateFreezePath: candidateFreezeRelativePath,
        candidateFreezeSha256: validationFreeze.inputs.candidateFreezeSha256,
        validationFreezePath: validationFreezeRelativePath,
        validationFreezeSha256: await sha256File(validationFreezePath)
      },
      products: {
        baseline: {
          role: conditions.baseline.role,
          productCommit: conditions.baseline.productCommit,
          cliSha256: conditions.baseline.cliSha256,
          build: baselineBuild
        },
        candidate: {
          role: conditions.candidate.role,
          baseCommit: conditions.candidate.productCommit,
          sourceState: conditions.candidate.sourceState,
          cliSha256: conditions.candidate.cliSha256,
          sourceTree: candidateFreeze.candidate.sourceTree
        }
      },
      protocol: {
        targets: targetCount,
        conditions: conditionIds,
        repetitions,
        formalObservationsPerCondition: targetCount * repetitions,
        totalFormalObservations: targetCount * repetitions * conditionIds.length,
        budget,
        routeLimit,
        maxDrawers,
        fetchDepth,
        fetchMode: "complete-shallow-history-no-promisor",
        materializationAttempts,
        indexAttempts: 1,
        indexTimeoutMs,
        evaluateRetries: 0,
        contextRetries: 0,
        calibrationTolerance,
        minimumMacroCoverage,
        minimumMacroFocus,
        minimumTargetCoverage,
        minimumTargetFocus,
        pairedNonInferiorityMargin,
        conditionOrder: "balanced AB/BA by manifest index",
        execution: "sequential-never-concurrent",
        staticPalaceCliCallsPerCompletedCondition: 7,
        agentToolCallsMeasured: false
      },
      aggregate,
      comparison,
      targets
    };

    await assertFrozenInputs();
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx"
    });
    process.stdout.write(`${JSON.stringify({
      outputPath,
      status,
      candidateGateStatus: report.candidateGateStatus,
      advancementStatus: report.advancementStatus,
      aggregate,
      comparison,
      validityFailures,
      candidateGateFailures
    }, null, 2)}\n`);
  } finally {
    if (process.env.KEEP_LOCAL_BLIND_ROUND_12_VALIDATION_TEMP === "1") {
      process.stderr.write(`Keeping Round 12 validation workspaces at ${temporaryRoot}\n`);
    } else {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }

  if (report?.status === "invalid") process.exitCode = 1;
}

async function assertFrozenInputs() {
  const validationFreezeBytes = await readFile(validationFreezePath);
  const validationFreeze = JSON.parse(validationFreezeBytes.toString("utf8"));
  assert.equal(validationFreeze.schemaVersion, 1);
  assert.equal(validationFreeze.studyId, studyId);
  assert.equal(validationFreeze.status, "locally-frozen");
  assert.equal(validationFreeze.freezeAttempt, 2);
  assert.equal(validationFreeze.publicPreregistration, false);
  assert.equal(validationFreeze.protocol.noPalaceResultObservedBeforeValidatorFreeze, true);
  assert.equal(validationFreeze.protocol.palaceCallsOnSelectedTasksBeforeFreeze, 0);

  for (const [relativePath, expectedHash] of Object.entries(validationFreeze.artifacts)) {
    assert.equal(await sha256File(path.join(projectRoot, relativePath)), expectedHash, `${relativePath} changed after validation freeze`);
  }
  assert.equal(await sha256File(manifestPath), validationFreeze.inputs.targetManifestSha256);
  assert.equal(await sha256File(candidateFreezePath), validationFreeze.inputs.candidateFreezeSha256);

  const candidateFreeze = JSON.parse(await readFile(candidateFreezePath, "utf8"));
  assert.equal(candidateFreeze.studyId, selectionStudyId);
  assert.equal(candidateFreeze.status, "locally-frozen");
  assert.equal(
    run("git", ["rev-parse", "HEAD"], { cwd: projectRoot }).stdout.trim(),
    candidateFreeze.candidate.baseCommit
  );
  assert.equal(
    await sha256File(path.join(projectRoot, candidateFreeze.candidate.cliPath)),
    candidateFreeze.candidate.cliSha256
  );
  assert.equal(
    await sha256File(path.join(projectRoot, candidateFreeze.candidate.generatedMcpPath)),
    candidateFreeze.candidate.generatedMcpSha256
  );
  assert.deepEqual(await hashSourceTree(projectRoot), candidateFreeze.candidate.sourceTree);

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.studyId, selectionStudyId);
  assert.equal(manifest.status, "selected");
  assert.equal(manifest.heldOutAgainstCandidate, true);
  assert.equal(manifest.rules.palaceCallsOnCandidateTasksBeforeFinalization, 0);
  assert.equal(manifest.rules.taskDiffCoherenceReviewRequired, true);
  assert.equal(manifest.rules.wholeTargetRejectionForUnrelatedOrUncertainHunk, true);
  assert.equal(manifest.rules.partialOraclePruningForbidden, true);
  assert.equal(manifest.rules.languageDiversitySatisfied, true);
  assert.equal(manifest.rules.targetsPerLanguageFamily, 2);
  assert.equal(manifest.rules.taskClassifier, "inflected-behavioral-subject-v1");
  assert.equal(manifest.targets.length, targetCount);
  for (const family of manifest.rules.requiredLanguageFamilies) {
    assert.equal(manifest.rules.selectedPerLanguageFamily[family], 2);
  }
  for (const target of manifest.targets) {
    assert.equal(target.expectedTaskType, expectedTaskType(target.task));
    assert.ok(target.changedFiles.length >= 2 && target.changedFiles.length <= 8);
    assert.ok(target.implementationFiles.length >= 1);
    assert.ok(target.testFiles.length >= 1);
    assert.ok(target.auxiliaryFiles.length <= 2);
    assert.deepEqual(
      [...target.changedFiles].sort(),
      [...target.implementationFiles, ...target.testFiles, ...target.auxiliaryFiles].sort()
    );
  }
  return { manifest, candidateFreeze, validationFreeze };
}

async function buildBaselineCli(temporaryRoot, baseline) {
  const baselineRoot = path.join(temporaryRoot, "_baseline-product");
  assertInside(baselineRoot, temporaryRoot);
  const startedAt = performance.now();
  run("git", ["clone", "--quiet", "--shared", "--no-checkout", projectRoot, baselineRoot], {
    cwd: temporaryRoot,
    timeout: 300_000
  });
  run("git", ["-c", "advice.detachedHead=false", "checkout", "--detach", baseline.productCommit], {
    cwd: baselineRoot,
    timeout: 120_000
  });
  assert.equal(run("git", ["rev-parse", "HEAD"], { cwd: baselineRoot }).stdout.trim(), baseline.productCommit);
  assert.deepEqual(await hashSourceTree(baselineRoot), baseline.sourceTree);

  const installStartedAt = performance.now();
  const install = runPnpm([
    "--dir", baselineRoot,
    "install", "--offline", "--frozen-lockfile", "--ignore-scripts"
  ], { cwd: projectRoot, timeout: 600_000 });
  const installElapsedMs = Math.round(performance.now() - installStartedAt);
  const buildStartedAt = performance.now();
  const build = runPnpm(["--dir", baselineRoot, "build"], {
    cwd: projectRoot,
    timeout: 600_000
  });
  const buildElapsedMs = Math.round(performance.now() - buildStartedAt);
  const cliPath = path.join(baselineRoot, baseline.cliPath);
  assert.equal(await sha256File(cliPath), baseline.cliSha256);
  assert.deepEqual(await hashSourceTree(baselineRoot), baseline.sourceTree);

  return {
    cliPath,
    elapsedMs: Math.round(performance.now() - startedAt),
    installElapsedMs,
    buildElapsedMs,
    pnpmVersion: runPnpm(["--version"], { cwd: projectRoot }).stdout.trim(),
    installLogSha256: sha256Text(`${install.stdout}\n${install.stderr}`),
    buildLogSha256: sha256Text(`${build.stdout}\n${build.stderr}`),
    sourceTreeVerifiedBeforeAndAfterBuild: true,
    cliHashVerified: true
  };
}

async function materializeTarget(target, root, temporaryRoot) {
  const attempts = [];
  let lastError = null;
  for (let attempt = 1; attempt <= materializationAttempts; attempt += 1) {
    const startedAt = performance.now();
    try {
      assertInside(root, temporaryRoot);
      await rm(root, { recursive: true, force: true });
      await clonePinnedTarget(target, root);
      attempts.push({
        attempt,
        status: "completed",
        elapsedMs: Math.round(performance.now() - startedAt),
        errorCode: null,
        error: null
      });
      return { completed: true, attempts, error: null };
    } catch (error) {
      lastError = error;
      attempts.push({
        attempt,
        status: "environment-failed",
        elapsedMs: Math.round(performance.now() - startedAt),
        errorCode: error.code || null,
        error: summarizeError(error)
      });
      if (attempt < materializationAttempts) await delay(retryDelayMs);
    }
  }
  return { completed: false, attempts, error: lastError };
}

async function clonePinnedTarget(target, root) {
  await mkdir(root, { recursive: true });
  run("git", ["init", "--quiet"], { cwd: root });
  run("git", ["remote", "add", "origin", target.url], { cwd: root });
  run("git", ["fetch", "--quiet", `--depth=${fetchDepth}`, "origin", target.pinnedHead], {
    cwd: root,
    timeout: 600_000
  });
  assert.ok(gitObjectExists(root, `${target.routeCommit}^{commit}`), "Route commit missing from frozen history");
  assert.ok(gitObjectExists(root, `${target.groundTruthCommit}^{commit}`), "Ground-truth commit missing from frozen history");
  run("git", ["-c", "advice.detachedHead=false", "checkout", "--detach", target.routeCommit], {
    cwd: root,
    timeout: 120_000
  });
  run("git", ["update-ref", "refs/vertex-palace/route", target.routeCommit], { cwd: root });
  run("git", ["update-ref", "refs/vertex-palace/ground-truth", target.groundTruthCommit], { cwd: root });
  verifyPinnedTarget(target, root);
}

async function cloneConditionTarget(target, sourceRoot, conditionRoot, targetContainer) {
  assertInside(conditionRoot, targetContainer);
  await rm(conditionRoot, { recursive: true, force: true });
  await mkdir(conditionRoot, { recursive: true });
  run("git", ["init", "--quiet"], { cwd: conditionRoot });
  run("git", ["remote", "add", "source", sourceRoot], { cwd: conditionRoot });
  run("git", [
    "fetch", "--quiet", "--no-tags", "source",
    "refs/vertex-palace/route:refs/vertex-palace/route",
    "refs/vertex-palace/ground-truth:refs/vertex-palace/ground-truth"
  ], { cwd: conditionRoot, timeout: 300_000 });
  run("git", ["-c", "advice.detachedHead=false", "checkout", "--detach", target.routeCommit], {
    cwd: conditionRoot,
    timeout: 120_000
  });
  verifyPinnedTarget(target, conditionRoot);
}

function verifyPinnedTarget(target, root) {
  assert.equal(run("git", ["rev-parse", "HEAD"], { cwd: root }).stdout.trim(), target.routeCommit);
  assert.equal(
    run("git", ["rev-parse", `${target.groundTruthCommit}^`], { cwd: root }).stdout.trim(),
    target.routeCommit
  );
  assert.equal(
    run("git", ["show", "-s", "--format=%s", target.groundTruthCommit], { cwd: root }).stdout.trim(),
    target.task
  );
  const changes = parseNameStatus(
    run("git", ["diff", "--name-status", "--find-renames", target.routeCommit, target.groundTruthCommit, "--"], {
      cwd: root
    }).stdout
  );
  assert.ok(changes.every(({ status }) => status === "M"));
  assert.deepEqual(changes.map(({ path: file }) => file).sort(), [...target.changedFiles].sort());
  for (const file of target.changedFiles) {
    assert.ok(gitObjectExists(root, `${target.routeCommit}:${file}`));
    assert.ok(gitObjectExists(root, `${target.groundTruthCommit}:${file}`));
  }
  assert.equal(
    run("git", ["status", "--short", "--untracked-files=no"], { cwd: root }).stdout.trim(),
    ""
  );
}

async function validateCondition(target, root, condition) {
  const freshIndex = prepareFreshIndex(target, root, condition);
  const trials = [];
  const failures = [];

  for (let trial = 1; trial <= repetitions; trial += 1) {
    let evaluation;
    let failedPhase = "evaluate";
    try {
      const evaluationStartedAt = performance.now();
      evaluation = parseJsonOutput(runNode([
        condition.cliPath,
        "evaluate",
        target.task,
        ...target.changedFiles.flatMap((file) => ["--changed-file", file]),
        "--budget", String(budget),
        "--route-limit", String(routeLimit),
        "--max-drawers", String(maxDrawers),
        "--json"
      ], { cwd: root, timeout: commandTimeoutMs }).stdout, `${target.name} ${condition.id} evaluate ${trial}`);
      const evaluationElapsedMs = Math.round(performance.now() - evaluationStartedAt);

      failedPhase = "context";
      const contextStartedAt = performance.now();
      const contextResult = runNode([
        condition.cliPath,
        "context",
        target.task,
        "--auto",
        "--format", "json",
        "--budget", String(budget),
        "--route-limit", String(routeLimit),
        "--max-drawers", String(maxDrawers)
      ], { cwd: root, timeout: commandTimeoutMs });
      const context = parseJsonOutput(contextResult.stdout, `${target.name} ${condition.id} context ${trial}`);
      const telemetry = normalizeContextTelemetry(context, contextResult.stdout);
      const contextElapsedMs = Math.round(performance.now() - contextStartedAt);

      const routeFiles = unique(evaluation.route.files.map(stripLocation));
      const routeFileSet = new Set(routeFiles.map(normalizePath));
      const changedFileSet = new Set(target.changedFiles.map(normalizePath));
      const matchedOracleFiles = target.changedFiles.filter((file) => routeFileSet.has(normalizePath(file)));
      const routeOnlyFiles = routeFiles.filter((file) => !changedFileSet.has(normalizePath(file)));
      const independentCoverage = round(matchedOracleFiles.length / target.changedFiles.length);
      const independentFocus = routeFiles.length ? round(matchedOracleFiles.length / routeFiles.length) : 0;
      const missingImplementationFiles = target.implementationFiles.filter(
        (file) => !routeFileSet.has(normalizePath(file))
      );
      const missingTestFiles = target.testFiles.filter((file) => !routeFileSet.has(normalizePath(file)));
      const missingAuxiliaryFiles = target.auxiliaryFiles.filter(
        (file) => !routeFileSet.has(normalizePath(file))
      );
      const coreFileCount = target.implementationFiles.length + target.testFiles.length;
      const coreSurfaceCoverage = round(
        (coreFileCount - missingImplementationFiles.length - missingTestFiles.length) / coreFileCount
      );
      const auxiliarySurfaceCoverage = target.auxiliaryFiles.length
        ? round((target.auxiliaryFiles.length - missingAuxiliaryFiles.length) / target.auxiliaryFiles.length)
        : null;
      const calibration = independentCalibration(evaluation.route.confidence, independentCoverage);
      const selectedFiles = unique([
        ...telemetry.executionBoundaries.primary,
        ...telemetry.executionBoundaries.support,
        ...telemetry.executionBoundaries.deferred
      ].map(stripLocation));
      const excludedFiles = unique(
        telemetry.executionBoundaries.excluded
          .map((entry) => typeof entry === "string" ? entry : entry?.sourcePath)
          .filter((entry) => typeof entry === "string" && entry.length > 0)
          .map(stripLocation)
      );
      const stopEnforced = context.executionBoundaries?.stopEnforced === true;
      const evidenceStatus = context.selection?.evidenceStatus
        ?? context.evidenceStatus
        ?? telemetry.evidenceStatus
        ?? null;
      const interventionPolicy = context.selection?.interventionPolicy
        ?? context.interventionPolicy
        ?? null;
      const reportedCoverage = finiteNumber(evaluation.coverage?.changedFileCoverage);
      const reportedFocus = finiteNumber(evaluation.coverage?.routeFocus);

      trials.push({
        trial,
        status: "completed",
        expectedTaskType: target.expectedTaskType,
        taskType: evaluation.taskType,
        routeFiles,
        routeFileCount: routeFiles.length,
        matchedOracleFiles,
        routeOnlyFiles,
        changedFileCoverage: independentCoverage,
        reportedChangedFileCoverage: reportedCoverage,
        coverageMetricAgreement: reportedCoverage !== null
          && Math.abs(reportedCoverage - independentCoverage) <= 0.001,
        routeFocus: independentFocus,
        reportedRouteFocus: reportedFocus,
        focusMetricAgreement: reportedFocus !== null
          && Math.abs(reportedFocus - independentFocus) <= 0.001,
        coreSurfaceCoverage,
        missingImplementationFiles,
        missingTestFiles,
        auxiliarySurfaceCoverage,
        missingAuxiliaryFiles,
        routeConfidence: evaluation.route.confidence,
        calibration,
        reportedCalibration: evaluation.calibration ?? null,
        mode: telemetry.mode,
        evidenceStatus,
        interventionPolicy,
        stopEnforced,
        unsafeNarrowMode: narrowModes.has(telemetry.mode) && independentCoverage < minimumMacroCoverage,
        unsafeEnforcedStop: stopEnforced && independentCoverage < 1,
        contextSelectedFiles: selectedFiles,
        evaluationContextRouteAgreement: sameValues(routeFiles, selectedFiles),
        selectedExcludedOverlap: selectedFiles.filter((selected) =>
          excludedFiles.some((excluded) => pathsOverlap(selected, excluded))
        ),
        contextEstimatedTokens: telemetry.payload.contextEstimatedTokens,
        contextBytes: telemetry.payload.contextBytes,
        contextMetricSource: telemetry.payload.source,
        evaluationElapsedMs,
        contextElapsedMs,
        staticPalaceCliCalls: 2
      });
    } catch (error) {
      trials.push({
        trial,
        status: "execution-error",
        failedPhase,
        expectedTaskType: target.expectedTaskType,
        taskType: evaluation?.taskType ?? null,
        routeFiles: unique(evaluation?.route?.files?.map(stripLocation) ?? []),
        errorCode: error.code || null,
        error: summarizeError(error)
      });
      failures.push(`trial ${trial} ${failedPhase} execution failed`);
    }
  }

  const completed = trials.filter((trial) => trial.status === "completed");
  const deterministicRoutes = completed.length === repetitions
    && completed.every((trial) => JSON.stringify(trial.routeFiles) === JSON.stringify(completed[0].routeFiles));
  if (completed.length !== repetitions) failures.push("not all formal repetitions completed");
  if (!deterministicRoutes) failures.push("route order or membership differed across repetitions");
  if (completed.some((trial) => trial.taskType !== target.expectedTaskType)) {
    failures.push(`task type differed from ${target.expectedTaskType}`);
  }
  if (completed.some((trial) => trial.coreSurfaceCoverage !== 1)) {
    failures.push("implementation or path-derived focused-test coverage was incomplete");
  }
  if (target.auxiliaryFiles.length && completed.some((trial) => trial.auxiliarySurfaceCoverage !== 1)) {
    failures.push("bounded auxiliary coverage was incomplete");
  }
  if (completed.some((trial) => trial.changedFileCoverage < minimumTargetCoverage)) {
    failures.push(`target changed-file coverage fell below ${minimumTargetCoverage.toFixed(2)}`);
  }
  if (completed.some((trial) => trial.routeFocus < minimumTargetFocus)) {
    failures.push(`target route focus fell below ${minimumTargetFocus.toFixed(2)}`);
  }
  if (completed.some((trial) => trial.calibration.status === "overconfident")) {
    failures.push("route was overconfident against independent coverage");
  }
  if (completed.some((trial) => trial.unsafeNarrowMode)) failures.push("unsafe narrow mode observed");
  if (completed.some((trial) => trial.unsafeEnforcedStop)) {
    failures.push("stop was enforced with incomplete oracle coverage");
  }
  if (completed.some((trial) => trial.contextEstimatedTokens > budget)) {
    failures.push("context payload exceeded the token ceiling");
  }
  if (completed.some((trial) => trial.selectedExcludedOverlap.length)) {
    failures.push("selected and excluded boundaries overlapped");
  }
  if (completed.some((trial) => !trial.coverageMetricAgreement || !trial.focusMetricAgreement)) {
    failures.push("reported route metrics differed from independent recomputation");
  }
  if (completed.some((trial) => !trial.evaluationContextRouteAgreement)) {
    failures.push("evaluate route and context selected boundaries differed");
  }
  if (freshIndex.status.stale !== false) failures.push("status was stale immediately after explicit index");

  const trackedStatus = run("git", ["status", "--short", "--untracked-files=no"], { cwd: root }).stdout.trim();
  if (trackedStatus) failures.push("Palace modified tracked target files");

  return {
    id: condition.id,
    role: condition.role,
    productCommit: condition.productCommit,
    cliSha256: condition.cliSha256,
    status: failures.length ? "failed" : "passed",
    failureCategory: failures.length ? "product-or-contract" : null,
    failures,
    deterministicRoutes,
    freshIndex,
    trackedWorktreeClean: trackedStatus === "",
    staticPalaceCliCalls: 3 + trials.reduce((sum, trial) => sum + (trial.staticPalaceCliCalls ?? 0), 0),
    trials
  };
}

function prepareFreshIndex(target, root, condition) {
  const startedAt = performance.now();
  const initStartedAt = performance.now();
  runNode([condition.cliPath, "init"], { cwd: root, timeout: 120_000 });
  const initElapsedMs = Math.round(performance.now() - initStartedAt);
  const indexStartedAt = performance.now();
  runNode([condition.cliPath, "index"], { cwd: root, timeout: indexTimeoutMs });
  const indexElapsedMs = Math.round(performance.now() - indexStartedAt);
  const statusStartedAt = performance.now();
  const status = parseJsonOutput(
    runNode([condition.cliPath, "status"], { cwd: root, timeout: 120_000 }).stdout,
    `${target.name} ${condition.id} status`
  );
  const statusElapsedMs = Math.round(performance.now() - statusStartedAt);
  return {
    status,
    elapsedMs: Math.round(performance.now() - startedAt),
    initElapsedMs,
    indexElapsedMs,
    statusElapsedMs,
    attempts: 1
  };
}

function aggregateCondition(targets, conditionId) {
  const targetResults = targets
    .map((target) => ({ target, result: target.conditions?.[conditionId] }))
    .filter(({ result }) => result);
  const trials = targetResults.flatMap(({ result }) => result.trials ?? []);
  const completed = trials.filter((trial) => trial.status === "completed");
  const firstTrials = targetResults.map(({ result }) => firstCompletedTrial(result)).filter(Boolean);
  const auxiliaryTargets = targetResults.filter(({ target }) => target.auxiliaryFiles.length);
  const staticTimes = targetResults.flatMap(({ result }) => [
    result.freshIndex?.elapsedMs,
    ...(result.trials ?? []).flatMap((trial) => [trial.evaluationElapsedMs, trial.contextElapsedMs])
  ]).filter((value) => Number.isFinite(value));

  return {
    condition: conditionId,
    targetCount: targets.length,
    conditionRecordedTargets: targetResults.length,
    passedTargets: targetResults.filter(({ result }) => result.status === "passed").length,
    failedTargets: targetResults.filter(({ result }) => result.status === "failed").length,
    completedTrials: completed.length,
    taskTypeMatchedTargets: targetResults.filter(({ target, result }) =>
      result.trials?.length === repetitions
      && result.trials.every((trial) => trial.status === "completed" && trial.taskType === target.expectedTaskType)
    ).length,
    coreSurfaceCompleteTargets: targetResults.filter(({ result }) =>
      result.trials?.length === repetitions
      && result.trials.every((trial) => trial.status === "completed" && trial.coreSurfaceCoverage === 1)
    ).length,
    auxiliarySurfaceTargetCount: auxiliaryTargets.length,
    auxiliarySurfaceCompleteTargets: auxiliaryTargets.filter(({ result }) =>
      result.trials?.length === repetitions
      && result.trials.every((trial) => trial.status === "completed" && trial.auxiliarySurfaceCoverage === 1)
    ).length,
    deterministicTargets: targetResults.filter(({ result }) => result.deterministicRoutes).length,
    exactOracleTargets: targetResults.filter(({ target, result }) => {
      const trial = firstCompletedTrial(result);
      return trial && sameValues(trial.routeFiles, target.changedFiles);
    }).length,
    oracleFileTotal: targets.reduce((sum, target) => sum + target.changedFiles.length, 0),
    routeFileTotal: firstTrials.reduce((sum, trial) => sum + trial.routeFileCount, 0),
    targetMacroChangedFileCoverage: averageOrNull(firstTrials.map((trial) => trial.changedFileCoverage)),
    targetMacroRouteFocus: averageOrNull(firstTrials.map((trial) => trial.routeFocus)),
    minimumTargetChangedFileCoverage: minimumOrNull(firstTrials.map((trial) => trial.changedFileCoverage)),
    minimumTargetRouteFocus: minimumOrNull(firstTrials.map((trial) => trial.routeFocus)),
    calibrationMeanAbsoluteError: averageOrNull(firstTrials.map((trial) => trial.calibration.absoluteError)),
    overconfidentTrials: completed.filter((trial) => trial.calibration.status === "overconfident").length,
    underconfidentTrials: completed.filter((trial) => trial.calibration.status === "underconfident").length,
    wellCalibratedTrials: completed.filter((trial) => trial.calibration.status === "well-calibrated").length,
    unsafeNarrowModeTrials: completed.filter((trial) => trial.unsafeNarrowMode).length,
    unsafeEnforcedStopTrials: completed.filter((trial) => trial.unsafeEnforcedStop).length,
    modeCounts: countValues(firstTrials.map((trial) => trial.mode)),
    evidenceStatusCounts: countValues(firstTrials.map((trial) => trial.evidenceStatus ?? "unknown")),
    contextEstimatedTokensMean: averageOrNull(completed.map((trial) => trial.contextEstimatedTokens)),
    contextEstimatedTokensMedian: medianOrNull(completed.map((trial) => trial.contextEstimatedTokens)),
    maxContextEstimatedTokens: maximumOrNull(completed.map((trial) => trial.contextEstimatedTokens)),
    contextBytesMean: averageOrNull(completed.map((trial) => trial.contextBytes)),
    selectedExcludedOverlapTrials: completed.filter((trial) => trial.selectedExcludedOverlap.length).length,
    metricDisagreementTrials: completed.filter(
      (trial) => !trial.coverageMetricAgreement || !trial.focusMetricAgreement
    ).length,
    evaluationContextRouteDisagreementTrials: completed.filter(
      (trial) => !trial.evaluationContextRouteAgreement
    ).length,
    staleAfterExplicitIndexTargets: targetResults.filter(
      ({ result }) => result.freshIndex?.status?.stale !== false
    ).length,
    trackedWorktreeModifiedTargets: targetResults.filter(
      ({ result }) => result.trackedWorktreeClean === false
    ).length,
    staticPalaceCliCalls: targetResults.reduce(
      (sum, { result }) => sum + (result.staticPalaceCliCalls ?? 0),
      0
    ),
    staticCommandElapsedMsTotal: staticTimes.reduce((sum, value) => sum + value, 0),
    staticCommandElapsedMsMedian: medianOrNull(staticTimes),
    environmentOrSetupFailures: targetResults.filter(
      ({ result }) => result.failureCategory === "environment-or-setup"
    ).length,
    harnessContractFailures: targetResults.filter(
      ({ result }) => result.failureCategory === "harness-contract"
    ).length,
    productOrContractFailures: targetResults.filter(
      ({ result }) => result.failureCategory === "product-or-contract"
    ).length
  };
}

function conditionGateFailures(result) {
  const failures = [];
  if (result.conditionRecordedTargets !== targetCount) failures.push("condition target count was incomplete");
  if (result.completedTrials !== targetCount * repetitions) failures.push("not all formal repetitions completed");
  if (result.taskTypeMatchedTargets !== targetCount) failures.push("task-type mapping was incomplete");
  if (result.coreSurfaceCompleteTargets !== targetCount) {
    failures.push("implementation/path-derived focused-test coverage was incomplete");
  }
  if (result.auxiliarySurfaceCompleteTargets !== result.auxiliarySurfaceTargetCount) {
    failures.push("bounded auxiliary coverage was incomplete");
  }
  if (result.deterministicTargets !== targetCount) failures.push("routes were not deterministic");
  if (result.targetMacroChangedFileCoverage === null || result.targetMacroChangedFileCoverage < minimumMacroCoverage) {
    failures.push(`target-macro changed-file coverage fell below ${minimumMacroCoverage.toFixed(2)}`);
  }
  if (result.targetMacroRouteFocus === null || result.targetMacroRouteFocus < minimumMacroFocus) {
    failures.push(`target-macro route focus fell below ${minimumMacroFocus.toFixed(2)}`);
  }
  if (
    result.minimumTargetChangedFileCoverage === null
    || result.minimumTargetChangedFileCoverage < minimumTargetCoverage
  ) failures.push(`a target changed-file coverage fell below ${minimumTargetCoverage.toFixed(2)}`);
  if (result.minimumTargetRouteFocus === null || result.minimumTargetRouteFocus < minimumTargetFocus) {
    failures.push(`a target route focus fell below ${minimumTargetFocus.toFixed(2)}`);
  }
  if (result.overconfidentTrials !== 0) failures.push("overconfident trials were observed");
  if (result.unsafeNarrowModeTrials !== 0) failures.push("unsafe narrow modes were observed");
  if (result.unsafeEnforcedStopTrials !== 0) failures.push("incomplete routes enforced stopping");
  if (result.maxContextEstimatedTokens === null || result.maxContextEstimatedTokens > budget) {
    failures.push("context payload exceeded the token ceiling");
  }
  if (result.selectedExcludedOverlapTrials !== 0) failures.push("selected and excluded boundaries overlapped");
  if (result.metricDisagreementTrials !== 0) failures.push("reported and independent route metrics disagreed");
  if (result.evaluationContextRouteDisagreementTrials !== 0) {
    failures.push("evaluate routes and context boundaries disagreed");
  }
  if (result.staleAfterExplicitIndexTargets !== 0) failures.push("explicit indexes were stale");
  if (result.trackedWorktreeModifiedTargets !== 0) failures.push("Palace modified tracked target files");
  return failures;
}

function compareConditions(targets, aggregate) {
  const targetPairs = [];
  for (const target of targets) {
    const baseline = firstCompletedTrial(target.conditions?.baseline);
    const candidate = firstCompletedTrial(target.conditions?.candidate);
    if (!baseline || !candidate) continue;
    targetPairs.push({
      target: target.name,
      languageFamily: target.languageFamily,
      routeChanged: JSON.stringify(baseline.routeFiles) !== JSON.stringify(candidate.routeFiles),
      modeChanged: baseline.mode !== candidate.mode,
      baseline: compactTrial(baseline),
      candidate: compactTrial(candidate),
      delta: {
        changedFileCoverage: round(candidate.changedFileCoverage - baseline.changedFileCoverage),
        routeFocus: round(candidate.routeFocus - baseline.routeFocus),
        routeConfidence: round(candidate.routeConfidence - baseline.routeConfidence),
        contextEstimatedTokens: candidate.contextEstimatedTokens - baseline.contextEstimatedTokens,
        evaluationElapsedMs: candidate.evaluationElapsedMs - baseline.evaluationElapsedMs,
        contextElapsedMs: candidate.contextElapsedMs - baseline.contextElapsedMs
      }
    });
  }
  const coverageDelta = difference(
    aggregate.candidate.targetMacroChangedFileCoverage,
    aggregate.baseline.targetMacroChangedFileCoverage
  );
  const focusDelta = difference(
    aggregate.candidate.targetMacroRouteFocus,
    aggregate.baseline.targetMacroRouteFocus
  );
  return {
    completedPairedTargets: targetPairs.length,
    requiredPairedTargets: targetCount,
    routeChangedTargets: targetPairs.filter((pair) => pair.routeChanged).length,
    modeChangedTargets: targetPairs.filter((pair) => pair.modeChanged).length,
    aggregateDelta: {
      changedFileCoverage: coverageDelta,
      routeFocus: focusDelta,
      calibrationMeanAbsoluteError: difference(
        aggregate.candidate.calibrationMeanAbsoluteError,
        aggregate.baseline.calibrationMeanAbsoluteError
      ),
      unsafeNarrowModeTrials: aggregate.candidate.unsafeNarrowModeTrials
        - aggregate.baseline.unsafeNarrowModeTrials,
      unsafeEnforcedStopTrials: aggregate.candidate.unsafeEnforcedStopTrials
        - aggregate.baseline.unsafeEnforcedStopTrials,
      contextEstimatedTokensMean: difference(
        aggregate.candidate.contextEstimatedTokensMean,
        aggregate.baseline.contextEstimatedTokensMean
      ),
      staticCommandElapsedMsTotal: aggregate.candidate.staticCommandElapsedMsTotal
        - aggregate.baseline.staticCommandElapsedMsTotal
    },
    coverageNonInferior: coverageDelta !== null && coverageDelta >= -pairedNonInferiorityMargin,
    focusNonInferior: focusDelta !== null && focusDelta >= -pairedNonInferiorityMargin,
    narrowModeSafetyNonInferior: aggregate.candidate.unsafeNarrowModeTrials
      <= aggregate.baseline.unsafeNarrowModeTrials,
    enforcedStopSafetyNonInferior: aggregate.candidate.unsafeEnforcedStopTrials
      <= aggregate.baseline.unsafeEnforcedStopTrials,
    targetPairs
  };
}

function studyValidityFailures(targets, baselineBuild) {
  const failures = [];
  if (!baselineBuild.cliHashVerified) failures.push("baseline CLI hash was not verified");
  if (targets.length !== targetCount) failures.push(`target count differed from ${targetCount}`);
  const baselineFirst = targets.filter((target) => target.conditionOrder?.[0] === "baseline").length;
  const candidateFirst = targets.filter((target) => target.conditionOrder?.[0] === "candidate").length;
  if (baselineFirst !== 4 || candidateFirst !== 4) failures.push("paired condition order was not balanced");
  for (const target of targets) {
    if (target.failureCategory === "environment-or-setup") {
      failures.push(`${target.name}: target materialization failed`);
    }
    for (const conditionId of conditionIds) {
      const category = target.conditions?.[conditionId]?.failureCategory;
      if (category === "environment-or-setup" || category === "harness-contract") {
        failures.push(`${target.name}: ${conditionId} ${category}`);
      }
    }
  }
  return failures;
}

function materializationFailureTarget(target, targetIndex, materialization) {
  return {
    ...publicTargetIdentity(target),
    conditionOrder: conditionOrderForIndex(targetIndex),
    materializationAttempts: materialization.attempts,
    status: "failed",
    failureCategory: "environment-or-setup",
    error: summarizeError(materialization.error),
    conditions: {}
  };
}

function conditionFailure(condition, failureCategory, error) {
  return {
    id: condition.id,
    role: condition.role,
    productCommit: condition.productCommit,
    cliSha256: condition.cliSha256,
    status: "failed",
    failureCategory,
    failures: ["condition setup or validation failed before formal repetitions completed"],
    error: summarizeError(error),
    deterministicRoutes: false,
    freshIndex: null,
    trackedWorktreeClean: null,
    staticPalaceCliCalls: 0,
    trials: []
  };
}

function publicTargetIdentity(target) {
  return {
    name: target.name,
    language: target.language,
    languageFamily: target.languageFamily,
    url: target.url,
    pinnedHead: target.pinnedHead,
    routeCommit: target.routeCommit,
    groundTruthCommit: target.groundTruthCommit,
    task: target.task,
    expectedTaskType: target.expectedTaskType,
    changedFiles: target.changedFiles,
    implementationFiles: target.implementationFiles,
    testFiles: target.testFiles,
    auxiliaryFiles: target.auxiliaryFiles,
    oracleSource: target.oracleSource,
    candidateId: target.candidateId,
    candidateRank: target.candidateRank,
    coherencePacketSha256: target.coherencePacketSha256,
    testRoleDerivedFromPath: true
  };
}

function compactTrial(trial) {
  return {
    routeFiles: trial.routeFiles,
    routeConfidence: trial.routeConfidence,
    changedFileCoverage: trial.changedFileCoverage,
    routeFocus: trial.routeFocus,
    coreSurfaceCoverage: trial.coreSurfaceCoverage,
    auxiliarySurfaceCoverage: trial.auxiliarySurfaceCoverage,
    mode: trial.mode,
    evidenceStatus: trial.evidenceStatus,
    stopEnforced: trial.stopEnforced,
    unsafeNarrowMode: trial.unsafeNarrowMode,
    unsafeEnforcedStop: trial.unsafeEnforcedStop,
    contextEstimatedTokens: trial.contextEstimatedTokens,
    evaluationElapsedMs: trial.evaluationElapsedMs,
    contextElapsedMs: trial.contextElapsedMs
  };
}

async function hashSourceTree(root) {
  const files = [];
  async function walk(relativePath) {
    const absolutePath = path.join(root, relativePath);
    const entry = await stat(absolutePath);
    if (!entry.isDirectory()) {
      files.push(relativePath.split(path.sep).join("/"));
      return;
    }
    for (const child of (await readdir(absolutePath)).sort()) {
      if (child === "dist" || child === "node_modules") continue;
      await walk(path.join(relativePath, child));
    }
  }
  for (const seed of sourceHashSeeds) await walk(seed);
  files.sort();
  const hash = createHash("sha256");
  for (const relativePath of files) {
    const bytes = await readFile(path.join(root, ...relativePath.split("/")));
    hash.update(relativePath);
    hash.update("\0");
    hash.update(String(bytes.length));
    hash.update("\0");
    hash.update(bytes);
    hash.update("\0");
  }
  return {
    algorithm: "sha256-path-length-bytes-v1",
    fileCount: files.length,
    sha256: hash.digest("hex").toUpperCase()
  };
}

function expectedTaskType(subject) {
  const taskType = classifyTaskType(subject);
  if (taskType) return taskType;
  throw new Error(`No frozen task-type mapping for subject: ${subject}`);
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  assert.ok(index >= 0, "--out is required so the first formal result cannot be lost");
  assert.ok(args[index + 1], "--out requires a repository-relative path");
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.ok(resolved.startsWith(`${projectRoot}${path.sep}`), "Output must stay inside the repository");
  return resolved;
}

function conditionOrderForIndex(targetIndex) {
  return targetIndex % 2 === 0 ? ["baseline", "candidate"] : ["candidate", "baseline"];
}

function firstCompletedTrial(condition) {
  return condition?.trials?.find((trial) => trial.status === "completed") ?? null;
}

function independentCalibration(confidence, coverage) {
  const signedError = confidence - coverage;
  return {
    predictedConfidence: confidence,
    observedCoverage: coverage,
    tolerance: calibrationTolerance,
    signedError: round(signedError),
    absoluteError: round(Math.abs(signedError)),
    status: signedError > calibrationTolerance + Number.EPSILON
      ? "overconfident"
      : signedError < -calibrationTolerance - Number.EPSILON
        ? "underconfident"
        : "well-calibrated"
  };
}

function stripLocation(sourcePath) {
  return sourcePath.replace(/:\d+(?:-\d+)?$/, "");
}

function pathsOverlap(left, right) {
  const normalizedLeft = normalizePath(left);
  const normalizedRight = normalizePath(right);
  return normalizedLeft === normalizedRight
    || normalizedLeft.startsWith(`${normalizedRight}/`)
    || normalizedRight.startsWith(`${normalizedLeft}/`);
}

function normalizePath(value) {
  return value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "").toLowerCase();
}

function parseNameStatus(value) {
  return lines(value).map((line) => {
    const parts = line.split("\t");
    return { status: parts[0], path: parts.at(-1) };
  }).filter((entry) => entry.status && entry.path);
}

function gitObjectExists(root, object) {
  const result = spawnSync("git", ["cat-file", "-e", object], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    windowsHide: true
  });
  return result.status === 0;
}

function assertInsideTemporaryRoot(temporaryRoot) {
  assert.ok(
    path.resolve(temporaryRoot).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`),
    "Temporary validation root must stay inside the OS temporary directory"
  );
}

function assertInside(target, root) {
  const relative = path.relative(root, target);
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function safeSegment(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function isEnvironmentFailure(error) {
  const text = error instanceof Error ? error.stack ?? error.message : String(error);
  return /could not resolve host|unable to access|connection|network|timed?\s*out|eai_again|econn|enospc|enomem|eagain/i.test(text);
}

function parseJsonOutput(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} did not return valid JSON: ${summarizeError(error)}\n${truncate(value)}`);
  }
}

async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex").toUpperCase();
}

function sha256Text(value) {
  return createHash("sha256").update(value, "utf8").digest("hex").toUpperCase();
}

function summarizeError(error) {
  if (!error) return null;
  const text = error instanceof Error ? error.stack ?? error.message : String(error);
  return truncate(text, 12_000);
}

function truncate(value, limit = 12_000) {
  const text = String(value ?? "");
  return text.length <= limit ? text : `${text.slice(0, limit)}\n...[truncated]`;
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function unique(values) {
  return [...new Set(values)];
}

function sameValues(left, right) {
  return JSON.stringify([...left].map(normalizePath).sort())
    === JSON.stringify([...right].map(normalizePath).sort());
}

function countValues(values) {
  const result = {};
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return result;
}

function averageOrNull(values) {
  return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function medianOrNull(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : round((sorted[middle - 1] + sorted[middle]) / 2);
}

function minimumOrNull(values) {
  return values.length ? Math.min(...values) : null;
}

function maximumOrNull(values) {
  return values.length ? Math.max(...values) : null;
}

function difference(left, right) {
  return Number.isFinite(left) && Number.isFinite(right) ? round(left - right) : null;
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function lines(value) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function runPnpm(args, options = {}) {
  if (process.platform === "win32") {
    const commandLine = `pnpm ${args.map(quoteCmdArgument).join(" ")}`;
    return run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", commandLine], options);
  }
  return run("pnpm", args, options);
}

function runNode(args, options = {}) {
  return run(process.execPath, args, options);
}

function quoteCmdArgument(value) {
  const text = String(value);
  assert.ok(!text.includes('"'), "Command arguments must not contain quotes");
  return /\s/.test(text) ? `"${text}"` : text;
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
    const error = new Error([
      `Command failed (${result.status}): ${command} ${args.join(" ")}`,
      truncate(result.stdout),
      truncate(result.stderr)
    ].filter(Boolean).join("\n"));
    error.code = result.status === null && result.signal ? result.signal : result.status;
    throw error;
  }
  return result;
}

module.exports = {
  conditionGateFailures,
  conditionOrderForIndex,
  independentCalibration,
  normalizePath
};
