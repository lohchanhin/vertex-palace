const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdir, readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const studyId = "local-blind-routing-round-11-0.4-alpha";
const poolRelativePath = "docs/research/evidence/local-blind-routing-repository-pool-0.4-alpha-round-11.json";
const poolPath = path.join(projectRoot, poolRelativePath);

main().catch((error) => {
  process.stderr.write(`${summarizeError(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  const outputPath = outputArgument(process.argv.slice(2));
  const pool = JSON.parse(await readFile(poolPath, "utf8"));
  assert.equal(pool.studyId, studyId);
  assert.equal(pool.rules.pinnedHeadsObtainedWithGitLsRemoteHeadOnly, true);
  const repositories = [];

  for (const repository of pool.repositoryPool) {
    const startedAt = Date.now();
    try {
      const output = run("git", ["ls-remote", "--exit-code", repository.url, "HEAD"], {
        timeout: 120_000
      }).stdout.trim();
      const match = output.match(/^([0-9a-f]{40})\s+HEAD$/);
      assert.ok(match, `Unexpected ls-remote output for ${repository.name}`);
      repositories.push({
        name: repository.name,
        url: repository.url,
        expectedHead: repository.pinnedHead,
        observedHead: match[1],
        matched: match[1] === repository.pinnedHead,
        elapsedMs: Date.now() - startedAt,
        error: null
      });
    } catch (error) {
      repositories.push({
        name: repository.name,
        url: repository.url,
        expectedHead: repository.pinnedHead,
        observedHead: null,
        matched: false,
        elapsedMs: Date.now() - startedAt,
        error: summarizeError(error)
      });
    }
  }

  const allMatched = repositories.every(({ matched }) => matched);
  const evidence = {
    schemaVersion: 1,
    studyId,
    generatedAt: new Date().toISOString(),
    status: allMatched ? "verified" : "verification-failed",
    claimBoundary: "Remote HEAD identity verification only. This command used git ls-remote <url> HEAD and did not fetch or inspect commit history, subjects, diffs, tasks, or Palace output.",
    repositoryPool: poolRelativePath,
    commandShape: "git ls-remote --exit-code <url> HEAD",
    commitHistoryInspected: false,
    palaceCallsOnCandidateTasks: 0,
    repositories
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  process.stdout.write(`${JSON.stringify({
    outputPath,
    status: evidence.status,
    matched: repositories.filter(({ matched }) => matched).length,
    total: repositories.length
  }, null, 2)}\n`);
  if (!allMatched) process.exitCode = 1;
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  assert.ok(index >= 0, "--out is required so HEAD verification evidence cannot be overwritten");
  assert.ok(args[index + 1], "--out requires a repository-relative path");
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.ok(resolved.startsWith(`${projectRoot}${path.sep}`), "Output must stay inside the repository");
  return resolved;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 4 * 1024 * 1024,
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

function summarizeError(error) {
  const text = error instanceof Error ? error.stack ?? error.message : String(error);
  return text.length <= 4_000 ? text : `${text.slice(0, 4_000)}\n...[truncated]`;
}
