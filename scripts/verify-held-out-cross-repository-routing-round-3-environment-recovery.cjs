const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdir, mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { normalizeContextTelemetry } = require("./lib/context-telemetry.cjs");

const projectRoot = path.resolve(__dirname, "..");
const cliPath = path.join(projectRoot, "dist", "palace.cjs");
const manifestRelativePath = "docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-3.json";
const manifestPath = path.join(projectRoot, manifestRelativePath);
const originalObservationRelativePath = "docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-3.json";
const originalObservationPath = path.join(projectRoot, originalObservationRelativePath);
const outputPath = outputArgument(process.argv.slice(2));
const studyId = "held-out-cross-repository-routing-round-3-environment-recovery-0.4-alpha";
const candidateCommit = "6060e0c6aa2aea64d0145c1e55bccdc4669e4b48";
const selectorCommit = "a9f5ff2e22a7cd41ed6f019f75c9759500ecce09";
const manifestCommit = "d35ff810c79c3374ce5b37d780138def50d3c52d";
const manifestSha256 = "16D62D36341E22864DED89CB7A8C2CC6C5D765C0C4F8B6AE237CFC4D5F0E1DC2";
const originalObservationCommit = "2964abf4c7f8b5745e8daa636ac2a58a37b662c0";
const originalObservationSha256 = "7C1C0731008979D1DD3085EAEC86A43F277E3BFE588C86D43D5E11AFA5BD7EDF";
const recoveryTargetNames = ["starlette", "gin", "tower", "axios", "echo", "serde-json", "pydantic"];
const manifestTargetCount = 8;
const targetCount = recoveryTargetNames.length;
const budget = 6_000;
const routeLimit = 9;
const maxDrawers = 4;
const repetitions = 2;
const minimumMacroCoverage = 0.90;
const minimumMacroFocus = 0.75;
const minimumMacroPrecision = 0.75;
const minimumTargetFocus = 0.50;
const minimumTargetPrecision = 0.50;
const materializationMaxAttempts = 3;
const materializationRetryDelayMs = 5_000;

const frozenCandidatePaths = [
  "packages",
  "plugins/vertex-palace/mcp",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "tsconfig.json",
  "tsup.package-cli.config.ts",
  "tsup.plugin-mcp.config.ts",
  "scripts/trim-generated.cjs"
];

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  const { manifest, originalObservation } = await assertFrozenInputs();
  assertCleanTrackedCandidate("before build");
  runNpm(["run", "build"], { cwd: projectRoot, timeout: 180_000 });
  await assertFrozenInputs();
  assertCleanTrackedCandidate("after build");

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-held-out-routing-round-3-recovery-"));
  assert.ok(
    path.resolve(temporaryRoot).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`),
    "Temporary validation root must stay inside the OS temporary directory."
  );

  let report;
  try {
    const targets = [];
    const recoveryTargets = manifest.targets.filter((target) => recoveryTargetNames.includes(target.name));
    assert.equal(recoveryTargets.length, targetCount);
    for (const target of recoveryTargets) {
      const targetRoot = path.join(temporaryRoot, target.name);
      const materializationAttempts = [];
      try {
        await clonePinnedTargetWithRetries(target, targetRoot, materializationAttempts);
      } catch (error) {
        targets.push(targetExecutionFailure(
          target,
          "environment-or-setup",
          "target materialization failed after preregistered retries",
          error,
          materializationAttempts
        ));
        continue;
      }
      try {
        verifyPinnedTarget(target, targetRoot);
      } catch (error) {
        targets.push(targetExecutionFailure(
          target,
          "harness-contract",
          "manifest or Git oracle verification failed",
          error,
          materializationAttempts
        ));
        continue;
      }
      try {
        const result = await validateTarget(target, targetRoot);
        targets.push({ ...result, materializationAttempts });
      } catch (error) {
        targets.push(targetExecutionFailure(
          target,
          "product-or-contract",
          "target validation execution failed",
          error,
          materializationAttempts
        ));
      }
    }

    const aggregateResult = aggregate(targets);
    const failures = targets.flatMap((target) =>
      target.failures.map((failure) => `${target.name}: ${failure}`)
    );
    appendAggregateFailures(failures, aggregateResult);

    report = {
      schemaVersion: 2,
      studyId,
      generatedAt: new Date().toISOString(),
      status: failures.length ? "failed" : "passed",
      failures,
      claimBoundary: "Supplemental observation of the seven Round 3 targets censored by target-materialization failures. The product candidate, tasks, oracles, and metrics are unchanged. This cannot change the original study from failed to passed, cannot erase Koa's product failure, and cannot support Agent Token or wall-time claims.",
      heldOutAgainstCandidate: true,
      evidenceClass: "preregistered-held-out-static-routing-environment-recovery",
      candidate: {
        productCommit: candidateCommit,
        validationHarnessCommit: run("git", ["rev-parse", "HEAD"], { cwd: projectRoot }).stdout.trim(),
        cliPath: "dist/palace.cjs",
        frozenPaths: frozenCandidatePaths,
        trackedWorktreeCleanBeforeMeasurement: true
      },
      targetSelection: {
        manifestPath: manifestRelativePath,
        manifestCommit,
        manifestSha256,
        selectorCommit,
        palaceCallsOnCandidateTasksDuringSelection: manifest.rules.palaceCallsOnCandidateTasksDuringSelection,
        manifestTargetCount: manifest.targets.length,
        recoveryTargetCount: targets.length,
        languageFamilies: unique(manifest.targets.map((target) => target.languageFamily)),
        targetsPerLanguageFamily: manifest.rules.targetsPerLanguageFamily
      },
      originalObservation: {
        path: originalObservationRelativePath,
        commit: originalObservationCommit,
        sha256: originalObservationSha256,
        status: originalObservation.status,
        productFailureKeptImmutable: "koa",
        environmentCensoredTargets: recoveryTargetNames
      },
      recoveryPolicy: {
        productChangedSinceOriginalObservation: false,
        targetReplacementAllowed: false,
        originalOutputOverwriteAllowed: false,
        recoveredTargetsOnly: true,
        palaceTrialsPerRecoveredTarget: repetitions,
        materializationMaxAttempts,
        materializationRetryDelayMs,
        retriesApplyOnlyBeforePalaceExecution: true
      },
      taskTypeOracle: {
        timing: "Derived mechanically during target selection and frozen in the manifest before any Palace call.",
        rule: "Scoped or unscoped fix maps to bugfix; scoped or unscoped feat and subjects beginning with Add, Allow, Implement, or Support map to feature.",
        replacementRule: "No target may be removed, replaced, or rerouted after observation."
      },
      environment: {
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        npm: runNpm(["--version"], { cwd: projectRoot }).stdout.trim(),
        git: run("git", ["--version"], { cwd: projectRoot }).stdout.trim()
      },
      protocol: {
        repetitions,
        sequential: true,
        budget,
        routeLimit,
        maxDrawers,
        outputCreateOnly: true,
        gates: {
          completedTargets: targetCount,
          completedTrials: targetCount * repetitions,
          coreImplementationAndTestCoveragePerTarget: 1,
          minimumMacroCoverage,
          minimumMacroFocus,
          minimumMacroPrecision,
          minimumTargetFocus,
          minimumTargetPrecision,
          deterministicRoutes: true,
          overconfidentTrials: 0,
          contextWithinBudget: true,
          selectedExcludedOverlap: 0,
          trackedWorktreeClean: true,
          freshAfterExplicitIndex: true
        }
      },
      aggregate: aggregateResult,
      targets
    };

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    if (process.env.KEEP_HELD_OUT_ROUTING_ROUND_3_RECOVERY_TEMP === "1") {
      process.stderr.write(`Kept round-3 recovery validation data at ${temporaryRoot}\n`);
    } else {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }

  if (report?.status !== "passed") process.exitCode = 1;
}

async function assertFrozenInputs() {
  run("git", ["cat-file", "-e", `${candidateCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["diff", "--quiet", candidateCommit, "--", ...frozenCandidatePaths], { cwd: projectRoot });
  run("git", ["cat-file", "-e", `${selectorCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["cat-file", "-e", `${manifestCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["diff", "--quiet", manifestCommit, "--", manifestRelativePath], { cwd: projectRoot });
  const bytes = await readFile(manifestPath);
  assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), manifestSha256);
  const manifest = JSON.parse(bytes.toString("utf8"));
  assert.equal(manifest.status, "selected");
  assert.equal(manifest.candidateCommit, candidateCommit);
  assert.equal(manifest.selectorCommit, selectorCommit);
  assert.equal(manifest.targets.length, manifestTargetCount);
  assert.equal(manifest.rules.palaceCallsOnCandidateTasksDuringSelection, 0);
  assert.equal(manifest.rules.languageDiversitySatisfied, true);
  assert.equal(manifest.rules.targetsPerLanguageFamily, 2);
  for (const family of manifest.rules.requiredLanguageFamilies) {
    assert.equal(manifest.rules.selectedPerLanguageFamily[family], 2);
  }
  for (const target of manifest.targets) {
    assert.equal(target.expectedTaskType, expectedTaskType(target.task));
  }
  run("git", ["cat-file", "-e", `${originalObservationCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["diff", "--quiet", originalObservationCommit, "--", originalObservationRelativePath], { cwd: projectRoot });
  const originalBytes = await readFile(originalObservationPath);
  assert.equal(
    createHash("sha256").update(originalBytes).digest("hex").toUpperCase(),
    originalObservationSha256
  );
  const originalObservation = JSON.parse(originalBytes.toString("utf8"));
  assert.equal(originalObservation.status, "failed");
  assert.equal(originalObservation.candidate.productCommit, candidateCommit);
  assert.equal(originalObservation.targets.length, manifestTargetCount);
  const koa = originalObservation.targets.find((target) => target.name === "koa");
  assert.equal(koa?.failureCategory, "product-or-contract");
  assert.equal(koa?.trials?.length, repetitions);
  const observedEnvironmentFailures = originalObservation.targets
    .filter((target) => target.failureCategory === "environment-or-setup" && target.trials.length === 0)
    .map((target) => target.name)
    .sort();
  assert.deepEqual(observedEnvironmentFailures, [...recoveryTargetNames].sort());
  return { manifest, originalObservation };
}

function assertCleanTrackedCandidate(phase) {
  assert.equal(
    run("git", ["status", "--short", "--untracked-files=no"], { cwd: projectRoot }).stdout.trim(),
    "",
    `Tracked candidate worktree must be clean ${phase}.`
  );
}

async function clonePinnedTarget(target, root) {
  await mkdir(root, { recursive: true });
  run("git", ["init", "--quiet"], { cwd: root });
  run("git", ["remote", "add", "origin", target.url], { cwd: root });
  run("git", ["fetch", "--quiet", "--depth=2", "origin", target.groundTruthCommit], {
    cwd: root,
    timeout: 300_000
  });
  run("git", ["fetch", "--quiet", "--depth=1", "origin", target.routeCommit], {
    cwd: root,
    timeout: 300_000
  });
  run("git", ["-c", "advice.detachedHead=false", "checkout", "--detach", target.routeCommit], { cwd: root });
}

async function clonePinnedTargetWithRetries(target, root, attempts) {
  for (let attempt = 1; attempt <= materializationMaxAttempts; attempt += 1) {
    await rm(root, { recursive: true, force: true });
    try {
      await clonePinnedTarget(target, root);
      attempts.push({ attempt, status: "completed", error: null });
      return;
    } catch (error) {
      attempts.push({ attempt, status: "failed", error: summarizeError(error) });
      if (attempt === materializationMaxAttempts) throw error;
      await delay(materializationRetryDelayMs);
    }
  }
}

function verifyPinnedTarget(target, root) {
  assert.equal(run("git", ["rev-parse", "HEAD"], { cwd: root }).stdout.trim(), target.routeCommit);
  assert.equal(run("git", ["rev-parse", `${target.groundTruthCommit}^`], { cwd: root }).stdout.trim(), target.routeCommit);
  assert.equal(
    run("git", ["show", "-s", "--format=%s", target.groundTruthCommit], { cwd: root }).stdout.trim(),
    target.task
  );
  assert.deepEqual(
    lines(run("git", ["diff", "--name-only", target.routeCommit, target.groundTruthCommit, "--"], { cwd: root }).stdout).sort(),
    [...target.changedFiles].sort()
  );
  assert.equal(run("git", ["status", "--short", "--untracked-files=no"], { cwd: root }).stdout.trim(), "");
}

async function validateTarget(target, root) {
  runNode([cliPath, "init"], { cwd: root, timeout: 180_000 });
  runNode([cliPath, "index"], { cwd: root, timeout: 240_000 });
  const statusAfterExplicitIndex = parseJsonOutput(
    runNode([cliPath, "status"], { cwd: root, timeout: 180_000 }).stdout,
    `${target.name} status after explicit index`
  );

  const expectedType = target.expectedTaskType;
  assert.equal(expectedType, expectedTaskType(target.task));
  const trials = [];
  const failures = [];
  for (let trial = 1; trial <= repetitions; trial += 1) {
    let evaluation;
    let failedPhase = "evaluate";
    try {
      const evaluationStartedAt = performance.now();
      evaluation = parseJsonOutput(runNode([
        cliPath,
        "evaluate",
        target.task,
        ...target.changedFiles.flatMap((file) => ["--changed-file", file]),
        "--budget", String(budget),
        "--route-limit", String(routeLimit),
        "--max-drawers", String(maxDrawers),
        "--json"
      ], { cwd: root, timeout: 240_000 }).stdout, `${target.name} trial ${trial} evaluate`);
      const evaluationElapsedMs = Math.round(performance.now() - evaluationStartedAt);

      failedPhase = "context";
      const contextStartedAt = performance.now();
      const contextResult = runNode([
        cliPath,
        "context",
        target.task,
        "--auto",
        "--format", "json",
        "--budget", String(budget),
        "--route-limit", String(routeLimit),
        "--max-drawers", String(maxDrawers)
      ], { cwd: root, timeout: 240_000 });
      const context = parseJsonOutput(contextResult.stdout, `${target.name} trial ${trial} context`);
      const telemetry = normalizeContextTelemetry(context, contextResult.stdout);
      const contextElapsedMs = Math.round(performance.now() - contextStartedAt);

      const routeFiles = unique(evaluation.route.files.map(stripLocation));
      const routeFileSet = new Set(routeFiles);
      const changedFileSet = new Set(target.changedFiles);
      const missingImplementationFiles = target.implementationFiles.filter((file) => !routeFileSet.has(file));
      const missingTestFiles = target.testFiles.filter((file) => !routeFileSet.has(file));
      const routePrecision = routeFiles.length
        ? round(routeFiles.filter((file) => changedFileSet.has(file)).length / routeFiles.length)
        : 0;
      const coreFileCount = target.implementationFiles.length + target.testFiles.length;
      const coreSurfaceCoverage = round(
        (coreFileCount - missingImplementationFiles.length - missingTestFiles.length) / coreFileCount
      );
      const selectedFiles = unique([
        ...telemetry.executionBoundaries.primary,
        ...telemetry.executionBoundaries.support,
        ...telemetry.executionBoundaries.deferred
      ].map(stripLocation));
      const excludedFiles = unique(telemetry.executionBoundaries.excluded
        .map((entry) => typeof entry === "string" ? entry : entry?.sourcePath)
        .filter((entry) => typeof entry === "string" && entry.length > 0)
        .map(stripLocation));

      trials.push({
        trial,
        status: "completed",
        expectedTaskType: expectedType,
        taskType: evaluation.taskType,
        evaluationCacheState: trial === 1 ? "warm-index-after-explicit-index" : "warm-index",
        contextCacheState: "warm-index-after-evaluation",
        evaluationElapsedMs,
        contextElapsedMs,
        mode: telemetry.mode,
        evidenceStatus: telemetry.evidenceStatus,
        routeFiles,
        routeFileCount: routeFiles.length,
        changedFileCoverage: evaluation.coverage.changedFileCoverage,
        coreSurfaceCoverage,
        missingImplementationFiles,
        missingTestFiles,
        routeFocus: evaluation.coverage.routeFocus,
        routePrecision,
        routeConfidence: evaluation.route.confidence,
        calibration: evaluation.calibration,
        contextEstimatedTokens: telemetry.payload.contextEstimatedTokens,
        contextBytes: telemetry.payload.contextBytes,
        contextMetricSource: telemetry.payload.source,
        selectedExcludedOverlap: selectedFiles.filter((selected) =>
          excludedFiles.some((excluded) => pathsOverlap(selected, excluded))
        )
      });
    } catch (error) {
      trials.push({
        trial,
        status: "execution-error",
        failedPhase,
        expectedTaskType: expectedType,
        taskType: evaluation?.taskType ?? null,
        routeFiles: unique(evaluation?.route?.files?.map(stripLocation) ?? []),
        routeFileCount: evaluation?.route?.files?.length ?? 0,
        changedFileCoverage: evaluation?.coverage?.changedFileCoverage ?? null,
        routeFocus: evaluation?.coverage?.routeFocus ?? null,
        routeConfidence: evaluation?.route?.confidence ?? null,
        calibration: evaluation?.calibration ?? null,
        error: summarizeError(error)
      });
      failures.push(`trial ${trial} ${failedPhase} execution failed`);
    }
  }

  const completed = trials.filter((trial) => trial.status === "completed");
  const deterministicRoutes = completed.length === repetitions
    && completed.every((trial) => sameValues(trial.routeFiles, completed[0].routeFiles));
  if (completed.length !== repetitions) failures.push("not all preregistered trials completed");
  if (!deterministicRoutes) failures.push("route files differed across repetitions");
  if (completed.some((trial) => trial.taskType !== expectedType)) failures.push(`task type differed from ${expectedType}`);
  if (completed.some((trial) => trial.coreSurfaceCoverage !== 1)) failures.push("implementation or test surface coverage was incomplete");
  if (completed.some((trial) => trial.routeFocus < minimumTargetFocus)) failures.push(`route focus fell below ${minimumTargetFocus.toFixed(2)}`);
  if (completed.some((trial) => trial.routePrecision < minimumTargetPrecision)) failures.push(`route precision fell below ${minimumTargetPrecision.toFixed(2)}`);
  if (completed.some((trial) => trial.calibration.status === "overconfident")) failures.push("route was overconfident against observed coverage");
  if (completed.some((trial) => trial.contextEstimatedTokens > budget)) failures.push("context payload exceeded the 6000-token ceiling");
  if (completed.some((trial) => trial.selectedExcludedOverlap.length)) failures.push("selected and excluded boundaries overlapped");
  if (statusAfterExplicitIndex.stale !== false) failures.push("status was stale immediately after explicit indexing");
  const trackedStatus = run("git", ["status", "--short", "--untracked-files=no"], { cwd: root }).stdout.trim();
  if (trackedStatus) failures.push("Palace modified tracked repository files");

  return {
    name: target.name,
    language: target.language,
    languageFamily: target.languageFamily,
    url: target.url,
    pinnedHead: target.pinnedHead,
    routeCommit: target.routeCommit,
    groundTruthCommit: target.groundTruthCommit,
    oracleSource: target.oracleSource,
    task: target.task,
    expectedTaskType: expectedType,
    changedFiles: target.changedFiles,
    implementationFiles: target.implementationFiles,
    testFiles: target.testFiles,
    status: failures.length ? "failed" : "passed",
    failureCategory: failures.length ? "product-or-contract" : null,
    failures,
    deterministicRoutes,
    statusAfterExplicitIndex,
    trackedWorktreeClean: trackedStatus === "",
    trials
  };
}

function aggregate(targets) {
  const trials = targets.flatMap((target) => target.trials);
  const completed = trials.filter((trial) => trial.status === "completed");
  const changedFileCoverage = completed.map((trial) => trial.changedFileCoverage);
  const routeFocus = completed.map((trial) => trial.routeFocus);
  const routePrecision = completed.map((trial) => trial.routePrecision);
  return {
    targetCount: targets.length,
    passedTargets: targets.filter((target) => target.status === "passed").length,
    failedTargets: targets.filter((target) => target.status === "failed").length,
    trialCount: trials.length,
    completedTrials: completed.length,
    taskTypeMatchedTargets: targets.filter((target) =>
      target.trials.filter((trial) => trial.status === "completed").every((trial) => trial.taskType === target.expectedTaskType)
      && target.trials.filter((trial) => trial.status === "completed").length === repetitions
    ).length,
    coreSurfaceCompleteTargets: targets.filter((target) =>
      target.trials.filter((trial) => trial.status === "completed").every((trial) => trial.coreSurfaceCoverage === 1)
      && target.trials.filter((trial) => trial.status === "completed").length === repetitions
    ).length,
    macroChangedFileCoverage: averageOrNull(changedFileCoverage),
    macroRouteFocus: averageOrNull(routeFocus),
    macroRoutePrecision: averageOrNull(routePrecision),
    minimumTargetRouteFocus: routeFocus.length ? Math.min(...routeFocus) : null,
    minimumTargetRoutePrecision: routePrecision.length ? Math.min(...routePrecision) : null,
    overconfidentTrials: completed.filter((trial) => trial.calibration.status === "overconfident").length,
    maxContextEstimatedTokens: completed.length
      ? Math.max(...completed.map((trial) => trial.contextEstimatedTokens))
      : null,
    environmentOrSetupFailures: targets.filter((target) => target.failureCategory === "environment-or-setup").length,
    harnessContractFailures: targets.filter((target) => target.failureCategory === "harness-contract").length,
    productOrContractFailures: targets.filter((target) => target.failureCategory === "product-or-contract").length
  };
}

function appendAggregateFailures(failures, result) {
  if (result.targetCount !== targetCount) failures.push(`aggregate: target count differed from ${targetCount}`);
  if (result.completedTrials !== targetCount * repetitions) failures.push("aggregate: not all preregistered trials completed");
  if (result.taskTypeMatchedTargets !== targetCount) failures.push("aggregate: task type mapping was incomplete");
  if (result.coreSurfaceCompleteTargets !== targetCount) failures.push("aggregate: implementation/test coverage was incomplete");
  if (result.macroChangedFileCoverage === null || result.macroChangedFileCoverage < minimumMacroCoverage) {
    failures.push(`aggregate: changed-file coverage fell below ${minimumMacroCoverage.toFixed(2)}`);
  }
  if (result.macroRouteFocus === null || result.macroRouteFocus < minimumMacroFocus) {
    failures.push(`aggregate: route focus fell below ${minimumMacroFocus.toFixed(2)}`);
  }
  if (result.macroRoutePrecision === null || result.macroRoutePrecision < minimumMacroPrecision) {
    failures.push(`aggregate: route precision fell below ${minimumMacroPrecision.toFixed(2)}`);
  }
  if (result.minimumTargetRouteFocus === null || result.minimumTargetRouteFocus < minimumTargetFocus) {
    failures.push(`aggregate: a target route focus fell below ${minimumTargetFocus.toFixed(2)}`);
  }
  if (result.minimumTargetRoutePrecision === null || result.minimumTargetRoutePrecision < minimumTargetPrecision) {
    failures.push(`aggregate: a target route precision fell below ${minimumTargetPrecision.toFixed(2)}`);
  }
  if (result.overconfidentTrials !== 0) failures.push("aggregate: overconfident trials were observed");
}

function targetExecutionFailure(target, category, message, error, materializationAttempts = []) {
  return {
    name: target.name,
    language: target.language,
    languageFamily: target.languageFamily,
    url: target.url,
    pinnedHead: target.pinnedHead,
    routeCommit: target.routeCommit,
    groundTruthCommit: target.groundTruthCommit,
    oracleSource: target.oracleSource,
    task: target.task,
    expectedTaskType: target.expectedTaskType ?? expectedTaskTypeOrNull(target.task),
    changedFiles: target.changedFiles,
    implementationFiles: target.implementationFiles,
    testFiles: target.testFiles,
    status: "failed",
    failureCategory: category,
    failures: [message],
    executionError: summarizeError(error),
    materializationAttempts,
    deterministicRoutes: false,
    statusAfterExplicitIndex: null,
    trackedWorktreeClean: null,
    trials: []
  };
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function expectedTaskType(subject) {
  if (/^fix(?:\([^)]*\))?:/i.test(subject)) return "bugfix";
  if (/^feat(?:\([^)]*\))?:/i.test(subject)) return "feature";
  if (/^(?:add|allow|implement|support)\b/i.test(subject)) return "feature";
  throw new Error(`No preregistered task-type mapping for subject: ${subject}`);
}

function expectedTaskTypeOrNull(subject) {
  try {
    return expectedTaskType(subject);
  } catch {
    return null;
  }
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  assert.ok(index >= 0, "--out is required so the first formal observation cannot be lost.");
  assert.ok(args[index + 1], "--out requires a repository-relative path.");
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.ok(resolved.startsWith(`${projectRoot}${path.sep}`), "Output must stay inside the Vertex Palace repository.");
  return resolved;
}

function stripLocation(sourcePath) {
  return sourcePath.replace(/:\d+(?:-\d+)?$/, "");
}

function pathsOverlap(left, right) {
  const normalizedLeft = left.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "").toLowerCase();
  const normalizedRight = right.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "").toLowerCase();
  return normalizedLeft === normalizedRight
    || normalizedLeft.startsWith(`${normalizedRight}/`)
    || normalizedRight.startsWith(`${normalizedLeft}/`);
}

function lines(value) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function sameValues(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function unique(values) {
  return [...new Set(values)];
}

function averageOrNull(values) {
  return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function round(value) {
  return Number(value.toFixed(3));
}

function parseJsonOutput(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} returned invalid JSON.\nstdout:\n${truncate(value)}`, { cause: error });
  }
}

function summarizeError(error) {
  return truncate(error instanceof Error ? error.stack ?? error.message : String(error));
}

function truncate(value, limit = 12_000) {
  const text = String(value);
  return text.length <= limit ? text : `${text.slice(0, limit)}\n...[truncated ${text.length - limit} characters]`;
}

function runNpm(args, options) {
  if (process.platform === "win32") {
    const commandLine = `npm ${args.map(quoteCmdArgument).join(" ")}`;
    return run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", commandLine], options);
  }
  return run("npm", args, options);
}

function runNode(args, options) {
  return run(process.execPath, args, options);
}

function quoteCmdArgument(value) {
  const text = String(value);
  assert.ok(!text.includes('"'), "Command arguments must not contain quotes.");
  return /\s/.test(text) ? `"${text}"` : text;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 32 * 1024 * 1024,
    timeout: options.timeout ?? 120_000
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error([
      `Command failed (${result.status}): ${command} ${args.join(" ")}`,
      result.stdout?.trim(),
      result.stderr?.trim()
    ].filter(Boolean).join("\n"));
  }
  return result;
}
