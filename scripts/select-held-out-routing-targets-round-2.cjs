const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdir, mkdtemp, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const outputPath = outputArgument(process.argv.slice(2));
const studyId = "held-out-cross-repository-routing-round-2-0.4-alpha";
const candidateCommit = "0ef19a7bbef1901d813b81389405f87482db47c5";
const desiredTargets = 6;
const requiredLanguageFamilies = ["javascript-typescript", "python", "go", "rust"];
const extraTargetSlots = desiredTargets - requiredLanguageFamilies.length;
const fetchDepth = 300;
const scanLimit = 250;
const minimumFiles = 2;
const maximumFiles = 6;
const maximumChangedLines = 400;

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

const previouslyObservedRepositories = [
  "https://github.com/colinhacks/zod.git",
  "https://github.com/psf/requests.git",
  "https://github.com/sindresorhus/p-limit.git",
  "https://github.com/fastify/fastify.git",
  "https://github.com/pallets/click.git",
  "https://github.com/date-fns/date-fns.git",
  "https://github.com/BurntSushi/ripgrep.git",
  "https://github.com/spf13/cobra.git",
  "https://github.com/markedjs/marked.git"
];

const repositoryPool = [
  {
    name: "express",
    language: "JavaScript",
    languageFamily: "javascript-typescript",
    url: "https://github.com/expressjs/express.git",
    pinnedHead: "ae6dd37680e3a00618d6c8a3e522f0ee4eeba1a4",
    extensions: [".cjs", ".js", ".mjs", ".ts"]
  },
  {
    name: "httpx",
    language: "Python",
    languageFamily: "python",
    url: "https://github.com/encode/httpx.git",
    pinnedHead: "b5addb64f0161ff6bfe94c124ef76f6a1fba5254",
    extensions: [".py"]
  },
  {
    name: "urfave-cli",
    language: "Go fallback parser",
    languageFamily: "go",
    url: "https://github.com/urfave/cli.git",
    pinnedHead: "c6f4cf7e9223793478cfcde9b8f135cc8f86e78f",
    extensions: [".go"]
  },
  {
    name: "clap",
    language: "Rust fallback parser",
    languageFamily: "rust",
    url: "https://github.com/clap-rs/clap.git",
    pinnedHead: "466b2be56c5811d1af62c407f5a00456350ece62",
    extensions: [".rs"]
  },
  {
    name: "commander",
    language: "JavaScript and TypeScript",
    languageFamily: "javascript-typescript",
    url: "https://github.com/tj/commander.js.git",
    pinnedHead: "ba6d13ddb4243e5913367734f8c159089ffe7834",
    extensions: [".cjs", ".js", ".mjs", ".ts"]
  },
  {
    name: "pytest",
    language: "Python",
    languageFamily: "python",
    url: "https://github.com/pytest-dev/pytest.git",
    pinnedHead: "b4e846616cbb0ba74dc548f7066b09d820f5dc05",
    extensions: [".py"]
  },
  {
    name: "chi",
    language: "Go fallback parser",
    languageFamily: "go",
    url: "https://github.com/go-chi/chi.git",
    pinnedHead: "8b258c7bb28f97a5f2a856ff7ef962578fec9215",
    extensions: [".go"]
  },
  {
    name: "axum",
    language: "Rust fallback parser",
    languageFamily: "rust",
    url: "https://github.com/tokio-rs/axum.git",
    pinnedHead: "0704574455272caa79ff3ae8207adf8f620516c9",
    extensions: [".rs"]
  }
];

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  assertFrozenCandidate();
  assert.equal(
    run("git", ["status", "--short", "--untracked-files=no"], { cwd: projectRoot }).stdout.trim(),
    "",
    "Commit tracked selection protocol and selector changes before choosing targets."
  );
  assert.equal(
    new Set(repositoryPool.map((repository) => normalizeRepositoryUrl(repository.url))).size,
    repositoryPool.length,
    "Held-out repository pool contains duplicate URLs."
  );
  const observed = new Set(previouslyObservedRepositories.map(normalizeRepositoryUrl));
  for (const repository of repositoryPool) {
    assert.ok(!observed.has(normalizeRepositoryUrl(repository.url)), `${repository.name} was previously observed.`);
    assert.ok(requiredLanguageFamilies.includes(repository.languageFamily), `${repository.name} has an unknown language family.`);
  }

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-held-out-round-2-selection-"));
  assert.ok(
    path.resolve(temporaryRoot).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`),
    "Temporary selection root must stay inside the OS temporary directory."
  );

  let manifest;
  try {
    const repositoryReports = [];
    const targets = [];
    const selectedFamilies = new Set();
    let selectedExtraTargets = 0;

    for (const repository of repositoryPool) {
      if (targets.length >= desiredTargets && hasRequiredLanguageDiversity(selectedFamilies)) {
        repositoryReports.push(notInspectedReport(repository, "reserved-fallback-not-inspected"));
        continue;
      }

      const fillsMissingFamily = !selectedFamilies.has(repository.languageFamily);
      if (!fillsMissingFamily && selectedExtraTargets >= extraTargetSlots) {
        repositoryReports.push(notInspectedReport(repository, "reserved-redundant-family-not-inspected"));
        continue;
      }

      const repositoryRoot = path.join(temporaryRoot, repository.name);
      try {
        await clonePinnedRepository(repository, repositoryRoot);
        const report = inspectRepository(repository, repositoryRoot);
        repositoryReports.push(report);
        if (report.selectedTarget) {
          targets.push(report.selectedTarget);
          if (fillsMissingFamily) selectedFamilies.add(repository.languageFamily);
          else selectedExtraTargets += 1;
        }
      } catch (error) {
        repositoryReports.push({
          ...notInspectedReport(repository, "setup-error"),
          error: summarizeError(error)
        });
      }
    }

    const languageDiversitySatisfied = hasRequiredLanguageDiversity(selectedFamilies);
    const status = targets.length === desiredTargets && languageDiversitySatisfied
      ? "selected"
      : "selection-failed";
    manifest = {
      schemaVersion: 2,
      studyId,
      generatedAt: new Date().toISOString(),
      status,
      claimBoundary: "Mechanical target selection only. The frozen Vertex Palace candidate has not routed or evaluated any selected task.",
      candidateCommit,
      selectorCommit: run("git", ["rev-parse", "HEAD"], { cwd: projectRoot }).stdout.trim(),
      selectorPath: "scripts/select-held-out-routing-targets-round-2.cjs",
      previouslyObservedRepositories,
      rules: {
        desiredTargets,
        requiredLanguageFamilies,
        languageDiversitySatisfied,
        selectedExtraTargets,
        repositoryOrderIsBinding: true,
        firstEligibleRepositoryPerMissingFamilyWins: true,
        extraSlotsFilledInRepositoryOrder: true,
        fallbackOnlyAfterNoEligibleCommitOrSetupFailure: true,
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
        palaceCallsOnCandidateTasksDuringSelection: 0,
        outputCreateOnly: true
      },
      repositoryPool,
      repositoryReports,
      targets
    };

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  } finally {
    if (process.env.KEEP_HELD_OUT_SELECTION_TEMP === "1") {
      process.stderr.write(`Kept round-2 held-out selection data at ${temporaryRoot}\n`);
    } else {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }

  if (manifest?.status !== "selected") process.exitCode = 1;
}

function inspectRepository(repository, root) {
  const commits = lines(run("git", ["rev-list", "--no-merges", `--max-count=${scanLimit}`, "HEAD"], { cwd: root }).stdout);
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
  if (!isBehavioralSubject(subject)) return rejected("non-behavioral-subject");

  const changes = parseNameStatus(
    run("git", ["diff", "--name-status", "--find-renames", parentCommit, commit, "--"], { cwd: root }).stdout
  );
  if (changes.length < minimumFiles || changes.length > maximumFiles) return rejected("file-count-outside-range");
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

function isBehavioralSubject(subject) {
  if (subject.length < 20 || subject.length > 180) return false;
  if (/^(?:build|chore|ci|docs?|release|revert|style|test)(?:\([^)]*\))?:/i.test(subject)) return false;
  return /^(?:(?:fix|feat)(?:\([^)]*\))?:|add\b|allow\b|avoid\b|correct\b|ensure\b|handle\b|implement\b|improve\b|prevent\b|restore\b|support\b|update\b)/i.test(subject);
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

async function clonePinnedRepository(repository, target) {
  await mkdir(target, { recursive: true });
  run("git", ["init", "--quiet"], { cwd: target });
  run("git", ["remote", "add", "origin", repository.url], { cwd: target });
  run("git", ["fetch", "--quiet", `--depth=${fetchDepth}`, "origin", repository.pinnedHead], {
    cwd: target,
    timeout: 300_000
  });
  run("git", ["-c", "advice.detachedHead=false", "checkout", "--detach", repository.pinnedHead], { cwd: target });
  assert.equal(run("git", ["rev-parse", "HEAD"], { cwd: target }).stdout.trim(), repository.pinnedHead);
}

function assertFrozenCandidate() {
  run("git", ["cat-file", "-e", `${candidateCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["diff", "--quiet", candidateCommit, "--", ...frozenCandidatePaths], { cwd: projectRoot });
}

function hasRequiredLanguageDiversity(selectedFamilies) {
  return requiredLanguageFamilies.every((family) => selectedFamilies.has(family));
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
    env: process.env
  });
  return result.status === 0;
}

function rejected(reason) {
  return { target: null, reason };
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  assert.ok(index >= 0, "--out is required so the target manifest cannot be lost.");
  assert.ok(args[index + 1], "--out requires a repository-relative path.");
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.ok(resolved.startsWith(`${projectRoot}${path.sep}`), "Output must stay inside the Vertex Palace repository.");
  return resolved;
}

function lines(value) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function summarizeError(error) {
  const text = error instanceof Error ? error.stack ?? error.message : String(error);
  return text.length <= 12_000 ? text : `${text.slice(0, 12_000)}\n...[truncated]`;
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
