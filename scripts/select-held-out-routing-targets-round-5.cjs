const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdir, mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const outputPath = outputArgument(process.argv.slice(2));
const studyId = "held-out-cross-repository-routing-round-5-0.4-alpha";
const poolRelativePath = "docs/research/evidence/held-out-routing-repository-pool-0.4-alpha-round-5.json";
const poolPath = path.join(projectRoot, poolRelativePath);
const candidateCommit = "f61207688badbe07818470a42441a3a966a8bdf0";
const candidateCliPath = path.join(projectRoot, "dist", "palace.cjs");
const candidateCliSha256 = "72E18636847227AD81D07132CCC47F1F0E62C279366221F1D2DF5CB04F2D0CFC";
const fetchDepth = 400;
const scanLimit = 300;
const minimumFiles = 2;
const maximumFiles = 6;
const maximumChangedLines = 400;
const materializationAttempts = 3;
const retryDelayMs = 5_000;

const frozenCandidatePaths = [
  "packages",
  "plugins/vertex-palace/mcp/server.cjs"
];

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  await assertFrozenCandidate();
  assert.equal(
    run("git", ["status", "--short", "--untracked-files=no"], { cwd: projectRoot }).stdout.trim(),
    "",
    "Commit tracked pool, selection protocol, selector, and tests before choosing targets."
  );

  const poolBytes = await readFile(poolPath);
  const pool = JSON.parse(poolBytes.toString("utf8"));
  validatePool(pool);

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-held-out-round-5-selection-"));
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

      const report = inspectRepository(repository, repositoryRoot);
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
    const selectorCommit = run("git", ["rev-parse", "HEAD"], { cwd: projectRoot }).stdout.trim();
    manifest = {
      schemaVersion: 3,
      studyId,
      generatedAt: new Date().toISOString(),
      status,
      claimBoundary: "Mechanical candidate-held-out target selection only. The frozen Vertex Palace candidate has not initialized, indexed, routed, packed, contextualized, or evaluated any selected task.",
      heldOutAgainstCandidate: true,
      candidate: {
        productCommit: candidateCommit,
        cliPath: "dist/palace.cjs",
        cliSha256: candidateCliSha256,
        frozenPaths: frozenCandidatePaths
      },
      selector: {
        commit: selectorCommit,
        path: "scripts/select-held-out-routing-targets-round-5.cjs"
      },
      repositoryPool: {
        path: poolRelativePath,
        commit: selectorCommit,
        sha256: createHash("sha256").update(poolBytes).digest("hex").toUpperCase(),
        previouslyObservedRepositories: pool.previouslyObservedRepositories,
        repositories: pool.repositoryPool
      },
      rules: {
        desiredTargets: pool.rules.desiredTargets,
        requiredLanguageFamilies: pool.rules.requiredLanguageFamilies,
        targetsPerLanguageFamily: pool.rules.targetsPerLanguageFamily,
        languageDiversitySatisfied,
        selectedPerLanguageFamily: Object.fromEntries(selectedFamilyCounts),
        repositoryOrderIsBinding: true,
        firstEligibleRepositoriesPerFamilyWin: true,
        fallbackOnlyAfterNoEligibleCommitOrSetupFailureInThatFamily: true,
        fetchDepth,
        scanLimit,
        nonMergeSingleParent: true,
        newestEligibleCommitWins: true,
        minimumFiles,
        maximumFiles,
        allFilesMustBeModifiedSourceFiles: true,
        requiresImplementationAndFocusedTest: true,
        maximumChangedLines,
        behavioralCommitSubjectRequired: true,
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
      selectedTargets: targets.map((target) => ({
        name: target.name,
        languageFamily: target.languageFamily
      })),
      selectedPerLanguageFamily: Object.fromEntries(selectedFamilyCounts)
    }, null, 2)}\n`);
  } finally {
    if (process.env.KEEP_HELD_OUT_SELECTION_ROUND_5_TEMP === "1") {
      process.stderr.write(`Keeping Round 5 selection repositories at ${temporaryRoot}\n`);
    } else {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }

  if (manifest?.status !== "selected") process.exitCode = 1;
}

function validatePool(pool) {
  assert.equal(pool.schemaVersion, 1);
  assert.equal(pool.studyId, studyId);
  assert.equal(pool.status, "preregistered");
  assert.equal(pool.candidate.productCommit, candidateCommit);
  assert.equal(pool.candidate.cliSha256, candidateCliSha256);
  assert.equal(pool.rules.desiredTargets, 8);
  assert.deepEqual(
    pool.rules.requiredLanguageFamilies,
    ["javascript-typescript", "python", "go", "rust"]
  );
  assert.equal(pool.rules.targetsPerLanguageFamily, 2);
  assert.equal(pool.rules.repositoriesPerLanguageFamily, 3);
  assert.equal(pool.rules.commitHistoryInspectedBeforePoolFreeze, false);
  assert.equal(pool.rules.palaceCallsOnCandidateTasksBeforePoolFreeze, 0);
  assert.equal(pool.repositoryPool.length, 12);

  const observed = new Set(pool.previouslyObservedRepositories.map(normalizeRepositoryUrl));
  const poolUrls = pool.repositoryPool.map((repository) => normalizeRepositoryUrl(repository.url));
  assert.equal(new Set(poolUrls).size, pool.repositoryPool.length, "Repository pool contains duplicate URLs.");
  for (const repository of pool.repositoryPool) {
    assert.ok(!observed.has(normalizeRepositoryUrl(repository.url)), `${repository.name} was previously observed.`);
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

function inspectRepository(repository, root) {
  const commits = lines(
    run("git", ["rev-list", "--no-merges", `--max-count=${scanLimit}`, "HEAD"], { cwd: root }).stdout
  );
  const rejectionCounts = {};
  for (let index = 0; index < commits.length; index += 1) {
    const inspected = inspectCommit(repository, root, commits[index]);
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

function inspectCommit(repository, root, commit) {
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
    run("git", ["diff", "--name-status", "--find-renames", parentCommit, commit, "--"], {
      cwd: root
    }).stdout
  );
  if (changes.length < minimumFiles || changes.length > maximumFiles) {
    return rejected("file-count-outside-range");
  }
  if (changes.some((change) => change.status !== "M")) return rejected("contains-non-modified-file");
  const changedFiles = changes.map((change) => change.path);
  if (changedFiles.some(isExcludedPath)) return rejected("contains-excluded-path");
  if (changedFiles.some((file) => !repository.extensions.includes(path.posix.extname(file).toLowerCase()))) {
    return rejected("contains-non-source-extension");
  }

  const testFiles = changedFiles.filter(isFocusedTestPath);
  const implementationFiles = changedFiles.filter((file) => !isFocusedTestPath(file));
  if (!testFiles.length || !implementationFiles.length) return rejected("missing-implementation-or-test");

  const stats = parseNumstat(
    run("git", ["diff", "--numstat", parentCommit, commit, "--", ...changedFiles], { cwd: root }).stdout
  );
  if (!stats || stats.changedLines < 2 || stats.changedLines > maximumChangedLines) {
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
      implementationFiles,
      testFiles,
      oracleSource: "mechanically selected single-parent real Git-history diff",
      changedLines: stats.changedLines,
      additions: stats.additions,
      deletions: stats.deletions
    }
  };
}

function classifyTaskType(subject) {
  const conventional = subject.match(/^\s*(fix|feat)(?:\([^)]*\))?!?:/i);
  if (conventional?.[1].toLowerCase() === "fix") return "bugfix";
  if (conventional?.[1].toLowerCase() === "feat") return "feature";
  if (/^\s*(?:add|allow|create|implement|support)\b/i.test(subject)) return "feature";
  if (/^\s*(?:fix|debug|repair|correct|resolve)\b/i.test(subject)) return "bugfix";
  return null;
}

function isFocusedTestPath(sourcePath) {
  const normalized = sourcePath.toLowerCase();
  return /(^|\/)(?:test|tests|spec|specs|__tests__)(\/|$)/.test(normalized)
    || /(?:^|\/)(?:test_[^/]+|[^/]+_(?:test|spec))\.[^/]+$/.test(normalized)
    || /(?:^|\/)[^/]*(?:test|tests|spec)\.[^/]+$/.test(normalized);
}

function isExcludedPath(sourcePath) {
  const normalized = sourcePath.toLowerCase();
  return /(^|\/)(?:bench|benches|benchmark|benchmarks|build|coverage|dist|docs?|examples?|fixtures?|generated|node_modules|snapshots?|vendor)(\/|$)/.test(normalized)
    || /(?:^|\/)(?:changelog|changes|license|readme)(?:\.|$)/.test(normalized)
    || /(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|uv\.lock|poetry\.lock|cargo\.lock|go\.sum)$/.test(normalized)
    || /\.snap$/.test(normalized);
}

async function prepareRepository(repository, target, temporaryRoot) {
  const attempts = [];
  for (let attempt = 1; attempt <= materializationAttempts; attempt += 1) {
    try {
      assertInside(target, temporaryRoot);
      await rm(target, { recursive: true, force: true });
      await clonePinnedRepository(repository, target);
      attempts.push({ attempt, status: "completed", errorCode: null, error: null });
      return { completed: true, attempts };
    } catch (error) {
      attempts.push({
        attempt,
        status: "environment-failed",
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
    "--filter=blob:none",
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

async function assertFrozenCandidate() {
  run("git", ["cat-file", "-e", `${candidateCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["diff", "--quiet", candidateCommit, "--", ...frozenCandidatePaths], {
    cwd: projectRoot
  });
  assert.equal(await sha256File(candidateCliPath), candidateCliSha256);
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
  assert.ok(index >= 0, "--out is required so the target manifest cannot be lost.");
  assert.ok(args[index + 1], "--out requires a repository-relative path.");
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.ok(resolved.startsWith(`${projectRoot}${path.sep}`), "Output must stay inside the repository.");
  return resolved;
}

function assertInsideTemporaryRoot(temporaryRoot) {
  assert.ok(
    path.resolve(temporaryRoot).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`),
    "Temporary selection root must stay inside the OS temporary directory."
  );
}

function assertInside(target, root) {
  const relative = path.relative(root, target);
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex").toUpperCase();
}

function lines(value) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function summarizeError(error) {
  const text = error instanceof Error ? error.stack ?? error.message : String(error);
  return text.length <= 12_000 ? text : `${text.slice(0, 12_000)}\n...[truncated]`;
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
