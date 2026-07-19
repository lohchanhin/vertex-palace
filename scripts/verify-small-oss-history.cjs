const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdir, mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const packageJson = require(path.join(projectRoot, "package.json"));
const outputPath = outputArgument(process.argv.slice(2));
const packageSourceCommit = "acec14ef9cbb0a404f2418768774695759137c2b";
const expectedPackageShasum = "b3af366d0b5e9f2bd5545e7f05f2ad9ac33065f7";
const expectedPackageIntegrity = "sha512-eoLk0UB9FkzFQ9Sh8n34yKTW+mHm9jCan+LL5wwxahGemCJtHiqSVLYvDAt2q7rxEDghgVI/wlVYjS/ZK92efA==";
const budget = 6_000;
const trials = 2;

const selection = Object.freeze({
  lockedBeforeFirstPalaceRun: true,
  repositoryClass: "independent-small-oss-real-history",
  maximumTrackedFiles: 100,
  requiredLicense: "OSI-approved",
  requiredIssueState: "closed",
  requiredGroundTruth: "A real commit after the routed parent must modify implementation/type surface and focused tests.",
  requiredTestCommand: true,
  selectionRule: "Select without observing a Palace route; preserve a failing route or test instead of replacing the repository."
});

const repository = Object.freeze({
  name: "p-limit",
  owner: "sindresorhus",
  language: "JavaScript runtime with TypeScript declarations",
  url: "https://github.com/sindresorhus/p-limit.git",
  issue: {
    number: 97,
    title: "limitFunction: overly permissive type hint",
    url: "https://github.com/sindresorhus/p-limit/issues/97",
    state: "closed"
  },
  parentCommit: "c944e4a4363ff41a7202d5dec346cc174c3ecf49",
  groundTruthCommit: "ccb80b2721a6a4a27ce5ad7721fe939162a35b31",
  task: "Fix the overly permissive public limitFunction type. It currently accepts synchronous functions even though limiting synchronous execution has no effect. Restrict it to asynchronous functions, preserve inferred argument and return types, and add focused compile-time regression coverage using the repository's existing type-test setup.",
  expectedChangedFiles: ["index.d.ts", "index.test-d.ts"],
  acceptedRouteFiles: ["index.d.ts", "index.test-d.ts", "package.json"],
  architectureContract: {
    typeExport: "./index.d.ts",
    runtimeExport: "./index.js",
    typeTestRunner: "tsd"
  }
});

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-small-oss-history-"));
  assert.ok(
    path.resolve(temporaryRoot).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`),
    "Temporary validation root must stay inside the OS temporary directory."
  );

  try {
    const packRoot = path.join(temporaryRoot, "pack");
    const installRoot = path.join(temporaryRoot, "install");
    const repositoryRoot = path.join(temporaryRoot, "repository");
    await Promise.all([mkdir(packRoot), mkdir(installRoot), mkdir(repositoryRoot)]);

    const packResult = runNpm(
      ["pack", "--json", "--ignore-scripts", "--pack-destination", packRoot],
      { cwd: projectRoot }
    );
    const metadata = parsePackMetadata(packResult.stdout);
    const tarballPath = path.join(packRoot, metadata.filename);
    const tarball = await readFile(tarballPath);
    const shasum = createHash("sha1").update(tarball).digest("hex");
    assert.equal(metadata.name, packageJson.name);
    assert.equal(metadata.version, "0.3.0");
    assert.equal(metadata.files.length, 7);
    assert.equal(shasum, expectedPackageShasum);
    assert.equal(metadata.integrity, expectedPackageIntegrity);

    runNpm(
      ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--loglevel=error", "--prefix", installRoot, tarballPath],
      { cwd: temporaryRoot }
    );
    const cliPath = path.join(installRoot, "node_modules", packageJson.name, "dist", "palace.cjs");
    const installedVersion = runNode([cliPath, "--version"], { cwd: temporaryRoot }).stdout.trim();
    assert.equal(installedVersion, "0.3.0");

    cloneHistory(repositoryRoot);
    const trackedFiles = lines(run("git", ["ls-tree", "-r", "--name-only", repository.parentCommit], { cwd: repositoryRoot }).stdout);
    const actualChangedFiles = lines(
      run("git", ["diff", "--name-only", repository.parentCommit, repository.groundTruthCommit, "--"], { cwd: repositoryRoot }).stdout
    );
    const parentPackage = JSON.parse(
      run("git", ["show", `${repository.parentCommit}:package.json`], { cwd: repositoryRoot }).stdout
    );
    const architecture = {
      packageName: parentPackage.name,
      license: parentPackage.license,
      typeExport: parentPackage.exports?.types ?? null,
      runtimeExport: parentPackage.exports?.default ?? null,
      testCommand: parentPackage.scripts?.test ?? null,
      typeTestsUseTsd: /(?:^|\s|&&)tsd(?:\s|$)/.test(parentPackage.scripts?.test ?? "")
    };

    const failures = [];
    if (trackedFiles.length > selection.maximumTrackedFiles) failures.push("tracked-file ceiling exceeded");
    if (architecture.license !== "MIT") failures.push("expected MIT license was not present");
    if (architecture.typeExport !== repository.architectureContract.typeExport) failures.push("type export contract changed");
    if (architecture.runtimeExport !== repository.architectureContract.runtimeExport) failures.push("runtime export contract changed");
    if (!architecture.typeTestsUseTsd) failures.push("repository type-test command no longer invokes tsd");
    if (!sameValues(actualChangedFiles, repository.expectedChangedFiles)) failures.push("real commit diff does not match the preregistered oracle");

    const routeTrials = [];
    for (let trial = 1; trial <= trials; trial += 1) {
      const result = runNodeAllowFailure(
        [cliPath, "context", repository.task, "--auto", "--format", "json", "--budget", String(budget)],
        { cwd: repositoryRoot, timeout: 180_000 }
      );
      const routeTrial = parseRouteTrial(trial, result);
      routeTrials.push(routeTrial);
      if (routeTrial.status !== 0) failures.push(`route trial ${trial} failed`);
      if (routeTrial.parseError) failures.push(`route trial ${trial} returned invalid JSON or schema`);
    }

    const validRouteTrials = routeTrials.filter((trial) => trial.status === 0 && !trial.parseError);
    const deterministicBoundaries = validRouteTrials.length === trials
      && JSON.stringify(validRouteTrials[0].boundaries) === JSON.stringify(validRouteTrials[1].boundaries);
    const routeFiles = validRouteTrials[0]?.routeFiles ?? [];
    const changed = new Set(actualChangedFiles);
    const accepted = new Set(repository.acceptedRouteFiles);
    const matchedChangedFiles = routeFiles.filter((file) => changed.has(file));
    const requiredRecall = round(matchedChangedFiles.length / actualChangedFiles.length);
    const strictDiffPrecision = routeFiles.length === 0 ? 0 : round(matchedChangedFiles.length / routeFiles.length);
    const acceptedPrecision = routeFiles.length === 0
      ? 0
      : round(routeFiles.filter((file) => accepted.has(file)).length / routeFiles.length);
    const unexpectedRouteFiles = routeFiles.filter((file) => !accepted.has(file));
    if (!deterministicBoundaries) failures.push("route boundaries differed across repetitions");
    if (requiredRecall !== 1) failures.push("route missed a real changed file");
    if (acceptedPrecision !== 1) failures.push("route crossed the preregistered accepted boundary");
    if (validRouteTrials.some((trial) => trial.payload.contextEstimatedTokens > budget)) failures.push("context budget exceeded");

    const parentTrackedStatus = run("git", ["status", "--short", "--untracked-files=no"], { cwd: repositoryRoot }).stdout.trim();
    if (parentTrackedStatus) failures.push("routing modified tracked files at the parent commit");

    run("git", ["-c", "advice.detachedHead=false", "checkout", "--detach", repository.groundTruthCommit], { cwd: repositoryRoot });
    const install = runNpmAllowFailure(
      ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--loglevel=error"],
      { cwd: repositoryRoot, timeout: 180_000 }
    );
    const test = install.status === 0
      ? runNpmAllowFailure(["test"], { cwd: repositoryRoot, timeout: 180_000 })
      : { status: null, stdout: "", stderr: "test skipped because dependency installation failed", durationMs: 0 };
    const diagnostics = test.status !== 0 && install.status === 0
      ? {
          reason: "The preregistered npm test command failed; run its behavior and type-test stages separately without changing the gate result.",
          behavior: runNpmAllowFailure(["exec", "--", "ava"], { cwd: repositoryRoot, timeout: 180_000 }),
          types: runNpmAllowFailure(["exec", "--", "tsd"], { cwd: repositoryRoot, timeout: 180_000 })
        }
      : null;
    const targetTrackedStatus = run("git", ["status", "--short", "--untracked-files=no"], { cwd: repositoryRoot }).stdout.trim();
    if (install.status !== 0) failures.push("ground-truth dependency installation failed");
    if (test.status !== 0) failures.push("ground-truth repository tests failed");
    if (targetTrackedStatus) failures.push("ground-truth tests modified tracked files");

    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      claimBoundary: "Small-OSS routing, real-history oracle, architecture-contract, and ground-truth test validation only; no Agent execution or efficiency claim.",
      status: failures.length === 0 ? "passed" : "failed",
      failures,
      package: {
        sourceCommit: packageSourceCommit,
        validationHarnessCommit: run("git", ["rev-parse", "HEAD"], { cwd: projectRoot }).stdout.trim(),
        name: metadata.name,
        version: metadata.version,
        files: metadata.files.length,
        shasum,
        integrity: metadata.integrity,
        cleanInstallVersion: installedVersion
      },
      environment: {
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        npm: runNpm(["--version"], { cwd: projectRoot }).stdout.trim(),
        git: run("git", ["--version"], { cwd: projectRoot }).stdout.trim()
      },
      selection,
      repository: {
        ...repository,
        trackedFilesAtParent: trackedFiles.length,
        actualChangedFiles,
        architecture
      },
      routing: {
        budget,
        repetitions: trials,
        deterministicBoundaries,
        requiredRecall,
        strictDiffPrecision,
        acceptedPrecision,
        matchedChangedFiles,
        unexpectedRouteFiles,
        trials: routeTrials
      },
      gates: {
        candidatePackage: "passed",
        repositorySelectionAndArchitecture: trackedFiles.length <= selection.maximumTrackedFiles
          && architecture.license === "MIT"
          && architecture.typeExport === repository.architectureContract.typeExport
          && architecture.runtimeExport === repository.architectureContract.runtimeExport
          && architecture.typeTestsUseTsd
          && sameValues(actualChangedFiles, repository.expectedChangedFiles)
          ? "passed"
          : "failed",
        routing: deterministicBoundaries
          && requiredRecall === 1
          && acceptedPrecision === 1
          && !validRouteTrials.some((trial) => trial.payload.contextEstimatedTokens > budget)
          ? "passed"
          : "failed",
        groundTruthTestCommand: install.status === 0 && test.status === 0 && targetTrackedStatus === ""
          ? "passed"
          : "failed",
        focusedBehaviorAndTypeDiagnostics: diagnostics
          ? diagnostics.behavior.status === 0 && diagnostics.types.status === 0 ? "passed" : "failed"
          : "not-needed"
      },
      groundTruthTests: {
        commit: repository.groundTruthCommit,
        dependencyResolutionPinnedByRepository: false,
        installCommand: "npm install --ignore-scripts --no-audit --no-fund --loglevel=error",
        installStatus: install.status,
        installDurationMs: install.durationMs,
        installOutputSha256: digestOutput(install),
        testCommand: "npm test",
        testStatus: test.status,
        testDurationMs: test.durationMs,
        testOutputSha256: digestOutput(test),
        testOutputSummary: summarizeOutput(test, temporaryRoot),
        diagnostics: diagnostics
          ? {
              reason: diagnostics.reason,
              behaviorCommand: "npm exec -- ava",
              behaviorStatus: diagnostics.behavior.status,
              behaviorDurationMs: diagnostics.behavior.durationMs,
              behaviorOutputSha256: digestOutput(diagnostics.behavior),
              behaviorOutputSummary: summarizeOutput(diagnostics.behavior, temporaryRoot),
              typeCommand: "npm exec -- tsd",
              typeStatus: diagnostics.types.status,
              typeDurationMs: diagnostics.types.durationMs,
              typeOutputSha256: digestOutput(diagnostics.types),
              typeOutputSummary: summarizeOutput(diagnostics.types, temporaryRoot)
            }
          : null,
        trackedWorktreeClean: targetTrackedStatus === ""
      }
    };

    const serialized = `${JSON.stringify(report, null, 2)}\n`;
    if (outputPath) {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, serialized, "utf8");
    }
    process.stdout.write(serialized);
    if (failures.length > 0) process.exitCode = 1;
  } finally {
    if (process.env.KEEP_SMALL_OSS_HISTORY_TEMP === "1") {
      process.stderr.write(`Kept small-OSS history validation data at ${temporaryRoot}\n`);
    } else {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
}

function cloneHistory(target) {
  run("git", ["init", "--quiet"], { cwd: target });
  run("git", ["remote", "add", "origin", repository.url], { cwd: target });
  run("git", ["fetch", "--depth", "1", "origin", repository.parentCommit], { cwd: target, timeout: 180_000 });
  run("git", ["fetch", "--depth", "1", "origin", repository.groundTruthCommit], { cwd: target, timeout: 180_000 });
  run("git", ["-c", "advice.detachedHead=false", "checkout", "--detach", repository.parentCommit], { cwd: target });
  assert.equal(run("git", ["rev-parse", "HEAD"], { cwd: target }).stdout.trim(), repository.parentCommit);
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  if (index < 0) return undefined;
  assert.ok(args[index + 1], "--out requires a repository-relative path.");
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.ok(resolved.startsWith(`${projectRoot}${path.sep}`), "Validation output must stay inside the Vertex Palace repository.");
  return resolved;
}

function parsePackMetadata(stdout) {
  const start = stdout.indexOf("[");
  const end = stdout.lastIndexOf("]");
  assert.ok(start >= 0 && end >= start, `npm pack did not return JSON: ${stdout}`);
  const entries = JSON.parse(stdout.slice(start, end + 1));
  assert.equal(entries.length, 1);
  return entries[0];
}

function stripLocation(sourcePath) {
  return sourcePath.replace(/:\d+(?:-\d+)?$/, "");
}

function lines(value) {
  return value.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
}

function sameValues(actual, expected) {
  return actual.length === expected.length
    && [...actual].sort().every((value, index) => value === [...expected].sort()[index]);
}

function unique(values) {
  return [...new Set(values)];
}

function round(value) {
  return Number(value.toFixed(3));
}

function digestOutput(result) {
  return createHash("sha256")
    .update(`${result.stdout}\n${result.stderr}\n${result.error?.message ?? ""}`)
    .digest("hex");
}

function summarizeOutput(result, temporaryRoot) {
  const combined = `${result.stdout}\n${result.stderr}\n${result.error?.message ?? ""}`
    .replaceAll(temporaryRoot, "<temporary-validation-root>")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .slice(0, 40)
    .join("\n");
  return combined.slice(0, 4_000);
}

function parseRouteTrial(trial, result) {
  const base = {
    trial,
    status: result.status,
    elapsedMs: result.durationMs,
    outputSha256: digestOutput(result),
    processError: result.error
  };
  if (result.status !== 0) return base;

  try {
    const output = JSON.parse(result.stdout);
    const boundaries = output.executionBoundaries;
    assert.ok(boundaries && typeof boundaries === "object");
    for (const key of ["primary", "support", "deferred"]) assert.ok(Array.isArray(boundaries[key]));
    assert.ok(output.route && typeof output.route === "object");
    assert.ok(output.payload && typeof output.payload.contextEstimatedTokens === "number");
    const routeFiles = unique([
      ...boundaries.primary,
      ...boundaries.support,
      ...boundaries.deferred
    ].map(stripLocation));
    return {
      ...base,
      mode: output.mode,
      taskType: output.route.taskType,
      routeConfidence: output.route.confidence,
      payload: output.payload,
      boundaries,
      routeFiles
    };
  } catch (error) {
    return {
      ...base,
      parseError: error instanceof Error ? error.message : String(error)
    };
  }
}

function runNpm(args, options) {
  const result = runNpmAllowFailure(args, options);
  if (result.status !== 0) throw commandError("npm", args, result);
  return result;
}

function runNpmAllowFailure(args, options) {
  if (process.platform === "win32") {
    const commandLine = `npm ${args.map(quoteCmdArgument).join(" ")}`;
    return runAllowFailure(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", commandLine], options);
  }
  return runAllowFailure("npm", args, options);
}

function runNode(args, options) {
  return run(process.execPath, args, options);
}

function runNodeAllowFailure(args, options) {
  return runAllowFailure(process.execPath, args, options);
}

function quoteCmdArgument(value) {
  const text = String(value);
  assert.ok(!text.includes('"'), "Validation command arguments must not contain quotes.");
  return /\s/.test(text) ? `"${text}"` : text;
}

function run(command, args, options = {}) {
  const result = runAllowFailure(command, args, options);
  if (result.status !== 0) throw commandError(command, args, result);
  return result;
}

function runAllowFailure(command, args, options = {}) {
  const startedAt = performance.now();
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: process.env,
    shell: false,
    windowsHide: true,
    maxBuffer: 30 * 1024 * 1024,
    timeout: options.timeout ?? 120_000
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error
      ? {
          name: result.error.name,
          message: result.error.message,
          code: result.error.code ?? null
        }
      : null,
    durationMs: Math.round(performance.now() - startedAt)
  };
}

function commandError(command, args, result) {
  return new Error([
    `Command failed (${result.status}): ${command} ${args.join(" ")}`,
    result.error?.message,
    result.stdout,
    result.stderr
  ].filter(Boolean).join("\n"));
}
