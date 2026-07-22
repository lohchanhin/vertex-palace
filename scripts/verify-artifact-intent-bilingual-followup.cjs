const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { copyFile, mkdir, mkdtemp, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const cliPath = path.join(projectRoot, "dist", "palace.cjs");
const outputPath = outputArgument(process.argv.slice(2));
const candidateCommit = "0b6a0fd92f43a74c983663cd32f937087e3ec923";
const budget = 6_000;
const routeLimit = 9;
const maxDrawers = 4;
const repetitions = 2;

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
    kind: "external-seen-regression",
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
    oracleSource: "previously frozen target-file replication",
    expectedCoverage: 1,
    minimumAcceptedRoutePrecision: 1
  },
  {
    name: "requests",
    kind: "external-seen-regression",
    language: "Python",
    url: "https://github.com/psf/requests.git",
    routeCommit: "f361ead047be5cb873174218582f7d8b9fcd9f49",
    task: "Fix redirect authorization handling so credentials are preserved for same-host default-port redirects and HTTP-to-HTTPS upgrades, but stripped on host, downgrade, or nonstandard port changes. Update the focused regression tests.",
    changedFiles: ["src/requests/sessions.py", "tests/test_requests.py"],
    acceptedRouteFiles: ["src/requests/sessions.py", "tests/test_requests.py"],
    oracleSource: "previously frozen target-file replication",
    expectedCoverage: 1,
    minimumAcceptedRoutePrecision: 1
  },
  {
    name: "p-limit",
    kind: "external-seen-regression",
    language: "JavaScript with TypeScript declarations",
    url: "https://github.com/sindresorhus/p-limit.git",
    routeCommit: "c944e4a4363ff41a7202d5dec346cc174c3ecf49",
    groundTruthCommit: "ccb80b2721a6a4a27ce5ad7721fe939162a35b31",
    task: "Fix the overly permissive public limitFunction type. It currently accepts synchronous functions even though limiting synchronous execution has no effect. Restrict it to asynchronous functions, preserve inferred argument and return types, and add focused compile-time regression coverage using the repository's existing type-test setup.",
    changedFiles: ["index.d.ts", "index.test-d.ts"],
    acceptedRouteFiles: ["index.d.ts", "index.test-d.ts", "package.json"],
    oracleSource: "real Git-history diff",
    expectedCoverage: 1,
    minimumAcceptedRoutePrecision: 1
  }
];

const oldFamilyFiles = [
  "scripts/verify-route-precision-cross-repositories.cjs",
  "docs/research/CROSS_REPOSITORY_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md",
  "docs/zh-CN/CROSS_REPOSITORY_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md",
  "docs/research/evidence/cross-repository-route-precision-0.4-alpha.json",
  "docs/research/CROSS_REPOSITORY_ROUTE_PRECISION_RESULT_0_4_ALPHA.md",
  "docs/zh-CN/CROSS_REPOSITORY_ROUTE_PRECISION_RESULT_0_4_ALPHA.md"
];

const recursiveFamilyFiles = [
  "scripts/verify-route-precision-after-self-audit.cjs",
  "docs/research/ROUTE_PRECISION_AFTER_SELF_AUDIT_PROTOCOL_0_4_ALPHA.md",
  "docs/zh-CN/ROUTE_PRECISION_AFTER_SELF_AUDIT_PROTOCOL_0_4_ALPHA.md",
  "docs/research/evidence/route-precision-after-self-audit-0.4-alpha.json",
  "docs/research/ROUTE_PRECISION_AFTER_SELF_AUDIT_RESULT_0_4_ALPHA.md",
  "docs/zh-CN/ROUTE_PRECISION_AFTER_SELF_AUDIT_RESULT_0_4_ALPHA.md"
];

const compoundProductFiles = [
  "packages/core/src/router/analyze-task.ts",
  "packages/core/src/router/route-planner.ts",
  "packages/core/src/router/route-scorer.ts",
  "packages/core/src/storage/status.ts",
  "packages/core/test/router.test.ts",
  "packages/core/test/context.test.ts",
  "plugins/vertex-palace/mcp/server.cjs"
];

const releaseVocabularyFiles = [
  "packages/core/src/router/classify-task.ts",
  "packages/core/src/router/publication-intent.ts",
  "packages/core/src/router/route-planner.ts",
  "packages/core/src/router/route-scorer.ts",
  "packages/core/test/router.test.ts",
  "packages/core/test/release-routing.test.ts",
  "plugins/vertex-palace/mcp/server.cjs"
];

const currentProductFiles = [
  "packages/core/src/router/route-planner.ts",
  "packages/core/src/router/route-scorer.ts",
  "packages/core/test/router.test.ts",
  "plugins/vertex-palace/mcp/server.cjs"
];

const missingFamilyFiles = [
  "scripts/verify-route-precision-after-cobalt-harbor.cjs",
  "docs/research/ROUTE_PRECISION_AFTER_COBALT_HARBOR_PROTOCOL_0_4_ALPHA.md",
  "docs/zh-CN/ROUTE_PRECISION_AFTER_COBALT_HARBOR_PROTOCOL_0_4_ALPHA.md",
  "docs/research/evidence/route-precision-after-cobalt-harbor-0.4-alpha.json",
  "docs/research/ROUTE_PRECISION_AFTER_COBALT_HARBOR_RESULT_0_4_ALPHA.md",
  "docs/zh-CN/ROUTE_PRECISION_AFTER_COBALT_HARBOR_RESULT_0_4_ALPHA.md"
];

const candidateTargets = [
  artifactTarget(
    "old-artifact-family-en",
    "English",
    "Freeze and execute a cross-repository route precision replication across Zod, Requests, and p-limit; preserve the first JSON evidence and write English and Simplified Chinese result reports.",
    oldFamilyFiles,
    "frozen original cross-repository artifact family"
  ),
  artifactTarget(
    "old-artifact-family-zh-cn",
    "Simplified Chinese",
    "冻结并执行 Zod、Requests、p-limit 跨仓库路由精度复现实验，保留首份 JSON 证据，并编写英文和简体中文结果报告。",
    oldFamilyFiles,
    "frozen original cross-repository artifact family"
  ),
  artifactTarget(
    "recursive-artifact-family-en",
    "English",
    "Freeze and execute the post-self-audit cross-repository routing regression, preserve the first JSON evidence, and write English and Simplified Chinese protocol and result reports.",
    recursiveFamilyFiles,
    "frozen post-self-audit recursive artifact family"
  ),
  artifactTarget(
    "recursive-artifact-family-zh-cn",
    "Simplified Chinese",
    "冻结并执行 post-self-audit 跨仓库路由回归，保留首份 JSON 证据，并编写英文和简体中文协议与结果报告。",
    recursiveFamilyFiles,
    "frozen post-self-audit recursive artifact family"
  ),
  {
    name: "compound-product-route",
    kind: "candidate-self-audit",
    language: "English",
    url: "local frozen candidate worktree",
    routeCommit: candidateCommit,
    task: "Fix generated-artifact index freshness in storage status and generalize artifact-family task analysis, route planning, and confidence scoring while preserving mixed feature release coverage; add focused router and context regression tests and rebuild the generated MCP bundle.",
    changedFiles: compoundProductFiles,
    acceptedRouteFiles: compoundProductFiles,
    oracleSource: "frozen seven-file compound product repair",
    expectedTaskType: "bugfix",
    expectedCoverage: 1,
    minimumRouteFocus: 1,
    maximumRouteFiles: 7,
    minimumAcceptedRoutePrecision: 1
  },
  {
    name: "release-vocabulary-product-route",
    kind: "candidate-self-audit",
    language: "English",
    url: "local frozen candidate worktree",
    routeCommit: candidateCommit,
    task: "Fix release-vocabulary action classification and publication intent so a mixed feature release mention does not override recursive artifact-family route planning and confidence scoring; add focused router and release-routing regressions and rebuild the generated MCP bundle.",
    changedFiles: releaseVocabularyFiles,
    acceptedRouteFiles: releaseVocabularyFiles,
    oracleSource: "frozen seven-file release-vocabulary product repair",
    expectedTaskType: "bugfix",
    expectedCoverage: 1,
    minimumRouteFocus: 1,
    maximumRouteFiles: 7,
    minimumAcceptedRoutePrecision: 1
  },
  {
    name: "current-named-artifact-product-repair",
    kind: "candidate-self-audit",
    language: "English",
    url: "local frozen candidate worktree",
    routeCommit: candidateCommit,
    task: "Fix the Simplified Chinese recursive artifact-family route so the explicit post-self-audit identity outranks a derived cross-repository scope entity, cap confidence for a missing Chinese family, preserve English and product regressions, and rebuild the generated MCP bundle.",
    changedFiles: currentProductFiles,
    acceptedRouteFiles: currentProductFiles,
    oracleSource: "frozen four-file named-artifact product repair",
    expectedTaskType: "bugfix",
    expectedCoverage: 1,
    minimumRouteFocus: 1,
    maximumRouteFiles: 4,
    minimumAcceptedRoutePrecision: 1
  },
  {
    name: "missing-artifact-family-confidence-cap-en",
    kind: "negative-control",
    language: "English",
    url: "local frozen candidate worktree",
    routeCommit: candidateCommit,
    task: "Freeze and execute the post-cobalt-harbor cross-platform routing regression; preserve the first JSON evidence and write English and Simplified Chinese protocol and result reports.",
    changedFiles: missingFamilyFiles,
    acceptedRouteFiles: [...oldFamilyFiles, "tsconfig.base.json"],
    oracleSource: "synthetic nonexistent artifact family negative control",
    expectedTaskType: "evaluation",
    expectedCoverage: 0,
    maximumConfidence: 0.15,
    maximumRouteFiles: 7,
    minimumAcceptedRoutePrecision: 1
  },
  {
    name: "missing-artifact-family-confidence-cap-zh-cn",
    kind: "negative-control",
    language: "Simplified Chinese",
    url: "local frozen candidate worktree",
    routeCommit: candidateCommit,
    task: "冻结并执行 post-cobalt-harbor 跨仓库路由回归，保留首份 JSON 证据，并编写英文和简体中文协议与结果报告。",
    changedFiles: missingFamilyFiles,
    acceptedRouteFiles: [...oldFamilyFiles, "tsconfig.base.json"],
    oracleSource: "synthetic nonexistent artifact family negative control",
    expectedTaskType: "evaluation",
    expectedCoverage: 0,
    maximumConfidence: 0.15,
    maximumRouteFiles: 7,
    minimumAcceptedRoutePrecision: 1
  }
];

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  assertFrozenCandidate();
  runNpm(["run", "build"], { cwd: projectRoot, timeout: 180_000 });
  assertFrozenCandidate();

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-artifact-intent-followup-"));
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
        repositoryReports.push(await validateTarget(repository, repositoryRoot));
      } catch (error) {
        repositoryReports.push(targetExecutionFailure(repository, error));
      }
    }

    let candidateAudit;
    const candidateRoot = path.join(temporaryRoot, "vertex-palace-candidate");
    try {
      await cloneCandidateRepository(candidateRoot);
      candidateAudit = await validateCandidateAudit(candidateRoot);
    } catch (error) {
      candidateAudit = candidateAuditExecutionFailure(error);
    }

    const failures = repositoryReports.flatMap((target) =>
      target.failures.map((failure) => `${target.name}: ${failure}`)
    ).concat(candidateAudit.failures.map((failure) => `candidate-audit: ${failure}`));
    report = {
      schemaVersion: 1,
      studyId: "artifact-intent-bilingual-followup-0.4-alpha",
      generatedAt: new Date().toISOString(),
      claimBoundary: "Preregistered seen-target static routing regression and candidate self-audit only; not held-out and not an end-to-end Agent performance benchmark.",
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
        externalRepositorySet: "previously used replication targets",
        candidateTargetSet: "previously observed artifact families, compound repairs, the current named-artifact product repair, and bilingual negative controls",
        heldOut: false,
        selectionLockedBeforeFirstFormalRun: true,
        outputCreateOnly: true,
        budget,
        routeLimit,
        maxDrawers,
        repetitions,
        gates: {
          deterministicRoutes: true,
          expectedChangedFileCoverage: true,
          acceptedRoutePrecisionAtLeast: 1,
          overconfidentRoutes: 0,
          contextWithinBudget: true,
          trackedWorktreeClean: true,
          candidateFreshAfterExplicitIndex: true,
          artifactFamilyFocusAtLeast: 0.85,
          productRouteFocus: 1,
          missingFamilyConfidenceAtMost: 0.15
        }
      },
      externalAggregate: aggregate(repositoryReports),
      repositories: repositoryReports,
      candidateAudit
    };

    const serialized = `${JSON.stringify(report, null, 2)}\n`;
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serialized, { encoding: "utf8", flag: "wx" });
    process.stdout.write(serialized);
  } finally {
    if (process.env.KEEP_ARTIFACT_INTENT_FOLLOWUP_TEMP === "1") {
      process.stderr.write(`Kept artifact-intent follow-up data at ${temporaryRoot}\n`);
    } else {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }

  if (report?.status !== "passed") process.exitCode = 1;
}

function artifactTarget(name, language, task, changedFiles, oracleSource) {
  return {
    name,
    kind: "candidate-self-audit",
    language,
    url: "local frozen candidate worktree",
    routeCommit: candidateCommit,
    task,
    changedFiles,
    acceptedRouteFiles: [...changedFiles, "tsconfig.base.json"],
    oracleSource,
    expectedTaskType: "evaluation",
    expectedCoverage: 1,
    minimumRouteFocus: 0.85,
    maximumRouteFiles: 7,
    minimumAcceptedRoutePrecision: 1
  };
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

async function validateCandidateAudit(root) {
  runNode([cliPath, "init"], { cwd: root, timeout: 180_000 });
  runNode([cliPath, "index"], { cwd: root, timeout: 180_000 });
  const statusAfterExplicitIndex = parseJsonOutput(
    runNode([cliPath, "status"], { cwd: root, timeout: 180_000 }).stdout,
    "candidate status after explicit index"
  );
  const targets = [];
  for (const target of candidateTargets) {
    targets.push(await validateTarget(target, root));
  }
  const failures = targets.flatMap((target) =>
    target.failures.map((failure) => `${target.name}: ${failure}`)
  );
  if (statusAfterExplicitIndex.stale !== false) {
    failures.push("status was stale immediately after indexing a declared generated artifact");
  }
  const trackedStatus = run("git", ["status", "--short", "--untracked-files=no"], { cwd: root }).stdout.trim();
  if (trackedStatus) failures.push("candidate audit modified tracked product files");
  return {
    repositoryCommit: candidateCommit,
    status: failures.length ? "failed" : "passed",
    failures,
    statusAfterExplicitIndex,
    generatedArtifactFixture: "dist/palace.cjs copied from the frozen candidate build",
    trackedWorktreeClean: trackedStatus === "",
    aggregate: aggregate(targets),
    targets
  };
}

async function validateTarget(target, root) {
  const failures = [];
  let historyChangedFiles;
  if (target.groundTruthCommit) {
    historyChangedFiles = lines(
      run("git", ["diff", "--name-only", target.routeCommit, target.groundTruthCommit, "--"], { cwd: root }).stdout
    );
    if (!sameValues(historyChangedFiles, target.changedFiles)) {
      failures.push("real Git-history diff no longer matches the frozen changed-file oracle");
    }
  }

  const trials = [];
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
      const accepted = new Set(target.acceptedRouteFiles);
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
        evaluationCacheState: trial === 1 ? "cold-or-explicitly-indexed" : "warm-index",
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
  if (completed.some((trial) => trial.changedFileCoverage !== target.expectedCoverage)) {
    failures.push(`changed-file coverage differed from ${target.expectedCoverage.toFixed(2)}`);
  }
  if (target.expectedTaskType && completed.some((trial) => trial.taskType !== target.expectedTaskType)) {
    failures.push(`task type differed from ${target.expectedTaskType}`);
  }
  if (target.minimumAcceptedRoutePrecision !== undefined
    && completed.some((trial) => trial.acceptedRoutePrecision < target.minimumAcceptedRoutePrecision)) {
    failures.push(`accepted-route precision fell below ${target.minimumAcceptedRoutePrecision.toFixed(2)}`);
  }
  if (target.minimumRouteFocus !== undefined
    && completed.some((trial) => trial.routeFocus < target.minimumRouteFocus)) {
    failures.push(`route focus fell below ${target.minimumRouteFocus.toFixed(2)}`);
  }
  if (target.maximumRouteFiles !== undefined
    && completed.some((trial) => trial.routeFileCount > target.maximumRouteFiles)) {
    failures.push(`route exceeded ${target.maximumRouteFiles} files`);
  }
  if (target.maximumConfidence !== undefined
    && completed.some((trial) => trial.routeConfidence > target.maximumConfidence)) {
    failures.push(`route confidence exceeded ${target.maximumConfidence.toFixed(2)}`);
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
  const trackedStatus = run("git", ["status", "--short", "--untracked-files=no"], { cwd: root }).stdout.trim();
  if (trackedStatus) failures.push("Palace modified tracked repository files");

  return {
    name: target.name,
    kind: target.kind,
    language: target.language,
    url: target.url,
    routeCommit: target.routeCommit,
    groundTruthCommit: target.groundTruthCommit ?? null,
    oracleSource: target.oracleSource,
    task: target.task,
    changedFiles: target.changedFiles,
    historyChangedFiles: historyChangedFiles ?? null,
    acceptedRouteFiles: target.acceptedRouteFiles,
    gates: {
      expectedTaskType: target.expectedTaskType ?? null,
      expectedCoverage: target.expectedCoverage,
      minimumRouteFocus: target.minimumRouteFocus ?? null,
      maximumRouteFiles: target.maximumRouteFiles ?? null,
      minimumAcceptedRoutePrecision: target.minimumAcceptedRoutePrecision ?? null,
      maximumConfidence: target.maximumConfidence ?? null
    },
    status: failures.length ? "failed" : "passed",
    failures,
    deterministicRoutes,
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
    trials: trials.length,
    completedTrials: completed.length,
    passedTargets: targets.filter((target) => target.status === "passed").length,
    macroChangedFileCoverage: averageOrNull(firstCompleted.map((trial) => trial.changedFileCoverage)),
    macroRouteFocus: averageOrNull(firstCompleted.map((trial) => trial.routeFocus)),
    macroAcceptedRoutePrecision: averageOrNull(firstCompleted.map((trial) => trial.acceptedRoutePrecision)),
    overconfidentTrials: completed.filter((trial) => trial.calibration.status === "overconfident").length,
    maxContextEstimatedTokens: completed.length
      ? Math.max(...completed.map((trial) => trial.contextEstimatedTokens))
      : null
  };
}

function targetExecutionFailure(target, error) {
  return {
    name: target.name,
    kind: target.kind,
    language: target.language,
    url: target.url,
    routeCommit: target.routeCommit,
    groundTruthCommit: target.groundTruthCommit ?? null,
    oracleSource: target.oracleSource,
    task: target.task,
    changedFiles: target.changedFiles,
    historyChangedFiles: null,
    acceptedRouteFiles: target.acceptedRouteFiles,
    gates: null,
    status: "failed",
    failures: ["target setup or validation execution failed"],
    executionError: summarizeError(error),
    deterministicRoutes: false,
    trackedWorktreeClean: null,
    trials: []
  };
}

function candidateAuditExecutionFailure(error) {
  return {
    repositoryCommit: candidateCommit,
    status: "failed",
    failures: ["candidate audit setup or validation execution failed"],
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
