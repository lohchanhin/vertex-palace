const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdir, mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { normalizeContextTelemetry } = require("./lib/context-telemetry.cjs");

const projectRoot = path.resolve(__dirname, "..");
const cliPath = path.join(projectRoot, "dist", "palace.cjs");
const manifestRelativePath = "docs/research/evidence/held-out-routing-target-manifest-0.4-alpha.json";
const baselineRelativePath = "docs/research/evidence/held-out-cross-repository-routing-0.4-alpha.json";
const manifestPath = path.join(projectRoot, manifestRelativePath);
const baselinePath = path.join(projectRoot, baselineRelativePath);
const args = process.argv.slice(2);
const outputPath = requiredPathArgument(args, "--out", projectRoot);
const providedRepositoriesRoot = optionalPathArgument(args, "--repos-root");
const budget = 6_000;
const routeLimit = 9;
const maxDrawers = 4;
const repetitions = 2;
const minimumRouteFocus = 0.75;
const minimumRoutePrecision = 0.75;

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  assert.equal(
    run("git", ["status", "--short", "--untracked-files=no"], { cwd: projectRoot }).stdout.trim(),
    "",
    "Commit tracked candidate changes before generating development-regression evidence."
  );
  runNpm(["run", "build"], { cwd: projectRoot, timeout: 180_000 });
  assert.equal(
    run("git", ["status", "--short", "--untracked-files=no"], { cwd: projectRoot }).stdout.trim(),
    "",
    "The build changed tracked candidate files; commit the generated bundle before measuring."
  );

  const candidateCommit = run("git", ["rev-parse", "HEAD"], { cwd: projectRoot }).stdout.trim();
  const manifestBytes = await readFile(manifestPath);
  const baselineBytes = await readFile(baselinePath);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const baseline = JSON.parse(baselineBytes.toString("utf8"));
  assert.equal(manifest.status, "selected");
  assert.equal(manifest.targets.length, 4);
  assert.equal(baseline.status, "failed");

  const temporaryRoot = providedRepositoriesRoot
    ? null
    : await mkdtemp(path.join(os.tmpdir(), "vertex-palace-disclosed-routing-"));
  const repositoriesRoot = providedRepositoriesRoot ?? temporaryRoot;

  let report;
  try {
    const targets = [];
    for (const target of manifest.targets) {
      const targetRoot = path.join(repositoriesRoot, target.name);
      try {
        if (!providedRepositoriesRoot) await clonePinnedTarget(target, targetRoot);
        await verifyPinnedTarget(target, targetRoot);
        targets.push(await validateTarget(target, targetRoot));
      } catch (error) {
        targets.push(targetExecutionFailure(target, error));
      }
    }

    const failures = targets.flatMap((target) => target.failures.map((failure) => `${target.name}: ${failure}`));
    report = {
      schemaVersion: 1,
      studyId: "disclosed-routing-regression-0.4-alpha",
      generatedAt: new Date().toISOString(),
      status: failures.length ? "failed" : "passed",
      failures,
      heldOutAgainstCandidate: false,
      evidenceClass: "seen-development-regression",
      claimBoundary: "Post-failure regression evidence on four disclosed repositories used during repair. This can show that known failures were corrected, but cannot establish held-out generalization or end-to-end Agent token/time gains.",
      candidate: {
        productCommit: candidateCommit,
        validationHarnessCommit: candidateCommit,
        cliPath: "dist/palace.cjs",
        trackedWorktreeCleanBeforeMeasurement: true
      },
      sources: {
        targetManifest: {
          path: manifestRelativePath,
          sha256: sha256(manifestBytes)
        },
        originalHeldOutFailure: {
          path: baselineRelativePath,
          sha256: sha256(baselineBytes),
          status: baseline.status,
          completedTrials: baseline.aggregate?.completedTrials ?? null
        },
        repositoryMaterialization: providedRepositoriesRoot ? "verified-provided-copies" : "fresh-pinned-clones"
      },
      protocol: {
        repetitions,
        budget,
        routeLimit,
        maxDrawers,
        gates: {
          changedFileCoverage: 1,
          minimumRouteFocus,
          minimumRoutePrecision,
          deterministicRoutes: true,
          overconfidentTrials: 0,
          contextWithinBudget: true,
          selectedExcludedOverlap: 0
        }
      },
      aggregate: aggregate(targets),
      targets
    };

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    if (temporaryRoot) {
      if (process.env.KEEP_DISCLOSED_ROUTING_TEMP === "1") {
        process.stderr.write(`Kept disclosed regression data at ${temporaryRoot}\n`);
      } else {
        await rm(temporaryRoot, { recursive: true, force: true });
      }
    }
  }

  if (report?.status !== "passed") process.exitCode = 1;
}

async function clonePinnedTarget(target, root) {
  await mkdir(root, { recursive: true });
  run("git", ["init", "--quiet"], { cwd: root });
  run("git", ["remote", "add", "origin", target.url], { cwd: root });
  run("git", ["fetch", "--quiet", "--depth=2", "origin", target.groundTruthCommit], { cwd: root, timeout: 240_000 });
  run("git", ["fetch", "--quiet", "--depth=1", "origin", target.routeCommit], { cwd: root, timeout: 240_000 });
  run("git", ["-c", "advice.detachedHead=false", "checkout", "--detach", target.routeCommit], { cwd: root });
}

async function verifyPinnedTarget(target, root) {
  assert.equal(run("git", ["rev-parse", "HEAD"], { cwd: root }).stdout.trim(), target.routeCommit);
  assert.equal(
    run("git", ["show", "-s", "--format=%s", target.groundTruthCommit], { cwd: root }).stdout.trim(),
    target.task
  );
  assert.equal(run("git", ["rev-parse", `${target.groundTruthCommit}^`], { cwd: root }).stdout.trim(), target.routeCommit);
  assert.deepEqual(
    lines(run("git", ["diff", "--name-only", target.routeCommit, target.groundTruthCommit, "--"], { cwd: root }).stdout).sort(),
    [...target.changedFiles].sort()
  );
  assert.equal(run("git", ["status", "--short", "--untracked-files=no"], { cwd: root }).stdout.trim(), "");
}

async function validateTarget(target, root) {
  runNode([cliPath, "init"], { cwd: root, timeout: 180_000 });
  runNode([cliPath, "index"], { cwd: root, timeout: 180_000 });
  const statusAfterExplicitIndex = parseJson(
    runNode([cliPath, "status"], { cwd: root, timeout: 180_000 }).stdout,
    `${target.name} status`
  );

  const trials = [];
  for (let trial = 1; trial <= repetitions; trial += 1) {
    const evaluationStartedAt = performance.now();
    const evaluation = parseJson(runNode([
      cliPath,
      "evaluate",
      target.task,
      ...target.changedFiles.flatMap((file) => ["--changed-file", file]),
      "--budget", String(budget),
      "--route-limit", String(routeLimit),
      "--max-drawers", String(maxDrawers),
      "--json"
    ], { cwd: root, timeout: 180_000 }).stdout, `${target.name} trial ${trial} evaluate`);
    const evaluationElapsedMs = Math.round(performance.now() - evaluationStartedAt);

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
    ], { cwd: root, timeout: 180_000 });
    const context = parseJson(contextResult.stdout, `${target.name} trial ${trial} context`);
    const telemetry = normalizeContextTelemetry(context, contextResult.stdout);
    const contextElapsedMs = Math.round(performance.now() - contextStartedAt);

    const routeFiles = unique(evaluation.route.files.map(stripLocation));
    const changedFiles = new Set(target.changedFiles);
    const routePrecision = routeFiles.length
      ? round(routeFiles.filter((file) => changedFiles.has(file)).length / routeFiles.length)
      : 0;
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
  }

  const failures = [];
  if (trials.some((trial) => trial.changedFileCoverage !== 1)) failures.push("changed-file coverage was below 1.0");
  if (trials.some((trial) => trial.routeFocus < minimumRouteFocus)) failures.push("route focus was below 0.75");
  if (trials.some((trial) => trial.routePrecision < minimumRoutePrecision)) failures.push("route precision was below 0.75");
  if (trials.some((trial) => trial.taskType !== "bugfix")) failures.push("task type differed from bugfix");
  if (!trials.every((trial) => sameValues(trial.routeFiles, trials[0].routeFiles))) failures.push("route files were not deterministic");
  if (trials.some((trial) => trial.calibration.status === "overconfident")) failures.push("an overconfident trial was observed");
  if (trials.some((trial) => trial.contextEstimatedTokens > budget)) failures.push("context exceeded the 6000-token ceiling");
  if (trials.some((trial) => trial.selectedExcludedOverlap.length > 0)) failures.push("selected and excluded context overlapped");
  if (statusAfterExplicitIndex.stale !== false) failures.push("status was stale immediately after explicit indexing");
  const trackedStatus = run("git", ["status", "--short", "--untracked-files=no"], { cwd: root }).stdout.trim();
  if (trackedStatus) failures.push("Palace modified tracked repository files");

  return {
    name: target.name,
    language: target.language,
    url: target.url,
    routeCommit: target.routeCommit,
    groundTruthCommit: target.groundTruthCommit,
    task: target.task,
    changedFiles: target.changedFiles,
    implementationFiles: target.implementationFiles,
    testFiles: target.testFiles,
    status: failures.length ? "failed" : "passed",
    failures,
    deterministicRoutes: trials.every((trial) => sameValues(trial.routeFiles, trials[0].routeFiles)),
    statusAfterExplicitIndex,
    trackedWorktreeClean: trackedStatus === "",
    trials
  };
}

function aggregate(targets) {
  const trials = targets.flatMap((target) => target.trials);
  return {
    targetCount: targets.length,
    passedTargets: targets.filter((target) => target.status === "passed").length,
    failedTargets: targets.filter((target) => target.status === "failed").length,
    completedTrials: trials.length,
    macroChangedFileCoverage: average(trials.map((trial) => trial.changedFileCoverage)),
    macroRouteFocus: average(trials.map((trial) => trial.routeFocus)),
    macroRoutePrecision: average(trials.map((trial) => trial.routePrecision)),
    overconfidentTrials: trials.filter((trial) => trial.calibration.status === "overconfident").length,
    maximumContextEstimatedTokens: trials.length ? Math.max(...trials.map((trial) => trial.contextEstimatedTokens)) : null,
    setupFailures: targets.filter((target) => target.executionError).length
  };
}

function targetExecutionFailure(target, error) {
  return {
    name: target.name,
    url: target.url,
    routeCommit: target.routeCommit,
    groundTruthCommit: target.groundTruthCommit,
    task: target.task,
    changedFiles: target.changedFiles,
    status: "failed",
    failures: ["target setup or validation execution failed"],
    executionError: error instanceof Error ? error.stack ?? error.message : String(error),
    deterministicRoutes: false,
    statusAfterExplicitIndex: null,
    trackedWorktreeClean: null,
    trials: []
  };
}

function requiredPathArgument(values, name, root) {
  const index = values.indexOf(name);
  assert.ok(index >= 0 && values[index + 1], `${name} is required.`);
  const resolved = path.resolve(root, values[index + 1]);
  assert.ok(resolved.startsWith(`${root}${path.sep}`), `${name} must stay inside the repository.`);
  return resolved;
}

function optionalPathArgument(values, name) {
  const index = values.indexOf(name);
  return index >= 0 && values[index + 1] ? path.resolve(values[index + 1]) : null;
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

function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} returned invalid JSON.`, { cause: error });
  }
}

function lines(value) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function unique(values) {
  return [...new Set(values)];
}

function sameValues(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function average(values) {
  return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function round(value) {
  return Number(value.toFixed(3));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

function runNpm(commandArgs, options) {
  if (process.platform === "win32") {
    return run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `npm ${commandArgs.join(" ")}`], options);
  }
  return run("npm", commandArgs, options);
}

function runNode(commandArgs, options) {
  return run(process.execPath, commandArgs, options);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 32 * 1024 * 1024,
    timeout: options.timeout ?? 120_000
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error([
      `Command failed (${result.status}): ${command} ${commandArgs.join(" ")}`,
      result.stdout?.trim(),
      result.stderr?.trim()
    ].filter(Boolean).join("\n"));
  }
  return result;
}
