const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { access, mkdtemp, mkdir, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const manifestRelativePath = "docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-3.json";
const manifestPath = path.join(projectRoot, manifestRelativePath);
const candidateCommit = "efd53274e42fb8123745f2b8bb09a24e4fa384b7";
const candidatePaths = [
  "packages/core/src/router/analyze-task.ts",
  "packages/core/src/router/classify-task.ts",
  "packages/core/src/router/route-planner.ts",
  "packages/core/test/router.test.ts",
  "plugins/vertex-palace/mcp/server.cjs"
];
const cliPath = path.join(projectRoot, "dist", "palace.cjs");
const outputPath = outputArgument(process.argv.slice(2));
const materializationRetries = 3;
const executionAttemptsPerCommand = 3;
const retryDelayMs = 5000;
const trialsPerTarget = 2;
const transientExecutionCodes = new Set(["EAGAIN", "ENOMEM", "ETIMEDOUT"]);

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

async function main() {
  await assertCandidate();
  const manifestBytes = await readFile(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  assert.equal(manifest.status, "selected");
  assert.equal(manifest.targets.length, 8);

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-round-3-disclosed-regression-"));
  const targets = [];
  try {
    for (const target of manifest.targets) {
      targets.push(await evaluateTarget(target, tempRoot));
    }

    const aggregate = aggregateTargets(targets);
    const report = {
      schemaVersion: 1,
      studyId: "disclosed-cross-repository-routing-round-3-regression",
      generatedAt: new Date().toISOString(),
      status: aggregate.failedTargets === 0 ? "passed" : "failed",
      evidenceClass: "disclosed-development-regression",
      claimBoundary: "All eight tasks and Git oracles were disclosed before this candidate was developed. This report verifies regression repair and determinism only; it is not held-out evidence and cannot support generalization, Agent Token, or wall-time claims.",
      candidate: {
        productCommit: candidateCommit,
        productPaths: candidatePaths,
        cliPath: "dist/palace.cjs",
        cliSha256: await sha256File(cliPath)
      },
      sourceProtocol: {
        manifestPath: manifestRelativePath,
        manifestSha256: createHash("sha256").update(manifestBytes).digest("hex").toUpperCase(),
        tasksAndOraclesFrozenBeforeOriginalRound3: true,
        tasksDisclosedBeforeCandidateDevelopment: true
      },
      protocol: {
        targetCount: manifest.targets.length,
        trialsPerTarget,
        sequentialExecution: true,
        freshClonePerTarget: true,
        fixedRouteCommit: true,
        explicitIndexBeforeTrials: true,
        materializationRetries,
        executionAttemptsPerCommand,
        transientExecutionCodes: [...transientExecutionCodes],
        retryDelayMs,
        outputCreateOnly: true,
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      },
      aggregate,
      targets
    };

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx"
    });
    console.log(JSON.stringify({
      outputPath,
      status: report.status,
      aggregate
    }, null, 2));
  } finally {
    if (process.env.KEEP_DISCLOSED_ROUTING_ROUND_3_TEMP === "1") {
      console.error(`Keeping temporary repositories at ${tempRoot}`);
    } else {
      await rm(tempRoot, { recursive: true, force: true });
    }
  }
}

async function assertCandidate() {
  await access(cliPath);
  run("git", ["cat-file", "-e", `${candidateCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["diff", "--quiet", candidateCommit, "--", ...candidatePaths], { cwd: projectRoot });
}

async function evaluateTarget(target, tempRoot) {
  const repoRoot = path.join(tempRoot, target.name);
  const materializationAttempts = [];
  let materialized = false;
  for (let attempt = 1; attempt <= materializationRetries; attempt += 1) {
    try {
      await assertInsideTemp(repoRoot, tempRoot);
      await rm(repoRoot, { recursive: true, force: true });
      run("git", [
        "clone",
        "--filter=blob:none",
        "--no-checkout",
        "--depth",
        "400",
        target.url,
        repoRoot
      ], { cwd: tempRoot, timeout: 120000 });
      run("git", ["checkout", "--detach", target.routeCommit], {
        cwd: repoRoot,
        timeout: 30000
      });
      materializationAttempts.push({ attempt, status: "completed", error: null });
      materialized = true;
      break;
    } catch (error) {
      materializationAttempts.push({
        attempt,
        status: "failed",
        error: error.message
      });
      if (attempt < materializationRetries) await delay(retryDelayMs);
    }
  }

  if (!materialized) {
    return {
      ...targetIdentity(target),
      status: "environment-failed",
      failures: ["target materialization failed before Palace execution"],
      materializationAttempts,
      trials: []
    };
  }

  try {
    const groundTruth = gitChangedFiles(repoRoot, target.routeCommit, target.groundTruthCommit);
    assert.deepEqual([...groundTruth].sort(), [...target.changedFiles].sort());
    runPalace(["init", "--root", repoRoot], { timeout: 30000 });
    const indexRun = await runPalaceJsonWithTransientRetries(
      ["index", "--root", repoRoot],
      { timeout: 180000 }
    );
    const index = indexRun.value;
    const indexElapsedMs = indexRun.elapsedMs;

    const trials = [];
    for (let trial = 1; trial <= trialsPerTarget; trial += 1) {
      const evaluationRun = await runPalaceJsonWithTransientRetries(
        evaluationArguments(target, repoRoot),
        { timeout: 120000 }
      );
      trials.push(summarizeTrial(
        target,
        evaluationRun.value,
        trial,
        evaluationRun.elapsedMs,
        evaluationRun.attempts
      ));
    }

    const deterministicRoutes = trials.every(
      (trial) => JSON.stringify(trial.routeFiles) === JSON.stringify(trials[0].routeFiles)
    );
    const failures = [];
    if (!deterministicRoutes) failures.push("route order or membership changed between trials");
    for (const trial of trials) failures.push(...trial.failures.map((failure) => `trial ${trial.trial}: ${failure}`));
    const trackedWorktreeClean = run("git", ["status", "--porcelain"], {
      cwd: repoRoot
    }).stdout.trim() === "";
    if (!trackedWorktreeClean) failures.push("tracked target worktree is dirty after evaluation");

    return {
      ...targetIdentity(target),
      status: failures.length ? "failed" : "passed",
      failures,
      deterministicRoutes,
      trackedWorktreeClean,
      index: {
        fileCount: index.fileCount,
        nodeCount: index.nodeCount,
        edgeCount: index.edgeCount,
        roomCount: index.roomCount,
        symbolCount: index.symbolCount,
        elapsedMs: indexElapsedMs,
        executionAttempts: indexRun.attempts
      },
      materializationAttempts,
      trials
    };
  } catch (error) {
    return {
      ...targetIdentity(target),
      status: error.environmentFailure ? "environment-failed" : "product-or-protocol-failed",
      failures: [error.stack || error.message],
      materializationAttempts,
      executionAttempts: error.executionAttempts || [],
      trials: []
    };
  }
}

function evaluationArguments(target, repoRoot) {
  const args = [
    "evaluate",
    target.task,
    "--root",
    repoRoot,
    "--route-limit",
    "9",
    "--budget",
    "6000",
    "--max-drawers",
    "4",
    "--json"
  ];
  for (const changedFile of target.changedFiles) {
    args.push("--changed-file", changedFile);
  }
  return args;
}

function summarizeTrial(target, evaluation, trial, elapsedMs, executionAttempts) {
  const routeFiles = evaluation.route.files;
  const routeSet = new Set(routeFiles);
  const oracleSet = new Set(target.changedFiles);
  const missingFiles = target.changedFiles.filter((file) => !routeSet.has(file));
  const routeOnlyFiles = routeFiles.filter((file) => !oracleSet.has(file));
  const failures = [];
  if (evaluation.taskType !== target.expectedTaskType) {
    failures.push(`task type ${evaluation.taskType} != ${target.expectedTaskType}`);
  }
  if (missingFiles.length) failures.push(`missing oracle files: ${missingFiles.join(", ")}`);
  if (routeOnlyFiles.length) failures.push(`extra route files: ${routeOnlyFiles.join(", ")}`);
  if (evaluation.coverage.changedFileCoverage !== 1) {
    failures.push(`changed-file coverage ${evaluation.coverage.changedFileCoverage} != 1`);
  }
  if (evaluation.coverage.routeFocus !== 1) {
    failures.push(`route focus ${evaluation.coverage.routeFocus} != 1`);
  }
  return {
    trial,
    status: failures.length ? "failed" : "passed",
    failures,
    taskType: evaluation.taskType,
    routeId: evaluation.routeId,
    routeFiles,
    routeFileCount: routeFiles.length,
    missingFiles,
    routeOnlyFiles,
    changedFileCoverage: evaluation.coverage.changedFileCoverage,
    routeFocus: evaluation.coverage.routeFocus,
    routePrecision: target.changedFiles.filter((file) => routeSet.has(file)).length / routeFiles.length,
    routeConfidence: evaluation.route.confidence,
    calibration: evaluation.calibration,
    packTokens: evaluation.context.packTokens,
    elapsedMs,
    executionAttempts
  };
}

function aggregateTargets(targets) {
  const completedTargets = targets.filter((target) => target.trials.length === trialsPerTarget);
  const trials = completedTargets.flatMap((target) => target.trials);
  const passedTargets = targets.filter((target) => target.status === "passed").length;
  return {
    targets: targets.length,
    completedTargets: completedTargets.length,
    passedTargets,
    failedTargets: targets.length - passedTargets,
    environmentFailedTargets: targets.filter((target) => target.status === "environment-failed").length,
    completedTrials: trials.length,
    passedTrials: trials.filter((trial) => trial.status === "passed").length,
    taskTypeMatches: trials.filter((trial, index) => {
      const target = completedTargets[Math.floor(index / trialsPerTarget)];
      return trial.taskType === target.expectedTaskType;
    }).length,
    deterministicTargets: completedTargets.filter((target) => target.deterministicRoutes).length,
    oracleFileTotal: completedTargets.reduce((sum, target) => sum + target.changedFiles.length, 0),
    routeFileTotal: completedTargets.reduce((sum, target) => sum + target.trials[0].routeFileCount, 0),
    macroChangedFileCoverage: mean(trials.map((trial) => trial.changedFileCoverage)),
    macroRouteFocus: mean(trials.map((trial) => trial.routeFocus)),
    macroRoutePrecision: mean(trials.map((trial) => trial.routePrecision)),
    minimumRouteFocus: trials.length ? Math.min(...trials.map((trial) => trial.routeFocus)) : null,
    maximumPackTokens: trials.length ? Math.max(...trials.map((trial) => trial.packTokens)) : null,
    medianElapsedMs: median(trials.map((trial) => trial.elapsedMs))
  };
}

function targetIdentity(target) {
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
    testFiles: target.testFiles
  };
}

function gitChangedFiles(repoRoot, from, to) {
  return run("git", ["diff", "--name-only", "--diff-filter=M", from, to], {
    cwd: repoRoot
  }).stdout.split(/\r?\n/).filter(Boolean);
}

function runPalace(args, options = {}) {
  return run(process.execPath, [cliPath, ...args], {
    cwd: projectRoot,
    ...options
  });
}

function runPalaceJson(args, options = {}) {
  const result = runPalace(args, options);
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Palace did not return JSON for ${args[0]}: ${error.message}\n${result.stdout}`);
  }
}

async function runPalaceJsonWithTransientRetries(args, options = {}) {
  const attempts = [];
  const startedAt = performance.now();
  for (let attempt = 1; attempt <= executionAttemptsPerCommand; attempt += 1) {
    const attemptStartedAt = performance.now();
    try {
      const value = runPalaceJson(args, options);
      attempts.push({
        attempt,
        status: "completed",
        elapsedMs: Math.round(performance.now() - attemptStartedAt),
        errorCode: null,
        error: null
      });
      return {
        value,
        attempts,
        elapsedMs: Math.round(performance.now() - startedAt)
      };
    } catch (error) {
      const transient = transientExecutionCodes.has(error.code);
      attempts.push({
        attempt,
        status: transient ? "environment-failed" : "failed",
        elapsedMs: Math.round(performance.now() - attemptStartedAt),
        errorCode: error.code || null,
        error: error.message
      });
      if (!transient || attempt === executionAttemptsPerCommand) {
        error.environmentFailure = transient;
        error.executionAttempts = attempts;
        throw error;
      }
      await delay(retryDelayMs);
    }
  }
  throw new Error(`unreachable Palace retry state for ${args[0]}`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: process.env,
    timeout: options.timeout ?? 60000,
    windowsHide: true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(" ")} exited with ${result.status}`,
      result.stdout,
      result.stderr
    ].filter(Boolean).join("\n"));
  }
  return result;
}

async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex").toUpperCase();
}

async function assertInsideTemp(target, tempRoot) {
  const relative = path.relative(tempRoot, target);
  assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  if (index < 0 || !args[index + 1]) {
    throw new Error("Usage: node scripts/verify-disclosed-routing-round-3.cjs --out <create-only-json-path>");
  }
  return path.resolve(projectRoot, args[index + 1]);
}

function mean(values) {
  if (!values.length) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4));
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Number(((sorted[middle - 1] + sorted[middle]) / 2).toFixed(1));
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
