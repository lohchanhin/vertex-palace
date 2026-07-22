const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdir, mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const cliPath = path.join(projectRoot, "dist", "palace.cjs");
const manifestRelativePath = "docs/research/evidence/held-out-routing-target-manifest-0.4-alpha.json";
const manifestPath = path.join(projectRoot, manifestRelativePath);
const outputPath = outputArgument(process.argv.slice(2));
const candidateCommit = "0b6a0fd92f43a74c983663cd32f937087e3ec923";
const manifestCommit = "b91dbd14a69f92fa84fa9f4175b1c3c33bd6d342";
const manifestSha256 = "5B071471BCF1B049B9BF1A2C70F536F138557A83AC6BCCDAA9AB9A82906A84C6";
const budget = 6_000;
const routeLimit = 9;
const maxDrawers = 4;
const repetitions = 2;
const minimumRouteFocus = 0.75;
const minimumRoutePrecision = 0.75;

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
  const manifest = await assertFrozenInputs();
  runNpm(["run", "build"], { cwd: projectRoot, timeout: 180_000 });
  await assertFrozenInputs();

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-held-out-routing-"));
  assert.ok(
    path.resolve(temporaryRoot).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`),
    "Temporary validation root must stay inside the OS temporary directory."
  );

  let report;
  try {
    const targets = [];
    for (const target of manifest.targets) {
      const targetRoot = path.join(temporaryRoot, target.name);
      try {
        await clonePinnedTarget(target, targetRoot);
        targets.push(await validateTarget(target, targetRoot));
      } catch (error) {
        targets.push(targetExecutionFailure(target, error));
      }
    }

    const failures = targets.flatMap((target) =>
      target.failures.map((failure) => `${target.name}: ${failure}`)
    );
    report = {
      schemaVersion: 1,
      studyId: "held-out-cross-repository-routing-0.4-alpha",
      generatedAt: new Date().toISOString(),
      status: failures.length ? "failed" : "passed",
      failures,
      claimBoundary: "First static routing observation on mechanically selected repositories and Git-history tasks unseen during candidate development; not an end-to-end Agent performance benchmark.",
      heldOutAgainstCandidate: true,
      candidate: {
        productCommit: candidateCommit,
        validationHarnessCommit: run("git", ["rev-parse", "HEAD"], { cwd: projectRoot }).stdout.trim(),
        cliPath: "dist/palace.cjs",
        frozenPaths: frozenCandidatePaths
      },
      targetSelection: {
        manifestPath: manifestRelativePath,
        manifestCommit,
        manifestSha256,
        selectorCommit: manifest.selectorCommit,
        palaceCallsDuringSelection: manifest.rules.palaceCallsDuringSelection,
        targetCount: manifest.targets.length
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
          changedFileCoverage: 1,
          minimumRouteFocus,
          minimumRoutePrecision,
          deterministicRoutes: true,
          overconfidentTrials: 0,
          contextWithinBudget: true,
          selectedExcludedOverlap: 0,
          trackedWorktreeClean: true,
          freshAfterExplicitIndex: true
        }
      },
      aggregate: aggregate(targets),
      targets
    };

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    if (process.env.KEEP_HELD_OUT_ROUTING_TEMP === "1") {
      process.stderr.write(`Kept held-out validation data at ${temporaryRoot}\n`);
    } else {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }

  if (report?.status !== "passed") process.exitCode = 1;
}

async function assertFrozenInputs() {
  run("git", ["cat-file", "-e", `${candidateCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["diff", "--quiet", candidateCommit, "--", ...frozenCandidatePaths], { cwd: projectRoot });
  run("git", ["cat-file", "-e", `${manifestCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["diff", "--quiet", manifestCommit, "--", manifestRelativePath], { cwd: projectRoot });
  const bytes = await readFile(manifestPath);
  assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), manifestSha256);
  const manifest = JSON.parse(bytes.toString("utf8"));
  assert.equal(manifest.status, "selected");
  assert.equal(manifest.candidateCommit, candidateCommit);
  assert.equal(manifest.targets.length, 4);
  assert.equal(manifest.rules.palaceCallsDuringSelection, 0);
  return manifest;
}

async function clonePinnedTarget(target, root) {
  await mkdir(root, { recursive: true });
  run("git", ["init", "--quiet"], { cwd: root });
  run("git", ["remote", "add", "origin", target.url], { cwd: root });
  run("git", ["fetch", "--quiet", "--depth=2", "origin", target.groundTruthCommit], {
    cwd: root,
    timeout: 240_000
  });
  run("git", ["fetch", "--quiet", "--depth=1", "origin", target.routeCommit], {
    cwd: root,
    timeout: 240_000
  });
  const groundTruthParent = run("git", ["rev-parse", `${target.groundTruthCommit}^`], { cwd: root }).stdout.trim();
  assert.equal(groundTruthParent, target.routeCommit, `${target.name} ground-truth parent changed.`);
  assert.equal(
    run("git", ["show", "-s", "--format=%s", target.groundTruthCommit], { cwd: root }).stdout.trim(),
    target.task,
    `${target.name} task no longer matches the selected commit subject.`
  );
  assert.deepEqual(
    lines(run("git", ["diff", "--name-only", target.routeCommit, target.groundTruthCommit, "--"], { cwd: root }).stdout).sort(),
    [...target.changedFiles].sort(),
    `${target.name} changed-file oracle no longer matches Git history.`
  );
  run("git", ["-c", "advice.detachedHead=false", "checkout", "--detach", target.routeCommit], { cwd: root });
  assert.equal(run("git", ["rev-parse", "HEAD"], { cwd: root }).stdout.trim(), target.routeCommit);
}

async function validateTarget(target, root) {
  runNode([cliPath, "init"], { cwd: root, timeout: 180_000 });
  runNode([cliPath, "index"], { cwd: root, timeout: 180_000 });
  const statusAfterExplicitIndex = parseJsonOutput(
    runNode([cliPath, "status"], { cwd: root, timeout: 180_000 }).stdout,
    `${target.name} status after explicit index`
  );

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
        "--budget",
        String(budget),
        "--route-limit",
        String(routeLimit),
        "--max-drawers",
        String(maxDrawers),
        "--json"
      ], { cwd: root, timeout: 180_000 }).stdout, `${target.name} trial ${trial} evaluate`);
      const evaluationElapsedMs = Math.round(performance.now() - evaluationStartedAt);

      failedPhase = "context";
      const contextStartedAt = performance.now();
      const context = parseJsonOutput(runNode([
        cliPath,
        "context",
        target.task,
        "--auto",
        "--format",
        "json",
        "--budget",
        String(budget),
        "--route-limit",
        String(routeLimit),
        "--max-drawers",
        String(maxDrawers)
      ], { cwd: root, timeout: 180_000 }).stdout, `${target.name} trial ${trial} context`);
      const contextElapsedMs = Math.round(performance.now() - contextStartedAt);

      const routeFiles = unique(evaluation.route.files.map(stripLocation));
      const changed = new Set(target.changedFiles);
      const routePrecision = routeFiles.length
        ? round(routeFiles.filter((file) => changed.has(file)).length / routeFiles.length)
        : 0;
      const selectedFiles = unique([
        ...context.executionBoundaries.primary,
        ...context.executionBoundaries.support,
        ...context.executionBoundaries.deferred
      ].map(stripLocation));
      const excludedFiles = unique(
        context.executionBoundaries.excluded
          .map((entry) => typeof entry === "string" ? entry : entry?.sourcePath)
          .filter((entry) => typeof entry === "string" && entry.length > 0)
          .map(stripLocation)
      );
      const selectedExcludedOverlap = selectedFiles.filter((selected) =>
        excludedFiles.some((excluded) => pathsOverlap(selected, excluded))
      );

      trials.push({
        trial,
        status: "completed",
        evaluationCacheState: trial === 1 ? "warm-index-after-explicit-index" : "warm-index",
        contextCacheState: "warm-index-after-evaluation",
        evaluationElapsedMs,
        contextElapsedMs,
        mode: context.mode,
        taskType: evaluation.taskType,
        routeFiles,
        routeFileCount: routeFiles.length,
        changedFileCoverage: evaluation.coverage.changedFileCoverage,
        routeFocus: evaluation.coverage.routeFocus,
        routePrecision,
        routeConfidence: evaluation.route.confidence,
        calibration: evaluation.calibration,
        contextEstimatedTokens: context.payload.contextEstimatedTokens,
        contextBytes: context.payload.contextBytes,
        selectedExcludedOverlap
      });
    } catch (error) {
      trials.push({
        trial,
        status: "execution-error",
        failedPhase,
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
  const first = completed[0];
  const deterministicRoutes = completed.length === repetitions
    && completed.every((trial) => sameValues(trial.routeFiles, first.routeFiles));
  if (completed.length !== repetitions) failures.push("not all preregistered trials completed");
  if (!deterministicRoutes) failures.push("route files differed across repetitions");
  if (completed.some((trial) => trial.taskType !== "bugfix")) failures.push("task type differed from bugfix");
  if (completed.some((trial) => trial.changedFileCoverage !== 1)) failures.push("changed-file coverage differed from 1.00");
  if (completed.some((trial) => trial.routeFocus < minimumRouteFocus)) failures.push(`route focus fell below ${minimumRouteFocus.toFixed(2)}`);
  if (completed.some((trial) => trial.routePrecision < minimumRoutePrecision)) failures.push(`route precision fell below ${minimumRoutePrecision.toFixed(2)}`);
  if (completed.some((trial) => trial.calibration.status === "overconfident")) failures.push("route was overconfident against observed coverage");
  if (completed.some((trial) => trial.contextEstimatedTokens > budget)) failures.push("context payload exceeded the 6000-token ceiling");
  if (completed.some((trial) => trial.selectedExcludedOverlap.length)) failures.push("selected and excluded boundaries overlapped");
  if (statusAfterExplicitIndex.stale !== false) failures.push("status was stale immediately after explicit indexing");
  const trackedStatus = run("git", ["status", "--short", "--untracked-files=no"], { cwd: root }).stdout.trim();
  if (trackedStatus) failures.push("Palace modified tracked repository files");

  return {
    name: target.name,
    language: target.language,
    url: target.url,
    pinnedHead: target.pinnedHead,
    routeCommit: target.routeCommit,
    groundTruthCommit: target.groundTruthCommit,
    oracleSource: target.oracleSource,
    task: target.task,
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
  const firstCompleted = targets
    .map((target) => target.trials.find((trial) => trial.status === "completed"))
    .filter(Boolean);
  return {
    targets: targets.length,
    passedTargets: targets.filter((target) => target.status === "passed").length,
    trials: trials.length,
    completedTrials: completed.length,
    macroChangedFileCoverage: averageOrNull(firstCompleted.map((trial) => trial.changedFileCoverage)),
    macroRouteFocus: averageOrNull(firstCompleted.map((trial) => trial.routeFocus)),
    macroRoutePrecision: averageOrNull(firstCompleted.map((trial) => trial.routePrecision)),
    overconfidentTrials: completed.filter((trial) => trial.calibration.status === "overconfident").length,
    maxContextEstimatedTokens: completed.length
      ? Math.max(...completed.map((trial) => trial.contextEstimatedTokens))
      : null,
    setupFailures: targets.filter((target) => target.failureCategory === "environment-or-setup").length
  };
}

function targetExecutionFailure(target, error) {
  return {
    name: target.name,
    language: target.language,
    url: target.url,
    pinnedHead: target.pinnedHead,
    routeCommit: target.routeCommit,
    groundTruthCommit: target.groundTruthCommit,
    oracleSource: target.oracleSource,
    task: target.task,
    changedFiles: target.changedFiles,
    implementationFiles: target.implementationFiles,
    testFiles: target.testFiles,
    status: "failed",
    failureCategory: "environment-or-setup",
    failures: ["target setup or validation execution failed"],
    executionError: summarizeError(error),
    deterministicRoutes: false,
    statusAfterExplicitIndex: null,
    trackedWorktreeClean: null,
    trials: []
  };
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  assert.ok(index >= 0, "--out is required so the first held-out observation cannot be lost.");
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

