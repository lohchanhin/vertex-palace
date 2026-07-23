const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdir, mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { normalizeContextTelemetry } = require("./lib/context-telemetry.cjs");

const projectRoot = path.resolve(__dirname, "..");
const cliPath = path.join(projectRoot, "dist", "palace.cjs");
const manifestRelativePath = "docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-4.json";
const manifestPath = path.join(projectRoot, manifestRelativePath);
const outputPath = outputArgument(process.argv.slice(2));
const studyId = "held-out-cross-repository-routing-round-4-0.4-alpha";
const candidateCommit = "efd53274e42fb8123745f2b8bb09a24e4fa384b7";
const candidateCliSha256 = "E0A2F54C826E742DF03BA0BC965C89AF834B3BBA199C1E135E63E21B291011D0";
const selectorCommit = "96af578295484831e4a14511baf0e88cb69cc081";
const manifestCommit = "7ccf0c7d668f4a9790186ba4659a76fd4a30813d";
const manifestSha256 = "D6A1DDCDA3BD704D1F809279229153F72B4CF6162F1C1231C40D36F18626F5C0";
const repositoryPoolSha256 = "DF36C82D51AF4B91DF6E67E9848AD54EBB5FE99E9F4DF03498BC1A0FFD6E1A0A";
const targetCount = 8;
const budget = 6_000;
const routeLimit = 9;
const maxDrawers = 4;
const repetitions = 2;
const materializationAttempts = 3;
const freshIndexAttempts = 2;
const retryDelayMs = 5_000;
const transientExecutionCodes = new Set(["EAGAIN", "ENOMEM", "ETIMEDOUT"]);
const minimumMacroCoverage = 0.90;
const minimumMacroFocus = 0.75;
const minimumMacroPrecision = 0.75;
const minimumTargetFocus = 0.50;
const minimumTargetPrecision = 0.50;

const frozenCandidatePaths = [
  "packages",
  "plugins/vertex-palace/mcp/server.cjs"
];

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  const manifest = await assertFrozenInputs();
  assertCleanTrackedCandidate("before measurement");

  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "vertex-palace-held-out-routing-round-4-")
  );
  assertInsideTemporaryRoot(temporaryRoot);

  let report;
  try {
    const targets = [];
    for (const target of manifest.targets) {
      const targetRoot = path.join(temporaryRoot, target.name);
      const materialization = await materializeTarget(target, targetRoot, temporaryRoot);
      if (!materialization.completed) {
        targets.push(targetExecutionFailure(
          target,
          "environment-or-setup",
          "target materialization failed before Palace execution",
          materialization.error,
          { materializationAttempts: materialization.attempts }
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
          { materializationAttempts: materialization.attempts }
        ));
        continue;
      }

      try {
        targets.push(await validateTarget(
          target,
          targetRoot,
          materialization.attempts
        ));
      } catch (error) {
        targets.push(targetExecutionFailure(
          target,
          error.environmentFailure ? "environment-or-setup" : "product-or-contract",
          "target validation execution failed before formal trials completed",
          error,
          {
            materializationAttempts: materialization.attempts,
            freshIndexAttempts: error.executionAttempts || []
          }
        ));
      }
    }

    const aggregateResult = aggregate(targets);
    const failures = targets.flatMap((target) =>
      target.failures.map((failure) => `${target.name}: ${failure}`)
    );
    appendAggregateFailures(failures, aggregateResult);

    report = {
      schemaVersion: 3,
      studyId,
      generatedAt: new Date().toISOString(),
      status: failures.length ? "failed" : "passed",
      failures,
      claimBoundary: "First static routing observation for candidate efd5327 on eight mechanically selected repository tasks not used during candidate development. This candidate-held-out sample is not model-unseen evidence, does not execute target tests, and cannot support Agent correctness, Token, tool-call, or wall-time claims.",
      heldOutAgainstCandidate: true,
      evidenceClass: "preregistered-candidate-held-out-static-routing",
      candidate: {
        productCommit: candidateCommit,
        validationHarnessCommit: run("git", ["rev-parse", "HEAD"], {
          cwd: projectRoot
        }).stdout.trim(),
        cliPath: "dist/palace.cjs",
        cliSha256: candidateCliSha256,
        frozenPaths: frozenCandidatePaths,
        trackedWorktreeCleanBeforeMeasurement: true,
        rebuiltBeforeMeasurement: false
      },
      targetSelection: {
        manifestPath: manifestRelativePath,
        manifestCommit,
        manifestSha256,
        selectorCommit,
        repositoryPoolSha256,
        palaceCallsOnCandidateTasksDuringSelection:
          manifest.rules.palaceCallsOnCandidateTasksDuringSelection,
        targetCount: manifest.targets.length,
        languageFamilies: unique(manifest.targets.map((target) => target.languageFamily)),
        targetsPerLanguageFamily: manifest.rules.targetsPerLanguageFamily
      },
      taskTypeOracle: {
        timing: "Derived mechanically during target selection and frozen in the manifest before any Palace call.",
        rule: "Conventional fix maps to bugfix and feat maps to feature. Subjects beginning with Add, Allow, Create, Implement, or Support map to feature. Subjects beginning with Fix, Debug, Repair, Correct, or Resolve map to bugfix.",
        replacementRule: "No target may be removed, replaced, rewritten, or rerouted after observation."
      },
      oracleLimitations: {
        source: "Complete modified-file Git diff selected by the preregistered path and commit-subject rules.",
        focusedTestClassification: "Test roles are derived from paths. A file under a test tree can be a helper, mock, or fixture rather than an assertion file.",
        targetTestsExecuted: false
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
        materializationAttempts,
        freshIndexAttempts,
        retryDelayMs,
        transientExecutionCodes: [...transientExecutionCodes],
        evaluateAndContextRetries: 0,
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
          deterministicRouteOrderAndMembership: true,
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

    await assertFrozenInputs();
    assertCleanTrackedCandidate("after measurement");
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx"
    });
    process.stdout.write(`${JSON.stringify({
      outputPath,
      status: report.status,
      aggregate: report.aggregate,
      failures: report.failures
    }, null, 2)}\n`);
  } finally {
    if (process.env.KEEP_HELD_OUT_ROUTING_ROUND_4_TEMP === "1") {
      process.stderr.write(`Keeping Round 4 validation repositories at ${temporaryRoot}\n`);
    } else {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }

  if (report?.status !== "passed") process.exitCode = 1;
}

async function assertFrozenInputs() {
  run("git", ["cat-file", "-e", `${candidateCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["diff", "--quiet", candidateCommit, "--", ...frozenCandidatePaths], {
    cwd: projectRoot
  });
  assert.equal(await sha256File(cliPath), candidateCliSha256);
  run("git", ["cat-file", "-e", `${selectorCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["cat-file", "-e", `${manifestCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["diff", "--quiet", manifestCommit, "--", manifestRelativePath], {
    cwd: projectRoot
  });

  const bytes = await readFile(manifestPath);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex").toUpperCase(),
    manifestSha256
  );
  const manifest = JSON.parse(bytes.toString("utf8"));
  assert.equal(manifest.schemaVersion, 3);
  assert.equal(manifest.status, "selected");
  assert.equal(manifest.heldOutAgainstCandidate, true);
  assert.equal(manifest.candidate.productCommit, candidateCommit);
  assert.equal(manifest.candidate.cliSha256, candidateCliSha256);
  assert.equal(manifest.selector.commit, selectorCommit);
  assert.equal(manifest.repositoryPool.sha256, repositoryPoolSha256);
  assert.equal(manifest.targets.length, targetCount);
  assert.equal(manifest.rules.palaceCallsOnCandidateTasksDuringSelection, 0);
  assert.equal(manifest.rules.languageDiversitySatisfied, true);
  assert.equal(manifest.rules.targetsPerLanguageFamily, 2);
  for (const family of manifest.rules.requiredLanguageFamilies) {
    assert.equal(manifest.rules.selectedPerLanguageFamily[family], 2);
  }
  for (const target of manifest.targets) {
    assert.equal(target.expectedTaskType, expectedTaskType(target.task));
  }
  return manifest;
}

function assertCleanTrackedCandidate(phase) {
  assert.equal(
    run("git", ["status", "--short", "--untracked-files=no"], {
      cwd: projectRoot
    }).stdout.trim(),
    "",
    `Tracked worktree must be clean ${phase}.`
  );
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
  run("git", [
    "fetch",
    "--quiet",
    "--filter=blob:none",
    "--depth=2",
    "origin",
    target.groundTruthCommit
  ], { cwd: root, timeout: 300_000 });
  if (!gitObjectExists(root, `${target.routeCommit}^{commit}`)) {
    run("git", [
      "fetch",
      "--quiet",
      "--filter=blob:none",
      "--depth=1",
      "origin",
      target.routeCommit
    ], { cwd: root, timeout: 300_000 });
  }
  run("git", [
    "-c",
    "advice.detachedHead=false",
    "checkout",
    "--detach",
    target.routeCommit
  ], { cwd: root, timeout: 120_000 });
}

function verifyPinnedTarget(target, root) {
  assert.equal(run("git", ["rev-parse", "HEAD"], { cwd: root }).stdout.trim(), target.routeCommit);
  assert.equal(
    run("git", ["rev-parse", `${target.groundTruthCommit}^`], { cwd: root }).stdout.trim(),
    target.routeCommit
  );
  assert.equal(
    run("git", ["show", "-s", "--format=%s", target.groundTruthCommit], {
      cwd: root
    }).stdout.trim(),
    target.task
  );
  assert.deepEqual(
    parseNameStatus(run("git", [
      "diff",
      "--name-status",
      "--find-renames",
      target.routeCommit,
      target.groundTruthCommit,
      "--"
    ], { cwd: root }).stdout),
    target.changedFiles.map((file) => ({ status: "M", path: file }))
  );
  for (const file of target.changedFiles) {
    assert.equal(gitObjectExists(root, `${target.routeCommit}:${file}`), true);
    assert.equal(gitObjectExists(root, `${target.groundTruthCommit}:${file}`), true);
  }
  assert.equal(expectedTaskType(target.task), target.expectedTaskType);
  assert.equal(
    run("git", ["status", "--short", "--untracked-files=no"], {
      cwd: root
    }).stdout.trim(),
    ""
  );
}

async function validateTarget(target, root, materializationAttemptLog) {
  const freshIndex = await prepareFreshIndex(target, root);
  const expectedType = target.expectedTaskType;
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
      ], { cwd: root, timeout: 300_000 }).stdout, `${target.name} trial ${trial} evaluate`);
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
      ], { cwd: root, timeout: 300_000 });
      const context = parseJsonOutput(
        contextResult.stdout,
        `${target.name} trial ${trial} context`
      );
      const telemetry = normalizeContextTelemetry(context, contextResult.stdout);
      const contextElapsedMs = Math.round(performance.now() - contextStartedAt);

      const routeFiles = unique(evaluation.route.files.map(stripLocation));
      const routeFileSet = new Set(routeFiles);
      const changedFileSet = new Set(target.changedFiles);
      const missingImplementationFiles = target.implementationFiles.filter(
        (file) => !routeFileSet.has(file)
      );
      const missingTestFiles = target.testFiles.filter((file) => !routeFileSet.has(file));
      const routeOnlyFiles = routeFiles.filter((file) => !changedFileSet.has(file));
      const routePrecision = routeFiles.length
        ? round(routeFiles.filter((file) => changedFileSet.has(file)).length / routeFiles.length)
        : 0;
      const coreFileCount = target.implementationFiles.length + target.testFiles.length;
      const coreSurfaceCoverage = round(
        (coreFileCount - missingImplementationFiles.length - missingTestFiles.length)
          / coreFileCount
      );
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

      trials.push({
        trial,
        status: "completed",
        expectedTaskType: expectedType,
        taskType: evaluation.taskType,
        evaluationCacheState: trial === 1
          ? "warm-index-after-explicit-index"
          : "warm-index",
        contextCacheState: "warm-index-after-evaluation",
        evaluationElapsedMs,
        contextElapsedMs,
        mode: telemetry.mode,
        evidenceStatus: telemetry.evidenceStatus,
        routeFiles,
        routeFileCount: routeFiles.length,
        routeOnlyFiles,
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
        errorCode: error.code || null,
        error: summarizeError(error)
      });
      failures.push(`trial ${trial} ${failedPhase} execution failed`);
    }
  }

  const completed = trials.filter((trial) => trial.status === "completed");
  const deterministicRoutes = completed.length === repetitions
    && completed.every(
      (trial) => JSON.stringify(trial.routeFiles) === JSON.stringify(completed[0].routeFiles)
    );
  if (completed.length !== repetitions) failures.push("not all preregistered trials completed");
  if (!deterministicRoutes) failures.push("route order or membership differed across repetitions");
  if (completed.some((trial) => trial.taskType !== expectedType)) {
    failures.push(`task type differed from ${expectedType}`);
  }
  if (completed.some((trial) => trial.coreSurfaceCoverage !== 1)) {
    failures.push("implementation or path-derived test surface coverage was incomplete");
  }
  if (completed.some((trial) => trial.routeFocus < minimumTargetFocus)) {
    failures.push(`route focus fell below ${minimumTargetFocus.toFixed(2)}`);
  }
  if (completed.some((trial) => trial.routePrecision < minimumTargetPrecision)) {
    failures.push(`route precision fell below ${minimumTargetPrecision.toFixed(2)}`);
  }
  if (completed.some((trial) => trial.calibration.status === "overconfident")) {
    failures.push("route was overconfident against observed coverage");
  }
  if (completed.some((trial) => trial.contextEstimatedTokens > budget)) {
    failures.push("context payload exceeded the 6000-token ceiling");
  }
  if (completed.some((trial) => trial.selectedExcludedOverlap.length)) {
    failures.push("selected and excluded boundaries overlapped");
  }
  if (freshIndex.status.stale !== false) {
    failures.push("status was stale immediately after explicit indexing");
  }

  const trackedStatus = run("git", ["status", "--short", "--untracked-files=no"], {
    cwd: root
  }).stdout.trim();
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
    testRoleDerivedFromPath: true,
    status: failures.length ? "failed" : "passed",
    failureCategory: failures.length ? "product-or-contract" : null,
    failures,
    deterministicRoutes,
    materializationAttempts: materializationAttemptLog,
    freshIndexAttempts: freshIndex.attempts,
    statusAfterExplicitIndex: freshIndex.status,
    trackedWorktreeClean: trackedStatus === "",
    trials
  };
}

async function prepareFreshIndex(target, root) {
  const attempts = [];
  for (let attempt = 1; attempt <= freshIndexAttempts; attempt += 1) {
    const startedAt = performance.now();
    try {
      const palaceRoot = path.join(root, ".palace");
      assertInside(palaceRoot, root);
      await rm(palaceRoot, { recursive: true, force: true });
      runNode([cliPath, "init"], { cwd: root, timeout: 120_000 });
      runNode([cliPath, "index"], { cwd: root, timeout: 300_000 });
      const status = parseJsonOutput(
        runNode([cliPath, "status"], { cwd: root, timeout: 120_000 }).stdout,
        `${target.name} status after explicit index`
      );
      attempts.push({
        attempt,
        status: "completed",
        elapsedMs: Math.round(performance.now() - startedAt),
        errorCode: null,
        error: null
      });
      return {
        status,
        attempts
      };
    } catch (error) {
      const transient = transientExecutionCodes.has(error.code);
      attempts.push({
        attempt,
        status: transient ? "environment-failed" : "failed",
        elapsedMs: Math.round(performance.now() - startedAt),
        errorCode: error.code || null,
        error: summarizeError(error)
      });
      if (!transient || attempt === freshIndexAttempts) {
        error.environmentFailure = transient;
        error.executionAttempts = attempts;
        throw error;
      }
      await delay(retryDelayMs);
    }
  }
  throw new Error(`unreachable fresh-index state for ${target.name}`);
}

function aggregate(targets) {
  const trials = targets.flatMap((target) => target.trials);
  const completed = trials.filter((trial) => trial.status === "completed");
  const changedFileCoverage = completed.map((trial) => trial.changedFileCoverage);
  const routeFocus = completed.map((trial) => trial.routeFocus);
  const routePrecision = completed.map((trial) => trial.routePrecision);
  const successfulTargets = targets.filter((target) => target.status === "passed");
  return {
    targetCount: targets.length,
    passedTargets: successfulTargets.length,
    failedTargets: targets.filter((target) => target.status === "failed").length,
    trialCount: trials.length,
    completedTrials: completed.length,
    passedTrials: completed.filter((trial) =>
      trial.taskType === trial.expectedTaskType
      && trial.coreSurfaceCoverage === 1
      && trial.routeFocus >= minimumTargetFocus
      && trial.routePrecision >= minimumTargetPrecision
      && trial.calibration.status !== "overconfident"
      && trial.contextEstimatedTokens <= budget
      && trial.selectedExcludedOverlap.length === 0
    ).length,
    taskTypeMatchedTargets: targets.filter((target) =>
      target.trials.length === repetitions
      && target.trials.every((trial) =>
        trial.status === "completed" && trial.taskType === target.expectedTaskType
      )
    ).length,
    coreSurfaceCompleteTargets: targets.filter((target) =>
      target.trials.length === repetitions
      && target.trials.every((trial) =>
        trial.status === "completed" && trial.coreSurfaceCoverage === 1
      )
    ).length,
    exactOracleTargets: targets.filter((target) =>
      target.trials.length === repetitions
      && target.trials.every((trial) =>
        trial.status === "completed"
        && sameValues(trial.routeFiles, target.changedFiles)
      )
    ).length,
    deterministicTargets: targets.filter((target) => target.deterministicRoutes).length,
    oracleFileTotal: targets.reduce((sum, target) => sum + target.changedFiles.length, 0),
    routeFileTotal: targets.reduce((sum, target) =>
      sum + (target.trials.find((trial) => trial.status === "completed")?.routeFileCount ?? 0), 0
    ),
    macroChangedFileCoverage: averageOrNull(changedFileCoverage),
    macroRouteFocus: averageOrNull(routeFocus),
    macroRoutePrecision: averageOrNull(routePrecision),
    minimumTargetRouteFocus: routeFocus.length ? Math.min(...routeFocus) : null,
    minimumTargetRoutePrecision: routePrecision.length ? Math.min(...routePrecision) : null,
    overconfidentTrials: completed.filter(
      (trial) => trial.calibration.status === "overconfident"
    ).length,
    maxContextEstimatedTokens: completed.length
      ? Math.max(...completed.map((trial) => trial.contextEstimatedTokens))
      : null,
    transientMaterializationAttempts: targets.reduce((sum, target) =>
      sum + (target.materializationAttempts ?? []).filter(
        (attempt) => attempt.status !== "completed"
      ).length, 0
    ),
    transientFreshIndexAttempts: targets.reduce((sum, target) =>
      sum + (target.freshIndexAttempts ?? []).filter(
        (attempt) => attempt.status === "environment-failed"
      ).length, 0
    ),
    environmentOrSetupFailures: targets.filter(
      (target) => target.failureCategory === "environment-or-setup"
    ).length,
    harnessContractFailures: targets.filter(
      (target) => target.failureCategory === "harness-contract"
    ).length,
    productOrContractFailures: targets.filter(
      (target) => target.failureCategory === "product-or-contract"
    ).length
  };
}

function appendAggregateFailures(failures, result) {
  if (result.targetCount !== targetCount) {
    failures.push(`aggregate: target count differed from ${targetCount}`);
  }
  if (result.completedTrials !== targetCount * repetitions) {
    failures.push("aggregate: not all preregistered trials completed");
  }
  if (result.taskTypeMatchedTargets !== targetCount) {
    failures.push("aggregate: task type mapping was incomplete");
  }
  if (result.coreSurfaceCompleteTargets !== targetCount) {
    failures.push("aggregate: implementation/path-derived-test coverage was incomplete");
  }
  if (result.deterministicTargets !== targetCount) {
    failures.push("aggregate: route order or membership was not deterministic");
  }
  if (
    result.macroChangedFileCoverage === null
    || result.macroChangedFileCoverage < minimumMacroCoverage
  ) {
    failures.push(
      `aggregate: changed-file coverage fell below ${minimumMacroCoverage.toFixed(2)}`
    );
  }
  if (result.macroRouteFocus === null || result.macroRouteFocus < minimumMacroFocus) {
    failures.push(`aggregate: route focus fell below ${minimumMacroFocus.toFixed(2)}`);
  }
  if (
    result.macroRoutePrecision === null
    || result.macroRoutePrecision < minimumMacroPrecision
  ) {
    failures.push(
      `aggregate: route precision fell below ${minimumMacroPrecision.toFixed(2)}`
    );
  }
  if (
    result.minimumTargetRouteFocus === null
    || result.minimumTargetRouteFocus < minimumTargetFocus
  ) {
    failures.push(
      `aggregate: a target route focus fell below ${minimumTargetFocus.toFixed(2)}`
    );
  }
  if (
    result.minimumTargetRoutePrecision === null
    || result.minimumTargetRoutePrecision < minimumTargetPrecision
  ) {
    failures.push(
      `aggregate: a target route precision fell below ${minimumTargetPrecision.toFixed(2)}`
    );
  }
  if (result.overconfidentTrials !== 0) {
    failures.push("aggregate: overconfident trials were observed");
  }
}

function targetExecutionFailure(target, category, message, error, execution = {}) {
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
    testRoleDerivedFromPath: true,
    status: "failed",
    failureCategory: category,
    failures: [message],
    executionError: summarizeError(error),
    deterministicRoutes: false,
    materializationAttempts: execution.materializationAttempts ?? [],
    freshIndexAttempts: execution.freshIndexAttempts ?? [],
    statusAfterExplicitIndex: null,
    trackedWorktreeClean: null,
    trials: []
  };
}

function expectedTaskType(subject) {
  const conventional = subject.match(/^\s*(fix|feat)(?:\([^)]*\))?!?:/i);
  if (conventional?.[1].toLowerCase() === "fix") return "bugfix";
  if (conventional?.[1].toLowerCase() === "feat") return "feature";
  if (/^\s*(?:add|allow|create|implement|support)\b/i.test(subject)) return "feature";
  if (/^\s*(?:fix|debug|repair|correct|resolve)\b/i.test(subject)) return "bugfix";
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
  assert.ok(resolved.startsWith(`${projectRoot}${path.sep}`), "Output must stay inside the repository.");
  return resolved;
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
    "Temporary validation root must stay inside the OS temporary directory."
  );
}

function assertInside(target, root) {
  const relative = path.relative(root, target);
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
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
  return values.length
    ? round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
}

function round(value) {
  return Number(value.toFixed(3));
}

function parseJsonOutput(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} returned invalid JSON.\nstdout:\n${truncate(value)}`, {
      cause: error
    });
  }
}

async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex").toUpperCase();
}

function summarizeError(error) {
  return truncate(error instanceof Error ? error.stack ?? error.message : String(error));
}

function truncate(value, limit = 12_000) {
  const text = String(value);
  return text.length <= limit
    ? text
    : `${text.slice(0, limit)}\n...[truncated ${text.length - limit} characters]`;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
    timeout: options.timeout ?? 120_000,
    windowsHide: true
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
