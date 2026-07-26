const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdir, mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { normalizeContextTelemetry } = require("./lib/context-telemetry.cjs");
const { classifyTaskType } = require("./lib/commit-task-classifier.cjs");

const projectRoot = path.resolve(__dirname, "..");
const candidateCliPath = path.join(projectRoot, "dist", "palace.cjs");
const manifestRelativePath = "docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-8.json";
const manifestPath = path.join(projectRoot, manifestRelativePath);
const originalResultRelativePath = "docs/research/evidence/held-out-confidence-calibration-0.4-alpha-round-8.json";
const originalResultPath = path.join(projectRoot, originalResultRelativePath);
const priorResultRelativePath = "docs/research/evidence/disclosed-round-8-after-condition-repository-repair-0.4-alpha.json";
const priorResultPath = path.join(projectRoot, priorResultRelativePath);
const outputPath = require.main === module ? outputArgument(process.argv.slice(2)) : null;
const studyId = "disclosed-round-8-sqlalchemy-timeout-completion-0.4-alpha";
const candidateCommit = "1a02d89269acb36473db3ad39badab9fe338a4a3";
const candidateCliSha256 = "49F44D09551222A2CB8D3BEEDBDA4E374A507C30DCA681D4D9CC0E57C6DB7747";
const baselineCommit = "228c3bde47f6930023496fdd0a54d43dba10091f";
const baselineCliSha256 = "E81774B89C3A6FAED83788335688EFCBC8B4D17DEA25CA002097FF1F9125318F";
const selectorCommit = "56c006f36b1b83f1b5756d071ce6f0f3dcdd57e5";
const manifestCommit = "93d9ae52ceb68f65dc69ec76cee96e8e752eb84a";
const manifestSha256 = "6678CE22935F938593C9F950636795E3295D18C9AC57D1C1E7A068B145214466";
const repositoryPoolSha256 = "118644384D9E099E0833E36900ED5A7E10648827FF4C2DE5AF40CE11A0018158";
const taskClassifierSha256 = "C3D787029C019FD64BFB079913F23B58082C38560448A9B9567954ECA9FE1254";
const originalResultCommit = "ea3504b770b26bae1ceeb684efe835ad72b0c66e";
const originalResultSha256 = "F8779C649DCA4350B4E22FBF3E423047371F74F03F6EFB6E3356C2B81083B733";
const priorResultCommit = "9eb29b4cdb639ccbb8db11df070fedb6498c49e6";
const priorResultSha256 = "E6216E3F6F43BFC3CD42A2B5E640777349B1977250BB43A159AC5155FFF3A23D";
const manifestTargetCount = 8;
const targetCount = 1;
const completionTargetName = "sqlalchemy";
const completionManifestIndex = 1;
const budget = 6_000;
const routeLimit = 9;
const maxDrawers = 4;
const repetitions = 2;
const materializationAttempts = 3;
const freshIndexAttempts = 1;
const freshIndexTimeoutMs = 900_000;
const retryDelayMs = 5_000;
const transientExecutionCodes = new Set(["EAGAIN", "ENOMEM", "ETIMEDOUT"]);
const minimumMacroCoverage = 0.90;
const minimumMacroFocus = 0.75;
const minimumMacroPrecision = 0.75;
const minimumTargetFocus = 0.50;
const minimumTargetPrecision = 0.50;
const requiredAuxiliarySurfaceCoverage = 1;
const calibrationTolerance = 0.15;
const conditionIds = ["baseline", "candidate"];
const narrowModes = new Set(["bypass", "route-lite"]);

const frozenCandidatePaths = [
  "packages",
  "plugins/vertex-palace/mcp/server.cjs"
];

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}

async function main() {
  const manifest = await assertFrozenInputs();
  assertCleanTrackedCandidate("before measurement");

  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "vertex-palace-disclosed-sqlalchemy-completion-round-8-")
  );
  assertInsideTemporaryRoot(temporaryRoot);

  let report;
  try {
    const baselineBuild = await buildBaselineCli(temporaryRoot);
    const conditions = {
      baseline: {
        id: "baseline",
        role: "pre-independent-anchor-confidence-cap",
        productCommit: baselineCommit,
        cliPath: baselineBuild.cliPath,
        cliSha256: baselineCliSha256
      },
      candidate: {
        id: "candidate",
        role: "independent-anchor-confidence-cap",
        productCommit: candidateCommit,
        cliPath: candidateCliPath,
        cliSha256: candidateCliSha256
      }
    };
    const targets = [];
    const completionTarget = manifest.targets[completionManifestIndex];
    assert.equal(completionTarget.name, completionTargetName);
    for (const [targetIndex, target] of [[completionManifestIndex, completionTarget]]) {
      const targetContainer = path.join(temporaryRoot, target.name);
      const sourceRoot = path.join(targetContainer, "source");
      const materialization = await materializeTarget(target, sourceRoot, temporaryRoot);
      if (!materialization.completed) {
        targets.push(pairedTargetExecutionFailure(
          target,
          "environment-or-setup",
          "target materialization failed before Palace execution",
          materialization.error,
          { materializationAttempts: materialization.attempts }
        ));
        continue;
      }

      try {
        verifyPinnedTarget(target, sourceRoot);
      } catch (error) {
        targets.push(pairedTargetExecutionFailure(
          target,
          "harness-contract",
          "manifest or Git oracle verification failed",
          error,
          { materializationAttempts: materialization.attempts }
        ));
        continue;
      }

      try {
        targets.push(await validatePairedTarget(
          target,
          targetContainer,
          sourceRoot,
          materialization.attempts,
          conditions,
          targetIndex
        ));
      } catch (error) {
        targets.push(pairedTargetExecutionFailure(
          target,
          error.environmentFailure ? "environment-or-setup" : "product-or-contract",
          "paired target validation failed before both conditions were recorded",
          error,
          {
            materializationAttempts: materialization.attempts,
            freshIndexAttempts: error.executionAttempts || []
          }
        ));
      }
    }

    const aggregateResult = {
      baseline: aggregateCondition(targets, "baseline"),
      candidate: aggregateCondition(targets, "candidate")
    };
    const comparison = compareConditions(targets, aggregateResult);
    const baselineGateFailures = conditionGateFailures(aggregateResult.baseline);
    const candidateGateFailures = conditionGateFailures(aggregateResult.candidate);
    const validityFailures = studyValidityFailures(targets, aggregateResult);

    report = {
      schemaVersion: 4,
      studyId,
      generatedAt: new Date().toISOString(),
      status: validityFailures.length ? "invalid" : "completed",
      validityFailures,
      candidateGateStatus: candidateGateFailures.length ? "failed" : "passed",
      candidateGateFailures,
      baselineGateStatus: baselineGateFailures.length ? "failed" : "passed",
      baselineGateFailures,
      claimBoundary: "Disclosed SQLAlchemy-only environment completion for the Round 8 paired static-routing and confidence-calibration study. The first invalid result and the seven-pair condition-repair result remain immutable. Only the SQLAlchemy explicit-index ceiling changes from two 300-second attempts to one 900-second attempt; neither product, task, original condition order, oracle, metric, tolerance, nor gate changes, and the seven completed targets are not rerun. This result does not execute target tests or an Agent and cannot support Agent correctness, reported Token, tool-call, or wall-time claims.",
      heldOutAgainstCandidate: true,
      evidenceClass: "disclosed-environment-completion-candidate-held-out-paired-static-calibration",
      originalInvalidResult: {
        path: originalResultRelativePath,
        commit: originalResultCommit,
        sha256: originalResultSha256,
        status: "invalid",
        completedFormalTrials: 0,
        palaceCallsOnSelectedTasks: 0,
        preservedWithoutModification: true
      },
      priorConditionRepairResult: {
        path: priorResultRelativePath,
        commit: priorResultCommit,
        sha256: priorResultSha256,
        status: "invalid",
        completedPairedTargets: 7,
        baselineCompletedFormalTrials: 14,
        candidateCompletedFormalTrials: 14,
        missingTarget: completionTargetName,
        preservedWithoutModification: true
      },
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
      comparisonBaseline: {
        productCommit: baselineCommit,
        role: "pre-independent-anchor-confidence-cap",
        cliPath: "temporary detached local clone/dist/palace.cjs",
        cliSha256: baselineCliSha256,
        rebuiltBeforeMeasurement: true,
        buildNetworkPolicy: "offline",
        build: {
          elapsedMs: baselineBuild.elapsedMs,
          pnpmVersion: baselineBuild.pnpmVersion,
          installArguments: baselineBuild.installArguments,
          buildArguments: baselineBuild.buildArguments,
          installLogSha256: baselineBuild.installLogSha256,
          buildLogSha256: baselineBuild.buildLogSha256,
          trackedGeneratedOutputs: baselineBuild.trackedGeneratedOutputs,
          packagesSourceUnchanged: baselineBuild.packagesSourceUnchanged,
          hashVerified: true
        }
      },
      targetSelection: {
        manifestPath: manifestRelativePath,
        manifestCommit,
        manifestSha256,
        selectorCommit,
        repositoryPoolSha256,
        palaceCallsOnCandidateTasksDuringSelection:
          manifest.rules.palaceCallsOnCandidateTasksDuringSelection,
        originalManifestTargetCount: manifest.targets.length,
        completionTargetCount: targetCount,
        completionManifestIndex,
        completionTargets: [completionTarget.name],
        languageFamilies: [completionTarget.languageFamily]
      },
      taskTypeOracle: {
        timing: "Derived mechanically during target selection and frozen in the manifest before any Palace call.",
        rule: "inflected-behavioral-subject-v1: Conventional fix/feat and tested base or inflected behavioral prefixes map mechanically to bugfix or feature.",
        classifierPath: "scripts/lib/commit-task-classifier.cjs",
        classifierSha256: taskClassifierSha256,
        replacementRule: "No target may be removed, replaced, rewritten, or rerouted after observation."
      },
      oracleLimitations: {
        source: "Complete modified-file Git diff selected by the preregistered task, path, source, focused-test, and bounded auxiliary-surface rules.",
        focusedTestClassification: "Test roles are derived from paths. A file under a test tree can be a helper, mock, or fixture rather than an assertion file.",
        auxiliaryClassification: "Documentation and configuration roles are derived from bounded extensions and exact basenames, not semantic inspection.",
        targetTestsExecuted: false
      },
      environment: {
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        npm: runNpm(["--version"], { cwd: projectRoot }).stdout.trim(),
        pnpm: runPnpm(["--version"], { cwd: projectRoot }).stdout.trim(),
        git: run("git", ["--version"], { cwd: projectRoot }).stdout.trim()
      },
      protocol: {
        repairScope: "Only the SQLAlchemy environment timeout is completed. Its explicit-index policy changes from two 300-second attempts per condition to one 900-second attempt per condition. The seven targets with completed paired observations are not rerun; no product or measurement rule changes.",
        conditions: conditionIds,
        paired: true,
        balancedDeterministicOrder: false,
        orderRule: "Preserve original manifest index 1: candidate then baseline.",
        freshPalacePerCondition: true,
        separateRepositoryClonePerCondition: true,
        repetitions,
        formalTrialsPerCondition: targetCount * repetitions,
        totalFormalTrials: targetCount * repetitions * conditionIds.length,
        sequential: true,
        concurrent: false,
        budget,
        routeLimit,
        maxDrawers,
        materializationAttempts,
        freshIndexAttempts,
        freshIndexTimeoutMs,
        retryDelayMs,
        transientExecutionCodes: [...transientExecutionCodes],
        evaluateAndContextRetries: 0,
        calibrationTolerance,
        repetitionsAreDeterminismChecksNotIndependentSamples: true,
        outputCreateOnly: true,
        gates: {
          completedTargetsPerCondition: targetCount,
          completedTrialsPerCondition: targetCount * repetitions,
          coreImplementationAndTestCoveragePerTarget: 1,
          auxiliarySurfaceCoveragePerApplicableTarget: requiredAuxiliarySurfaceCoverage,
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
      comparison,
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
      candidateGateStatus: report.candidateGateStatus,
      calibrationFinding: report.comparison.calibrationFinding,
      aggregate: report.aggregate,
      validityFailures: report.validityFailures,
      candidateGateFailures: report.candidateGateFailures
    }, null, 2)}\n`);
  } finally {
    if (process.env.KEEP_DISCLOSED_SQLALCHEMY_COMPLETION_ROUND_8_TEMP === "1") {
      process.stderr.write(`Keeping disclosed Round 8 SQLAlchemy completion repositories at ${temporaryRoot}\n`);
    } else {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }

  if (report?.status === "invalid") process.exitCode = 1;
}

async function assertFrozenInputs() {
  run("git", ["cat-file", "-e", `${candidateCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["cat-file", "-e", `${baselineCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["diff", "--quiet", candidateCommit, "--", ...frozenCandidatePaths], {
    cwd: projectRoot
  });
  assert.equal(await sha256File(candidateCliPath), candidateCliSha256);
  assert.equal(
    await sha256File(path.join(projectRoot, "scripts", "lib", "commit-task-classifier.cjs")),
    taskClassifierSha256
  );
  run("git", ["cat-file", "-e", `${selectorCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["cat-file", "-e", `${manifestCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["cat-file", "-e", `${originalResultCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["cat-file", "-e", `${priorResultCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["diff", "--quiet", manifestCommit, "--", manifestRelativePath], {
    cwd: projectRoot
  });
  run("git", ["diff", "--quiet", originalResultCommit, "--", originalResultRelativePath], {
    cwd: projectRoot
  });
  run("git", ["diff", "--quiet", priorResultCommit, "--", priorResultRelativePath], {
    cwd: projectRoot
  });

  const originalResultBytes = await readFile(originalResultPath);
  assert.equal(
    createHash("sha256").update(originalResultBytes).digest("hex").toUpperCase(),
    originalResultSha256
  );
  const originalResult = JSON.parse(originalResultBytes.toString("utf8"));
  assert.equal(originalResult.status, "invalid");
  assert.equal(originalResult.aggregate.baseline.completedTrials, 0);
  assert.equal(originalResult.aggregate.candidate.completedTrials, 0);

  const priorResultBytes = await readFile(priorResultPath);
  assert.equal(
    createHash("sha256").update(priorResultBytes).digest("hex").toUpperCase(),
    priorResultSha256
  );
  const priorResult = JSON.parse(priorResultBytes.toString("utf8"));
  assert.equal(priorResult.status, "invalid");
  assert.equal(priorResult.aggregate.baseline.completedTrials, 14);
  assert.equal(priorResult.aggregate.candidate.completedTrials, 14);
  assert.equal(priorResult.comparison.completedPairedTargets, 7);
  assert.equal(priorResult.comparison.completedPairedTrials, 14);
  const incompleteTargets = priorResult.targets.filter((target) =>
    conditionIds.some((conditionId) =>
      target.conditions?.[conditionId]?.failureCategory === "environment-or-setup"
    )
  );
  assert.deepEqual(incompleteTargets.map((target) => target.name), [completionTargetName]);
  assert.deepEqual(incompleteTargets[0].conditionOrder, ["candidate", "baseline"]);
  for (const conditionId of conditionIds) {
    const condition = incompleteTargets[0].conditions[conditionId];
    assert.equal(condition.trials.length, 0);
    assert.equal(condition.freshIndexAttempts.length, 2);
    assert.ok(condition.freshIndexAttempts.every((attempt) => attempt.errorCode === "ETIMEDOUT"));
  }

  const bytes = await readFile(manifestPath);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex").toUpperCase(),
    manifestSha256
  );
  const manifest = JSON.parse(bytes.toString("utf8"));
  assert.equal(manifest.schemaVersion, 3);
  assert.equal(manifest.studyId, "held-out-confidence-calibration-round-8-0.4-alpha");
  assert.equal(manifest.status, "selected");
  assert.equal(manifest.heldOutAgainstCandidate, true);
  assert.equal(manifest.candidate.productCommit, candidateCommit);
  assert.equal(manifest.candidate.cliSha256, candidateCliSha256);
  assert.equal(manifest.comparisonBaseline.productCommit, baselineCommit);
  assert.equal(manifest.comparisonBaseline.cliSha256, baselineCliSha256);
  assert.equal(manifest.comparisonBaseline.role, "pre-independent-anchor-confidence-cap");
  assert.equal(manifest.selector.commit, selectorCommit);
  assert.equal(manifest.repositoryPool.sha256, repositoryPoolSha256);
  assert.equal(manifest.targets.length, manifestTargetCount);
  assert.equal(manifest.targets[completionManifestIndex].name, completionTargetName);
  assert.equal(manifest.rules.palaceCallsOnCandidateTasksDuringSelection, 0);
  assert.equal(manifest.rules.languageDiversitySatisfied, true);
  assert.equal(manifest.rules.targetsPerLanguageFamily, 2);
  assert.equal(manifest.rules.taskClassifier, "inflected-behavioral-subject-v1");
  assert.equal(manifest.rules.maximumAuxiliaryFiles, 2);
  assert.equal(manifest.rules.plannedPairedCalibrationComparison, true);
  assert.equal(manifest.rules.baselineAndCandidateFrozenBeforeTargetSelection, true);
  assert.equal(manifest.rules.calibrationTolerance, calibrationTolerance);
  for (const family of manifest.rules.requiredLanguageFamilies) {
    assert.equal(manifest.rules.selectedPerLanguageFamily[family], 2);
  }
  for (const target of manifest.targets) {
    assert.equal(target.expectedTaskType, expectedTaskType(target.task));
    assert.ok(Array.isArray(target.auxiliaryFiles));
    assert.ok(target.auxiliaryFiles.length <= 2);
    assert.deepEqual(
      [...target.changedFiles].sort(),
      [...target.implementationFiles, ...target.testFiles, ...target.auxiliaryFiles].sort()
    );
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

async function buildBaselineCli(temporaryRoot) {
  const baselineRoot = path.join(temporaryRoot, "_baseline-product");
  assertInside(baselineRoot, temporaryRoot);
  const startedAt = performance.now();
  run("git", ["clone", "--quiet", "--shared", "--no-checkout", projectRoot, baselineRoot], {
    cwd: temporaryRoot,
    timeout: 300_000
  });
  run("git", ["-c", "advice.detachedHead=false", "checkout", "--detach", baselineCommit], {
    cwd: baselineRoot,
    timeout: 120_000
  });
  assert.equal(run("git", ["rev-parse", "HEAD"], { cwd: baselineRoot }).stdout.trim(), baselineCommit);

  const installArguments = [
    "--dir", baselineRoot,
    "install",
    "--offline",
    "--frozen-lockfile",
    "--ignore-scripts"
  ];
  const buildArguments = ["--dir", baselineRoot, "build"];
  const installResult = runPnpm(installArguments, { cwd: projectRoot, timeout: 600_000 });
  const buildResult = runPnpm(buildArguments, { cwd: projectRoot, timeout: 600_000 });
  const cliPath = path.join(baselineRoot, "dist", "palace.cjs");
  assert.equal(await sha256File(cliPath), baselineCliSha256);
  run("git", ["diff", "--quiet", baselineCommit, "--", "packages"], { cwd: baselineRoot });
  assert.deepEqual(
    lines(run("git", ["status", "--short", "--untracked-files=no"], {
      cwd: baselineRoot
    }).stdout),
    ["M plugins/vertex-palace/mcp/server.cjs"],
    "Baseline build changed tracked files beyond the known generated MCP bundle."
  );

  return {
    cliPath,
    elapsedMs: Math.round(performance.now() - startedAt),
    pnpmVersion: runPnpm(["--version"], { cwd: projectRoot }).stdout.trim(),
    installArguments: [
      "--dir", "<temporary-baseline-root>",
      "install", "--offline", "--frozen-lockfile", "--ignore-scripts"
    ],
    buildArguments: ["--dir", "<temporary-baseline-root>", "build"],
    trackedGeneratedOutputs: ["plugins/vertex-palace/mcp/server.cjs"],
    packagesSourceUnchanged: true,
    installLogSha256: sha256Text(`${installResult.stdout}\n${installResult.stderr}`),
    buildLogSha256: sha256Text(`${buildResult.stdout}\n${buildResult.stderr}`)
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

async function cloneConditionTarget(target, sourceRoot, conditionRoot, targetContainer) {
  assertInside(conditionRoot, targetContainer);
  await rm(conditionRoot, { recursive: true, force: true });
  run("git", ["update-ref", "refs/vertex-palace/route", target.routeCommit], { cwd: sourceRoot });
  run("git", ["update-ref", "refs/vertex-palace/ground-truth", target.groundTruthCommit], {
    cwd: sourceRoot
  });
  await mkdir(conditionRoot, { recursive: true });
  run("git", ["init", "--quiet"], { cwd: conditionRoot });
  run("git", ["remote", "add", "source", sourceRoot], { cwd: conditionRoot });
  run("git", [
    "fetch",
    "--quiet",
    "--no-tags",
    "--depth=2",
    "source",
    "refs/vertex-palace/route:refs/vertex-palace/route",
    "refs/vertex-palace/ground-truth:refs/vertex-palace/ground-truth"
  ], { cwd: conditionRoot, timeout: 120_000 });
  run("git", [
    "-c",
    "advice.detachedHead=false",
    "checkout",
    "--detach",
    target.routeCommit
  ], { cwd: conditionRoot, timeout: 120_000 });
  verifyPinnedTarget(target, conditionRoot);
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

async function validatePairedTarget(
  target,
  targetContainer,
  sourceRoot,
  materializationAttemptLog,
  conditions,
  targetIndex
) {
  const conditionOrder = conditionOrderForIndex(targetIndex);
  const conditionResults = {};

  for (const conditionId of conditionOrder) {
    const condition = conditions[conditionId];
    const conditionRoot = path.join(targetContainer, conditionId);
    let failedPhase = "condition-repository-setup";
    try {
      await cloneConditionTarget(target, sourceRoot, conditionRoot, targetContainer);
      failedPhase = "product-execution";
      conditionResults[conditionId] = await validateCondition(target, conditionRoot, condition);
    } catch (error) {
      conditionResults[conditionId] = conditionExecutionFailure(
        condition,
        failedPhase === "condition-repository-setup" || error.environmentFailure
          ? "environment-or-setup"
          : "product-or-contract",
        `${failedPhase} failed before formal trials completed`,
        error,
        { freshIndexAttempts: error.executionAttempts || [] }
      );
    }
  }

  const validityFailures = conditionIds.flatMap((conditionId) => {
    const result = conditionResults[conditionId];
    return result && ["environment-or-setup", "harness-contract"].includes(result.failureCategory)
      ? result.failures.map((failure) => `${conditionId}: ${failure}`)
      : [];
  });

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
    expectedTaskType: target.expectedTaskType,
    changedFiles: target.changedFiles,
    implementationFiles: target.implementationFiles,
    testFiles: target.testFiles,
    auxiliaryFiles: target.auxiliaryFiles,
    testRoleDerivedFromPath: true,
    conditionOrder,
    materializationAttempts: materializationAttemptLog,
    validityFailures,
    conditions: conditionResults
  };
}

async function validateCondition(target, root, condition) {
  const freshIndex = await prepareFreshIndex(target, root, condition);
  const expectedType = target.expectedTaskType;
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
      ], { cwd: root, timeout: 300_000 }).stdout, `${target.name} ${condition.id} trial ${trial} evaluate`);
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
      ], { cwd: root, timeout: 300_000 });
      const context = parseJsonOutput(
        contextResult.stdout,
        `${target.name} ${condition.id} trial ${trial} context`
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
      const missingAuxiliaryFiles = target.auxiliaryFiles.filter(
        (file) => !routeFileSet.has(file)
      );
      const routeOnlyFiles = routeFiles.filter((file) => !changedFileSet.has(file));
      const routePrecision = routeFiles.length
        ? round(routeFiles.filter((file) => changedFileSet.has(file)).length / routeFiles.length)
        : 0;
      const coreFileCount = target.implementationFiles.length + target.testFiles.length;
      const coreSurfaceCoverage = round(
        (coreFileCount - missingImplementationFiles.length - missingTestFiles.length)
          / coreFileCount
      );
      const auxiliarySurfaceCoverage = target.auxiliaryFiles.length
        ? round(
          (target.auxiliaryFiles.length - missingAuxiliaryFiles.length)
            / target.auxiliaryFiles.length
        )
        : null;
      const calibration = independentCalibration(
        evaluation.route.confidence,
        evaluation.coverage.changedFileCoverage
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
        auxiliarySurfaceCoverage,
        missingAuxiliaryFiles,
        routeFocus: evaluation.coverage.routeFocus,
        routePrecision,
        routeConfidence: evaluation.route.confidence,
        calibration,
        reportedCalibration: evaluation.calibration,
        unsafeNarrowMode: narrowModes.has(telemetry.mode)
          && evaluation.coverage.changedFileCoverage < minimumMacroCoverage,
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
        calibration: evaluation?.route && evaluation?.coverage
          ? independentCalibration(
            evaluation.route.confidence,
            evaluation.coverage.changedFileCoverage
          )
          : null,
        reportedCalibration: evaluation?.calibration ?? null,
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
  if (
    target.auxiliaryFiles.length
    && completed.some(
      (trial) => trial.auxiliarySurfaceCoverage !== requiredAuxiliarySurfaceCoverage
    )
  ) {
    failures.push("documentation or configuration auxiliary surface coverage was incomplete");
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
    id: condition.id,
    role: condition.role,
    productCommit: condition.productCommit,
    cliSha256: condition.cliSha256,
    status: failures.length ? "failed" : "passed",
    failureCategory: failures.length ? "product-or-contract" : null,
    failures,
    deterministicRoutes,
    freshIndexAttempts: freshIndex.attempts,
    statusAfterExplicitIndex: freshIndex.status,
    trackedWorktreeClean: trackedStatus === "",
    trials
  };
}

async function prepareFreshIndex(target, root, condition) {
  const attempts = [];
  for (let attempt = 1; attempt <= freshIndexAttempts; attempt += 1) {
    const startedAt = performance.now();
    try {
      const palaceRoot = path.join(root, ".palace");
      assertInside(palaceRoot, root);
      await rm(palaceRoot, { recursive: true, force: true });
      runNode([condition.cliPath, "init"], { cwd: root, timeout: 120_000 });
      runNode([condition.cliPath, "index"], { cwd: root, timeout: freshIndexTimeoutMs });
      const status = parseJsonOutput(
        runNode([condition.cliPath, "status"], { cwd: root, timeout: 120_000 }).stdout,
        `${target.name} ${condition.id} status after explicit index`
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
  throw new Error(`unreachable fresh-index state for ${target.name} ${condition.id}`);
}

function aggregateCondition(targets, conditionId) {
  const targetResults = targets
    .map((target) => ({ target, result: target.conditions?.[conditionId] }))
    .filter(({ result }) => result);
  const trials = targetResults.flatMap(({ result }) => result.trials ?? []);
  const completed = trials.filter((trial) => trial.status === "completed");
  const firstTrials = targetResults
    .map(({ result }) => firstCompletedTrial(result))
    .filter(Boolean);
  const auxiliaryTargets = targetResults.filter(({ target }) => target.auxiliaryFiles?.length);
  const auxiliaryCoverage = completed
    .map((trial) => trial.auxiliarySurfaceCoverage)
    .filter((value) => value !== null);
  const calibrationErrors = completed.map((trial) => trial.calibration.absoluteError);
  const firstCalibrationErrors = firstTrials.map((trial) => trial.calibration.absoluteError);
  const contextTokens = completed.map((trial) => trial.contextEstimatedTokens);
  const firstContextTokens = firstTrials.map((trial) => trial.contextEstimatedTokens);

  return {
    condition: conditionId,
    targetCount: targets.length,
    conditionRecordedTargets: targetResults.length,
    passedTargets: targetResults.filter(({ result }) => result.status === "passed").length,
    failedTargets: targetResults.filter(({ result }) => result.status === "failed").length,
    trialCount: trials.length,
    completedTrials: completed.length,
    passedTrials: completed.filter(trialPassesProductGates).length,
    taskTypeMatchedTargets: targetResults.filter(({ target, result }) =>
      result.trials.length === repetitions
      && result.trials.every((trial) =>
        trial.status === "completed" && trial.taskType === target.expectedTaskType
      )
    ).length,
    coreSurfaceCompleteTargets: targetResults.filter(({ result }) =>
      result.trials.length === repetitions
      && result.trials.every((trial) =>
        trial.status === "completed" && trial.coreSurfaceCoverage === 1
      )
    ).length,
    auxiliarySurfaceTargetCount: auxiliaryTargets.length,
    auxiliarySurfaceCompleteTargets: auxiliaryTargets.filter(({ result }) =>
      result.trials.length === repetitions
      && result.trials.every((trial) =>
        trial.status === "completed"
        && trial.auxiliarySurfaceCoverage === requiredAuxiliarySurfaceCoverage
      )
    ).length,
    exactOracleTargets: targetResults.filter(({ target, result }) =>
      result.trials.length === repetitions
      && result.trials.every((trial) =>
        trial.status === "completed" && sameValues(trial.routeFiles, target.changedFiles)
      )
    ).length,
    deterministicTargets: targetResults.filter(({ result }) => result.deterministicRoutes).length,
    oracleFileTotal: targets.reduce((sum, target) => sum + target.changedFiles.length, 0),
    auxiliaryOracleFileTotal: targets.reduce(
      (sum, target) => sum + (target.auxiliaryFiles?.length ?? 0),
      0
    ),
    routeFileTotal: firstTrials.reduce((sum, trial) => sum + trial.routeFileCount, 0),
    macroChangedFileCoverage: averageOrNull(completed.map((trial) => trial.changedFileCoverage)),
    macroAuxiliarySurfaceCoverage: averageOrNull(auxiliaryCoverage),
    macroRouteFocus: averageOrNull(completed.map((trial) => trial.routeFocus)),
    macroRoutePrecision: averageOrNull(completed.map((trial) => trial.routePrecision)),
    targetMacroChangedFileCoverage: averageOrNull(
      firstTrials.map((trial) => trial.changedFileCoverage)
    ),
    targetMacroRouteFocus: averageOrNull(firstTrials.map((trial) => trial.routeFocus)),
    targetMacroRoutePrecision: averageOrNull(firstTrials.map((trial) => trial.routePrecision)),
    minimumTargetRouteFocus: firstTrials.length
      ? Math.min(...firstTrials.map((trial) => trial.routeFocus))
      : null,
    minimumTargetRoutePrecision: firstTrials.length
      ? Math.min(...firstTrials.map((trial) => trial.routePrecision))
      : null,
    calibrationMeanAbsoluteError: averageOrNull(calibrationErrors),
    targetCalibrationMeanAbsoluteError: averageOrNull(firstCalibrationErrors),
    overconfidentTrials: completed.filter(
      (trial) => trial.calibration.status === "overconfident"
    ).length,
    underconfidentTrials: completed.filter(
      (trial) => trial.calibration.status === "underconfident"
    ).length,
    wellCalibratedTrials: completed.filter(
      (trial) => trial.calibration.status === "well-calibrated"
    ).length,
    miscalibratedTrials: completed.filter(
      (trial) => trial.calibration.status !== "well-calibrated"
    ).length,
    unsafeNarrowModeTrials: completed.filter((trial) => trial.unsafeNarrowMode).length,
    unsafeNarrowModeTargets: firstTrials.filter((trial) => trial.unsafeNarrowMode).length,
    modeCounts: countValues(completed.map((trial) => trial.mode)),
    targetModeCounts: countValues(firstTrials.map((trial) => trial.mode)),
    contextEstimatedTokensTotal: contextTokens.reduce((sum, value) => sum + value, 0),
    contextEstimatedTokensMean: averageOrNull(contextTokens),
    contextEstimatedTokensMedian: medianOrNull(contextTokens),
    targetContextEstimatedTokensMedian: medianOrNull(firstContextTokens),
    maxContextEstimatedTokens: contextTokens.length ? Math.max(...contextTokens) : null,
    selectedExcludedOverlapTrials: completed.filter(
      (trial) => trial.selectedExcludedOverlap.length > 0
    ).length,
    staleAfterExplicitIndexTargets: targetResults.filter(
      ({ result }) => result.statusAfterExplicitIndex?.stale !== false
    ).length,
    trackedWorktreeModifiedTargets: targetResults.filter(
      ({ result }) => result.trackedWorktreeClean === false
    ).length,
    transientMaterializationAttempts: targets.reduce((sum, target) =>
      sum + (target.materializationAttempts ?? []).filter(
        (attempt) => attempt.status !== "completed"
      ).length, 0
    ),
    transientFreshIndexAttempts: targetResults.reduce((sum, { result }) =>
      sum + (result.freshIndexAttempts ?? []).filter(
        (attempt) => attempt.status === "environment-failed"
      ).length, 0
    ),
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
  if (result.targetCount !== targetCount || result.conditionRecordedTargets !== targetCount) {
    failures.push(`condition: target count differed from ${targetCount}`);
  }
  if (result.completedTrials !== targetCount * repetitions) {
    failures.push("condition: not all preregistered trials completed");
  }
  if (result.taskTypeMatchedTargets !== targetCount) {
    failures.push("condition: task type mapping was incomplete");
  }
  if (result.coreSurfaceCompleteTargets !== targetCount) {
    failures.push("condition: implementation/path-derived-test coverage was incomplete");
  }
  if (result.auxiliarySurfaceCompleteTargets !== result.auxiliarySurfaceTargetCount) {
    failures.push("condition: documentation/configuration auxiliary coverage was incomplete");
  }
  if (result.deterministicTargets !== targetCount) {
    failures.push("condition: route order or membership was not deterministic");
  }
  if (
    result.macroChangedFileCoverage === null
    || result.macroChangedFileCoverage < minimumMacroCoverage
  ) {
    failures.push(`condition: changed-file coverage fell below ${minimumMacroCoverage.toFixed(2)}`);
  }
  if (result.macroRouteFocus === null || result.macroRouteFocus < minimumMacroFocus) {
    failures.push(`condition: route focus fell below ${minimumMacroFocus.toFixed(2)}`);
  }
  if (
    result.macroRoutePrecision === null
    || result.macroRoutePrecision < minimumMacroPrecision
  ) {
    failures.push(`condition: route precision fell below ${minimumMacroPrecision.toFixed(2)}`);
  }
  if (
    result.minimumTargetRouteFocus === null
    || result.minimumTargetRouteFocus < minimumTargetFocus
  ) {
    failures.push(`condition: a target route focus fell below ${minimumTargetFocus.toFixed(2)}`);
  }
  if (
    result.minimumTargetRoutePrecision === null
    || result.minimumTargetRoutePrecision < minimumTargetPrecision
  ) {
    failures.push(`condition: a target route precision fell below ${minimumTargetPrecision.toFixed(2)}`);
  }
  if (result.overconfidentTrials !== 0) {
    failures.push("condition: overconfident trials were observed");
  }
  if (result.maxContextEstimatedTokens === null || result.maxContextEstimatedTokens > budget) {
    failures.push("condition: context payload exceeded the token ceiling");
  }
  if (result.selectedExcludedOverlapTrials !== 0) {
    failures.push("condition: selected and excluded boundaries overlapped");
  }
  if (result.staleAfterExplicitIndexTargets !== 0) {
    failures.push("condition: explicit indexes were not fresh");
  }
  if (result.trackedWorktreeModifiedTargets !== 0) {
    failures.push("condition: Palace modified tracked target files");
  }
  return failures;
}

function studyValidityFailures(targets, aggregateResult) {
  const failures = targets.flatMap((target) =>
    (target.validityFailures ?? []).map((failure) => `${target.name}: ${failure}`)
  );
  if (targets.length !== targetCount) failures.push(`study: target count differed from ${targetCount}`);
  const baselineFirst = targets.filter(
    (target) => target.conditionOrder?.[0] === "baseline"
  ).length;
  const candidateFirst = targets.filter(
    (target) => target.conditionOrder?.[0] === "candidate"
  ).length;
  if (baselineFirst !== 0 || candidateFirst !== targetCount) {
    failures.push("study: SQLAlchemy completion did not preserve original candidate-first order");
  }
  for (const conditionId of conditionIds) {
    const aggregate = aggregateResult[conditionId];
    if (aggregate.environmentOrSetupFailures !== 0) {
      failures.push(`${conditionId}: environment or setup failures were observed`);
    }
    if (aggregate.harnessContractFailures !== 0) {
      failures.push(`${conditionId}: harness contract failures were observed`);
    }
  }
  return unique(failures);
}

function compareConditions(targets, aggregates) {
  const trialPairs = [];
  const targetPairs = [];
  for (const target of targets) {
    const baseline = target.conditions?.baseline;
    const candidate = target.conditions?.candidate;
    if (!baseline || !candidate) continue;
    for (let trial = 1; trial <= repetitions; trial += 1) {
      const baselineTrial = baseline.trials.find(
        (entry) => entry.trial === trial && entry.status === "completed"
      );
      const candidateTrial = candidate.trials.find(
        (entry) => entry.trial === trial && entry.status === "completed"
      );
      if (baselineTrial && candidateTrial) {
        trialPairs.push(pairedTrialSummary(target.name, trial, baselineTrial, candidateTrial));
      }
    }
    const baselineFirst = firstCompletedTrial(baseline);
    const candidateFirst = firstCompletedTrial(candidate);
    if (baselineFirst && candidateFirst) {
      targetPairs.push(pairedTrialSummary(target.name, 1, baselineFirst, candidateFirst));
    }
  }

  const baselineOverconfidentTargets = targetPairs.filter(
    (pair) => pair.baseline.calibrationStatus === "overconfident"
  ).length;
  const candidateOverconfidentTargets = targetPairs.filter(
    (pair) => pair.candidate.calibrationStatus === "overconfident"
  ).length;
  const baselineUnderconfidentTargets = targetPairs.filter(
    (pair) => pair.baseline.calibrationStatus === "underconfident"
  ).length;
  const candidateUnderconfidentTargets = targetPairs.filter(
    (pair) => pair.candidate.calibrationStatus === "underconfident"
  ).length;
  const baselineMiscalibratedTargets = targetPairs.filter(
    (pair) => pair.baseline.calibrationStatus !== "well-calibrated"
  ).length;
  const candidateMiscalibratedTargets = targetPairs.filter(
    (pair) => pair.candidate.calibrationStatus !== "well-calibrated"
  ).length;
  const baselineMae = averageOrNull(
    targetPairs.map((pair) => pair.baseline.calibrationAbsoluteError)
  );
  const candidateMae = averageOrNull(
    targetPairs.map((pair) => pair.candidate.calibrationAbsoluteError)
  );
  const routeChangedTargets = targetPairs.filter((pair) => pair.routeChanged).length;
  const modeChangedTargets = targetPairs.filter((pair) => pair.modeChanged).length;
  const baselineUnsafeNarrowTargets = targetPairs.filter(
    (pair) => pair.baseline.unsafeNarrowMode
  ).length;
  const candidateUnsafeNarrowTargets = targetPairs.filter(
    (pair) => pair.candidate.unsafeNarrowMode
  ).length;
  const contextTokenDeltas = targetPairs.map((pair) => pair.delta.contextEstimatedTokens);

  const calibrationFinding = classifyCalibrationFinding({
    completedPairedTargets: targetPairs.length,
    requiredTargets: targetCount,
    routeChangedTargets,
    baselineUnsafeNarrowTargets,
    candidateUnsafeNarrowTargets,
    baselineOverconfidentTargets,
    candidateOverconfidentTargets,
    baselineUnderconfidentTargets,
    candidateUnderconfidentTargets,
    baselineMiscalibratedTargets,
    candidateMiscalibratedTargets,
    baselineMae,
    candidateMae
  });

  const medianContextDelta = medianOrNull(contextTokenDeltas);
  return {
    completedPairedTrials: trialPairs.length,
    completedPairedTargets: targetPairs.length,
    repetitionsUsedForInference: 1,
    calibrationTolerance,
    calibrationFinding,
    routingFinding: targetPairs.length !== targetCount
      ? "incomplete"
      : routeChangedTargets === 0 ? "unchanged" : "changed",
    narrowModeSafetyFinding: targetPairs.length !== targetCount
      ? "incomplete"
      : candidateUnsafeNarrowTargets <= baselineUnsafeNarrowTargets
        ? "non-inferior"
        : "regression",
    contextCostFinding: medianContextDelta === null
      ? "incomplete"
      : medianContextDelta > 0 ? "candidate-higher"
        : medianContextDelta < 0 ? "candidate-lower" : "same",
    routeChangedTargets,
    modeChangedTargets,
    confidenceLoweredTargets: targetPairs.filter((pair) => pair.delta.confidence < 0).length,
    confidenceRaisedTargets: targetPairs.filter((pair) => pair.delta.confidence > 0).length,
    confidenceUnchangedTargets: targetPairs.filter((pair) => pair.delta.confidence === 0).length,
    baselineOverconfidentTargets,
    candidateOverconfidentTargets,
    baselineUnderconfidentTargets,
    candidateUnderconfidentTargets,
    baselineMiscalibratedTargets,
    candidateMiscalibratedTargets,
    baselineCalibrationMeanAbsoluteError: baselineMae,
    candidateCalibrationMeanAbsoluteError: candidateMae,
    baselineUnsafeNarrowTargets,
    candidateUnsafeNarrowTargets,
    medianContextEstimatedTokenDelta: medianContextDelta,
    meanContextEstimatedTokenDelta: averageOrNull(contextTokenDeltas),
    aggregateDelta: {
      changedFileCoverage: difference(
        aggregates.candidate.targetMacroChangedFileCoverage,
        aggregates.baseline.targetMacroChangedFileCoverage
      ),
      routeFocus: difference(
        aggregates.candidate.targetMacroRouteFocus,
        aggregates.baseline.targetMacroRouteFocus
      ),
      routePrecision: difference(
        aggregates.candidate.targetMacroRoutePrecision,
        aggregates.baseline.targetMacroRoutePrecision
      ),
      calibrationMeanAbsoluteError: difference(candidateMae, baselineMae),
      overconfidentTargets: candidateOverconfidentTargets - baselineOverconfidentTargets,
      underconfidentTargets: candidateUnderconfidentTargets - baselineUnderconfidentTargets,
      miscalibratedTargets: candidateMiscalibratedTargets - baselineMiscalibratedTargets,
      unsafeNarrowTargets: candidateUnsafeNarrowTargets - baselineUnsafeNarrowTargets
    },
    modeShifts: countValues(
      targetPairs.filter((pair) => pair.modeChanged).map(
        (pair) => `${pair.baseline.mode}->${pair.candidate.mode}`
      )
    ),
    targetPairs,
    trialPairs
  };
}

function pairedTrialSummary(target, trial, baseline, candidate) {
  return {
    target,
    trial,
    routeChanged: JSON.stringify(baseline.routeFiles) !== JSON.stringify(candidate.routeFiles),
    modeChanged: baseline.mode !== candidate.mode,
    baseline: compactTrialForComparison(baseline),
    candidate: compactTrialForComparison(candidate),
    delta: {
      confidence: difference(candidate.routeConfidence, baseline.routeConfidence),
      changedFileCoverage: difference(candidate.changedFileCoverage, baseline.changedFileCoverage),
      routeFocus: difference(candidate.routeFocus, baseline.routeFocus),
      routePrecision: difference(candidate.routePrecision, baseline.routePrecision),
      contextEstimatedTokens: candidate.contextEstimatedTokens - baseline.contextEstimatedTokens,
      contextBytes: candidate.contextBytes - baseline.contextBytes
    }
  };
}

function compactTrialForComparison(trial) {
  return {
    routeFiles: trial.routeFiles,
    routeConfidence: trial.routeConfidence,
    changedFileCoverage: trial.changedFileCoverage,
    routeFocus: trial.routeFocus,
    routePrecision: trial.routePrecision,
    calibrationStatus: trial.calibration.status,
    calibrationAbsoluteError: trial.calibration.absoluteError,
    mode: trial.mode,
    unsafeNarrowMode: trial.unsafeNarrowMode,
    contextEstimatedTokens: trial.contextEstimatedTokens,
    contextBytes: trial.contextBytes
  };
}

function trialPassesProductGates(trial) {
  return trial.taskType === trial.expectedTaskType
    && trial.coreSurfaceCoverage === 1
    && (
      trial.auxiliarySurfaceCoverage === null
      || trial.auxiliarySurfaceCoverage === requiredAuxiliarySurfaceCoverage
    )
    && trial.routeFocus >= minimumTargetFocus
    && trial.routePrecision >= minimumTargetPrecision
    && trial.calibration.status !== "overconfident"
    && trial.contextEstimatedTokens <= budget
    && trial.selectedExcludedOverlap.length === 0;
}

function pairedTargetExecutionFailure(target, category, message, error, execution = {}) {
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
    auxiliaryFiles: target.auxiliaryFiles,
    testRoleDerivedFromPath: true,
    conditionOrder: [],
    failureCategory: category,
    executionError: summarizeError(error),
    materializationAttempts: execution.materializationAttempts ?? [],
    validityFailures: ["environment-or-setup", "harness-contract"].includes(category)
      ? [message]
      : [],
    conditions: {}
  };
}

function conditionExecutionFailure(condition, category, message, error, execution = {}) {
  return {
    id: condition.id,
    role: condition.role,
    productCommit: condition.productCommit,
    cliSha256: condition.cliSha256,
    status: "failed",
    failureCategory: category,
    failures: [message],
    executionError: summarizeError(error),
    deterministicRoutes: false,
    freshIndexAttempts: execution.freshIndexAttempts ?? [],
    statusAfterExplicitIndex: null,
    trackedWorktreeClean: null,
    trials: []
  };
}

function expectedTaskType(subject) {
  const taskType = classifyTaskType(subject);
  if (taskType) return taskType;
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

function conditionOrderForIndex(targetIndex) {
  return targetIndex % 2 === 0
    ? ["baseline", "candidate"]
    : ["candidate", "baseline"];
}

function firstCompletedTrial(condition) {
  return condition?.trials?.find((trial) => trial.status === "completed") ?? null;
}

function independentCalibration(confidence, observedCoverage) {
  const signedErrorRaw = confidence - observedCoverage;
  const status = signedErrorRaw > calibrationTolerance + Number.EPSILON
    ? "overconfident"
    : signedErrorRaw < -calibrationTolerance - Number.EPSILON
      ? "underconfident"
      : "well-calibrated";
  return {
    predictedConfidence: confidence,
    observedCoverage,
    tolerance: calibrationTolerance,
    signedError: round(signedErrorRaw),
    absoluteError: round(Math.abs(signedErrorRaw)),
    status
  };
}

function classifyCalibrationFinding(metrics) {
  if (metrics.completedPairedTargets !== metrics.requiredTargets) return "incomplete";
  const routingOrModeSafetyRegression = metrics.routeChangedTargets > 0
    || metrics.candidateUnsafeNarrowTargets > metrics.baselineUnsafeNarrowTargets;
  const overconfidenceImproved = metrics.candidateOverconfidentTargets
    < metrics.baselineOverconfidentTargets;
  const underconfidenceNonInferior = metrics.candidateUnderconfidentTargets
    <= metrics.baselineUnderconfidentTargets;
  const totalCalibrationNonInferior = metrics.candidateMiscalibratedTargets
    <= metrics.baselineMiscalibratedTargets;
  const maeNonInferior = metrics.candidateMae <= metrics.baselineMae + 0.001;
  if (routingOrModeSafetyRegression) return "regression";
  if (
    overconfidenceImproved
    && underconfidenceNonInferior
    && totalCalibrationNonInferior
    && maeNonInferior
  ) {
    return "supported";
  }
  if (overconfidenceImproved) return "tradeoff";
  if (
    metrics.candidateOverconfidentTargets === metrics.baselineOverconfidentTargets
    && metrics.candidateUnderconfidentTargets === metrics.baselineUnderconfidentTargets
    && metrics.candidateMiscalibratedTargets === metrics.baselineMiscalibratedTargets
    && Math.abs(metrics.candidateMae - metrics.baselineMae) <= 0.001
  ) {
    return "no-difference";
  }
  if (!totalCalibrationNonInferior || !maeNonInferior) return "regression";
  return "mixed";
}

function unique(values) {
  return [...new Set(values)];
}

function countValues(values) {
  return Object.fromEntries(
    [...values.reduce((counts, value) => {
      counts.set(value, (counts.get(value) ?? 0) + 1);
      return counts;
    }, new Map())].sort(([left], [right]) => String(left).localeCompare(String(right)))
  );
}

function averageOrNull(values) {
  return values.length
    ? round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
}

function medianOrNull(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? round(sorted[middle])
    : round((sorted[middle - 1] + sorted[middle]) / 2);
}

function difference(left, right) {
  return typeof left === "number" && typeof right === "number"
    ? round(left - right)
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

function sha256Text(value) {
  return createHash("sha256").update(String(value)).digest("hex").toUpperCase();
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

function runPnpm(args, options) {
  if (process.platform === "win32") {
    const commandLine = `pnpm ${args.map(quoteCmdArgument).join(" ")}`;
    return run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", commandLine], options);
  }
  return run("pnpm", args, options);
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

module.exports = {
  calibrationTolerance,
  classifyCalibrationFinding,
  cloneConditionTarget,
  conditionOrderForIndex,
  independentCalibration
};
