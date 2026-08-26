const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdir, mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { classifyTaskType } = require("./lib/commit-task-classifier.cjs");
const {
  allowedAuxiliaryExtensions,
  classifyFileSurfaces
} = require("./lib/held-out-file-surfaces.cjs");
const {
  assertCandidateFreeze,
  sha256Bytes,
  validateRepositoryPool
} = require("./lib/local-blind-freeze.cjs");
const { buildTaskDiffCoherencePacket } = require("./lib/task-diff-coherence.cjs");

const projectRoot = path.resolve(__dirname, "..");
const studyId = "local-blind-routing-round-19-0.4-alpha";
const poolRelativePath = "docs/research/evidence/local-blind-routing-repository-pool-0.4-alpha-round-19.json";
const freezeRelativePath = "docs/research/evidence/local-blind-candidate-freeze-0.4-alpha-round-19.json";
const poolPath = path.join(projectRoot, poolRelativePath);
const freezePath = path.join(projectRoot, freezeRelativePath);
const fetchDepth = 400;
const scanLimit = 300;
const materializationAttempts = 3;
const retryDelayMs = 5_000;

if (require.main === module) {
  runMain().catch((error) => {
    process.stderr.write(`${summarizeError(error)}\n`);
    process.exitCode = 1;
  });
}

async function runMain() {
  const outputPath = outputArgument(process.argv.slice(2));
  try {
    await main(outputPath);
  } catch (error) {
    await preserveFailure(outputPath, error);
    throw error;
  }
}

async function main(outputPath) {
  const { freeze, freezeSha256 } = await assertCandidateFreeze({
    root: projectRoot,
    freezePath,
    studyId
  });
  const poolBytes = await readFile(poolPath);
  const pool = JSON.parse(poolBytes.toString("utf8"));
  await validateRepositoryPool({
    root: projectRoot,
    pool,
    studyId,
    freezeRelativePath
  });

  const generatedAt = new Date().toISOString();
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-local-blind-round-19-queue-"));
  assertInsideTemporaryRoot(temporaryRoot);
  let queue;

  try {
    const repositoryReports = [];
    for (const repository of pool.repositoryPool) {
      const repositoryRoot = path.join(temporaryRoot, repository.name);
      const preparation = await prepareRepository(repository, repositoryRoot, temporaryRoot);
      if (!preparation.completed) {
        repositoryReports.push({
          name: repository.name,
          languageFamily: repository.languageFamily,
          url: repository.url,
          pinnedHead: repository.pinnedHead,
          status: "setup-error",
          scannedCommits: 0,
          rejectionCounts: {},
          candidates: [],
          materializationAttempts: preparation.attempts
        });
        continue;
      }

      let report;
      try {
        report = inspectRepository({
          repository,
          root: repositoryRoot,
          rules: pool.rules,
          generatedAt
        });
      } catch (error) {
        report = {
          name: repository.name,
          languageFamily: repository.languageFamily,
          url: repository.url,
          pinnedHead: repository.pinnedHead,
          status: "inspection-error",
          scannedCommits: 0,
          rejectionCounts: {},
          candidates: [],
          failureCategory: isNetworkFailure(error)
            ? "environment-inspection-error"
            : "harness-inspection-error",
          inspectionError: summarizeError(error)
        };
      }
      report.materializationAttempts = preparation.attempts;
      repositoryReports.push(report);
    }

    const ready = repositoryReports.every(({ status }) => status === "inspected");
    queue = {
      schemaVersion: 1,
      studyId,
      generatedAt,
      status: ready ? "candidate-queue-ready" : "candidate-queue-partial",
      claimBoundary: "Mechanical candidate queue and hunk-addressed diff packets only. No Round 19 candidate task was sent to Palace, and no semantic target acceptance decision was made by this script.",
      evidenceClass: "local-hash-frozen-pre-route-mechanical-candidate-queue",
      publicPreregistration: false,
      candidateFreeze: {
        path: freezeRelativePath,
        sha256: freezeSha256,
        frozenAt: freeze.frozenAt,
        artifactHashesVerified: true
      },
      candidate: freeze.candidate,
      comparisonBaseline: freeze.comparisonBaseline,
      repositoryPool: {
        path: poolRelativePath,
        sha256: sha256Bytes(poolBytes)
      },
      selector: {
        path: "scripts/prepare-local-blind-routing-candidates-round-19.cjs",
        sha256: freeze.artifacts["scripts/prepare-local-blind-routing-candidates-round-19.cjs"]
      },
      rules: {
        ...pool.rules,
        fetchDepth,
        fetchMode: "complete-shallow-history-no-promisor",
        scanLimit,
        nonMergeSingleParent: true,
        newestFirstCandidateOrder: true,
        completeUnifiedZeroDiffRequired: true,
        allFilesMustBeModified: true,
        requiresImplementationAndFocusedTest: true,
        implementationAndTestMustUsePrimaryLanguageExtension: true,
        auxiliaryFilesRemainInOracle: true,
        expectedTaskTypeDerivedBeforeRouting: true,
        materializationAttempts,
        retryDelayMs,
        palaceCallsOnCandidateTasksDuringQueuePreparation: 0,
        outputCreateOnly: true
      },
      palaceCallsOnCandidateTasks: 0,
      repositoryReports
    };

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(queue, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx"
    });
    process.stdout.write(`${JSON.stringify({
      outputPath,
      status: queue.status,
      repositoriesInspected: repositoryReports.filter(({ status }) => status === "inspected").length,
      mechanicalCandidates: repositoryReports.reduce((sum, report) => sum + report.candidates.length, 0),
      palaceCallsOnCandidateTasks: 0
    }, null, 2)}\n`);
  } finally {
    if (process.env.KEEP_LOCAL_BLIND_ROUND_19_QUEUE_TEMP === "1") {
      process.stderr.write(`Keeping Round 19 candidate repositories at ${temporaryRoot}\n`);
    } else {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }

  if (queue.status !== "candidate-queue-ready") process.exitCode = 1;
}

function inspectRepository({ repository, root, rules, generatedAt }) {
  const commits = lines(
    run("git", ["rev-list", "--no-merges", `--max-count=${scanLimit}`, "HEAD"], { cwd: root }).stdout
  );
  const rejectionCounts = {};
  const candidates = [];
  let scannedCommits = 0;

  for (const commit of commits) {
    if (candidates.length >= rules.maximumMechanicalCandidatesPerRepository) break;
    scannedCommits += 1;
    const inspected = inspectCommit({ repository, root, commit, rules, generatedAt });
    if (inspected.candidate) {
      candidates.push({
        ...inspected.candidate,
        candidateRank: candidates.length + 1
      });
      continue;
    }
    rejectionCounts[inspected.reason] = (rejectionCounts[inspected.reason] ?? 0) + 1;
  }

  return {
    name: repository.name,
    languageFamily: repository.languageFamily,
    url: repository.url,
    pinnedHead: repository.pinnedHead,
    status: "inspected",
    scannedCommits,
    rejectionCounts,
    candidates
  };
}

function inspectCommit({ repository, root, commit, rules, generatedAt }) {
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
  if (changes.some(({ status }) => status !== "M")) return rejected("contains-non-modified-file");
  const changedFiles = changes.map(({ path: sourcePath }) => sourcePath);
  const surfaces = classifyFileSurfaces(changedFiles, repository.extensions, rules.maximumAuxiliaryFiles);
  if (!surfaces.eligible) return rejected(surfaces.reason);

  const stats = parseNumstat(
    run("git", ["diff", "--numstat", parentCommit, commit, "--", ...changedFiles], { cwd: root }).stdout
  );
  if (!stats || stats.changedLines < 2 || stats.changedLines > rules.maximumChangedLines) {
    return rejected("changed-lines-outside-range-or-binary");
  }
  for (const sourcePath of changedFiles) {
    if (!gitObjectExists(root, `${parentCommit}:${sourcePath}`)
      || !gitObjectExists(root, `${commit}:${sourcePath}`)) {
      return rejected("file-not-present-on-both-sides");
    }
  }

  const target = {
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
    oracleSource: "mechanically eligible single-parent real Git-history diff pending whole-target semantic review",
    changedLines: stats.changedLines,
    additions: stats.additions,
    deletions: stats.deletions
  };

  let coherencePacket;
  try {
    const diffText = run("git", [
      "-c",
      "core.quotePath=false",
      "diff",
      "--unified=0",
      "--no-color",
      "--no-ext-diff",
      "--no-textconv",
      "--ignore-submodules=all",
      parentCommit,
      commit,
      "--",
      ...changedFiles
    ], { cwd: root }).stdout;
    coherencePacket = buildTaskDiffCoherencePacket({ target, diffText, generatedAt });
  } catch {
    return rejected("unreviewable-unified-diff");
  }

  return {
    candidate: {
      candidateId: candidateId(repository.name, parentCommit, commit),
      target,
      coherencePacket
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
      attempts.push({
        attempt,
        status: "completed",
        elapsedMs: Date.now() - startedAt,
        errorCode: null,
        error: null
      });
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

async function preserveFailure(outputPath, error) {
  try {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify({
      schemaVersion: 1,
      studyId,
      generatedAt: new Date().toISOString(),
      status: "candidate-queue-failed",
      claimBoundary: "Unexpected queue-preparation failure preserved before any Round 19 candidate task was sent to Palace.",
      palaceCallsOnCandidateTasks: 0,
      error: summarizeError(error)
    }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  } catch (preservationError) {
    process.stderr.write(`Could not preserve queue failure: ${summarizeError(preservationError)}\n`);
  }
}

function candidateId(repository, parentCommit, commit) {
  return `candidate_${createHash("sha256")
    .update(`${repository}\0${parentCommit}\0${commit}`)
    .digest("hex")
    .slice(0, 16)}`;
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
  }).filter(({ status, path: sourcePath }) => status && sourcePath);
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
  return { candidate: null, reason };
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  assert.ok(index >= 0, "--out is required so the first queue result cannot be lost");
  assert.ok(args[index + 1], "--out requires a repository-relative path");
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.ok(resolved.startsWith(`${projectRoot}${path.sep}`), "Output must stay inside the repository");
  return resolved;
}

function assertInsideTemporaryRoot(temporaryRoot) {
  assert.ok(
    path.resolve(temporaryRoot).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`),
    "Temporary queue root must stay inside the OS temporary directory"
  );
}

function assertInside(target, root) {
  const relative = path.relative(root, target);
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
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

module.exports = {
  candidateId,
  inspectCommit,
  inspectRepository,
  parseNameStatus,
  parseNumstat
};


