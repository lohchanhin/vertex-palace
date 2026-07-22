const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { copyFile, mkdir, mkdtemp, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const cliPath = path.join(projectRoot, "dist", "palace.cjs");
const outputPath = outputArgument(process.argv.slice(2));
const candidateCommit = "543a670ff06d65d8df3fe6d63f0915918812aaaf";
const budget = 6_000;
const routeLimit = 9;
const maxDrawers = 4;
const repetitions = 2;
const selfAuditMinimumFocus = 0.75;
const selfAuditMaximumRouteFiles = 8;

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

const repositories = [
  {
    name: "zod",
    language: "TypeScript",
    url: "https://github.com/colinhacks/zod.git",
    routeCommit: "912f0f51b0ced654d0069741e7160834dca742ee",
    task: "A codec-backed discriminated union decodes correctly but fails when encoding because input and output discriminator values differ. Preserve fast decoding while allowing backward encoding to select the right option, and update the focused regression tests.",
    changedFiles: [
      "packages/zod/src/v4/core/schemas.ts",
      "packages/zod/src/v4/classic/tests/discriminated-unions.test.ts"
    ],
    acceptedRouteFiles: [
      "packages/zod/src/v4/core/schemas.ts",
      "packages/zod/src/v4/classic/tests/discriminated-unions.test.ts"
    ],
    oracleSource: "previously frozen target-file replication"
  },
  {
    name: "requests",
    language: "Python",
    url: "https://github.com/psf/requests.git",
    routeCommit: "f361ead047be5cb873174218582f7d8b9fcd9f49",
    task: "Fix redirect authorization handling so credentials are preserved for same-host default-port redirects and HTTP-to-HTTPS upgrades, but stripped on host, downgrade, or nonstandard port changes. Update the focused regression tests.",
    changedFiles: ["src/requests/sessions.py", "tests/test_requests.py"],
    acceptedRouteFiles: ["src/requests/sessions.py", "tests/test_requests.py"],
    oracleSource: "previously frozen target-file replication"
  },
  {
    name: "p-limit",
    language: "JavaScript with TypeScript declarations",
    url: "https://github.com/sindresorhus/p-limit.git",
    routeCommit: "c944e4a4363ff41a7202d5dec346cc174c3ecf49",
    groundTruthCommit: "ccb80b2721a6a4a27ce5ad7721fe939162a35b31",
    task: "Fix the overly permissive public limitFunction type. It currently accepts synchronous functions even though limiting synchronous execution has no effect. Restrict it to asynchronous functions, preserve inferred argument and return types, and add focused compile-time regression coverage using the repository's existing type-test setup.",
    changedFiles: ["index.d.ts", "index.test-d.ts"],
    acceptedRouteFiles: ["index.d.ts", "index.test-d.ts", "package.json"],
    oracleSource: "real Git-history diff"
  }
];

const selfAuditChangedFiles = [
  "scripts/verify-route-precision-cross-repositories.cjs",
  "docs/research/CROSS_REPOSITORY_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md",
  "docs/zh-CN/CROSS_REPOSITORY_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md",
  "docs/research/evidence/cross-repository-route-precision-0.4-alpha.json",
  "docs/research/CROSS_REPOSITORY_ROUTE_PRECISION_RESULT_0_4_ALPHA.md",
  "docs/zh-CN/CROSS_REPOSITORY_ROUTE_PRECISION_RESULT_0_4_ALPHA.md"
];

const selfAuditAcceptedRouteFiles = [
  ...selfAuditChangedFiles,
  "tsconfig.base.json"
];

const selfAuditTargets = [
  {
    name: "vertex-palace-self-audit-en",
    language: "English",
    task: "Freeze and execute a cross-repository route precision replication across Zod, Requests, and p-limit; preserve the first JSON evidence and write English and Simplified Chinese result reports"
  },
  {
    name: "vertex-palace-self-audit-zh-cn",
    language: "Simplified Chinese",
    task: "冻结并执行 Zod、Requests、p-limit 跨仓库路由精度复现实验，保留首次 JSON 证据并编写英文与简体中文结果报告"
  }
].map((target) => ({
  ...target,
  url: "local frozen candidate worktree",
  routeCommit: candidateCommit,
  changedFiles: selfAuditChangedFiles,
  acceptedRouteFiles: selfAuditAcceptedRouteFiles,
  oracleSource: "frozen prior cross-repository research artifact family",
  firstEvaluationCacheState: "warm-index-after-explicit-index",
  minimumRouteFocus: selfAuditMinimumFocus,
  maximumRouteFiles: selfAuditMaximumRouteFiles
}));

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  assertFrozenCandidate();
  runNpm(["run", "build"], { cwd: projectRoot, timeout: 180_000 });
  assertFrozenCandidate();

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-route-precision-after-self-audit-"));
  assert.ok(
    path.resolve(temporaryRoot).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`),
    "Temporary validation root must stay inside the OS temporary directory."
  );

  let report;
  try {
    const repositoryReports = [];
    for (const repository of repositories) {
      const repositoryRoot = path.join(temporaryRoot, repository.name);
      try {
        await clonePinnedRepository(repository, repositoryRoot);
        repositoryReports.push(await validateRepository(repository, repositoryRoot));
      } catch (error) {
        repositoryReports.push(repositoryExecutionFailure(repository, error));
      }
    }

    let selfAuditReport;
    const selfAuditRoot = path.join(temporaryRoot, "vertex-palace-self-audit");
    try {
      await cloneCandidateRepository(selfAuditRoot);
      selfAuditReport = await validateSelfAudit(selfAuditRoot);
    } catch (error) {
      selfAuditReport = selfAuditExecutionFailure(error);
    }

    const failures = repositoryReports.flatMap((repository) =>
      repository.failures.map((failure) => `${repository.name}: ${failure}`)
    ).concat(selfAuditReport.failures.map((failure) => `self-audit: ${failure}`));
    report = {
      schemaVersion: 1,
      studyId: "route-precision-after-self-audit-0.4-alpha",
      generatedAt: new Date().toISOString(),
      claimBoundary: "Pinned seen-repository static routing regression plus bilingual Vertex Palace self-audit only; not held-out and not an end-to-end Agent performance benchmark.",
      status: failures.length ? "failed" : "passed",
      failures,
      candidate: {
        productCommit: candidateCommit,
        validationHarnessCommit: run("git", ["rev-parse", "HEAD"], { cwd: projectRoot }).stdout.trim(),
        cliPath: "dist/palace.cjs",
        frozenPaths: frozenCandidatePaths
      },
      environment: {
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        npm: runNpm(["--version"], { cwd: projectRoot }).stdout.trim(),
        git: run("git", ["--version"], { cwd: projectRoot }).stdout.trim()
      },
      protocol: {
        repositorySet: "previously used replication targets",
        heldOut: false,
        selectionLockedBeforeFirstCandidateRun: true,
        budget,
        routeLimit,
        maxDrawers,
        repetitions,
        gates: {
          changedFileCoverage: 1,
          acceptedRoutePrecision: 1,
          deterministicRoutes: true,
          overconfidentRoutes: 0,
          contextWithinBudget: true,
          trackedWorktreeClean: true,
          selfAuditFreshAfterExplicitIndex: true,
          selfAuditChangedFileCoverage: 1,
          selfAuditRouteFocusAtLeast: selfAuditMinimumFocus,
          selfAuditMaximumRouteFiles
        }
      },
      aggregate: aggregate(repositoryReports),
      repositories: repositoryReports,
      selfAudit: selfAuditReport
    };

    const serialized = `${JSON.stringify(report, null, 2)}\n`;
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serialized, { encoding: "utf8", flag: "wx" });
    process.stdout.write(serialized);
  } finally {
    if (process.env.KEEP_ROUTE_PRECISION_TEMP === "1") {
      process.stderr.write(`Kept cross-repository validation data at ${temporaryRoot}\n`);
    } else {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }

  if (report?.status !== "passed") process.exitCode = 1;
}

function assertFrozenCandidate() {
  run("git", ["cat-file", "-e", `${candidateCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["diff", "--quiet", candidateCommit, "--", ...frozenCandidatePaths], { cwd: projectRoot });
}

async function clonePinnedRepository(repository, target) {
  await mkdir(target, { recursive: true });
  run("git", ["init", "--quiet"], { cwd: target });
  run("git", ["remote", "add", "origin", repository.url], { cwd: target });
  for (const commit of unique([repository.routeCommit, repository.groundTruthCommit].filter(Boolean))) {
    run("git", ["fetch", "--depth", "1", "origin", commit], { cwd: target, timeout: 180_000 });
  }
  run("git", ["-c", "advice.detachedHead=false", "checkout", "--detach", repository.routeCommit], { cwd: target });
  assert.equal(run("git", ["rev-parse", "HEAD"], { cwd: target }).stdout.trim(), repository.routeCommit);
}

async function cloneCandidateRepository(target) {
  run("git", ["clone", "--quiet", "--no-hardlinks", projectRoot, target], {
    cwd: path.dirname(target),
    timeout: 180_000
  });
  run("git", ["-c", "advice.detachedHead=false", "checkout", "--detach", candidateCommit], { cwd: target });
  assert.equal(run("git", ["rev-parse", "HEAD"], { cwd: target }).stdout.trim(), candidateCommit);
  await mkdir(path.join(target, "dist"), { recursive: true });
  await copyFile(cliPath, path.join(target, "dist", "palace.cjs"));
}

async function validateSelfAudit(root) {
  runNode([cliPath, "init"], { cwd: root, timeout: 180_000 });
  runNode([cliPath, "index"], { cwd: root, timeout: 180_000 });
  const statusAfterExplicitIndex = parseJsonOutput(
    runNode([cliPath, "status"], { cwd: root, timeout: 180_000 }).stdout,
    "Vertex Palace self-audit status after explicit index"
  );
  const targetReports = [];
  for (const target of selfAuditTargets) {
    targetReports.push(await validateRepository(target, root));
  }
  const failures = targetReports.flatMap((target) =>
    target.failures.map((failure) => `${target.name}: ${failure}`)
  );
  if (statusAfterExplicitIndex.stale !== false) {
    failures.push("status was stale immediately after indexing a declared generated artifact");
  }
  const trackedStatus = run("git", ["status", "--short", "--untracked-files=no"], { cwd: root }).stdout.trim();
  if (trackedStatus) failures.push("self-audit modified tracked candidate files");
  return {
    repositoryCommit: candidateCommit,
    status: failures.length ? "failed" : "passed",
    failures,
    statusAfterExplicitIndex,
    generatedArtifactFixture: "dist/palace.cjs copied from the frozen candidate build",
    trackedWorktreeClean: trackedStatus === "",
    aggregate: aggregate(targetReports),
    targets: targetReports
  };
}

async function validateRepository(repository, root) {
  const failures = [];
  let historyChangedFiles;
  if (repository.groundTruthCommit) {
    historyChangedFiles = lines(
      run("git", ["diff", "--name-only", repository.routeCommit, repository.groundTruthCommit, "--"], { cwd: root }).stdout
    );
    if (!sameValues(historyChangedFiles, repository.changedFiles)) {
      failures.push("real Git-history diff no longer matches the frozen changed-file oracle");
    }
  }

  const trials = [];
  for (let trial = 1; trial <= repetitions; trial += 1) {
    let evaluation;
    let evaluationElapsedMs = null;
    let failedPhase = "evaluate";
    try {
      const evaluationStartedAt = performance.now();
      const evaluationResult = runNode([
        cliPath,
        "evaluate",
        repository.task,
        ...repository.changedFiles.flatMap((file) => ["--changed-file", file]),
        "--budget",
        String(budget),
        "--route-limit",
        String(routeLimit),
        "--max-drawers",
        String(maxDrawers),
        "--json"
      ], { cwd: root, timeout: 180_000 });
      evaluationElapsedMs = Math.round(performance.now() - evaluationStartedAt);
      evaluation = parseJsonOutput(evaluationResult.stdout, `${repository.name} trial ${trial} evaluate`);

      failedPhase = "context";
      const contextStartedAt = performance.now();
      const contextResult = runNode([
        cliPath,
        "context",
        repository.task,
        "--auto",
        "--format",
        "json",
        "--budget",
        String(budget),
        "--route-limit",
        String(routeLimit),
        "--max-drawers",
        String(maxDrawers)
      ], { cwd: root, timeout: 180_000 });
      const contextElapsedMs = Math.round(performance.now() - contextStartedAt);
      const context = parseJsonOutput(contextResult.stdout, `${repository.name} trial ${trial} context`);

      const routeFiles = unique(evaluation.route.files.map(stripLocation));
      const accepted = new Set(repository.acceptedRouteFiles);
      const acceptedRoutePrecision = routeFiles.length
        ? round(routeFiles.filter((file) => accepted.has(file)).length / routeFiles.length)
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
        evaluationCacheState: trial === 1
          ? (repository.firstEvaluationCacheState ?? "cold-index")
          : "warm-index",
        contextCacheState: "warm-index-after-evaluation",
        evaluationElapsedMs,
        contextElapsedMs,
        mode: context.mode,
        taskType: evaluation.taskType,
        routeFiles,
        routeFileCount: routeFiles.length,
        changedFileCoverage: evaluation.coverage.changedFileCoverage,
        routeFocus: evaluation.coverage.routeFocus,
        routeConfidence: evaluation.route.confidence,
        calibration: evaluation.calibration,
        acceptedRoutePrecision,
        unexpectedRouteFiles: routeFiles.filter((file) => !accepted.has(file)),
        contextEstimatedTokens: context.payload.contextEstimatedTokens,
        contextBytes: context.payload.contextBytes,
        selectedExcludedOverlap
      });
    } catch (error) {
      const routeFiles = unique(evaluation?.route?.files?.map(stripLocation) ?? []);
      trials.push({
        trial,
        status: "execution-error",
        evaluationCacheState: trial === 1
          ? (repository.firstEvaluationCacheState ?? "cold-index")
          : "warm-index",
        contextCacheState: failedPhase === "context" ? "warm-index-after-evaluation" : "not-observed",
        failedPhase,
        evaluationElapsedMs,
        routeFiles,
        routeFileCount: routeFiles.length,
        changedFileCoverage: evaluation?.coverage?.changedFileCoverage ?? null,
        routeFocus: evaluation?.coverage?.routeFocus ?? null,
        routeConfidence: evaluation?.route?.confidence ?? null,
        calibration: evaluation?.calibration ?? null,
        error: summarizeError(error)
      });
      failures.push(`trial ${trial} ${failedPhase} execution failed`);
    }
  }

  const completedTrials = trials.filter((trial) => trial.status === "completed");
  const first = completedTrials[0];
  const deterministicRoutes = completedTrials.length === repetitions
    && completedTrials.every((trial) => sameValues(trial.routeFiles, first.routeFiles));
  if (completedTrials.length !== repetitions) failures.push("not all preregistered trials completed");
  if (!deterministicRoutes) failures.push("route files differed across repetitions");
  if (completedTrials.some((trial) => trial.changedFileCoverage !== 1)) failures.push("changed-file coverage fell below 1.00");
  if (completedTrials.some((trial) => trial.acceptedRoutePrecision !== 1)) failures.push("route crossed the frozen accepted-file boundary");
  if (repository.minimumRouteFocus !== undefined
    && completedTrials.some((trial) => trial.routeFocus < repository.minimumRouteFocus)) {
    failures.push(`route focus fell below ${repository.minimumRouteFocus.toFixed(2)}`);
  }
  if (repository.maximumRouteFiles !== undefined
    && completedTrials.some((trial) => trial.routeFileCount > repository.maximumRouteFiles)) {
    failures.push(`route exceeded ${repository.maximumRouteFiles} files`);
  }
  if (completedTrials.some((trial) => trial.calibration.status === "overconfident")) failures.push("route was overconfident against observed coverage");
  if (completedTrials.some((trial) => trial.contextEstimatedTokens > budget)) failures.push("context payload exceeded the 6000-token ceiling");
  if (completedTrials.some((trial) => trial.selectedExcludedOverlap.length)) failures.push("selected and excluded boundaries overlapped");
  const trackedStatus = run("git", ["status", "--short", "--untracked-files=no"], { cwd: root }).stdout.trim();
  if (trackedStatus) failures.push("Palace modified tracked repository files");

  return {
    name: repository.name,
    language: repository.language,
    url: repository.url,
    routeCommit: repository.routeCommit,
    groundTruthCommit: repository.groundTruthCommit ?? null,
    oracleSource: repository.oracleSource,
    changedFiles: repository.changedFiles,
    historyChangedFiles: historyChangedFiles ?? null,
    acceptedRouteFiles: repository.acceptedRouteFiles,
    status: failures.length ? "failed" : "passed",
    failures,
    deterministicRoutes,
    trackedWorktreeClean: trackedStatus === "",
    trials
  };
}

function aggregate(reports) {
  const trials = reports.flatMap((repository) => repository.trials);
  const completedTrials = trials.filter((trial) => trial.status === "completed");
  const firstCompletedTrials = reports
    .map((repository) => repository.trials.find((trial) => trial.status === "completed"))
    .filter(Boolean);
  return {
    repositories: reports.length,
    trials: trials.length,
    completedTrials: completedTrials.length,
    passedRepositories: reports.filter((repository) => repository.status === "passed").length,
    macroChangedFileCoverage: averageOrNull(firstCompletedTrials.map((trial) => trial.changedFileCoverage)),
    macroRouteFocus: averageOrNull(firstCompletedTrials.map((trial) => trial.routeFocus)),
    macroAcceptedRoutePrecision: averageOrNull(firstCompletedTrials.map((trial) => trial.acceptedRoutePrecision)),
    overconfidentTrials: completedTrials.filter((trial) => trial.calibration.status === "overconfident").length,
    maxContextEstimatedTokens: completedTrials.length
      ? Math.max(...completedTrials.map((trial) => trial.contextEstimatedTokens))
      : null
  };
}

function repositoryExecutionFailure(repository, error) {
  return {
    name: repository.name,
    language: repository.language,
    url: repository.url,
    routeCommit: repository.routeCommit,
    groundTruthCommit: repository.groundTruthCommit ?? null,
    oracleSource: repository.oracleSource,
    changedFiles: repository.changedFiles,
    historyChangedFiles: null,
    acceptedRouteFiles: repository.acceptedRouteFiles,
    status: "failed",
    failures: ["repository setup or validation execution failed"],
    executionError: summarizeError(error),
    deterministicRoutes: false,
    trackedWorktreeClean: null,
    trials: []
  };
}

function selfAuditExecutionFailure(error) {
  return {
    repositoryCommit: candidateCommit,
    status: "failed",
    failures: ["self-audit setup or validation execution failed"],
    executionError: summarizeError(error),
    statusAfterExplicitIndex: null,
    generatedArtifactFixture: null,
    trackedWorktreeClean: null,
    aggregate: aggregate([]),
    targets: []
  };
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  assert.ok(index >= 0, "--out is required so the first observation cannot be lost.");
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

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageOrNull(values) {
  return values.length ? round(average(values)) : null;
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
    shell: false,
    windowsHide: true,
    maxBuffer: 50 * 1024 * 1024,
    timeout: options.timeout ?? 120_000
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error([
      `Command failed (${result.status}): ${command} ${args.join(" ")}`,
      result.stdout,
      result.stderr
    ].filter(Boolean).join("\n"));
  }
  return { stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}
