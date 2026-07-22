const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdir, mkdtemp, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const outputPath = outputArgument(process.argv.slice(2));
const candidateCommit = "0b6a0fd92f43a74c983663cd32f937087e3ec923";
const desiredTargets = 4;
const fetchDepth = 250;
const scanLimit = 200;
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
  "https://github.com/sindresorhus/p-limit.git"
];

const repositoryPool = [
  {
    name: "fastify",
    language: "JavaScript",
    url: "https://github.com/fastify/fastify.git",
    pinnedHead: "ada0623dce9ed776306f2ccaa095b8ee01a492ba",
    extensions: [".cjs", ".js", ".mjs", ".ts"]
  },
  {
    name: "click",
    language: "Python",
    url: "https://github.com/pallets/click.git",
    pinnedHead: "cfa01eeb7894a408af70b29d28c0b24f8680f9fb",
    extensions: [".py"]
  },
  {
    name: "date-fns",
    language: "TypeScript",
    url: "https://github.com/date-fns/date-fns.git",
    pinnedHead: "4098115cf705e3af7f663d8e5b0686e39a9f478a",
    extensions: [".js", ".jsx", ".ts", ".tsx"]
  },
  {
    name: "ripgrep",
    language: "Rust fallback parser",
    url: "https://github.com/BurntSushi/ripgrep.git",
    pinnedHead: "8372866810a1f2a647d11d7780984d4402a5c1e9",
    extensions: [".rs"]
  },
  {
    name: "cobra",
    language: "Go fallback parser",
    url: "https://github.com/spf13/cobra.git",
    pinnedHead: "adbc8813901bba65827259daa8e22ff94ec1f30e",
    extensions: [".go"]
  },
  {
    name: "marked",
    language: "JavaScript and TypeScript",
    url: "https://github.com/markedjs/marked.git",
    pinnedHead: "1d3229a4cc423dbfef9dc2d1e325f7a9231ad60b",
    extensions: [".js", ".mjs", ".ts"]
  }
];

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  assertFrozenCandidate();
  assert.equal(
    new Set(repositoryPool.map((repository) => repository.url)).size,
    repositoryPool.length,
    "Held-out repository pool contains duplicate URLs."
  );
  for (const repository of repositoryPool) {
    assert.ok(!previouslyObservedRepositories.includes(repository.url), `${repository.name} was previously observed.`);
  }

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-held-out-selection-"));
  assert.ok(
    path.resolve(temporaryRoot).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`),
    "Temporary selection root must stay inside the OS temporary directory."
  );

  let manifest;
  try {
    const repositoryReports = [];
    const targets = [];
    for (const repository of repositoryPool) {
      if (targets.length >= desiredTargets) {
        repositoryReports.push({
          name: repository.name,
          url: repository.url,
          pinnedHead: repository.pinnedHead,
          status: "reserved-fallback-not-inspected",
          scannedCommits: 0,
          rejectionCounts: {},
          selectedTarget: null
        });
        continue;
      }

      const repositoryRoot = path.join(temporaryRoot, repository.name);
      try {
        await clonePinnedRepository(repository, repositoryRoot);
        const report = inspectRepository(repository, repositoryRoot);
        repositoryReports.push(report);
        if (report.selectedTarget) targets.push(report.selectedTarget);
      } catch (error) {
        repositoryReports.push({
          name: repository.name,
          url: repository.url,
          pinnedHead: repository.pinnedHead,
          status: "setup-error",
          scannedCommits: 0,
          rejectionCounts: {},
          selectedTarget: null,
          error: summarizeError(error)
        });
      }
    }

    const status = targets.length === desiredTargets ? "selected" : "selection-failed";
    manifest = {
      schemaVersion: 1,
      studyId: "held-out-cross-repository-routing-0.4-alpha",
      generatedAt: new Date().toISOString(),
      status,
      claimBoundary: "Mechanical target selection only. The frozen Vertex Palace candidate has not routed or evaluated these tasks.",
      candidateCommit,
      selectorCommit: run("git", ["rev-parse", "HEAD"], { cwd: projectRoot }).stdout.trim(),
      previouslyObservedRepositories,
      rules: {
        desiredTargets,
        repositoryOrderIsBinding: true,
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
        palaceCallsDuringSelection: 0,
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
      process.stderr.write(`Kept held-out selection data at ${temporaryRoot}\n`);
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
    || /(?:^|\/)[^/]*(?:test|tests|spec)\.[^/]+$/.test(normalized)
    || /_test\.[^/]+$/.test(normalized);
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
    timeout: 240_000
  });
  run("git", ["-c", "advice.detachedHead=false", "checkout", "--detach", repository.pinnedHead], { cwd: target });
  assert.equal(run("git", ["rev-parse", "HEAD"], { cwd: target }).stdout.trim(), repository.pinnedHead);
}

function assertFrozenCandidate() {
  run("git", ["cat-file", "-e", `${candidateCommit}^{commit}`], { cwd: projectRoot });
  run("git", ["diff", "--quiet", candidateCommit, "--", ...frozenCandidatePaths], { cwd: projectRoot });
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
