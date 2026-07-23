const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdir, mkdtemp, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const outputPath = outputArgument(process.argv.slice(2));
const studyId = "held-out-cross-repository-routing-round-3-0.4-alpha";
const candidateCommit = "6060e0c6aa2aea64d0145c1e55bccdc4669e4b48";
const desiredTargets = 8;
const requiredLanguageFamilies = ["javascript-typescript", "python", "go", "rust"];
const targetsPerLanguageFamily = 2;
const fetchDepth = 400;
const scanLimit = 300;
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
  "https://github.com/markedjs/marked.git",
  "https://github.com/expressjs/express.git",
  "https://github.com/encode/httpx.git",
  "https://github.com/urfave/cli.git",
  "https://github.com/clap-rs/clap.git",
  "https://github.com/tj/commander.js.git",
  "https://github.com/pytest-dev/pytest.git",
  "https://github.com/go-chi/chi.git",
  "https://github.com/tokio-rs/axum.git"
];

const repositoryPool = [
  {
    name: "koa",
    language: "JavaScript",
    languageFamily: "javascript-typescript",
    url: "https://github.com/koajs/koa.git",
    pinnedHead: "52d5e8ff5ac79f2479463b53df2999900ae95115",
    extensions: [".cjs", ".js", ".mjs", ".ts"]
  },
  {
    name: "starlette",
    language: "Python",
    languageFamily: "python",
    url: "https://github.com/encode/starlette.git",
    pinnedHead: "5174d4c8358a6f06aa8056bafd14c2272dab8dd1",
    extensions: [".py"]
  },
  {
    name: "gin",
    language: "Go fallback parser",
    languageFamily: "go",
    url: "https://github.com/gin-gonic/gin.git",
    pinnedHead: "34dac209ffb6ef85cc78c5d217bbb7ad001d68fd",
    extensions: [".go"]
  },
  {
    name: "tower",
    language: "Rust fallback parser",
    languageFamily: "rust",
    url: "https://github.com/tower-rs/tower.git",
    pinnedHead: "df06d70dbea345facbffb5881fe8647f53bf424d",
    extensions: [".rs"]
  },
  {
    name: "axios",
    language: "JavaScript and TypeScript",
    languageFamily: "javascript-typescript",
    url: "https://github.com/axios/axios.git",
    pinnedHead: "311fcc5c8d989b7248f05d390bb83bfbfb009977",
    extensions: [".cjs", ".js", ".mjs", ".ts"]
  },
  {
    name: "flask",
    language: "Python",
    languageFamily: "python",
    url: "https://github.com/pallets/flask.git",
    pinnedHead: "36e4a824f340fdee7ed50937ba8e7f6bc7d17f81",
    extensions: [".py"]
  },
  {
    name: "echo",
    language: "Go fallback parser",
    languageFamily: "go",
    url: "https://github.com/labstack/echo.git",
    pinnedHead: "ed8bbe4b6cbf519766c99e492b9cc427404b3719",
    extensions: [".go"]
  },
  {
    name: "serde-json",
    language: "Rust fallback parser",
    languageFamily: "rust",
    url: "https://github.com/serde-rs/json.git",
    pinnedHead: "de8500740cdcabffb9734f503e4889def823cf10",
    extensions: [".rs"]
  },
  {
    name: "hono",
    language: "TypeScript",
    languageFamily: "javascript-typescript",
    url: "https://github.com/honojs/hono.git",
    pinnedHead: "44f884321a1d52e98d45a85634da9d5f4751a43a",
    extensions: [".cjs", ".js", ".mjs", ".ts"]
  },
  {
    name: "pydantic",
    language: "Python",
    languageFamily: "python",
    url: "https://github.com/pydantic/pydantic.git",
    pinnedHead: "7b3dd4cf4ba551c33c963f22627cdc566402d8f6",
    extensions: [".py"]
  },
  {
    name: "fiber",
    language: "Go fallback parser",
    languageFamily: "go",
    url: "https://github.com/gofiber/fiber.git",
    pinnedHead: "23c4f5957f31120b3afd82d223d773fe41957a06",
    extensions: [".go"]
  },
  {
    name: "hyper",
    language: "Rust fallback parser",
    languageFamily: "rust",
    url: "https://github.com/hyperium/hyper.git",
    pinnedHead: "67ace6484db5d4a15367013847768f5f94f4b97d",
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

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-held-out-round-3-selection-"));
  assert.ok(
    path.resolve(temporaryRoot).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`),
    "Temporary selection root must stay inside the OS temporary directory."
  );

  let manifest;
  try {
    const repositoryReports = [];
    const targets = [];
    const selectedFamilyCounts = new Map(requiredLanguageFamilies.map((family) => [family, 0]));

    for (const repository of repositoryPool) {
      if (targets.length >= desiredTargets && hasRequiredLanguageDiversity(selectedFamilyCounts)) {
        repositoryReports.push(notInspectedReport(repository, "reserved-fallback-not-inspected"));
        continue;
      }

      const fillsMissingFamily = (selectedFamilyCounts.get(repository.languageFamily) ?? 0) < targetsPerLanguageFamily;
      if (!fillsMissingFamily) {
        repositoryReports.push(notInspectedReport(repository, "family-quota-filled-not-inspected"));
        continue;
      }

      const repositoryRoot = path.join(temporaryRoot, repository.name);
      try {
        await clonePinnedRepository(repository, repositoryRoot);
        const report = inspectRepository(repository, repositoryRoot);
        repositoryReports.push(report);
        if (report.selectedTarget) {
          targets.push(report.selectedTarget);
          selectedFamilyCounts.set(
            repository.languageFamily,
            (selectedFamilyCounts.get(repository.languageFamily) ?? 0) + 1
          );
        }
      } catch (error) {
        repositoryReports.push({
          ...notInspectedReport(repository, "setup-error"),
          error: summarizeError(error)
        });
      }
    }

    const languageDiversitySatisfied = hasRequiredLanguageDiversity(selectedFamilyCounts);
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
      selectorPath: "scripts/select-held-out-routing-targets-round-3.cjs",
      previouslyObservedRepositories,
      rules: {
        desiredTargets,
        requiredLanguageFamilies,
        targetsPerLanguageFamily,
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
  const expectedTaskType = classifyTaskType(subject);
  if (subject.length < 20 || subject.length > 180 || !expectedTaskType) {
    return rejected("non-behavioral-or-ambiguous-subject");
  }

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
  if (/^fix(?:\([^)]*\))?:/i.test(subject)) return "bugfix";
  if (/^feat(?:\([^)]*\))?:/i.test(subject)) return "feature";
  if (/^(?:add|allow|implement|support)\b/i.test(subject)) return "feature";
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

function hasRequiredLanguageDiversity(selectedFamilyCounts) {
  return requiredLanguageFamilies.every(
    (family) => (selectedFamilyCounts.get(family) ?? 0) >= targetsPerLanguageFamily
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
