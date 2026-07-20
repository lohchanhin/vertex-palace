const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdir, mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const packageJson = require(path.join(projectRoot, "package.json"));
const outputPath = outputArgument(process.argv.slice(2));
const budget = 6_000;
const trialsPerRepository = 2;
const minimumTargetRecall = 1;
const minimumTargetPrecision = 1;
const packageSourceCommit = "805074b78a65e1d50c88085a7ea66f50d30bce5d";
const expectedPackageShasum = "45513d0001a00f34b55e0fe2bbdf19b14e516bff";
const expectedPackageIntegrity = "sha512-IE6dixh5nLQScK4dKpF35cWFmesUeK5iNEsXB6zGUARD7G+32ck3MepjPAFV4umtPh1mLT3RV7vkzaKZqrp9pA==";

const repositories = [
  {
    name: "zod",
    language: "TypeScript",
    url: "https://github.com/colinhacks/zod.git",
    commit: "912f0f51b0ced654d0069741e7160834dca742ee",
    task: "A codec-backed discriminated union decodes correctly but fails when encoding because input and output discriminator values differ. Preserve fast decoding while allowing backward encoding to select the right option, and update the focused regression tests.",
    expectedPrimary: "packages/zod/src/v4/core/schemas.ts",
    expectedVerification: "packages/zod/src/v4/classic/tests/discriminated-unions.test.ts"
  },
  {
    name: "requests",
    language: "Python",
    url: "https://github.com/psf/requests.git",
    commit: "f361ead047be5cb873174218582f7d8b9fcd9f49",
    task: "Fix redirect authorization handling so credentials are preserved for same-host default-port redirects and HTTP-to-HTTPS upgrades, but stripped on host, downgrade, or nonstandard port changes. Update the focused regression tests.",
    expectedPrimary: "src/requests/sessions.py",
    expectedVerification: "tests/test_requests.py"
  }
];

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-real-repositories-"));
  assert.ok(
    path.resolve(temporaryRoot).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`),
    "Temporary validation root must stay inside the OS temporary directory."
  );

  try {
    const packRoot = path.join(temporaryRoot, "pack");
    const installRoot = path.join(temporaryRoot, "install");
    const repositoriesRoot = path.join(temporaryRoot, "repositories");
    await Promise.all([mkdir(packRoot), mkdir(installRoot), mkdir(repositoriesRoot)]);

    const packResult = runNpm(
      ["pack", "--json", "--ignore-scripts", "--pack-destination", packRoot],
      { cwd: projectRoot }
    );
    const metadata = parsePackMetadata(packResult.stdout);
    assert.equal(metadata.name, packageJson.name);
    assert.equal(metadata.version, "0.3.0");
    assert.equal(metadata.files.length, 7);

    const tarballPath = path.join(packRoot, metadata.filename);
    const tarball = await readFile(tarballPath);
    const shasum = createHash("sha1").update(tarball).digest("hex");
    assert.equal(shasum, metadata.shasum);
    assert.equal(shasum, expectedPackageShasum);
    assert.equal(metadata.integrity, expectedPackageIntegrity);

    runNpm(
      ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--loglevel=error", "--prefix", installRoot, tarballPath],
      { cwd: temporaryRoot }
    );
    const cliPath = path.join(installRoot, "node_modules", packageJson.name, "dist", "palace.cjs");
    const installedVersion = runNode([cliPath, "--version"], { cwd: temporaryRoot }).stdout.trim();
    assert.equal(installedVersion, packageJson.version);

    const repositoryReports = [];
    for (const repository of repositories) {
      const repositoryRoot = path.join(repositoriesRoot, repository.name);
      await clonePinnedRepository(repository, repositoryRoot);
      repositoryReports.push(await validateRepository(repository, repositoryRoot, cliPath));
    }

    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      claimBoundary: "Product routing and packaging validation only; not an Agent performance benchmark.",
      sourceCommit: packageSourceCommit,
      validationHarnessCommit: run("git", ["rev-parse", "HEAD"], { cwd: projectRoot }).stdout.trim(),
      candidate: {
        package: `${metadata.name}@${metadata.version}`,
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
      protocol: {
        budget,
        trialsPerRepository,
        minimumTargetRecall,
        minimumTargetPrecision,
        cleanPinnedClonePerRepository: true,
        trackedWorktreeMutationAllowed: false
      },
      repositories: repositoryReports
    };
    const serialized = `${JSON.stringify(report, null, 2)}\n`;
    if (outputPath) {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, serialized, "utf8");
    }
    process.stdout.write(serialized);
  } finally {
    if (process.env.KEEP_REAL_REPOSITORY_TEMP === "1") {
      process.stderr.write(`Kept real-repository validation data at ${temporaryRoot}\n`);
    } else {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
}

async function clonePinnedRepository(repository, target) {
  await mkdir(target, { recursive: true });
  run("git", ["init", "--quiet"], { cwd: target });
  run("git", ["remote", "add", "origin", repository.url], { cwd: target });
  run("git", ["fetch", "--depth", "1", "origin", repository.commit], { cwd: target, timeout: 180_000 });
  run("git", ["-c", "advice.detachedHead=false", "checkout", "--detach", "FETCH_HEAD"], { cwd: target });
  assert.equal(run("git", ["rev-parse", "HEAD"], { cwd: target }).stdout.trim(), repository.commit);
}

async function validateRepository(repository, root, cliPath) {
  const trials = [];
  for (let trial = 1; trial <= trialsPerRepository; trial += 1) {
    const startedAt = performance.now();
    const raw = runNode(
      [cliPath, "context", repository.task, "--auto", "--format", "json", "--budget", String(budget)],
      { cwd: root, timeout: 180_000 }
    ).stdout;
    const output = JSON.parse(raw);
    const elapsedMs = Math.round(performance.now() - startedAt);
    assert.equal(output.mode, "full-palace");
    assert.equal(output.route.taskType, "bugfix");
    assert.ok(output.payload.contextEstimatedTokens <= budget);

    const boundaries = output.executionBoundaries;
    for (const key of ["primary", "support", "deferred", "excluded"]) assert.ok(Array.isArray(boundaries[key]));
    const routeFiles = unique([
      ...boundaries.primary,
      ...boundaries.support,
      ...boundaries.deferred
    ].map(stripLocation));
    const excludedFiles = unique(
      boundaries.excluded
        .map((entry) => typeof entry === "string" ? entry : entry?.sourcePath)
        .filter((sourcePath) => typeof sourcePath === "string" && sourcePath.length > 0)
        .map(stripLocation)
    );
    const selectedExcludedOverlap = routeFiles.filter((selected) =>
      excludedFiles.some((excluded) => pathsOverlap(selected, excluded))
    );
    assert.ok(boundaries.primary.some((entry) => stripLocation(entry) === repository.expectedPrimary));
    assert.ok(
      [...boundaries.primary, ...boundaries.support].some(
        (entry) => stripLocation(entry) === repository.expectedVerification
      )
    );
    assert.deepEqual(selectedExcludedOverlap, []);

    trials.push({
      trial,
      elapsedMs,
      mode: output.mode,
      taskType: output.route.taskType,
      routeConfidence: output.route.confidence,
      boundaries,
      payload: output.payload,
      routeFiles,
      excludedFiles,
      selectedExcludedOverlap
    });
  }

  assert.deepEqual(trials[1].boundaries, trials[0].boundaries);
  const expected = new Set([repository.expectedPrimary, repository.expectedVerification]);
  const routeFiles = trials[0].routeFiles;
  const truePositiveCount = routeFiles.filter((file) => expected.has(file)).length;
  const targetRecall = round(truePositiveCount / expected.size);
  const targetPrecision = round(truePositiveCount / routeFiles.length);
  const selectedExcludedOverlap = unique(trials.flatMap((trial) => trial.selectedExcludedOverlap));
  assert.equal(targetRecall, minimumTargetRecall, `${repository.name} target recall fell below the release gate`);
  assert.equal(targetPrecision, minimumTargetPrecision, `${repository.name} target precision fell below the release gate`);
  const trackedStatus = run("git", ["status", "--short", "--untracked-files=no"], { cwd: root }).stdout.trim();
  assert.equal(trackedStatus, "");
  const fileHashes = JSON.parse(await readFile(path.join(root, ".palace", "indexes", "file-hashes.json"), "utf8"));

  return {
    name: repository.name,
    language: repository.language,
    url: repository.url,
    commit: repository.commit,
    indexedFiles: Object.keys(fileHashes).length,
    expected: {
      primary: repository.expectedPrimary,
      verification: repository.expectedVerification
    },
    routeQuality: {
      targetRecall,
      targetPrecision,
      unexpectedBoundaryFiles: routeFiles.filter((file) => !expected.has(file)),
      selectedExcludedOverlap
    },
    deterministicBoundaries: true,
    trackedWorktreeClean: true,
    trials
  };
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  if (index < 0) return undefined;
  assert.ok(args[index + 1], "--out requires a repository-relative path.");
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.ok(
    resolved.startsWith(`${projectRoot}${path.sep}`),
    "Validation output must stay inside the Vertex Palace repository."
  );
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

function pathsOverlap(left, right) {
  const normalizedLeft = left.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "").toLowerCase();
  const normalizedRight = right.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "").toLowerCase();
  return normalizedLeft === normalizedRight
    || normalizedLeft.startsWith(`${normalizedRight}/`)
    || normalizedRight.startsWith(`${normalizedLeft}/`);
}

function unique(values) {
  return [...new Set(values)];
}

function round(value) {
  return Number(value.toFixed(3));
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
  assert.ok(!text.includes('"'), "Validation command arguments must not contain quotes.");
  return /\s/.test(text) ? `"${text}"` : text;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: process.env,
    shell: false,
    windowsHide: true,
    maxBuffer: 30 * 1024 * 1024,
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
