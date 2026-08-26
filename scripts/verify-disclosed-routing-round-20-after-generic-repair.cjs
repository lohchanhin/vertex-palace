const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdir, mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const {
  hashSourceTree,
  sha256File
} = require("./lib/local-blind-freeze.cjs");

const projectRoot = path.resolve(__dirname, "..");
const candidateCliPath = path.join(projectRoot, "dist", "palace.cjs");
const generatedMcpPath = path.join(projectRoot, "plugins", "vertex-palace", "mcp", "server.cjs");
const formalRelativePath = "docs/research/evidence/local-blind-routing-validation-0.4-stable-round-20.json";
const formalPath = path.join(projectRoot, formalRelativePath);
const outputPath = require.main === module ? outputArgument(process.argv.slice(2)) : null;
const studyId = outputPath
  ? path.basename(outputPath, path.extname(outputPath))
  : "disclosed-routing-round-20-after-generic-repair-attempt-1-0.4-alpha";
const repetitions = 2;
const budget = 6_000;
const routeLimit = 10;
const maxDrawers = 4;
const fetchDepth = 400;
const commandTimeoutMs = 300_000;
const indexTimeoutMs = 900_000;
const calibrationTolerance = 0.15;
const metricAgreementTolerance = 0.005;
const minimumMacroChangedFileCoverage = 0.90;
const minimumMacroRouteFocus = 0.70;
const minimumTargetChangedFileCoverage = 0.50;
const minimumTargetRouteFocus = 0.40;

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

async function main() {
  const formal = JSON.parse(await readFile(formalPath, "utf8"));
  assert.equal(formal.status, "completed");
  assert.equal(formal.candidateGateStatus, "failed");
  assert.equal(formal.targets.length, 8);

  const formalSha256 = await sha256File(formalPath);
  const candidateCliSha256 = await sha256File(candidateCliPath);
  const generatedMcpSha256 = await sha256File(generatedMcpPath);
  const sourceTreeBefore = await hashSourceTree(projectRoot);
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-round-20-disclosed-repair-"));
  const targets = [];

  try {
    for (const target of formal.targets) {
      const root = path.join(temporaryRoot, safeSegment(target.name));
      const formalCandidate = formalCandidateSummary(target);
      try {
        await materializeTarget(target, root);
        const repairedCandidate = validateTarget(target, root);
        targets.push({
          ...publicTargetIdentity(target),
          formalCandidate,
          repairedCandidate,
          comparison: compareTarget(formalCandidate, repairedCandidate)
        });
        process.stdout.write(`${target.name}: ${repairedCandidate.status} (${repairedCandidate.trials[0].routeFiles.length} routed files)\n`);
      } catch (error) {
        targets.push({
          ...publicTargetIdentity(target),
          formalCandidate,
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
    const sourceTreeAfter = await hashSourceTree(projectRoot);
    assert.deepEqual(sourceTreeAfter, sourceTreeBefore, "Candidate source tree changed during replay");
    assert.equal(await sha256File(candidateCliPath), candidateCliSha256, "Candidate CLI changed during replay");
    assert.equal(await sha256File(generatedMcpPath), generatedMcpSha256, "Generated MCP changed during replay");
    assert.equal(await sha256File(formalPath), formalSha256, "Formal Round 20 evidence changed during replay");

    const report = {
      schemaVersion: 1,
      studyId,
      generatedAt: new Date().toISOString(),
      status: aggregate.completedTargets === formal.targets.length ? "completed" : "invalid",
      gateStatus: gateFailures.length ? "failed" : "passed",
      gateFailures,
      evidenceClass: "disclosed-post-observation-static-routing-regression",
      heldOutAgainstCandidate: false,
      claimBoundary: "Disclosed post-observation replay on the eight already observed Round 20 tasks after repository-generic action-noise removal, low-confidence conventional-entry fallback, Python annotation semantics, fail-fast decomposition, additive API companion closure, and Apple platform-family verification closure. The immutable formal Round 20 candidate gate remains failed. This replay does not execute target tests or an Agent and supports no held-out generalization, Agent correctness, Token, tool-call, or wall-time claim. Fresh frozen repositories are required for new generalization evidence.",
      formalEvidence: {
        path: formalRelativePath,
        sha256: formalSha256,
        status: formal.status,
        candidateGateStatus: formal.candidateGateStatus,
        preservedWithoutModification: true
      },
      candidate: {
        gitHead: run("git", ["rev-parse", "HEAD"], { cwd: projectRoot }).stdout.trim(),
        gitBranch: run("git", ["branch", "--show-current"], { cwd: projectRoot }).stdout.trim(),
        sourceState: "local uncommitted disclosed repair worktree",
        cliPath: "dist/palace.cjs",
        cliSha256: candidateCliSha256,
        generatedMcpPath: "plugins/vertex-palace/mcp/server.cjs",
        generatedMcpSha256,
        sourceTree: sourceTreeBefore,
        rebuiltBeforeMeasurement: true,
        unchangedDuringMeasurement: true
      },
      protocol: {
        targets: formal.targets.length,
        repetitions,
        repetitionsAreDeterminismChecksNotIndependentSamples: true,
        sequential: true,
        concurrent: false,
        freshPalacePerTarget: true,
        targetTestsExecuted: false,
        agentExecuted: false,
        budget,
        routeLimit,
        maxDrawers,
        fetchDepth,
        calibrationTolerance,
        metricAgreementTolerance,
        gates: {
          completedTargets: formal.targets.length,
          deterministicTargets: formal.targets.length,
          taskTypeMatchedTargets: formal.targets.length,
          coreSurfaceCompleteTargets: formal.targets.length,
          auxiliarySurfaceCompleteTargets: "all frozen targets with auxiliary files",
          minimumMacroChangedFileCoverage,
          minimumMacroRouteFocus,
          minimumTargetChangedFileCoverage,
          minimumTargetRouteFocus,
          overconfidentTrials: 0,
          metricDisagreementTrials: 0,
          trackedTargetWorktreeChanges: 0
        }
      },
      formalCandidateAggregate: formal.aggregate.candidate,
      aggregate,
      targets
    };

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx"
    });
    process.stdout.write(`${JSON.stringify({
      outputPath,
      status: report.status,
      gateStatus: report.gateStatus,
      aggregate
    }, null, 2)}\n`);
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
  assert.ok(gitObjectExists(root, `${target.routeCommit}^{commit}`), `Route commit is unreachable: ${target.name}`);
  assert.ok(gitObjectExists(root, `${target.groundTruthCommit}^{commit}`), `Ground-truth commit is unreachable: ${target.name}`);
  run("git", ["-c", "advice.detachedHead=false", "checkout", "--detach", target.routeCommit], { cwd: root });
  assert.equal(run("git", ["rev-parse", "HEAD"], { cwd: root }).stdout.trim(), target.routeCommit);
  const changedFiles = lines(run("git", [
    "diff", "--name-only", "--find-renames", target.routeCommit, target.groundTruthCommit, "--"
  ], { cwd: root }).stdout).map(normalizePath).sort();
  assert.deepEqual(changedFiles, target.changedFiles.map(normalizePath).sort());
  assert.equal(trackedStatus(root), "");
}

function validateTarget(target, root) {
  const indexStartedAt = performance.now();
  parseJson(runNode([candidateCliPath, "index", "--root", root], {
    cwd: root,
    timeout: indexTimeoutMs
  }).stdout, `${target.name} index`);
  const status = parseJson(runNode([candidateCliPath, "status", "--root", root], {
    cwd: root,
    timeout: commandTimeoutMs
  }).stdout, `${target.name} status`);
  const indexElapsedMs = Math.round(performance.now() - indexStartedAt);
  const trials = [];

  for (let trial = 1; trial <= repetitions; trial += 1) {
    const startedAt = performance.now();
    const evaluation = parseJson(runNode([
      candidateCliPath,
      "evaluate",
      target.task,
      ...target.changedFiles.flatMap((file) => ["--changed-file", file]),
      "--budget", String(budget),
      "--route-limit", String(routeLimit),
      "--max-drawers", String(maxDrawers),
      "--json"
    ], { cwd: root, timeout: commandTimeoutMs }).stdout, `${target.name} evaluation ${trial}`);
    trials.push(buildTrial(target, trial, evaluation, Math.round(performance.now() - startedAt)));
  }

  const failures = [];
  const deterministic = trials.every((trial) =>
    JSON.stringify(trial.routeFiles) === JSON.stringify(trials[0].routeFiles)
      && trial.routeConfidence === trials[0].routeConfidence
  );
  if (!deterministic) failures.push("route membership, order, or confidence changed across repetitions");
  if (trials.some((trial) => trial.taskType !== target.expectedTaskType)) failures.push("task type mismatch");
  if (trials.some((trial) => trial.coreSurfaceCoverage !== 1)) failures.push("core implementation/test coverage incomplete");
  if (trials.some((trial) => trial.changedFileCoverage < minimumTargetChangedFileCoverage)) {
    failures.push("changed-file coverage below disclosed threshold");
  }
  if (trials.some((trial) => trial.routeFocus < minimumTargetRouteFocus)) {
    failures.push("route focus below disclosed threshold");
  }
  if (trials.some((trial) => trial.overconfident)) failures.push("route confidence exceeded observed coverage tolerance");
  if (trials.some((trial) => trial.metricDisagreement)) failures.push("reported metrics disagreed with independent recomputation");
  if (trackedStatus(root)) failures.push("tracked target worktree changed during replay");

  return {
    status: failures.length ? "failed" : "passed",
    failures,
    deterministic,
    indexedFresh: status.initialized === true && status.stale === false,
    indexElapsedMs,
    trackedWorktreeClean: trackedStatus(root) === "",
    trials
  };
}

function buildTrial(target, trial, evaluation, evaluationElapsedMs) {
  const routeFiles = unique(evaluation.route.files.map(normalizePath));
  const changedFiles = target.changedFiles.map(normalizePath);
  const coreFiles = [...target.implementationFiles, ...target.testFiles].map(normalizePath);
  const auxiliaryFiles = target.auxiliaryFiles.map(normalizePath);
  const routeSet = new Set(routeFiles);
  const changedFileCoverage = coverageOf(changedFiles, routeSet);
  const coreSurfaceCoverage = coverageOf(coreFiles, routeSet);
  const auxiliarySurfaceCoverage = auxiliaryFiles.length ? coverageOf(auxiliaryFiles, routeSet) : 1;
  const routeFocus = routeFiles.length
    ? round(changedFiles.filter((file) => routeSet.has(file)).length / routeFiles.length)
    : 0;
  const metricDisagreement = Math.abs(changedFileCoverage - evaluation.coverage.changedFileCoverage) > metricAgreementTolerance
    || Math.abs(routeFocus - evaluation.coverage.routeFocus) > metricAgreementTolerance;
  const routeConfidence = round(evaluation.route.confidence);
  return {
    trial,
    taskType: evaluation.taskType,
    routeFiles,
    routeFileCount: routeFiles.length,
    routeConfidence,
    changedFileCoverage,
    coreSurfaceCoverage,
    auxiliarySurfaceCoverage,
    routeFocus,
    overconfident: routeConfidence > changedFileCoverage + calibrationTolerance,
    metricDisagreement,
    reportedCalibrationStatus: evaluation.calibration.status,
    evaluationElapsedMs
  };
}

function aggregateTargets(targets) {
  const completed = targets.filter((target) => target.repairedCandidate.trials.length === repetitions);
  const representativeTrials = completed.map((target) => target.repairedCandidate.trials[0]);
  const allTrials = completed.flatMap((target) => target.repairedCandidate.trials);
  const auxiliaryTargets = completed.filter((target) => target.auxiliaryFiles.length > 0);
  return {
    targetCount: targets.length,
    completedTargets: completed.length,
    passedTargets: completed.filter((target) => target.repairedCandidate.status === "passed").length,
    failedTargets: targets.length - completed.filter((target) => target.repairedCandidate.status === "passed").length,
    completedTrials: allTrials.length,
    deterministicTargets: completed.filter((target) => target.repairedCandidate.deterministic).length,
    taskTypeMatchedTargets: completed.filter((target) =>
      target.repairedCandidate.trials.every((trial) => trial.taskType === target.expectedTaskType)
    ).length,
    coreSurfaceCompleteTargets: completed.filter((target) =>
      target.repairedCandidate.trials.every((trial) => trial.coreSurfaceCoverage === 1)
    ).length,
    auxiliarySurfaceTargetCount: auxiliaryTargets.length,
    auxiliarySurfaceCompleteTargets: auxiliaryTargets.filter((target) =>
      target.repairedCandidate.trials.every((trial) => trial.auxiliarySurfaceCoverage === 1)
    ).length,
    targetMacroChangedFileCoverage: average(representativeTrials.map((trial) => trial.changedFileCoverage)),
    targetMacroCoreSurfaceCoverage: average(representativeTrials.map((trial) => trial.coreSurfaceCoverage)),
    targetMacroRouteFocus: average(representativeTrials.map((trial) => trial.routeFocus)),
    minimumTargetChangedFileCoverage: minimum(representativeTrials.map((trial) => trial.changedFileCoverage)),
    minimumTargetRouteFocus: minimum(representativeTrials.map((trial) => trial.routeFocus)),
    overconfidentTrials: allTrials.filter((trial) => trial.overconfident).length,
    metricDisagreementTrials: allTrials.filter((trial) => trial.metricDisagreement).length,
    trackedTargetWorktreeChanges: completed.filter((target) => !target.repairedCandidate.trackedWorktreeClean).length,
    routeFileTotal: representativeTrials.reduce((sum, trial) => sum + trial.routeFileCount, 0),
    evaluationElapsedMsTotal: allTrials.reduce((sum, trial) => sum + trial.evaluationElapsedMs, 0)
  };
}

function disclosedGateFailures(aggregate) {
  const failures = [];
  if (aggregate.completedTargets !== aggregate.targetCount) failures.push("not all targets completed");
  if (aggregate.deterministicTargets !== aggregate.targetCount) failures.push("routes were not deterministic");
  if (aggregate.taskTypeMatchedTargets !== aggregate.targetCount) failures.push("task type classification mismatch");
  if (aggregate.coreSurfaceCompleteTargets !== aggregate.targetCount) failures.push("core implementation/test coverage incomplete");
  if (aggregate.auxiliarySurfaceCompleteTargets !== aggregate.auxiliarySurfaceTargetCount) failures.push("bounded auxiliary coverage incomplete");
  if (aggregate.targetMacroChangedFileCoverage < minimumMacroChangedFileCoverage) failures.push("target-macro changed-file coverage below 0.90");
  if (aggregate.targetMacroRouteFocus < minimumMacroRouteFocus) failures.push("target-macro route focus below 0.70");
  if (aggregate.minimumTargetChangedFileCoverage < minimumTargetChangedFileCoverage) failures.push("a target changed-file coverage fell below 0.50");
  if (aggregate.minimumTargetRouteFocus < minimumTargetRouteFocus) failures.push("a target route focus fell below 0.40");
  if (aggregate.overconfidentTrials > 0) failures.push("overconfident trials observed");
  if (aggregate.metricDisagreementTrials > 0) failures.push("reported and independent route metrics disagreed");
  if (aggregate.trackedTargetWorktreeChanges > 0) failures.push("tracked target worktree changes observed");
  return failures;
}

function compareTarget(formalCandidate, repairedCandidate) {
  const current = repairedCandidate.trials[0];
  if (!current) return null;
  return {
    routeChanged: JSON.stringify(formalCandidate.routeFiles ?? []) !== JSON.stringify(current.routeFiles),
    changedFileCoverageDelta: difference(current.changedFileCoverage, formalCandidate.changedFileCoverage),
    routeFocusDelta: difference(current.routeFocus, formalCandidate.routeFocus),
    routeConfidenceDelta: difference(current.routeConfidence, formalCandidate.routeConfidence)
  };
}

function formalCandidateSummary(target) {
  const condition = target.conditions?.candidate;
  const trial = condition?.trials?.find((entry) => entry.status === "completed");
  if (!trial) {
    return {
      status: condition?.status ?? "failed",
      routeFiles: [],
      routeConfidence: null,
      changedFileCoverage: null,
      routeFocus: null,
      formalExecutionError: true
    };
  }
  return {
    status: condition.status,
    routeFiles: trial.routeFiles,
    routeConfidence: trial.routeConfidence,
    changedFileCoverage: trial.changedFileCoverage,
    routeFocus: trial.routeFocus,
    formalExecutionError: false
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
    auxiliaryFiles: target.auxiliaryFiles
  };
}

function outputArgument(args) {
  const index = args.indexOf("--output");
  assert.ok(index >= 0 && args[index + 1], "Usage: node scripts/verify-disclosed-routing-round-20-after-generic-repair.cjs --output <new-json-path>");
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.equal(path.extname(resolved).toLowerCase(), ".json");
  return resolved;
}

function coverageOf(expectedFiles, routeSet) {
  return expectedFiles.length
    ? round(expectedFiles.filter((file) => routeSet.has(file)).length / expectedFiles.length)
    : 1;
}

function trackedStatus(root) {
  return run("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: root }).stdout.trim();
}

function gitObjectExists(root, object) {
  return spawnSync("git", ["cat-file", "-e", object], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    windowsHide: true
  }).status === 0;
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
      result.stdout?.trim(),
      result.stderr?.trim()
    ].filter(Boolean).join("\n"));
  }
  return result;
}

function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} did not return valid JSON: ${summarizeError(error)}`);
  }
}

function safeSegment(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function normalizePath(value) {
  return String(value).replaceAll("\\", "/").replace(/^\.\//, "").replace(/:\d+(?:-\d+)?$/, "").toLowerCase();
}

function lines(value) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function unique(values) {
  return [...new Set(values)];
}

function average(values) {
  return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function minimum(values) {
  return values.length ? Math.min(...values) : null;
}

function difference(left, right) {
  return Number.isFinite(left) && Number.isFinite(right) ? round(left - right) : null;
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function summarizeError(error) {
  const text = error instanceof Error ? error.stack ?? error.message : String(error);
  return text.length <= 12_000 ? text : `${text.slice(0, 12_000)}\n...[truncated]`;
}

module.exports = {
  aggregateTargets,
  disclosedGateFailures,
  normalizePath
};
