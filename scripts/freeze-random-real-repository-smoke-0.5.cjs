const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash, randomBytes } = require("node:crypto");
const { mkdir, readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const studyId = "random-real-repository-repair-smoke-0.5";
const allowedLanguages = new Set(["JavaScript", "TypeScript", "Python"]);
const excludedRepositories = new Set([
  "colinhacks/zod",
  "psf/requests",
  "lohchanhin/vertex-palace",
  "lohchanhin/benchmarks-demo",
  "lohchanhin/benchmarks-ab-demo"
]);

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  const outputPath = outputArgument(process.argv.slice(2));
  const now = new Date();
  const createdAfter = isoDate(daysBefore(now, 365));
  const pushedAfter = daysBefore(now, 180).toISOString();
  const seed = randomBytes(32).toString("hex");
  const searchQuery = [
    "is:issue",
    "is:open",
    "label:bug",
    'label:"good first issue"',
    "no:assignee",
    `created:>=${createdAfter}`,
    "sort:updated-desc"
  ].join(" ");

  const response = githubGraphql(searchQuery);
  const rawNodes = response?.data?.search?.nodes ?? [];
  const candidates = rawNodes
    .map((issue) => normalizeCandidate(issue, pushedAfter))
    .filter(Boolean)
    .sort((left, right) => left.issue.url.localeCompare(right.issue.url));

  assert.ok(candidates.length > 0, "The mechanically filtered GitHub issue pool is empty.");
  const ranked = candidates
    .map((candidate) => ({
      ...candidate,
      selectionKey: sha256(`${seed}\n${candidate.issue.url}`)
    }))
    .sort((left, right) => left.selectionKey.localeCompare(right.selectionKey));
  const selected = ranked[0];
  const candidateCliPath = path.join(projectRoot, "dist", "palace.cjs");
  const candidateCli = await readFile(candidateCliPath);
  const sourceCommit = run("git", ["rev-parse", "HEAD"], projectRoot).trim();
  const sourceStatus = run("git", ["status", "--short", "--untracked-files=no"], projectRoot).trim();
  assert.equal(sourceStatus, "", "Tracked product worktree must be clean before selection freeze.");

  const freeze = {
    schemaVersion: 1,
    studyId,
    status: "selection-frozen",
    frozenAt: now.toISOString(),
    claimBoundary: "One exploratory real-repository repair smoke test. Random selection is reproducible from the frozen seed and pool, but this single observation cannot establish routing quality, repair accuracy, Token savings, or speed.",
    protocol: {
      selectionBeforePalaceExposure: true,
      outcomeDependentReplacementForbidden: true,
      upstreamPushForbidden: true,
      selectedTargetCount: 1,
      searchQuery,
      returnedNodes: rawNodes.length,
      eligibility: {
        languages: [...allowedLanguages],
        publicRepository: true,
        fork: false,
        archived: false,
        disabled: false,
        stars: { minimum: 50, maximum: 10_000 },
        diskUsageKiB: { minimum: 100, maximum: 100_000 },
        pushedAfter,
        issueBodyBytes: { minimum: 40, maximum: 12_000 },
        openBugAndGoodFirstIssue: true,
        unassigned: true
      },
      selectionMethod: "Choose the lexicographically smallest SHA-256(seed + newline + issue URL).",
      seed
    },
    candidate: {
      sourceCommit,
      cliPath: "dist/palace.cjs",
      cliSha256: sha256(candidateCli),
      reportedVersion: run(process.execPath, [candidateCliPath, "--version"], projectRoot).trim()
    },
    pool: {
      eligibleCount: candidates.length,
      sha256: sha256(canonicalJson(candidates)),
      candidates
    },
    selected
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(freeze, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  process.stdout.write(`${JSON.stringify({
    outputPath,
    frozenAt: freeze.frozenAt,
    eligibleCount: candidates.length,
    poolSha256: freeze.pool.sha256,
    selected: freeze.selected,
    candidate: freeze.candidate
  }, null, 2)}\n`);
}

function githubGraphql(searchQuery) {
  const query = `
    query($searchQuery: String!) {
      search(first: 100, type: ISSUE, query: $searchQuery) {
        issueCount
        nodes {
          ... on Issue {
            number
            title
            body
            url
            state
            createdAt
            updatedAt
            assignees(first: 1) { totalCount }
            labels(first: 50) { nodes { name } }
            repository {
              nameWithOwner
              url
              isPrivate
              isFork
              isArchived
              isDisabled
              diskUsage
              stargazerCount
              pushedAt
              primaryLanguage { name }
              defaultBranchRef { name target { oid } }
            }
          }
        }
      }
    }
  `;
  const result = spawnSync(
    "gh",
    ["api", "graphql", "-F", `query=${query}`, "-F", `searchQuery=${searchQuery}`],
    { cwd: projectRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024, windowsHide: true }
  );
  assert.equal(result.status, 0, `GitHub GraphQL query failed: ${redact(result.stderr || result.stdout)}`);
  return JSON.parse(result.stdout);
}

function normalizeCandidate(issue, pushedAfter) {
  if (!issue?.repository || issue.state !== "OPEN") return undefined;
  const repository = issue.repository;
  const language = repository.primaryLanguage?.name;
  const labels = (issue.labels?.nodes ?? []).map((label) => label.name).sort();
  const lowerLabels = new Set(labels.map((label) => label.toLowerCase()));
  const body = issue.body ?? "";
  const bodyBytes = Buffer.byteLength(body, "utf8");
  if (repository.isPrivate || repository.isFork || repository.isArchived || repository.isDisabled) return undefined;
  if (excludedRepositories.has(repository.nameWithOwner)) return undefined;
  if (!allowedLanguages.has(language)) return undefined;
  if (repository.stargazerCount < 50 || repository.stargazerCount > 10_000) return undefined;
  if (repository.diskUsage < 100 || repository.diskUsage > 100_000) return undefined;
  if (!repository.pushedAt || repository.pushedAt < pushedAfter) return undefined;
  if (!repository.defaultBranchRef?.target?.oid) return undefined;
  if (issue.assignees?.totalCount !== 0) return undefined;
  if (!lowerLabels.has("bug") || !lowerLabels.has("good first issue")) return undefined;
  if (bodyBytes < 40 || bodyBytes > 12_000) return undefined;

  return {
    repository: {
      nameWithOwner: repository.nameWithOwner,
      url: repository.url,
      cloneUrl: `${repository.url}.git`,
      defaultBranch: repository.defaultBranchRef.name,
      commit: repository.defaultBranchRef.target.oid,
      primaryLanguage: language,
      stars: repository.stargazerCount,
      diskUsageKiB: repository.diskUsage,
      pushedAt: repository.pushedAt
    },
    issue: {
      number: issue.number,
      url: issue.url,
      title: issue.title,
      bodyBytes,
      bodySha256: sha256(body),
      labels,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt
    }
  };
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true
  });
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed: ${redact(result.stderr || result.stdout)}`);
  return result.stdout;
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  assert.ok(index >= 0 && args[index + 1], "--out requires a repository-relative path.");
  const outputPath = path.resolve(projectRoot, args[index + 1]);
  assert.ok(outputPath.startsWith(`${projectRoot}${path.sep}`), "Output must stay inside the repository.");
  return outputPath;
}

function daysBefore(date, days) {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function canonicalJson(value) {
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function redact(value) {
  return String(value).replace(/(?:gh[opsu]_|github_pat_)[A-Za-z0-9_]+/g, "[REDACTED]");
}
