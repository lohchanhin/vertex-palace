const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { classifyTaskType } = require("./lib/commit-task-classifier.cjs");
const {
  allowedAuxiliaryExtensions,
  classifyFileSurfaces
} = require("./lib/held-out-file-surfaces.cjs");

const projectRoot = path.resolve(__dirname, "..");
const studyId = "local-blind-routing-round-9-0.4-alpha";
const poolRelativePath = "docs/research/evidence/local-blind-routing-repository-pool-0.4-alpha-round-9.json";
const freezeRelativePath = "docs/research/evidence/local-blind-candidate-freeze-0.4-alpha-round-9.json";
const poolPath = path.join(projectRoot, poolRelativePath);
const freezePath = path.join(projectRoot, freezeRelativePath);
const outputPath = outputArgument(process.argv.slice(2));
const fetchDepth = 400;
const scanLimit = 300;
const materializationAttempts = 3;
const retryDelayMs = 5_000;
const sourceHashSeeds = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "tsconfig.json",
  "tsup.package-cli.config.ts",
  "tsup.plugin-mcp.config.ts",
  "packages"
];

main().catch(async (error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  try {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify({
      schemaVersion: 1,
      studyId,
      generatedAt: new Date().toISOString(),
      status: "selection-failed",
      claimBoundary: "Unexpected local selection failure preserved before any Round 9 task was sent to Palace. This is not a product result or public preregistration.",
      failureCategory: "unexpected-selector-failure",
      palaceCallsOnCandidateTasksDuringSelection: 0,
      error: summarizeError(error)
    }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  } catch (preservationError) {
    process.stderr.write(`Could not preserve selector failure: ${summarizeError(preservationError)}\n`);
  }
  process.exitCode = 1;
});

async function main() {
  const freeze = await assertLocalFreeze();
  const poolBytes = await readFile(poolPath);
  const pool = JSON.parse(poolBytes.toString("utf8"));
  await validatePool(pool, freeze);

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-local-blind-round-9-selection-"));
  assertInsideTemporaryRoot(temporaryRoot);
  let manifest;

  try {
    const repositoryReports = [];
    const targets = [];
    const selectedFamilyCounts = new Map(
      pool.rules.requiredLanguageFamilies.map((family) => [family, 0])
    );

    for (const repository of pool.repositoryPool) {
      if (targets.length >= pool.rules.desiredTargets && hasRequiredLanguageDiversity(pool, selectedFamilyCounts)) {
        repositoryReports.push(notInspectedReport(repository, "reserved-fallback-not-inspected"));
        continue;
      }

      const familyCount = selectedFamilyCounts.get(repository.languageFamily) ?? 0;
      if (familyCount >= pool.rules.targetsPerLanguageFamily) {
        repositoryReports.push(notInspectedReport(repository, "family-quota-filled-not-inspected"));
        continue;
      }

      const repositoryRoot = path.join(temporaryRoot, repository.name);
      const preparation = await prepareRepository(repository, repositoryRoot, temporaryRoot);
      if (!preparation.completed) {
        repositoryReports.push({
          ...notInspectedReport(repository, "setup-error"),
          materializationAttempts: preparation.attempts
        });
        continue;
      }

      let report;
      try {
        report = inspectRepository(repository, repositoryRoot, pool.rules);
      } catch (error) {
        report = {
          ...notInspectedReport(repository, "inspection-error"),
          failureCategory: isNetworkFailure(error) ? "environment-inspection-error" : "harness-inspection-error",
          inspectionError: summarizeError(error)
        };
      }
      report.materializationAttempts = preparation.attempts;
      repositoryReports.push(report);
      if (report.selectedTarget) {
        targets.push(report.selectedTarget);
        selectedFamilyCounts.set(repository.languageFamily, familyCount + 1);
      }
    }

    const languageDiversitySatisfied = hasRequiredLanguageDiversity(pool, selectedFamilyCounts);
    const status = targets.length === pool.rules.desiredTargets && languageDiversitySatisfied
      ? "selected"
      : "selection-failed";
    manifest = {
      schemaVersion: 1,
      studyId,
      generatedAt: new Date().toISOString(),
      status,
      claimBoundary: "Mechanical local candidate-held-out target selection only. The frozen baseline and candidate have not initialized, indexed, routed, packed, contextualized, or evaluated any selected Round 9 task. This locally hash-frozen evidence is not public preregistration.",
      evidenceClass: "local-hash-frozen-candidate-held-out-target-selection",
      publicPreregistration: false,
      heldOutAgainstCandidate: true,
      candidate: freeze.candidate,
      comparisonBaseline: freeze.comparisonBaseline,
      localFreeze: {
        path: freezeRelativePath,
        sha256: await sha256File(freezePath),
        frozenAt: freeze.frozenAt,
        artifactHashesVerified: true
      },
      selector: {
        path: "scripts/select-local-blind-routing-targets-round-9.cjs",
        sha256: freeze.artifacts["scripts/select-local-blind-routing-targets-round-9.cjs"]
      },
      repositoryPool: {
        path: poolRelativePath,
        sha256: sha256Bytes(poolBytes),
        priorExclusionSource: pool.priorExclusionSource,
        repositories: pool.repositoryPool
      },
      rules: {
        ...pool.rules,
        languageDiversitySatisfied,
        selectedPerLanguageFamily: Object.fromEntries(selectedFamilyCounts),
        fetchDepth,
        fetchMode: "complete-shallow-history-no-promisor",
        scanLimit,
        nonMergeSingleParent: true,
        newestEligibleCommitWins: true,
        allFilesMustBeModified: true,
        requiresImplementationAndFocusedTest: true,
        implementationAndTestMustUsePrimaryLanguageExtension: true,
        auxiliaryFilesAreIncludedInOracle: true,
        expectedTaskTypeDerivedBeforeRouting: true,
        materializationAttempts,
        retryDelayMs,
        palaceCallsOnCandidateTasksDuringSelection: 0,
        outputCreateOnly: true
      },
      repositoryReports,
      targets
    };

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx"
    });
    process.stdout.write(`${JSON.stringify({
      outputPath,
      status,
      selectedTargets: targets.map(({ name, languageFamily }) => ({ name, languageFamily })),
      selectedPerLanguageFamily: Object.fromEntries(selectedFamilyCounts),
      palaceCallsOnCandidateTasksDuringSelection: 0
    }, null, 2)}\n`);
  } finally {
    if (process.env.KEEP_LOCAL_BLIND_ROUND_9_SELECTION_TEMP === "1") {
      process.stderr.write(`Keeping Round 9 selection repositories at ${temporaryRoot}\n`);
    } else {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }

  if (manifest?.status !== "selected") process.exitCode = 1;
}

async function assertLocalFreeze() {
  const freeze = JSON.parse(await readFile(freezePath, "utf8"));
  assert.equal(freeze.schemaVersion, 1);
  assert.equal(freeze.studyId, studyId);
  assert.equal(freeze.status, "locally-frozen");
  assert.equal(freeze.publicPreregistration, false);
  assert.equal(freeze.competitionFreeze.noCommit, true);
  assert.equal(freeze.competitionFreeze.noPush, true);
  assert.equal(run("git", ["rev-parse", "HEAD"], { cwd: projectRoot }).stdout.trim(), freeze.candidate.baseCommit);
  run("git", ["cat-file", "-e", `${freeze.comparisonBaseline.productCommit}^{commit}`], { cwd: projectRoot });

  for (const [relativePath, expectedHash] of Object.entries(freeze.artifacts)) {
    assert.equal(await sha256File(path.join(projectRoot, relativePath)), expectedHash, `${relativePath} changed after local freeze`);
  }

  assert.equal(
    await sha256File(path.join(projectRoot, freeze.candidate.cliPath)),
    freeze.candidate.cliSha256,
    "Candidate CLI changed after local freeze"
  );
  assert.equal(
    await sha256File(path.join(projectRoot, freeze.candidate.generatedMcpPath)),
    freeze.candidate.generatedMcpSha256,
    "Generated MCP bundle changed after local freeze"
  );
  const sourceTree = await hashSourceTree(projectRoot);
  assert.deepEqual(sourceTree, freeze.candidate.sourceTree, "Candidate source tree changed after local freeze");
  return freeze;
}

async function validatePool(pool, freeze) {
  assert.equal(pool.schemaVersion, 1);
  assert.equal(pool.studyId, studyId);
  assert.equal(pool.status, "locally-frozen");
  assert.equal(pool.rules.desiredTargets, 8);
  assert.deepEqual(pool.rules.requiredLanguageFamilies, [
    "javascript-typescript",
    "python",
    "go",
    "rust"
  ]);
  assert.equal(pool.rules.targetsPerLanguageFamily, 2);
  assert.equal(pool.rules.repositoriesPerLanguageFamily, 4);
  assert.equal(pool.rules.minimumFiles, 2);
  assert.equal(pool.rules.maximumFiles, 8);
  assert.equal(pool.rules.maximumAuxiliaryFiles, 2);
  assert.equal(pool.rules.maximumChangedLines, 400);
  assert.deepEqual(pool.rules.allowedAuxiliaryExtensions, allowedAuxiliaryExtensions);
  assert.equal(pool.rules.taskClassifier, "inflected-behavioral-subject-v1");
  assert.equal(pool.rules.commitHistoryInspectedBeforePoolFreeze, false);
  assert.equal(pool.rules.palaceCallsOnCandidateTasksBeforePoolFreeze, 0);
  assert.equal(pool.rules.baselineAndCandidateFrozenBeforeTargetSelection, true);
  assert.equal(pool.rules.outputCreateOnly, true);
  assert.equal(pool.repositoryPool.length, 16);
  assert.equal(pool.candidateFreeze.path, freezeRelativePath);

  const priorPath = path.join(projectRoot, pool.priorExclusionSource.path);
  const priorBytes = await readFile(priorPath);
  assert.equal(sha256Bytes(priorBytes), pool.priorExclusionSource.sha256);
  const prior = JSON.parse(priorBytes.toString("utf8"));
  const observed = new Set([
    ...prior.previouslyObservedRepositories,
    ...prior.repositoryPool.map((repository) => repository.url)
  ].map(normalizeRepositoryUrl));
  assert.equal(observed.size, pool.priorExclusionSource.expectedUniqueRepositoryCount);

  const poolUrls = pool.repositoryPool.map((repository) => normalizeRepositoryUrl(repository.url));
  assert.equal(new Set(poolUrls).size, pool.repositoryPool.length, "Round 9 pool contains duplicate URLs");
  for (const repository of pool.repositoryPool) {
    assert.ok(!observed.has(normalizeRepositoryUrl(repository.url)), `${repository.name} was previously observed`);
    assert.ok(pool.rules.requiredLanguageFamilies.includes(repository.languageFamily));
    assert.match(repository.pinnedHead, /^[0-9a-f]{40}$/);
    assert.ok(repository.extensions.length > 0);
  }
  for (const family of pool.rules.requiredLanguageFamilies) {
    assert.equal(
      pool.repositoryPool.filter((repository) => repository.languageFamily === family).length,
      pool.rules.repositoriesPerLanguageFamily
    );
  }
}

function inspectRepository(repository, root, rules) {
  const commits = lines(
    run("git", ["rev-list", "--no-merges", `--max-count=${scanLimit}`, "HEAD"], { cwd: root }).stdout
  );
  const rejectionCounts = {};
  for (let index = 0; index < commits.length; index += 1) {
    const inspected = inspectCommit(repository, root, commits[index], rules);
    if (inspected.target) {
      return {
        name: repository.name,
        languageFamily: repository.languageFamily,
        url: repository.url,
        pinnedHead: repository.pinnedHead,
        status: "selected",
        scannedCommits: index + 1,
        rejectionCounts,
        selectedTarget: inspected.target
      };
    }
    rejectionCounts[inspected.reason] = (rejectionCounts[inspected.reason] ?? 0) + 1;
  }
  return {
    name: repository.name,
    languageFamily: repository.languageFamily,
    url: repository.url,
    pinnedHead: repository.pinnedHead,
    status: "no-eligible-commit",
    scannedCommits: commits.length,
    rejectionCounts,
    selectedTarget: null
  };
}

function inspectCommit(repository, root, commit, rules) {
  const parents = lines(run("git", ["show", "-s", "--format=%P", commit], { cwd: root }).stdout);
  const parentParts = parents[0]?.split(/\s+/).filter(Boolean) ?? [];
  if (parentParts.length !== 1) return rejected("not-single-parent");
  const parentCommit = parentParts[0];
  if (!gitObjectExists(root, `${parentCommit}^{commit}`)) return rejected("parent-not-fetched");

  const message = run("git", ["show", "-s", "--format=%B", commit], { cwd: root }).stdout.trim();
  const subject = message.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "";
  const expectedTaskType = classifyTaskType(subject);
  if (subject.length < 20 || subject.length > 180 || !expectedTaskType) {
    return rejected("non-behavioral-or-ambiguous-subject");
  }

  const changes = parseNameStatus(
    run("git", ["diff", "--name-status", "--find-renames", parentCommit, commit, "--"], { cwd: root }).stdout
  );
  if (changes.length < rules.minimumFiles || changes.length > rules.maximumFiles) {
    return rejected("file-count-outside-range");
  }
  if (changes.some((change) => change.status !== "M")) return rejected("contains-non-modified-file");
  const changedFiles = changes.map((change) => change.path);
  const surfaces = classifyFileSurfaces(changedFiles, repository.extensions, rules.maximumAuxiliaryFiles);
  if (!surfaces.eligible) return rejected(surfaces.reason);

  const stats = parseNumstat(
    run("git", ["diff", "--numstat", parentCommit, commit, "--", ...changedFiles], { cwd: root }).stdout
  );
  if (!stats || stats.changedLines < 2 || stats.changedLines > rules.maximumChangedLines) {
    return rejected("changed-lines-outside-range-or-binary");
  }
  for (const file of changedFiles) {
    if (!gitObjectExists(root, `${parentCommit}:${file}`) || !gitObjectExists(root, `${commit}:${file}`)) {
      return rejected("file-not-present-on-both-sides");
    }
  }

  return {
    target: {
      name: repository.name,
      language: repository.language,
      languageFamily: repository.languageFamily,
      url: repository.url,
      pinnedHead: repository.pinnedHead,
      routeCommit: parentCommit,
      groundTruthCommit: commit,
      task: subject,
      expectedTaskType,
      changedFiles,
      implementationFiles: surfaces.implementationFiles,
      testFiles: surfaces.testFiles,
      auxiliaryFiles: surfaces.auxiliaryFiles,
      oracleSource: "mechanically selected single-parent real Git-history diff",
      changedLines: stats.changedLines,
      additions: stats.additions,
      deletions: stats.deletions
    }
  };
}

async function prepareRepository(repository, target, temporaryRoot) {
  const attempts = [];
  for (let attempt = 1; attempt <= materializationAttempts; attempt += 1) {
    const startedAt = Date.now();
    try {
      assertInside(target, temporaryRoot);
      await rm(target, { recursive: true, force: true });
      await clonePinnedRepository(repository, target);
      attempts.push({ attempt, status: "completed", elapsedMs: Date.now() - startedAt, errorCode: null, error: null });
      return { completed: true, attempts };
    } catch (error) {
      attempts.push({
        attempt,
        status: "environment-failed",
        elapsedMs: Date.now() - startedAt,
        errorCode: error.code || null,
        error: summarizeError(error)
      });
      if (attempt < materializationAttempts) await delay(retryDelayMs);
    }
  }
  return { completed: false, attempts };
}

async function clonePinnedRepository(repository, target) {
  await mkdir(target, { recursive: true });
  run("git", ["init", "--quiet"], { cwd: target });
  run("git", ["remote", "add", "origin", repository.url], { cwd: target });
  run("git", [
    "fetch",
    "--quiet",
    `--depth=${fetchDepth}`,
    "origin",
    repository.pinnedHead
  ], { cwd: target, timeout: 300_000 });
  run("git", ["-c", "advice.detachedHead=false", "checkout", "--detach", repository.pinnedHead], {
    cwd: target,
    timeout: 120_000
  });
  assert.equal(run("git", ["rev-parse", "HEAD"], { cwd: target }).stdout.trim(), repository.pinnedHead);
}

async function hashSourceTree(root) {
  const files = [];
  async function walk(relativePath) {
    const absolutePath = path.join(root, relativePath);
    const entry = await stat(absolutePath);
    if (!entry.isDirectory()) {
      files.push(relativePath.split(path.sep).join("/"));
      return;
    }
    for (const child of (await readdir(absolutePath)).sort()) {
      if (child === "dist" || child === "node_modules") continue;
      await walk(path.join(relativePath, child));
    }
  }
  for (const seed of sourceHashSeeds) await walk(seed);
  files.sort();
  const hash = createHash("sha256");
  for (const relativePath of files) {
    const bytes = await readFile(path.join(root, ...relativePath.split("/")));
    hash.update(relativePath);
    hash.update("\0");
    hash.update(String(bytes.length));
    hash.update("\0");
    hash.update(bytes);
    hash.update("\0");
  }
  return {
    algorithm: "sha256-path-length-bytes-v1",
    fileCount: files.length,
    sha256: hash.digest("hex").toUpperCase()
  };
}

function hasRequiredLanguageDiversity(pool, selectedFamilyCounts) {
  return pool.rules.requiredLanguageFamilies.every(
    (family) => (selectedFamilyCounts.get(family) ?? 0) >= pool.rules.targetsPerLanguageFamily
  );
}

function notInspectedReport(repository, status) {
  return {
    name: repository.name,
    languageFamily: repository.languageFamily,
    url: repository.url,
    pinnedHead: repository.pinnedHead,
    status,
    scannedCommits: 0,
    rejectionCounts: {},
    selectedTarget: null
  };
}

function normalizeRepositoryUrl(value) {
  return value.toLowerCase().replace(/\.git$/, "").replace(/\/$/, "");
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

function parseNameStatus(value) {
  return lines(value).map((line) => {
    const parts = line.split("\t");
    return { status: parts[0], path: parts.at(-1) };
  }).filter((entry) => entry.status && entry.path);
}

function parseNumstat(value) {
  let additions = 0;
  let deletions = 0;
  for (const line of lines(value)) {
    const [added, deleted] = line.split("\t");
    if (!/^\d+$/.test(added) || !/^\d+$/.test(deleted)) return null;
    additions += Number(added);
    deletions += Number(deleted);
  }
  return { additions, deletions, changedLines: additions + deletions };
}

function rejected(reason) {
  return { target: null, reason };
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  assert.ok(index >= 0, "--out is required so the first selection result cannot be lost");
  assert.ok(args[index + 1], "--out requires a repository-relative path");
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.ok(resolved.startsWith(`${projectRoot}${path.sep}`), "Output must stay inside the repository");
  return resolved;
}

function assertInsideTemporaryRoot(temporaryRoot) {
  assert.ok(
    path.resolve(temporaryRoot).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`),
    "Temporary selection root must stay inside the OS temporary directory"
  );
}

function assertInside(target, root) {
  const relative = path.relative(root, target);
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

async function sha256File(filePath) {
  return sha256Bytes(await readFile(filePath));
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function lines(value) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function summarizeError(error) {
  const text = error instanceof Error ? error.stack ?? error.message : String(error);
  return text.length <= 12_000 ? text : `${text.slice(0, 12_000)}\n...[truncated]`;
}

function isNetworkFailure(error) {
  const text = error instanceof Error ? error.stack ?? error.message : String(error);
  return /could not resolve host|unable to access|connection|network|timed?\s*out|eai_again|econn/i.test(text);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
